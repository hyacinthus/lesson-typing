package app

import (
	"errors"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

const (
	demoInterval     = 160 * time.Millisecond
	demoRestartDelay = 2400 * time.Millisecond
)

// homePage builds the home page: the hero, the start button, and what the
// app does.
func (a *App) homePage(c *ui.Context) {
	pal := a.pal
	cat := a.catalog
	page := ui.Column(c).Fill().Background(pal.background)
	page.Children(func() {
		a.titleBar(c, func() {
			a.logo(c)
		}, func() {
			a.collectionSelect(c)
		}, func() {
			a.languageSelect(c)
			a.themeToggle(c)
			a.userMenu(c)
		})

		ui.Scroll(c).Grow(1).Children(func() {
			ui.Column(c).FillWidth().AlignItems(ui.Center).Padding(0, 24).Children(func() {
				_, h := c.Size()
				ui.Box(c).Height(max(48, h*0.16))
				ui.Text(c, a.t("hero_subtitle")).FontSize(44).FontWeight(500).LetterSpacing(1).TextAlign(ui.Center)
				ui.Box(c).Height(40)
				a.typingDemo(c)
				ui.Box(c).Height(56)

				switch {
				case cat.err != nil:
					msg := a.t("desktop.load_failed")
					notConfigured := errors.Is(cat.err, supa.ErrNotConfigured)
					if notConfigured {
						msg = a.t("desktop.not_configured")
					}
					ui.Column(c).AlignItems(ui.Center).Gap(12).Children(func() {
						ui.Text(c, msg).TextColor(pal.destructive)
						if !notConfigured {
							ui.Button(c, a.t("desktop.retry")).OnClick(a.retryCatalog)
						}
					})
				case cat.loading:
					ui.Text(c, a.t("loading")).FontSize(20).TextColor(pal.mutedForeground)
				default:
					ui.Column(c).AlignItems(ui.Center).Gap(14).Children(func() {
						start := ui.PrimaryButton(c, a.t("start")).FontSize(20).FontWeight(500).Padding(12, 40).Radius(10)
						if start.Clicked() {
							a.startPractice()
						}
						ui.Row(c).Gap(6).Children(func() {
							ui.Text(c, a.t("hint_enter_before")).FontSize(13).TextColor(pal.mutedForeground)
							ui.Row(c).Gap(4).Padding(2, 6).Radius(6).Background(pal.card).Border(1, pal.border).Children(func() {
								ui.Text(c, "Enter").FontSize(12)
								ui.Icon(c, iconEnter).FontSize(12)
							})
							ui.Text(c, a.t("hint_enter_after")).FontSize(13).TextColor(pal.mutedForeground)
						})
					})

				}

				ui.Box(c).Height(72)
				ui.Grid(c).Columns(3).Gap(24).MaxWidth(768).FillWidth().Children(func() {
					a.feature(c, iconBook, "seo.feature_curriculum")
					a.feature(c, iconChartLine, "seo.feature_tracking")
					a.feature(c, iconKeyboard, "seo.feature_languages")
				})
				ui.Box(c).Height(48)
			})
		})
	})
	// Enter starts, wherever the focus is on the page, before the focused
	// control: a select chooses with Enter only while its list is open.
	if !cat.loading && cat.err == nil && (page.Shortcut(0, ui.KeyEnter) || c.Shortcut(0, ui.KeyEnter)) {
		a.startPractice()
	}
}

func (a *App) feature(c *ui.Context, ic *ui.SVG, key string) {
	pal := a.pal
	ui.Column(c).AlignItems(ui.Center).Gap(8).Padding(16).Children(func() {
		ui.Icon(c, ic).FontSize(32).TextColor(pal.primary)
		ui.Text(c, a.t(key)).Bold().TextAlign(ui.Center)
		ui.Text(c, a.t(key+"_desc")).FontSize(13).TextColor(pal.mutedForeground).TextAlign(ui.Center)
	})
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
	ui.Row(c).Children(func() {
		ui.Text(c, string(chars[:shown])).FontSize(24).LetterSpacing(1).TextColor(pal.charCorrect)
		if !reduce {
			ui.Box(c).Size(2, 28).Background(pal.primary)
		}
		ui.Text(c, string(chars[shown:])).FontSize(24).LetterSpacing(1).TextColor(pal.charPending)
	})
}
