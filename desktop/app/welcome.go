package app

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

const (
	demoInterval     = 160 * time.Millisecond
	demoRestartDelay = 2400 * time.Millisecond
)

// startPage is "/", which the window shows until a lesson opens: while the
// lessons load, when they fail to, and at the first launch, under the sheet
// that asks which collection to start with.
func (a *App) startPage(c *ui.Context) {
	pal, cat := a.pal, a.catalog
	ui.Column(c).Fill().Background(pal.background).Children(func() {
		a.titleBar(c, "Lesson Typing", nil, func() { a.accountButton(c) })
		ui.Column(c).Grow(1).Center().Gap(12).Padding(0, 24, headerHeight, 24).Children(func() {
			switch {
			case cat.err != nil:
				msg := a.t("desktop.load_failed")
				notConfigured := errors.Is(cat.err, supa.ErrNotConfigured)
				if notConfigured {
					msg = a.t("desktop.not_configured")
				}
				ui.Text(c, msg).TextColor(pal.destructive).TextAlign(ui.Center)
				if !notConfigured {
					ui.Button(c, a.t("desktop.retry")).OnClick(a.retryCatalog)
				}
			case cat.loading:
				ui.Spinner(c)
			case a.prefs.Collection != "":
				ui.Text(c, a.t("lesson_not_found")).TextColor(pal.mutedForeground)
			}
		})
	})
	if !cat.loading && cat.err == nil && a.prefs.Collection == "" && len(cat.collections) > 0 {
		a.welcomeSheet(c)
	}
}

// welcomeSheet greets the first launch with what the app does, and asks
// which collection to start with; closed, it starts with the one chosen.
func (a *App) welcomeSheet(c *ui.Context) {
	pal := a.pal
	cols := a.catalog.collections
	a.welcomeChoice = findCollection(cols, a.welcomeChoice).ID
	open, start := true, false
	a.dialogPanel(c, &open, 600, func() {
		ui.Column(c).FillWidth().AlignItems(ui.Center).Gap(14).Padding(8, 0, 0, 0).Children(func() {
			ui.Image(c, logoSVG).Size(60, 60)
			ui.Text(c, a.t("hero_subtitle")).FontSize(22).Bold().TextAlign(ui.Center)
			a.typingDemo(c)
		})
		ui.Text(c, a.t("desktop.welcome_question")).FontSize(13).FontWeight(600).Padding(8, 0, 0, 0)
		ui.RadioGroup(c, func() {
			ui.Grid(c).Columns(4).Gap(8).FillWidth().Children(func() {
				for _, col := range cols {
					a.collectionTile(c, col)
				}
			})
		}).FillWidth().Label(a.t("desktop.welcome_question"))
		ui.Text(c, a.t("desktop.welcome_hint")).FontSize(12).TextColor(pal.mutedForeground)
		ui.Row(c).FillWidth().Justify(ui.End).Padding(4, 0, 0, 0).Children(func() {
			// A tile leaves Enter to the sheet's shortcut.
			start = a.enterButton(c, a.t("start")).Clicked() || c.Shortcut(0, ui.KeyEnter)
		})
	})
	if start || !open {
		a.chooseCollection(a.welcomeChoice)
	}
}

// enterButton is the default button of a sheet, which Enter presses: a
// primary capsule showing the Enter key.
func (a *App) enterButton(c *ui.Context, label string) ui.Element {
	return ui.PrimaryButton(c, "").Label(label).AutoFocus().Padding(7, 18).Radius(16).Gap(8).Children(func() {
		ui.Text(c, label).FontWeight(600)
		ui.Icon(c, iconEnter).FontSize(14).Opacity(0.8)
	})
}

// collectionTile chooses a collection in the welcome sheet.
func (a *App) collectionTile(c *ui.Context, col data.Collection) {
	pal := a.pal
	tile := ui.RadioBase(c, &a.welcomeChoice, col.ID).Label(col.Name).Padding(12).Radius(12).MinHeight(76).
		Background(pal.card).Border(1, pal.border)
	if col.ID == a.welcomeChoice {
		tile.Border(2, pal.primary).Background(pal.primary.Alpha(0.06))
	}
	count := strings.ReplaceAll(a.t("desktop.lesson_count"), "{{count}}", strconv.Itoa(a.lessonCount(col.ID)))
	tile.Children(func() {
		ui.Column(c).FillWidth().Gap(8).AlignItems(ui.Start).Children(func() {
			a.collectionIcon(c, col.ID, 20)
			ui.Column(c).Gap(1).Children(func() {
				ui.Text(c, col.Name).FontSize(13).FontWeight(600).SingleLine()
				ui.Text(c, count).FontSize(11).TextColor(pal.mutedForeground).SingleLine()
			})
		})
	})
}

// collectionIcon shows the icon of collection id, size wide: its grade's
// number, a feather for poems, a note for lyrics, else a book.
func (a *App) collectionIcon(c *ui.Context, id string, size float32) {
	pal := a.pal
	ic := iconBook
	switch {
	case strings.HasPrefix(id, "grade-"):
		ui.Box(c).Size(size, size).Radius(size/2).Border(1.5, pal.primary).Center().Children(func() {
			ui.Text(c, strings.TrimPrefix(id, "grade-")).FontSize(size * 0.55).Bold().TextColor(pal.primary)
		})
		return
	case strings.HasPrefix(id, "poetry-"):
		ic = iconFeather
	case strings.HasPrefix(id, "lyrics-"):
		ic = iconMusic
	}
	ui.Icon(c, ic).FontSize(size).TextColor(pal.primary)
}

// typingDemo types a sample line by itself, as the web's TypingDemo.
func (a *App) typingDemo(c *ui.Context) {
	pal := a.pal
	chars := []rune(a.t("hero_demo_text"))
	shown := len(chars)
	reduce := c.Preferences().ReduceMotion
	if !reduce {
		period := time.Duration(len(chars))*demoInterval + demoRestartDelay
		elapsed := time.Duration(c.Now().UnixNano()) % period
		shown = min(len(chars), int(elapsed/demoInterval))
		next := demoInterval - elapsed%demoInterval
		if shown == len(chars) {
			next = period - elapsed
		}
		c.After(next)
	}
	ui.Row(c).Padding(10, 22).Radius(12).Background(pal.muted).Children(func() {
		ui.Text(c, string(chars[:shown])).FontSize(19).LetterSpacing(1).TextColor(pal.charCorrect)
		if !reduce {
			ui.Box(c).Size(2, 22).Background(pal.primary)
		}
		ui.Text(c, string(chars[shown:])).FontSize(19).LetterSpacing(1).TextColor(pal.charPending)
	})
}
