package app

import (
	"fmt"
	"strconv"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

const (
	// HeaderHeight is the height of the title bar the view draws, which holds
	// the window controls.
	HeaderHeight = 56
	headerHeight = HeaderHeight
	contentWidth = 896 // the web's max-w-4xl
	pagePadding  = 24
)

// contentColumnWidth is the width of the page's content in a window of
// width w.
func contentColumnWidth(w float32) float32 {
	return max(320, min(contentWidth, w-2*pagePadding))
}

// practicePage builds the practice of lesson id.
func (a *App) practicePage(c *ui.Context, id string) {
	p := a.practiceFor(id)
	pal := a.pal
	ui.Column(c).Fill().Background(pal.background).Children(func() {
		a.titleBar(c, func() {
			ui.Button(c, "").Label(a.t("back_home")).Children(func() {
				ui.Row(c).Gap(6).Children(func() {
					ui.Icon(c, iconArrowLeft).FontSize(18)
					ui.Text(c, a.t("back_home"))
				})
			}).OnClick(func() { a.router.Push("/") })
		}, func() {
			title := ""
			if p.lesson != nil {
				title = p.lesson.Title
			}
			ui.Text(c, title).FontSize(18).Bold().SingleLine().TextColor(pal.headerText)
		}, func() {
			if p.session != nil && !p.session.Started() {
				ui.Button(c, "").Label(a.t("change_article")).Children(func() {
					ui.Row(c).Gap(6).Children(func() {
						ui.Icon(c, iconShuffle).FontSize(16)
						ui.Text(c, a.t("change_article"))
					})
				}).OnClick(func() { a.nextLesson(p) })
			}
		})

		switch {
		case p.loading:
			ui.Column(c).Grow(1).Center().Children(func() {
				ui.Spinner(c)
			})
			return
		case p.lesson == nil:
			ui.Column(c).Grow(1).Center().Gap(16).Children(func() {
				msg := a.t("lesson_not_found")
				if p.failed {
					msg = a.t("desktop.load_failed")
				}
				ui.Text(c, msg).TextColor(pal.destructive)
				ui.PrimaryButton(c, a.t("back_home")).OnClick(func() { a.router.Push("/") })
			})
			return
		}

		w, h := c.Size()
		width := contentColumnWidth(w)
		ui.Scroll(c).Grow(1).Children(func() {
			ui.Column(c).Width(width).Margin(pagePadding, ui.Auto).Gap(24).Children(func() {
				a.statsPanel(c, p)
				// The card fills the window below the stats.
				a.typingCard(c, p, width, h-headerHeight-pagePadding*2-120)
				if p.result != nil {
					a.resultsPanel(c, p)
				} else {
					a.leaderboardView(c, p)
				}
			})
		})
	})

	if p.result != nil {
		if c.Shortcut(0, ui.KeyEnter) {
			a.nextLesson(p)
		}
		if c.Shortcut(0, ui.KeyR) {
			a.restart(p)
		}
	}
}

// statsPanel shows the run's figures as it goes.
func (a *App) statsPanel(c *ui.Context, p *practice) {
	pal, s := a.pal, p.session
	now := time.Now()
	st := s.Stats()
	secs := s.Seconds(now)
	if s.Started() && !s.Done {
		// Tick with the clock.
		c.After(time.Second - now.Sub(s.Start)%time.Second)
	}
	started := st.Correct+st.Incorrect > 0 || secs > 0
	grade := string(engine.GradeOf(st.Accuracy, st.CPM))
	accColor, accText, gradeText := pal.mutedForeground, "—", " "
	if started {
		accColor = pal.gradeColor(grade)
		accText = strconv.Itoa(st.Accuracy) + "%"
		gradeText = a.t("stats.grade") + " " + grade
	}

	ui.Grid(c).Columns(4).Gap(16).Children(func() {
		a.statCard(c, a.t("stats.duration"), engine.FormatDuration(secs), "", pal.foreground)
		a.statCard(c, a.t("stats.char_speed"), strconv.Itoa(st.CPM), a.t("stats.char_unit"), pal.primary)
		a.statCard(c, a.t("stats.wpm_title"), strconv.Itoa(st.WPM), a.t("stats.wpm_unit"), pal.primary)
		a.statCard(c, a.t("stats.accuracy"), accText, gradeText, accColor)
	})
}

func (a *App) statCard(c *ui.Context, label, value, unit string, color ui.Color) {
	pal := a.pal
	ui.Column(c).Padding(16).Gap(4).Radius(10).Background(pal.card).Border(1, pal.border).Children(func() {
		ui.Text(c, label).FontSize(14).TextColor(pal.mutedForeground).SingleLine()
		ui.Text(c, value).FontSize(24).Bold().TextColor(color).FontFeatures("tnum")
		if unit != "" {
			ui.Text(c, unit).FontSize(12).TextColor(color.Mix(pal.mutedForeground, 0.5)).SingleLine()
		}
	})
}

// leaderboardView shows the best players of the lesson.
func (a *App) leaderboardView(c *ui.Context, p *practice) {
	b := p.board
	if !b.loaded || len(b.top) == 0 {
		return
	}
	pal := a.pal
	ui.Column(c).Gap(8).PaddingY(8).Children(func() {
		ui.Row(c).Gap(8).Children(func() {
			ui.Icon(c, iconTrophy).FontSize(18).TextColor(pal.gradeS)
			ui.Text(c, a.t("leaderboard.title")).FontSize(18).Bold()
		})
		row := func(rank, player, cpm, wpm string, header, me bool) {
			r := ui.Row(c).PaddingY(6).PaddingX(12).Gap(12).Radius(6)
			if me {
				r.Background(pal.primary.Alpha(0.08))
			}
			r.Children(func() {
				style := func(e ui.Element) ui.Element {
					if header {
						return e.FontSize(12).TextColor(pal.mutedForeground)
					}
					return e.FontSize(14)
				}
				style(ui.Text(c, rank)).Width(56)
				style(ui.Text(c, player)).Grow(1).SingleLine()
				style(ui.Text(c, cpm)).Width(72).FontFeatures("tnum")
				style(ui.Text(c, wpm)).Width(72).FontFeatures("tnum")
			})
		}
		row(a.t("leaderboard.rank"), a.t("leaderboard.player"), "CPM", "WPM", true, false)
		ui.Divider(c)
		entry := func(e data.LeaderboardEntry) {
			rank := strconv.Itoa(e.Rank)
			if e.Rank <= 3 {
				rank = []string{"🥇", "🥈", "🥉"}[e.Rank-1]
			}
			name := a.t("leaderboard.anonymous")
			if e.Nickname != nil && *e.Nickname != "" {
				name = *e.Nickname
			}
			if e.IsCurrentUser {
				name += fmt.Sprintf(" (%s)", a.t("leaderboard.you"))
			}
			row(rank, name, strconv.Itoa(e.BestCPM), strconv.Itoa(e.BestWPM), false, e.IsCurrentUser)
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
