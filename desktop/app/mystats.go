package app

import (
	"context"
	"log"
	"slices"
	"strconv"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// stats are the latest runs of a user, which the statistics' window
// shows.
type stats struct {
	// shown is set once the window opened: the runs then follow the user's
	// sign-ins and runs.
	shown  bool
	user   string // whose runs they are
	loaded bool
	logs   []data.PracticeLog
}

// openStats opens the window of the user's statistics, loading their
// latest runs.
func (a *App) openStats() {
	a.stats.shown = true
	a.loadStats()
	if a.openWindow != nil {
		a.openWindow(WindowSpec{
			Key:       "stats",
			Title:     func() string { return a.t("auth.stats_title") },
			Width:     760,
			Height:    620,
			Resizable: true,
			View:      a.statsView,
		})
	}
}

// loadStats loads the signed-in user's latest runs, keeping those shown
// meanwhile when they are the same user's.
func (a *App) loadStats() {
	user := a.userID()
	if a.stats.user != user {
		a.stats = stats{shown: a.stats.shown, user: user}
	}
	if user == "" {
		return
	}
	a.run(func(ctx context.Context) func() {
		logs, err := a.store.RecentLogs(ctx, user, "", 20)
		if err != nil {
			log.Printf("load recent runs: %v", err)
		}
		return func() {
			if a.stats.user == user {
				a.stats.loaded, a.stats.logs = true, logs
			}
		}
	})
}

// refreshStats loads the runs again for the statistics' window, once it
// opened, as a sign-in or a run changes them.
func (a *App) refreshStats() {
	if a.stats.shown {
		a.loadStats()
	}
}

// statsView builds the window of the user's statistics, as the web's
// PersonalStatsDialog: the progress of their speed, and their latest runs.
func (a *App) statsView(c *ui.Context) {
	a.applyTheme(c)
	pal, st := a.pal, a.stats
	ui.Scroll(c).Fill().Background(pal.background).Children(func() {
		ui.Column(c).FillWidth().Padding(16, 24, 24, 24).Gap(12).Children(func() {
			placeholder := func(content func()) {
				ui.Column(c).FillWidth().Height(240).Center().Children(content)
			}
			message := func(s string) {
				placeholder(func() { ui.Text(c, s).TextColor(pal.mutedForeground) })
			}
			switch {
			case a.userID() == "":
				message(a.t("auth.login_prompt"))
				return
			case !st.loaded:
				placeholder(func() { ui.Spinner(c) })
				return
			case len(st.logs) == 0:
				message(a.t("auth.no_records"))
				return
			}

			if len(st.logs) >= 3 {
				ui.Text(c, a.t("auth.progress_chart")).FontSize(13).FontWeight(600)
				runs := slices.Clone(st.logs)
				slices.Reverse(runs) // oldest first
				ui.Column(c).FillWidth().Padding(16).Radius(14).Background(pal.muted).Children(func() {
					a.cpmChart(c, runs, 220)
				})
				ui.Box(c).Height(8)
			}
			ui.Text(c, a.t("auth.recent_results")).FontSize(13).FontWeight(600)
			a.runsTable(c, st.logs)
		})
	})
}

// runsTable lists runs, newest first, a row each.
func (a *App) runsTable(c *ui.Context, logs []data.PracticeLog) {
	pal := a.pal
	ui.Column(c).FillWidth().Radius(10).Border(1, pal.border).Clip().Children(func() {
		row := func(cells [6]string, header, stripe bool, grade ui.Color) {
			r := ui.Row(c).Padding(7, 12).Gap(12)
			switch {
			case header:
				r.BorderWidth(0, 0, 1, 0).BorderColor(pal.border)
			case stripe:
				r.Background(pal.muted)
			}
			r.Children(func() {
				for i, cell := range cells {
					t := ui.Text(c, cell).FontSize(13).FontFeatures("tnum").SingleLine()
					switch {
					case header:
						t.FontSize(12).TextColor(pal.mutedForeground)
					case i == 4:
						t.Bold().TextColor(grade)
					case i == 5:
						t.TextColor(pal.mutedForeground)
					}
					switch i {
					case 0:
						t.Basis(0).Grow(1)
					case 4:
						t.Width(48).TextAlign(ui.Center)
					case 5:
						t.Width(110).TextAlign(ui.End)
					default:
						t.Width(72).TextAlign(ui.End)
					}
				}
			})
		}
		row([6]string{a.t("auth.lesson_name"), a.t("stats.char_speed"), a.t("stats.wpm_title"), a.t("stats.accuracy"),
			a.t("desktop.grade"), a.t("time")}, true, false, ui.Color{})
		for i, l := range logs {
			grade := string(engine.GradeOf(int(l.Accuracy+0.5), l.CPM))
			title := l.LessonTitle
			if title == "" {
				title = a.lessonTitle(l.LessonID)
			}
			row([6]string{title, strconv.Itoa(l.CPM), strconv.Itoa(l.WPM), data.FormatAccuracy(l.Accuracy) + "%", grade,
				formatWhen(l.CompletedAt)}, false, i%2 == 1, pal.gradeColor(grade))
		}
	})
}

// lessonTitle returns the title of a lesson the catalog has, else its ID.
func (a *App) lessonTitle(id string) string {
	for _, l := range a.catalog.lessons {
		if l.ID == id {
			return l.Title
		}
	}
	return id
}
