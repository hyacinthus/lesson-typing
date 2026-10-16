package app

import (
	"runtime"
	"strconv"

	"github.com/egoist/mygo"

	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
)

// Menu returns the application's menu in the interface's language: the
// app's, Edit (which text inputs need for copy and paste), Practice, which
// also chooses the collection, Window and Help. The app sets it again as
// the language, the collections or the one chosen change.
//
// On macOS, Check for Updates… follows About, as Sparkle puts it, and
// Settings… is in the app menu; elsewhere, where there is no app menu,
// they are in Help and in Practice.
func (a *App) Menu() *mygo.Menu {
	// The commands wait while a dialog of the account covers the window.
	do := func(fn func()) func(*mygo.MenuItem, *mygo.Window) {
		return func(*mygo.MenuItem, *mygo.Window) {
			a.post(func() {
				if !a.modal() {
					fn()
				}
			})
		}
	}
	settings := &mygo.MenuItem{Label: a.t("menu.settings"), Accelerator: "CmdOrCtrl+,", Click: func(*mygo.MenuItem, *mygo.Window) {
		a.post(a.openSettings)
	}}
	var update *mygo.MenuItem
	if a.checkForUpdates != nil {
		update = &mygo.MenuItem{Label: a.t("menu.check_for_updates"), Click: func(*mygo.MenuItem, *mygo.Window) {
			a.checkForUpdates()
		}}
	}

	appMenu := &mygo.MenuItem{Role: mygo.RoleAppMenu}
	help := &mygo.MenuItem{Label: a.t("menu.help"), Submenu: []*mygo.MenuItem{
		{Label: a.t("auth.feedback"), Click: func(*mygo.MenuItem, *mygo.Window) {
			go mygo.Shell.OpenExternal(config.IssuesURL)
		}},
	}}
	practice := &mygo.MenuItem{Label: a.t("menu.practice"), Submenu: []*mygo.MenuItem{
		{Label: a.t("restart"), Accelerator: "CmdOrCtrl+R", Click: do(func() {
			if p := a.currentPractice(); p != nil {
				a.restart(p)
			}
		})},
		{Label: a.t("change_article"), Accelerator: "CmdOrCtrl+N", Click: do(func() {
			if p := a.currentPractice(); p != nil {
				a.nextLesson(p)
			}
		})},
		// Not one of the commands: it changes nothing a dialog covers.
		{Label: a.t("show_keyboard"), Accelerator: "CmdOrCtrl+K", Type: mygo.MenuItemCheckbox, Checked: !a.prefs.HideKeyboard,
			Click: func(*mygo.MenuItem, *mygo.Window) { a.post(a.toggleKeyboard) }},
	}}
	if cols := a.catalog.collections; len(cols) > 0 {
		practice.Submenu = append(practice.Submenu, mygo.Separator())
		current := a.collection().ID
		for i, col := range cols {
			item := &mygo.MenuItem{Label: col.Name, Type: mygo.MenuItemRadio, Checked: col.ID == current, Click: do(func() {
				a.chooseCollection(col.ID)
			})}
			if i < len(digitKeys) {
				item.Accelerator = "CmdOrCtrl+" + strconv.Itoa(i+1)
			}
			practice.Submenu = append(practice.Submenu, item)
		}
	}

	if runtime.GOOS == "darwin" {
		// Help's role adds the search field on macOS; MyGo leaves out the
		// items of macOS roles on other platforms, so it would hide the menu
		// there.
		help.Role = mygo.RoleHelp
		appMenu.Submenu = []*mygo.MenuItem{{Role: mygo.RoleAbout}}
		if update != nil {
			appMenu.Submenu = append(appMenu.Submenu, update)
		}
		appMenu.Submenu = append(appMenu.Submenu,
			mygo.Separator(),
			settings,
			mygo.Separator(),
			&mygo.MenuItem{Role: mygo.RoleServices},
			mygo.Separator(),
			&mygo.MenuItem{Role: mygo.RoleHide},
			&mygo.MenuItem{Role: mygo.RoleHideOthers},
			&mygo.MenuItem{Role: mygo.RoleUnhide},
			mygo.Separator(),
			&mygo.MenuItem{Role: mygo.RoleQuit},
		)
	} else {
		practice.Submenu = append(practice.Submenu, mygo.Separator(), settings)
		if update != nil {
			help.Submenu = append(help.Submenu, update)
		}
	}
	return mygo.NewMenu([]*mygo.MenuItem{
		appMenu,
		{Role: mygo.RoleEditMenu},
		practice,
		{Role: mygo.RoleWindowMenu},
		help,
	})
}

// currentPractice returns the practice the window shows, nil while it
// shows none or loads it.
func (a *App) currentPractice() *practice {
	if p := a.practice; p != nil && p.id == a.lessonID && p.session != nil {
		return p
	}
	return nil
}
