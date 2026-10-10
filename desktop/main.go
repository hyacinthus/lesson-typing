// Lesson Typing for macOS, Windows and Linux, in native UI drawn by MyGo.
// From the repository root:
//
//	npm run desktop:dev    # build and run, rebuilt when the Go code changes
//	npm run desktop:build  # packaged apps in desktop/build/
package main

import (
	"log"
	"runtime"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/plugins/updater"
	"github.com/egoist/mygo/plugins/updater/native"
	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/app"
	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/prefs"
	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

// mainWin is the main window, nil while it is closed. Only touched on the
// main thread, where MyGo runs event listeners.
var mainWin *mygo.Window

func main() {
	// A deep link starts a new process on Windows and Linux: hand it to the
	// running instance, whose OnOpenURL receives it.
	if !mygo.App.RequestSingleInstanceLock() {
		return
	}

	dir, err := mygo.App.Path(mygo.PathUserData)
	if err != nil {
		log.Fatal(err)
	}
	files, err := prefs.Open(dir)
	if err != nil {
		log.Fatal(err)
	}
	if !config.Configured() {
		log.Print("no Supabase project: run `go generate ./internal/config` with the repository's .env")
	}
	store := data.New(supa.New(config.SupabaseURL, config.SupabaseAnonKey, files))

	// The update window speaks the language the app starts in, until the
	// next launch: the plugin chooses it once.
	locale := mygo.App.Locale()
	lang := app.InitialLanguage(files.Load().Language, locale)
	mygo.Use(native.New(updater.Options{Language: lang.Code, Icon: app.AppIcon}))

	var a *app.App
	post := func(fn func()) {
		if mainWin != nil {
			mainWin.Update(fn)
		} else {
			mygo.RunOnMain(fn)
		}
	}
	// Deep links may arrive before the app is ready, at launch on macOS.
	var pendingURLs []string
	mygo.App.OnOpenURL(func(rawURL string) {
		if a == nil {
			pendingURLs = append(pendingURLs, rawURL)
			return
		}
		a.OpenURL(rawURL)
		mygo.App.WhenReady(showMainWindow)
	})
	mygo.App.OnSecondInstance(func([]string, string) { mygo.App.WhenReady(showMainWindow) })

	mygo.App.WhenReady(func() {
		a = app.New(app.Options{
			Store:           store,
			Files:           files,
			Post:            post,
			Locale:          locale,
			SetMenu:         mygo.App.SetMenu,
			ShowWindow:      showMainWindow,
			CheckForUpdates: updater.CheckForUpdates,
		})
		mygo.Theme.SetSource(a.ThemeSource())
		content = ui.View(a.View)
		showMainWindow()
		for _, u := range pendingURLs {
			a.OpenURL(u)
		}
		pendingURLs = nil
		// Packaged apps declare the scheme at install time; this also covers
		// portable executables and dev builds.
		if !mygo.App.IsURLSchemeRegistered(config.URLScheme) {
			if err := mygo.App.RegisterURLScheme(config.URLScheme); err != nil {
				log.Printf("register %s:// scheme: %v", config.URLScheme, err)
			}
		}
	})

	// macOS apps stay in the Dock with no window and reopen one when clicked.
	mygo.App.OnWindowAllClosed(func() {
		if runtime.GOOS != "darwin" {
			mygo.App.Quit()
		}
	})
	mygo.App.OnActivate(func(hasVisibleWindows bool) {
		if !hasVisibleWindows {
			showMainWindow()
		}
	})

	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}

// content is the main window's interface, made once the app is ready.
var content *ui.Content

// showMainWindow brings the main window to the front, creating it when it
// was closed.
func showMainWindow() {
	if mainWin != nil {
		if mainWin.IsMinimized() {
			mainWin.Restore()
		}
		mainWin.Show()
		mainWin.Focus()
		return
	}
	mainWin = mygo.NewWindow(mygo.WindowOptions{
		Width:     1200,
		Height:    840,
		MinWidth:  760,
		MinHeight: 600,
		StateKey:  "main",
		// The header the view draws holds the window's controls.
		TitleBarStyle:        mygo.TitleBarHidden,
		TitleBarHeight:       app.HeaderHeight,
		TrafficLightPosition: &mygo.Point{X: 20, Y: (app.HeaderHeight - 14) / 2},
		// On Linux and Windows the menu shows from Alt, under the header.
		AutoHideMenuBar: true,
		Content:         content,
	})
	mainWin.OnClosed(func() { mainWin = nil })
}
