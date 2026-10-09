// Package app is the desktop app's interface, in native UI: the home page,
// the practice of a lesson and its results, and the account's dialogs.
package app

import (
	"context"
	"net/url"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
	"github.com/hyacinthus/lesson-typing/desktop/internal/prefs"
)

// App is the state of the interface. The view reads and changes it on the
// main thread; goroutines change it through post.
type App struct {
	store *data.Store
	files *prefs.Store
	prefs prefs.Prefs
	// post runs fn on the main thread and redraws: Window.Update.
	post       func(fn func())
	setMenu    func(*mygo.Menu)
	showWindow func()

	router *ui.Router
	pal    *palette
	tr     i18n.Translator

	lang        i18n.Language
	catalog     *catalog
	practice    *practice
	account     account
	dialogs     dialogs
	pendingToks []toast
	// loopback is the server waiting for the browser's return from a
	// Google sign-in, nil when none waits.
	loopback *loopback
}

// Options are what the app is made with.
type Options struct {
	Store *data.Store
	Files *prefs.Store
	// Post runs fn on the main thread and redraws, as Window.Update.
	Post func(fn func())
	// Locale is the system's language, as "zh-CN".
	Locale string
	// SetMenu sets the application menu, in the language of the interface
	// as it changes.
	SetMenu func(*mygo.Menu)
	// ShowWindow brings the window to the front, on the main thread, as a
	// sign-in completes in the browser.
	ShowWindow func()
}

// New returns the app, its session restored from files.
func New(o Options) *App {
	a := &App{
		store:      o.Store,
		files:      o.Files,
		post:       o.Post,
		setMenu:    o.SetMenu,
		showWindow: o.ShowWindow,
		router:     ui.NewRouter("/"),
		pal:        &lightPalette,
	}
	if o.Files != nil {
		a.prefs = o.Files.Load()
	}
	a.setLanguage(a.initialLanguage(o.Locale))
	a.watchAuth()
	return a
}

// initialLanguage is the language chosen last, else the system's (locale),
// else English, as the web's root redirect picks it.
func (a *App) initialLanguage(locale string) i18n.Language {
	for _, code := range []string{a.prefs.Language, locale} {
		if l, ok := i18n.Find(code); ok {
			return l
		}
	}
	l, _ := i18n.Find(i18n.Fallback)
	return l
}

// setLanguage switches the interface and the lessons to l.
func (a *App) setLanguage(l i18n.Language) {
	if a.lang == l && a.catalog != nil {
		return
	}
	a.lang = l
	a.tr = i18n.For(l.Code)
	if a.prefs.Language != l.Code {
		a.prefs.Language = l.Code
		a.savePrefs()
	}
	a.catalog = a.loadCatalog(l)
	if a.setMenu != nil {
		a.setMenu(a.Menu())
	}
}

func (a *App) savePrefs() {
	if a.files != nil {
		_ = a.files.Save(a.prefs)
	}
}

// t returns the text of key in the interface's language.
func (a *App) t(key string) string { return a.tr.T(key) }

// run does work on a goroutine, with a timeout, and applies what it
// returns on the main thread.
func (a *App) run(work func(ctx context.Context) func()) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if apply := work(ctx); apply != nil {
			a.post(apply)
		}
	}()
}

// toast is a message waiting for the next frame, which shows it.
type toast struct {
	text string
	kind string // "", "error", "warning", "success"
}

func (a *App) toast(kind, text string) {
	a.pendingToks = append(a.pendingToks, toast{text: text, kind: kind})
}

// View builds the window's interface.
func (a *App) View(c *ui.Context) {
	dark := c.Theme().Dark
	switch a.prefs.Theme {
	case "light":
		dark = false
	case "dark":
		dark = true
	}
	a.pal = &lightPalette
	theme := lightTheme
	if dark {
		a.pal, theme = &darkPalette, darkTheme
	}
	c.SetTheme(theme)

	for _, tk := range a.pendingToks {
		c.AddToast(ui.Toast{Title: tk.text, Type: tk.kind})
	}
	a.pendingToks = nil

	a.router.View(c, func(r *ui.Route) {
		switch {
		case r.Match("/lesson/{id}"):
			a.practicePage(c, r.Param("id"))
		default:
			a.homePage(c)
		}
	})
	a.accountDialogs(c)
}

// modal reports whether something covers the page: a dialog, or a sign-in
// completing. The typing area leaves the focus to it, and the menu's
// commands wait.
func (a *App) modal() bool {
	return a.dialogs.open() || a.account.exchanging
}

// ThemeSource is the native appearance matching the app's theme.
func (a *App) ThemeSource() mygo.ThemeSource {
	switch a.prefs.Theme {
	case "light":
		return mygo.ThemeLight
	case "dark":
		return mygo.ThemeDark
	}
	return mygo.ThemeSystem
}

// toggleTheme switches between light and dark, as the web's toggle does.
func (a *App) toggleTheme() {
	if a.pal.dark {
		a.prefs.Theme = "light"
	} else {
		a.prefs.Theme = "dark"
	}
	a.savePrefs()
	mygo.Theme.SetSource(a.ThemeSource())
}

// OpenURL handles a deep link of the app's scheme, whose host and path
// are a page, as lessontyping://lesson/<id>: the callback of a sign-in
// (config.AuthCallbackURL), or a page of the router.
func (a *App) OpenURL(raw string) {
	u, err := url.Parse(raw)
	if err != nil || !strings.EqualFold(u.Scheme, config.URLScheme) {
		return
	}
	switch page := strings.TrimSuffix("/"+u.Host+u.Path, "/"); page {
	case "/auth/callback":
		a.completeSignIn(u)
	default:
		a.router.Push(page)
	}
}
