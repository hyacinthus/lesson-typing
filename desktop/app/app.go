// Package app is the desktop app's interface, in native UI: one window that
// opens on a lesson to type, its results, the account's dialogs, and the
// windows of the settings and of the user's statistics.
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
	post            func(fn func())
	setMenu         func(*mygo.Menu)
	showWindow      func()
	openWindow      func(WindowSpec)
	setThemeSource  func(mygo.ThemeSource)
	checkForUpdates func()
	version         string

	pal *palette
	tr  i18n.Translator

	// lessonID is the lesson the window shows, "" before one opens.
	lessonID string
	lang     i18n.Language
	catalog  *catalog
	practice *practice
	account  account
	dialogs  dialogs
	stats    stats
	// settingsPane is the pane the settings show: general, or account.
	settingsPane int
	// welcomeChoice is the collection the first launch's sheet chose.
	welcomeChoice string
	pendingToks   []toast
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
	// ShowWindow brings the main window to the front, on the main thread:
	// as a sign-in completes in the browser, or the settings open one of
	// its dialogs.
	ShowWindow func()
	// OpenWindow shows another window of the app's, or brings it to the
	// front when it is open.
	OpenWindow func(WindowSpec)
	// SetThemeSource sets the appearance of the app's windows.
	SetThemeSource func(mygo.ThemeSource)
	// CheckForUpdates checks for a new version as the user asked, from the
	// menu; nil leaves the menu item out.
	CheckForUpdates func()
	// Version is the app's, which the settings show.
	Version string
}

// WindowSpec is a window of the app's besides the main one.
type WindowSpec struct {
	// Key names the window: opening it again brings it to the front.
	Key string
	// Title is the window's title, read again as the interface changes.
	Title         func() string
	Width, Height float32
	Resizable     bool
	View          func(c *ui.Context)
}

// New returns the app, its session restored from files.
func New(o Options) *App {
	a := &App{
		store:           o.Store,
		files:           o.Files,
		post:            o.Post,
		setMenu:         o.SetMenu,
		showWindow:      o.ShowWindow,
		openWindow:      o.OpenWindow,
		setThemeSource:  o.SetThemeSource,
		checkForUpdates: o.CheckForUpdates,
		version:         o.Version,
		pal:             &lightPalette,
	}
	if o.Files != nil {
		a.prefs = o.Files.Load()
	}
	a.setLanguage(InitialLanguage(a.prefs.Language, o.Locale))
	a.watchAuth()
	return a
}

// InitialLanguage is the language the app starts in: the one chosen last
// (saved), else the system's (locale), else English, as the web's root
// redirect picks it.
func InitialLanguage(saved, locale string) i18n.Language {
	for _, code := range []string{saved, locale} {
		if l, ok := i18n.Find(code); ok {
			return l
		}
	}
	l, _ := i18n.Find(i18n.Fallback)
	return l
}

// setLanguage switches the interface and the lessons to l, opening a
// lesson of l once its lessons load.
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
	a.lessonID = "" // a lesson of l opens once its lessons load
	a.updateMenu()
}

// updateMenu sets the application menu again, as the language, the
// collections or the one chosen change.
func (a *App) updateMenu() {
	if a.setMenu != nil {
		a.setMenu(a.Menu())
	}
}

// changed redraws every window after a change made in one: the views of
// the others do not know of it.
func (a *App) changed() { a.post(func() {}) }

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

// applyTheme gives a window's view the colors of the appearance chosen.
func (a *App) applyTheme(c *ui.Context) {
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
}

// View builds the main window's interface.
func (a *App) View(c *ui.Context) {
	a.applyTheme(c)
	for _, tk := range a.pendingToks {
		c.AddToast(ui.Toast{Title: tk.text, Type: tk.kind})
	}
	a.pendingToks = nil

	if a.lessonID != "" {
		a.practicePage(c, a.lessonID)
	} else {
		a.startPage(c)
	}
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

// setTheme sets the appearance: "light", "dark", or "" to follow the
// system.
func (a *App) setTheme(theme string) {
	if a.prefs.Theme == theme {
		return
	}
	a.prefs.Theme = theme
	a.savePrefs()
	if a.setThemeSource != nil {
		a.setThemeSource(a.ThemeSource())
	}
	a.changed()
}

// toggleKeyboard shows or hides the keyboard in the corner of the
// practice.
func (a *App) toggleKeyboard() {
	a.prefs.HideKeyboard = !a.prefs.HideKeyboard
	a.savePrefs()
	a.updateMenu() // its check
	a.changed()
}

// OpenURL handles a deep link of the app's scheme, whose host and path
// are a page: the callback of a sign-in (config.AuthCallbackURL), or a
// lesson, as lessontyping://lesson/<id>.
func (a *App) OpenURL(raw string) {
	u, err := url.Parse(raw)
	if err != nil || !strings.EqualFold(u.Scheme, config.URLScheme) {
		return
	}
	page := strings.TrimSuffix("/"+u.Host+u.Path, "/")
	if page == "/auth/callback" {
		a.completeSignIn(u)
	} else if id, ok := strings.CutPrefix(page, "/lesson/"); ok && id != "" {
		a.lessonID = id
	}
}
