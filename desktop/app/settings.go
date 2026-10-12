package app

import (
	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
)

// The settings' panes.
const (
	paneGeneral = iota
	paneAccount
)

// openSettings opens the settings' window.
func (a *App) openSettings() {
	if a.openWindow == nil {
		return
	}
	a.openWindow(WindowSpec{Key: "settings", Title: a.settingsTitle, Width: 560, Height: 400, View: a.settingsView})
}

// settingsTitle names the settings' window after its pane, as macOS's
// settings windows are.
func (a *App) settingsTitle() string {
	if a.settingsPane == paneAccount {
		return a.t("settings.account")
	}
	return a.t("settings.general")
}

// settingsView builds the settings' window: the general settings, which
// are the language, the appearance and the updates, and the account.
func (a *App) settingsView(c *ui.Context) {
	a.applyTheme(c)
	pal := a.pal
	ui.Column(c).Fill().Background(pal.background).Children(func() {
		// The panes' buttons, as in the toolbar of macOS's settings windows.
		tabs := ui.TabsBase(c, &a.settingsPane, 2)
		tabs.List.FillWidth().Justify(ui.Center).Gap(4).Padding(8, 0).BorderWidth(0, 0, 1, 0).BorderColor(pal.border).Children(func() {
			for i, pane := range []struct {
				icon  *ui.SVG
				label string
			}{{iconSettings, a.t("settings.general")}, {iconUser, a.t("settings.account")}} {
				chosen := i == a.settingsPane
				tab := tabs.Tab(i).Size(76, 52).Shrink(0).Center().Radius(9).Label(pane.label)
				iconColor := pal.mutedForeground
				if chosen {
					tab.Background(pal.foreground.Alpha(0.07))
					iconColor = pal.primary
				}
				tab.Children(func() {
					ui.Column(c).Gap(3).AlignItems(ui.Center).Children(func() {
						ui.Icon(c, pane.icon).FontSize(22).TextColor(iconColor)
						ui.Text(c, pane.label).FontSize(11)
					})
				})
			}
		})
		if tabs.List.Changed() {
			a.changed() // the window's title
		}
		ui.Column(c).Grow(1).FillWidth().Padding(24, 32).Children(func() {
			if a.settingsPane == paneAccount {
				a.accountSettings(c)
			} else {
				a.generalSettings(c)
			}
		})
	})
}

// settingRow lays a setting out as macOS's settings do: its label on the
// left, aligned to the right and to the top of its controls, which go on
// the right, with a hint under them. ui.Form would align the label with
// the controls' first text, under the appearance's pictures.
func (a *App) settingRow(c *ui.Context, label, hint string, controls func()) {
	ui.Row(c).FillWidth().Gap(14).AlignItems(ui.Start).Children(func() {
		ui.Text(c, label).Width(160).TextAlign(ui.End).PaddingY(4)
		ui.Column(c).Basis(0).Grow(1).Gap(6).AlignItems(ui.Start).Children(func() {
			controls()
			if hint != "" {
				ui.Text(c, hint).FontSize(11).TextColor(a.pal.mutedForeground)
			}
		})
	})
}

func (a *App) generalSettings(c *ui.Context) {
	ui.Column(c).FillWidth().Gap(22).Children(func() {
		a.settingRow(c, a.t("language"), a.t("settings.language_hint"), func() {
			ui.MenuButton(c, a.lang.Label, func(m *ui.Menu) {
				for _, l := range i18n.Languages {
					if m.Item(l.Label).Checked(l == a.lang).Chosen() {
						a.setLanguage(l)
						a.changed()
					}
				}
			}).MinWidth(150).Label(a.t("language"))
		})

		a.settingRow(c, a.t("settings.appearance"), "", func() {
			theme := a.prefs.Theme
			ui.RadioGroup(c, func() {
				for _, o := range [][2]string{
					{"", a.t("settings.appearance_auto")},
					{"light", a.t("settings.appearance_light")},
					{"dark", a.t("settings.appearance_dark")},
				} {
					a.appearanceOption(c, &theme, o[0], o[1]).OnChange(func() { a.setTheme(theme) })
				}
			}).Row().Gap(14).Label(a.t("settings.appearance"))
		})

		if a.checkForUpdates != nil {
			hint := a.t("settings.updates_hint")
			if a.version != "" {
				hint = "Lesson Typing " + a.version + " · " + hint
			}
			a.settingRow(c, a.t("settings.updates"), hint, func() {
				if ui.Button(c, a.t("menu.check_for_updates")).Clicked() {
					a.checkForUpdates()
				}
			})
		}
	})
}

// appearanceOption chooses an appearance into *theme, "" to follow the
// system, shown as a little window in its colors.
func (a *App) appearanceOption(c *ui.Context, theme *string, value, label string) ui.Element {
	pal := a.pal
	chosen := *theme == value
	return ui.RadioBase(c, theme, value).Label(label).Children(func() {
		ui.Column(c).Gap(6).AlignItems(ui.Center).Children(func() {
			thumb := ui.Row(c).Size(68, 46).Radius(8).Clip().Border(1, pal.border).Shadow(0, 1, 3, 0, ui.RGBA(0, 0, 0, 0.12))
			if chosen {
				thumb.Border(3, pal.primary)
			}
			thumb.Children(func() {
				half := func(dark bool, w float32) {
					bg, bar := lightPalette.background, ui.RGBA(0, 0, 0, 0.2)
					if dark {
						bg, bar = darkPalette.card, ui.RGBA(255, 255, 255, 0.3)
					}
					ui.Column(c).Width(w).Height(46).Background(bg).Padding(8).Gap(5).Children(func() {
						ui.Box(c).Size(min(30, w-12), 4).Radius(2).Background(lightPalette.primary)
						ui.Box(c).Size(min(40, w-12), 4).Radius(2).Background(bar)
					})
				}
				switch value {
				case "light":
					half(false, 68)
				case "dark":
					half(true, 68)
				default:
					half(false, 34)
					half(true, 34)
				}
			})
			t := ui.Text(c, label).FontSize(11)
			if chosen {
				t.FontWeight(600)
			}
		})
	})
}

func (a *App) accountSettings(c *ui.Context) {
	pal := a.pal
	if !a.store.Client().Configured() {
		ui.Text(c, a.t("desktop.not_configured")).TextColor(pal.mutedForeground)
		return
	}
	// The account's dialogs open in the main window, which keeps them.
	inMainWindow := func(open func()) {
		open()
		if a.showWindow != nil {
			a.showWindow()
		}
		a.changed()
	}
	s := a.account.session
	if s == nil {
		ui.Column(c).FillWidth().Gap(14).AlignItems(ui.Center).PaddingY(32).Children(func() {
			ui.Text(c, a.t("auth.login_prompt")).TextColor(pal.mutedForeground)
			if ui.PrimaryButton(c, a.t("auth.login")).Clicked() {
				inMainWindow(a.openLogin)
			}
		})
		return
	}
	ui.Column(c).FillWidth().Gap(22).Children(func() {
		ui.Row(c).FillWidth().Gap(16).Children(func() {
			a.avatarImage(c, 56)
			ui.Column(c).Gap(2).Children(func() {
				ui.Text(c, a.displayName()).FontSize(15).FontWeight(600)
				ui.Text(c, s.User.Email).FontSize(12).TextColor(pal.mutedForeground)
			})
		})
		ui.Row(c).Gap(10).Wrap().Children(func() {
			if ui.Button(c, a.t("auth.edit_profile")).Clicked() {
				inMainWindow(a.openProfile)
			}
			if ui.Button(c, a.t("auth.my_stats")).Clicked() {
				a.openStats()
			}
			if ui.Button(c, a.t("auth.logout")).Clicked() {
				a.signOut()
			}
		})
	})
}
