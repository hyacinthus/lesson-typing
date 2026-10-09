package app

import (
	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
)

// titleBar builds the bar along the top of the window, under the window's
// controls, which drags the window: left, center and right parts.
func (a *App) titleBar(c *ui.Context, left, center, right func()) {
	pal := a.pal
	bar := c.TitleBar()
	ui.Row(c).Height(headerHeight).FillWidth().Padding(0, bar.Right+20, 0, bar.Left+20).
		Background(pal.header).TextColor(pal.headerText).
		Shadow(0, 1, 2, 0, ui.RGBA(0, 0, 0, 0.06)).DragWindow().Children(func() {
		ui.Row(c).Basis(0).Grow(1).Gap(12).Children(left)
		ui.Row(c).Justify(ui.Center).Shrink(1).Children(center)
		ui.Row(c).Basis(0).Grow(1).Gap(12).Justify(ui.End).Children(right)
	})
}

// pill styles a control of the title bar as the web's pills.
func (a *App) pill(e ui.Element) ui.Element {
	pal := a.pal
	return e.Height(36).PaddingX(14).Radius(999).Background(pal.card.Alpha(0.7)).Border(1, pal.border)
}

// logo shows the logo and the app's name.
func (a *App) logo(c *ui.Context) {
	ui.Row(c).Gap(10).Children(func() {
		ui.Image(c, logoSVG).Size(32, 32)
		ui.Text(c, "Lesson Typing").FontSize(18).Bold()
	})
}

// collectionSelect chooses the collection to practice.
func (a *App) collectionSelect(c *ui.Context) {
	cols := a.catalog.collections
	if len(cols) == 0 {
		a.pill(ui.Row(c)).Children(func() {
			ui.Text(c, a.t("loading")).TextColor(a.pal.mutedForeground)
		})
		return
	}
	current := a.collection()
	sel := ui.SelectBase(c.Key("collection-"+a.lang.Code), &current)
	a.pill(sel.Trigger).MinWidth(160).Gap(8).Children(func() {
		for _, col := range cols {
			if col.ID == current {
				ui.Text(c, col.Name).Grow(1).SingleLine()
			}
		}
		ui.Icon(c, iconChevronDown).FontSize(16).TextColor(a.pal.mutedForeground)
	})
	a.selectPopup(c, sel, func(item func(value string, label string)) {
		for _, col := range cols {
			item(col.ID, col.Name)
		}
	})
	if sel.Trigger.Changed() {
		a.setCollection(current)
	}
}

// languageSelect chooses the interface's and the lessons' language.
func (a *App) languageSelect(c *ui.Context) {
	code := a.lang.Code
	sel := ui.SelectBase(c.Key("language"), &code)
	a.pill(sel.Trigger).MinWidth(130).Gap(8).Children(func() {
		ui.Text(c, a.lang.Label).Grow(1)
		ui.Icon(c, iconChevronDown).FontSize(16).TextColor(a.pal.mutedForeground)
	})
	a.selectPopup(c, sel, func(item func(value string, label string)) {
		for _, l := range i18n.Languages {
			item(l.Code, l.Label)
		}
	})
	if sel.Trigger.Changed() {
		if l, ok := i18n.Find(code); ok {
			a.setLanguage(l)
		}
	}
}

// selectPopup builds the options of a select of strings.
func (a *App) selectPopup(c *ui.Context, sel ui.SelectParts[string], items func(item func(value, label string))) {
	pal := a.pal
	sel.Popup(func(panel ui.Element) {
		panel.Margin(6, 0, 0, 0).Padding(4).Radius(10).MinWidth(160).
			Background(pal.card).Border(1, pal.border).Shadow(0, 4, 16, 0, ui.RGBA(0, 0, 0, 0.12))
		items(func(value, label string) {
			it := sel.Item(value).Padding(7, 12).Radius(6)
			if it.Highlighted() {
				it.Background(pal.primary).TextColor(pal.primaryText)
			}
			it.Children(func() { ui.Text(c, label) })
		})
	})
}

// themeToggle switches between light and dark.
func (a *App) themeToggle(c *ui.Context) {
	ic := iconSun
	if a.pal.dark {
		ic = iconMoon
	}
	b := ui.Button(c, "").Label(a.t("theme_toggle")).Tooltip(a.t("theme_toggle"))
	a.pill(b).Size(36, 36).Padding(0).Center().Children(func() {
		ui.Icon(c, ic).FontSize(18)
	})
	if b.Clicked() {
		a.toggleTheme()
	}
}
