package app

import (
	"runtime"

	"github.com/egoist/mygo"

	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
)

// Menu returns the application's menu in the interface's language: the
// app's, Edit (which text inputs need for copy and paste), Practice,
// Window and Help. The app sets it again as the language changes.
//
// Check for Updates… follows About on macOS, as Sparkle puts it, and is
// in Help elsewhere, where there is no app menu.
func (a *App) Menu() *mygo.Menu {
	// The commands wait while something covers the page.
	do := func(fn func()) func(*mygo.MenuItem, *mygo.Window) {
		return func(*mygo.MenuItem, *mygo.Window) {
			a.post(func() {
				if !a.modal() {
					fn()
				}
			})
		}
	}
	appMenu := &mygo.MenuItem{Role: mygo.RoleAppMenu}
	help := &mygo.MenuItem{Label: a.t("menu.help"), Submenu: []*mygo.MenuItem{
		{Label: a.t("auth.feedback"), Click: func(*mygo.MenuItem, *mygo.Window) {
			go mygo.Shell.OpenExternal(config.IssuesURL)
		}},
	}}
	// Help's role adds the search field on macOS; MyGo leaves out the items
	// of macOS roles on other platforms, so it would hide the menu there.
	if runtime.GOOS == "darwin" {
		help.Role = mygo.RoleHelp
	}
	if a.checkForUpdates != nil {
		update := &mygo.MenuItem{Label: a.t("menu.check_for_updates"), Click: func(*mygo.MenuItem, *mygo.Window) {
			a.checkForUpdates()
		}}
		if runtime.GOOS == "darwin" {
			appMenu.Submenu = []*mygo.MenuItem{
				{Role: mygo.RoleAbout},
				update,
				mygo.Separator(),
				{Role: mygo.RoleServices},
				mygo.Separator(),
				{Role: mygo.RoleHide},
				{Role: mygo.RoleHideOthers},
				{Role: mygo.RoleUnhide},
				mygo.Separator(),
				{Role: mygo.RoleQuit},
			}
		} else {
			help.Submenu = append(help.Submenu, update)
		}
	}
	return mygo.NewMenu([]*mygo.MenuItem{
		appMenu,
		{Role: mygo.RoleEditMenu},
		{Label: a.t("menu.practice"), Submenu: []*mygo.MenuItem{
			{Label: a.t("start"), Accelerator: "CmdOrCtrl+Enter", Click: do(func() {
				if a.practice == nil || a.router.Path() == "/" {
					a.startPractice()
				}
			})},
			{Label: a.t("restart"), Accelerator: "CmdOrCtrl+R", Click: do(func() {
				if p := a.currentPractice(); p != nil {
					a.restart(p)
				}
			})},
			{Label: a.t("next_lesson"), Accelerator: "CmdOrCtrl+N", Click: do(func() {
				if p := a.currentPractice(); p != nil {
					a.nextLesson(p)
				}
			})},
			mygo.Separator(),
			{Label: a.t("back_home"), Accelerator: "CmdOrCtrl+[", Click: do(func() { a.router.Push("/") })},
		}},
		{Role: mygo.RoleWindowMenu},
		help,
	})
}

// currentPractice returns the practice the window shows, nil on the home
// page.
func (a *App) currentPractice() *practice {
	if a.router.Path() == "/" || a.practice == nil || a.practice.session == nil {
		return nil
	}
	return a.practice
}
