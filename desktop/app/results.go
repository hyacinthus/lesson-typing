package app

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// newRecordPulse is how long a new record pulses.
const newRecordPulse = 3 * time.Second

// resultsSheet shows a completed run in a sheet: its grade and figures,
// the personal best, the recent runs and the leaderboard, and what to do
// next: Enter goes to the next lesson and R starts over. Closed, it leaves
// the completed text in view.
func (a *App) resultsSheet(c *ui.Context, p *practice) {
	pal, res := a.pal, p.result
	st := res.stats
	grade := string(engine.GradeOf(st.Accuracy, st.CPM))
	gradeColor := pal.gradeColor(grade)
	signedIn := a.userID() != ""
	open := true
	a.dialogPanel(c, &open, 640, func() {
		ui.Row(c).Gap(18).Children(func() {
			ui.Box(c).Size(64, 64).Radius(32).Border(3, gradeColor).Background(gradeColor.Alpha(0.08)).Center().Children(func() {
				ui.Text(c, grade).FontSize(32).FontWeight(800).TextColor(gradeColor)
			})
			ui.Column(c).Gap(4).Children(func() {
				ui.Row(c).Gap(10).Children(func() {
					ui.Text(c, a.t("results")).FontSize(22).Bold()
					if res.newRecord {
						nr := ui.Text(c, a.t("new_record")).FontSize(12).FontWeight(600).TextColor(pal.primary).
							Background(pal.primary.Alpha(0.12)).Radius(11).Padding(3, 9)
						// It pulses a few times, then rests: a pulse runs the view on
						// every frame.
						if left := newRecordPulse - time.Since(res.completedAt); left > 0 {
							nr.Opacity(0.6 + 0.4*nr.Loop("pulse", time.Second, ui.Bounce(ui.EaseInOut)))
							c.After(left)
						}
					}
				})
				if l := p.lesson; l != nil {
					ui.Text(c, l.Title).FontSize(12).TextColor(pal.mutedForeground).SingleLine()
				}
			})
		})

		a.figureGrid(c, a.figures(st.WPM, st.CPM, strconv.Itoa(st.Accuracy), st.Duration),
			[4]ui.Color{pal.primary, pal.primary, gradeColor, pal.foreground})
		if b := p.best; b != nil {
			ui.Row(c).Gap(8).Children(func() {
				ui.Text(c, a.t("personal_best")).FontSize(12).FontWeight(600)
				var parts []string
				for _, f := range a.figures(b.WPM, b.CPM, data.FormatAccuracy(b.Accuracy), b.Duration) {
					parts = append(parts, f.text())
				}
				ui.Text(c, strings.Join(parts, " · ")).FontSize(12).FontFeatures("tnum").TextColor(pal.mutedForeground)
			})
		}

		pts := chartPoints(res)
		board := p.board.loaded && len(p.board.top) > 0
		if len(pts) >= 3 || board {
			ui.Row(c).FillWidth().Gap(24).AlignItems(ui.Start).PaddingY(4).Children(func() {
				if len(pts) >= 3 {
					ui.Column(c).Basis(0).Grow(1).Gap(8).Children(func() {
						ui.Text(c, a.t("recent_activity")).FontSize(13).FontWeight(600)
						a.cpmChart(c, pts, 150)
					})
				}
				if board {
					ui.Column(c).Basis(0).Grow(1).Children(func() { a.leaderboardView(c, p) })
				}
			})
		}

		ui.Row(c).FillWidth().Gap(10).Children(func() {
			if !signedIn {
				ui.Text(c, a.t("auth.login_prompt")).FontSize(12).TextColor(pal.mutedForeground).Grow(1)
				if ui.Button(c, a.t("auth.login")).Radius(16).Clicked() {
					a.openLogin()
				}
			} else {
				ui.Spacer(c)
			}
			restart := ui.Button(c, "").Label(a.t("restart")).Padding(7, 16).Radius(16).Gap(8).Children(func() {
				ui.Text(c, a.t("restart")).FontWeight(500)
				ui.Text(c, "R").FontSize(11).TextColor(pal.mutedForeground)
			})
			if restart.Clicked() {
				a.restart(p)
			}
			if a.enterButton(c, a.t("next_lesson")).Clicked() {
				a.nextLesson(p)
			}
		})
		// The sheet keeps the keyboard while it shows.
		a.resultKeys(c, p)
	})
	if !open {
		res.dismissed = true
	}
}

// resultKeys takes the keys of a completed run: Enter goes to the next
// lesson, R starts over.
func (a *App) resultKeys(c *ui.Context, p *practice) {
	if c.Shortcut(0, ui.KeyEnter) {
		a.nextLesson(p)
	}
	if c.Shortcut(0, ui.KeyR) {
		a.restart(p)
	}
}

// figure is one of a run's figures: what it is, its value and its unit.
type figure struct{ label, value, unit string }

// text is the figure's value with its unit.
func (f figure) text() string { return strings.TrimSpace(f.value + " " + f.unit) }

// figures labels and formats the figures of a run: its WPM, CPM, accuracy
// (formatted) and time.
func (a *App) figures(wpm, cpm int, accuracy string, seconds int) [4]figure {
	return [4]figure{
		{a.t("stats.wpm_title"), strconv.Itoa(wpm), a.t("stats.wpm_unit")},
		{a.t("stats.char_speed"), strconv.Itoa(cpm), a.t("stats.char_unit")},
		{a.t("stats.accuracy"), accuracy + "%", ""},
		{a.t("time"), engine.FormatDuration(seconds), ""},
	}
}

// figureGrid shows figures side by side in a well, in colors.
func (a *App) figureGrid(c *ui.Context, figs [4]figure, colors [4]ui.Color) {
	pal := a.pal
	ui.Grid(c).Columns(4).FillWidth().Radius(14).Background(pal.muted).Children(func() {
		for i, f := range figs {
			col := ui.Column(c).Gap(2).Padding(12, 16)
			if i > 0 {
				col.BorderWidth(0, 0, 0, 1).BorderColor(pal.border)
			}
			col.Children(func() {
				ui.Text(c, f.label).FontSize(11).TextColor(pal.mutedForeground).SingleLine()
				ui.Row(c).Gap(4).AlignItems(ui.End).Children(func() {
					ui.Text(c, f.value).FontSize(26).FontWeight(600).TextColor(colors[i]).FontFeatures("tnum").NoWrap()
					if f.unit != "" {
						ui.Text(c, f.unit).FontSize(11).TextColor(pal.mutedForeground).NoWrap().Padding(0, 0, 5, 0)
					}
				})
			})
		}
	})
}

// chartPoints are the runs the chart shows, oldest first: the latest
// ten of the server, with this run when the server does not know it yet.
func chartPoints(res *result) []data.PracticeLog {
	logs := make([]data.PracticeLog, len(res.recent))
	for i, l := range res.recent {
		logs[len(logs)-1-i] = l // newest first from the server
	}
	st := res.stats
	included := false
	for _, l := range logs {
		if l.CPM == st.CPM && l.Duration == st.Duration && math.Abs(l.Accuracy-float64(st.Accuracy)) < 0.01 &&
			res.completedAt.Sub(l.CompletedAt).Abs() < 2*time.Minute {
			included = true
		}
	}
	if !included {
		logs = append(logs, data.PracticeLog{
			CPM: st.CPM, WPM: st.WPM, Accuracy: float64(st.Accuracy), Duration: st.Duration, CompletedAt: res.completedAt,
		})
	}
	if len(logs) > 10 {
		logs = logs[len(logs)-10:]
	}
	return logs
}

// confettiColors are the web's confetti colors.
var confettiColors = []ui.Color{ui.Hex("#007FFF"), ui.Hex("#22c55e"), ui.Hex("#f59e0b"), ui.Hex("#ec4899"), ui.Hex("#a855f7")}

// confetti rains pieces over the window for a few seconds after start, as
// the web's ConfettiBurst.
func confetti(c *ui.Context, start time.Time) {
	const pieces = 60
	if c.Now().Sub(start) > 4*time.Second {
		return
	}
	random := func(i, salt int) float32 {
		x := math.Sin(float64(i)*12.9898+float64(salt)*78.233) * 43758.5453
		return float32(x - math.Floor(x))
	}
	ui.Box(c).Absolute().Top(0).Left(0).Fill().PassThrough().Draw(func(p *ui.Painter, r ui.Rect) {
		t := float32(p.Now().Sub(start).Seconds())
		alive := false
		for i := range pieces {
			delay := random(i, 3) * 0.5
			dur := 2.2 + random(i, 4)*1.6
			k := (t - delay) / dur
			if k < 0 || k > 1 {
				alive = alive || k < 0
				continue
			}
			alive = true
			size := 6 + random(i, 2)*6
			round := i%3 == 0
			h := size * 0.6
			if round {
				h = size
			}
			// Falls with ease-in, sways, fades out at the end.
			x := r.X + random(i, 1)*r.W + float32(math.Sin(float64(k)*6+float64(i)))*20
			y := r.Y - 20 + k*k*(r.H+40)
			col := confettiColors[i%len(confettiColors)].Alpha(min(1, (1-k)*3))
			radius := float32(2)
			if round {
				radius = size / 2
			}
			p.Fill(ui.Rect{X: x, Y: y, W: size, H: h}, col, radius)
		}
		if alive {
			p.AnimationFrame()
		}
	})
}

// leaderboardView shows the best players of the lesson.
func (a *App) leaderboardView(c *ui.Context, p *practice) {
	b := p.board
	pal := a.pal
	ui.Column(c).Gap(4).Children(func() {
		ui.Row(c).Gap(6).Padding(0, 0, 4, 0).Children(func() {
			ui.Icon(c, iconTrophy).FontSize(14).TextColor(pal.gradeS)
			ui.Text(c, a.t("leaderboard.title")).FontSize(13).FontWeight(600)
		})
		row := func(rank int, player, cpm, wpm string, me bool) {
			r := ui.Row(c).Padding(5, 8).Gap(10).Radius(7)
			if me {
				r.Background(pal.primary.Alpha(0.1))
			}
			r.Children(func() {
				header := rank < 0
				text := func(s string) ui.Element {
					t := ui.Text(c, s).FontSize(12).FontFeatures("tnum").SingleLine()
					switch {
					case header:
						t.TextColor(pal.mutedForeground)
					case me:
						t.FontWeight(600)
					}
					return t
				}
				switch {
				case header:
					text(a.t("leaderboard.rank")).Width(36)
				case rank <= 3:
					medal := [3]ui.Color{pal.gradeS, pal.gradeC, ui.Hex("#b4691f")}[rank-1]
					ui.Row(c).Width(36).Children(func() {
						ui.Box(c).Size(18, 18).Radius(9).Background(medal.Alpha(0.18)).Center().Children(func() {
							ui.Text(c, strconv.Itoa(rank)).FontSize(11).Bold().TextColor(medal)
						})
					})
				default:
					text(strconv.Itoa(rank)).Width(36).TextColor(pal.mutedForeground)
				}
				text(player).Grow(1)
				text(cpm).Width(44).TextAlign(ui.End)
				text(wpm).Width(44).TextAlign(ui.End)
			})
		}
		row(-1, a.t("leaderboard.player"), "CPM", "WPM", false)
		entry := func(e data.LeaderboardEntry) {
			name := a.t("leaderboard.anonymous")
			if e.Nickname != nil && *e.Nickname != "" {
				name = *e.Nickname
			}
			if e.IsCurrentUser {
				name += fmt.Sprintf(" (%s)", a.t("leaderboard.you"))
			}
			row(e.Rank, name, strconv.Itoa(e.BestCPM), strconv.Itoa(e.BestWPM), e.IsCurrentUser)
		}
		for _, e := range b.top {
			entry(e)
		}
		if b.me != nil {
			ui.Text(c, "···").TextColor(pal.mutedForeground).TextAlign(ui.Center).FillWidth()
			entry(*b.me)
		}
	})
}
