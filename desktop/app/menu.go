package app

import (
	"github.com/egoist/mygo"

	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
)

// Menu returns the application's menu in the interface's language: the
// app's, Edit (which text inputs need for copy and paste), Practice,
// Window and Help. The app sets it again as the language changes.
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
	return mygo.NewMenu([]*mygo.MenuItem{
		{Role: mygo.RoleAppMenu},
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
		{Label: a.t("menu.help"), Role: mygo.RoleHelp, Submenu: []*mygo.MenuItem{
			{Label: a.t("auth.feedback"), Click: func(*mygo.MenuItem, *mygo.Window) {
				go mygo.Shell.OpenExternal(config.IssuesURL)
			}},
		}},
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
