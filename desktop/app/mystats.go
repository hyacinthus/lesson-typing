package app

import (
	"slices"
	"strconv"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// statsDialog shows the user's latest results and the progress of their
// speed, as the web's PersonalStatsDialog.
func (a *App) statsDialog(c *ui.Context) {
	d := &a.dialogs
	pal := a.pal
	a.dialogPanel(c, &d.stats, 680, func() {
		ui.Text(c, a.t("auth.stats_title")).FontSize(20).Bold()
		switch {
		case !d.statsLoaded:
			ui.Column(c).Height(160).Center().Children(func() { ui.Spinner(c) })
			return
		case len(d.statsLogs) == 0:
			ui.Column(c).Height(160).Center().Children(func() {
				ui.Text(c, a.t("auth.no_records")).TextColor(pal.mutedForeground)
			})
			return
		}

		ui.Text(c, a.t("auth.recent_results")).FontSize(14).Bold()
		ui.Column(c).Children(func() {
			row := func(cells [6]string, header bool, grade ui.Color) {
				ui.Row(c).PaddingY(8).Gap(12).BorderWidth(0, 0, 1, 0).BorderColor(pal.border).Children(func() {
					for i, cell := range cells {
						t := ui.Text(c, cell).FontSize(14).SingleLine()
						switch {
						case header:
							t.TextColor(pal.mutedForeground)
						case i == 4:
							t.Bold().TextColor(grade)
						}
						if i == 0 {
							t.Grow(1).Basis(0)
						} else {
							t.Width(84).TextAlign(ui.Center)
						}
						if i == 5 {
							t.TextAlign(ui.End)
						}
					}
				})
			}
			row([6]string{a.t("auth.lesson_name"), a.t("stats.char_speed"), a.t("stats.wpm_title"), a.t("stats.accuracy"), a.t("stats.grade"), a.t("time")}, true, ui.Color{})
			for _, l := range d.statsLogs[:min(3, len(d.statsLogs))] {
				grade := string(engine.GradeOf(int(l.Accuracy+0.5), l.CPM))
				title := l.LessonTitle
				if title == "" {
					title = a.lessonTitle(l.LessonID)
				}
				row([6]string{title, strconv.Itoa(l.CPM), strconv.Itoa(l.WPM), data.FormatAccuracy(l.Accuracy) + "%", grade, formatWhen(l.CompletedAt)}, false, pal.gradeColor(grade))
			}
		})

		if len(d.statsLogs) >= 3 {
			ui.Text(c, a.t("auth.progress_chart")).FontSize(14).Bold()
			runs := slices.Clone(d.statsLogs)
			slices.Reverse(runs) // oldest first
			a.cpmChart(c, runs, 220)
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
