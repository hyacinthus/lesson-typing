package app

import (
	"github.com/egoist/mygo/ui"
)

const (
	textMaxWidth = 760
	pagePadding  = 24
)

// typingWidth is the width of the text in a window of width w.
func typingWidth(w float32) float32 {
	return max(320, min(textMaxWidth, w-2*pagePadding-2*textBleed))
}

// practicePage builds the practice of lesson id: the title bar, and the
// text to type in the middle of the window; the results come in a sheet.
func (a *App) practicePage(c *ui.Context, id string) {
	p := a.practiceFor(id)
	pal := a.pal
	w, h := c.Size()
	wide := w >= wideHeader
	title := ""
	if p.lesson != nil {
		title = p.lesson.Title
	}
	// Keyed, each lesson starts with its own state: the scroll, the caret.
	ui.Column(c).Key(id).Fill().Background(pal.background).Children(func() {
		var status func()
		if wide {
			status = func() { a.runStatus(c, p) }
		}
		a.titleBar(c, title, status, func() { a.practiceControls(c, p) })
		if !wide && p.session != nil {
			ui.Row(c).FillWidth().Justify(ui.Center).Padding(0, 0, 4, 0).Children(func() { a.runStatus(c, p) })
		}

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
				ui.PrimaryButton(c, a.t("change_article")).OnClick(a.startPractice)
			})
			return
		}

		// The text sits in the middle of the window, a little above.
		ui.Column(c).Grow(1).FillWidth().AlignItems(ui.Center).Justify(ui.Center).
			Padding(0, pagePadding, headerHeight, pagePadding).Children(func() {
			a.typingArea(c, p, typingWidth(w), h-3*headerHeight)
		})
	})

	res := p.result
	if res == nil {
		return
	}
	if !c.Preferences().ReduceMotion {
		confetti(c, res.completedAt)
	}
	if res.dismissed {
		a.resultKeys(c, p) // the window's, once the sheet closed
	} else {
		a.resultsSheet(c, p)
	}
}
