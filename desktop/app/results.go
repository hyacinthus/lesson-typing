package app

import (
	"math"
	"strconv"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// newRecordPulse is how long a new record pulses.
const newRecordPulse = 3 * time.Second

// resultsPanel shows a completed run: its grade and figures, the personal
// best, what to do next, the recent runs and the leaderboard.
func (a *App) resultsPanel(c *ui.Context, p *practice) {
	pal, res := a.pal, p.result
	st := res.stats
	grade := string(engine.GradeOf(st.Accuracy, st.CPM))
	gradeColor := pal.gradeColor(grade)
	signedIn := a.userID() != ""

	panel := ui.Column(c).Padding(32).Gap(20).AlignItems(ui.Center).Radius(10).
		Background(pal.results).TextColor(pal.foreground).Border(1, pal.border)
	panel.Transition(ui.ElementTransition{Enter: &ui.Motion{Y: 16}})
	if res.completedAt.After(time.Now().Add(-time.Second)) {
		panel.ScrollIntoView()
	}
	panel.Children(func() {
		ui.Box(c).Size(80, 80).Radius(40).Border(4, gradeColor).Background(pal.card.Alpha(0.6)).Center().Children(func() {
			ui.Text(c, grade).FontSize(36).FontWeight(900).TextColor(gradeColor)
		})
		ui.Row(c).Gap(10).Children(func() {
			ui.Text(c, a.t("results")).FontSize(28).Bold()
			if res.newRecord {
				nr := ui.Text(c, "("+a.t("new_record")+")").FontSize(22).TextColor(pal.primary)
				// It pulses a few times, then rests: a pulse runs the view on
				// every frame.
				if left := newRecordPulse - time.Since(res.completedAt); left > 0 {
					nr.Opacity(0.6 + 0.4*nr.Loop("pulse", time.Second, ui.Bounce(ui.EaseInOut)))
					c.After(left)
				}
			}
		})

		a.figureGrid(c, a.figures(st.WPM, st.CPM, strconv.Itoa(st.Accuracy), st.Duration),
			[4]ui.Color{pal.primary, pal.primary, gradeColor, pal.foreground}, 24)

		if b := p.best; b != nil {
			ui.Column(c).FillWidth().Padding(16).Gap(12).Radius(10).Background(pal.card.Alpha(0.5)).Border(1, pal.border).Children(func() {
				ui.Text(c, a.t("personal_best")).FontSize(14).Bold()
				a.figureGrid(c, a.figures(b.WPM, b.CPM, data.FormatAccuracy(b.Accuracy), b.Duration),
					[4]ui.Color{pal.foreground, pal.foreground, pal.foreground, pal.foreground}, 18)
			})
		}

		if !signedIn {
			ui.Text(c, a.t("auth.login_prompt")).FontSize(14).TextColor(pal.mutedForeground)
		}

		ui.Row(c).Gap(14).Children(func() {
			if !signedIn {
				ui.PrimaryButton(c, a.t("auth.login")).Padding(10, 28).Bold().OnClick(a.openLogin)
			}
			ui.Button(c, "").Label(a.t("restart")).Padding(10, 28).Children(func() {
				ui.Row(c).Gap(8).Children(func() {
					ui.Text(c, a.t("restart")).Bold()
					ui.Text(c, "R").FontSize(12).TextColor(pal.mutedForeground)
				})
			}).OnClick(func() { a.restart(p) })
			ui.PrimaryButton(c, "").Label(a.t("next_lesson")).Padding(10, 28).Children(func() {
				ui.Row(c).Gap(8).Children(func() {
					ui.Text(c, a.t("next_lesson")).Bold()
					ui.Icon(c, iconEnter).FontSize(14).Opacity(0.7)
				})
			}).OnClick(func() { a.nextLesson(p) })
		})

		if pts := chartPoints(res); len(pts) >= 3 {
			ui.Column(c).FillWidth().Gap(16).PaddingY(8).Children(func() {
				ui.Divider(c)
				ui.Text(c, a.t("recent_activity")).FontSize(18).Bold().FillWidth()
				a.cpmChart(c, pts, 240)
			})
		}
		ui.Column(c).FillWidth().Children(func() {
			ui.Divider(c)
			a.leaderboardView(c, p)
		})
	})

	if !c.Preferences().ReduceMotion {
		confetti(c, res.completedAt)
	}
}

// figures labels and formats the figures of a run: its WPM, CPM, accuracy
// (formatted) and time.
func (a *App) figures(wpm, cpm int, accuracy string, seconds int) [4][2]string {
	return [4][2]string{
		{a.t("stats.wpm_title"), strconv.Itoa(wpm) + " " + a.t("stats.wpm_unit")},
		{a.t("stats.char_speed"), strconv.Itoa(cpm) + " " + a.t("stats.char_unit")},
		{a.t("stats.accuracy"), accuracy + "%"},
		{a.t("time"), engine.FormatDuration(seconds)},
	}
}

// figureGrid shows figures side by side, their values size high.
func (a *App) figureGrid(c *ui.Context, figs [4][2]string, colors [4]ui.Color, size float32) {
	ui.Grid(c).Columns(4).Gap(16).FillWidth().Children(func() {
		for i, f := range figs {
			ui.Column(c).Gap(4).AlignItems(ui.Center).Children(func() {
				ui.Text(c, f[0]).FontSize(13).TextColor(a.pal.mutedForeground).SingleLine()
				ui.Text(c, f[1]).FontSize(size).Bold().TextColor(colors[i]).FontFeatures("tnum").TextAlign(ui.Center)
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
