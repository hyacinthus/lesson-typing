package app

import (
	"encoding/json"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

const testLesson = "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。"

// testLessons are the fake Supabase's lessons, one in each collection.
var testLessons = []struct{ id, title, collection, content string }{
	{"jys", "静夜思", "grade-1", testLesson},
	{"cx", "春晓", "grade-2", "春眠不觉晓，处处闻啼鸟。"},
}

// backend is what the fake Supabase saw.
type backend struct {
	submitted chan map[string]any
}

// fakeSupabase serves a Chinese lesson in each of two collections, an
// empty leaderboard, and the account of Ada, whose password is "secret1".
func fakeSupabase(t *testing.T) (*httptest.Server, *backend) {
	t.Helper()
	be := &backend{submitted: make(chan map[string]any, 1)}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		q := r.URL.Query()
		authorized := r.Header.Get("Authorization") == "Bearer access-ada"
		var body any = []any{}
		switch r.URL.Path {
		case "/auth/v1/token":
			var creds map[string]string
			_ = json.NewDecoder(r.Body).Decode(&creds)
			if q.Get("grant_type") == "pkce" && creds["auth_code"] != "good-code" {
				w.WriteHeader(http.StatusNotFound)
				body = map[string]any{"error_code": "flow_state_not_found", "msg": "invalid flow state"}
				break
			}
			if q.Get("grant_type") == "password" && creds["password"] != "secret1" {
				w.WriteHeader(http.StatusBadRequest)
				body = map[string]any{"error_code": "invalid_credentials", "msg": "Invalid login credentials"}
				break
			}
			body = map[string]any{
				"access_token": "access-ada", "refresh_token": "refresh-ada", "expires_in": 3600,
				"user": map[string]any{"id": "user-ada", "email": "ada@example.com"},
			}
		case "/rest/v1/lt_profiles":
			if authorized {
				body = []any{map[string]any{"id": "user-ada", "nickname": "Ada"}}
			}
		case "/rest/v1/lt_practice_logs":
			if !authorized {
				t.Errorf("practice logs read anonymously")
			}
		case "/functions/v1/start-practice":
			if !authorized {
				t.Errorf("start-practice without the user's token")
			}
			body = map[string]string{"sessionId": "run-1"}
		case "/functions/v1/submit-practice":
			var sub map[string]any
			_ = json.NewDecoder(r.Body).Decode(&sub)
			be.submitted <- sub
			body = map[string]any{"success": true}
		case "/rest/v1/lt_lessons":
			var lessons []any
			for _, l := range testLessons {
				lesson := map[string]any{
					"id": l.id, "title": l.title, "collection_id": l.collection, "language": "chinese",
					"sort_order": 1, "character_count": len([]rune(l.content)),
				}
				switch q.Get("id") {
				case "":
				case "eq." + l.id:
					lesson["content"] = l.content
				default:
					continue
				}
				lessons = append(lessons, lesson)
			}
			body = lessons
		case "/rest/v1/lt_collections":
			body = []any{map[string]any{"id": "grade-1", "name": "小学一年级"}, map[string]any{"id": "grade-2", "name": "小学二年级"}}
		case "/rest/v1/rpc/lt_lesson_leaderboard":
		default:
			t.Errorf("unexpected request %s", r.URL)
		}
		_ = json.NewEncoder(w).Encode(body)
	}))
	t.Cleanup(srv.Close)
	return srv, be
}

// harness runs the app's view in a tester, applying the work its
// goroutines post as the window would.
type harness struct {
	t       *testing.T
	app     *App
	tt      *ui.Tester
	posted  chan func()
	backend *backend
	// windows are the other windows the app opened.
	windows []WindowSpec
}

func newHarness(t *testing.T) *harness {
	srv, be := fakeSupabase(t)
	h := &harness{t: t, posted: make(chan func(), 64), backend: be}
	h.app = New(Options{
		Store:      data.New(supa.New(srv.URL, "anon", nil)),
		Post:       func(fn func()) { h.posted <- fn },
		Locale:     "zh-CN",
		OpenWindow: func(w WindowSpec) { h.windows = append(h.windows, w) },
	})
	h.tt = ui.NewTester(h.app.View, 1200, 840)
	return h
}

// settle applies what goroutines posted until cond holds.
func (h *harness) settle(what string, cond func() bool) {
	h.t.Helper()
	deadline := time.After(5 * time.Second)
	for !cond() {
		select {
		case fn := <-h.posted:
			fn()
			h.tt.Frame()
		case <-deadline:
			h.t.Fatalf("timed out waiting for %s", what)
		}
	}
	h.tt.Frame()
}

// snapshot saves the main window's last frame to LT_SNAPSHOT_DIR, for a
// look at it.
func (h *harness) snapshot(name string) { h.snapshotOf(h.tt, name) }

// snapshotOf saves the last frame of tt to LT_SNAPSHOT_DIR.
func (h *harness) snapshotOf(tt *ui.Tester, name string) {
	dir := os.Getenv("LT_SNAPSHOT_DIR")
	if dir == "" {
		return
	}
	f, err := os.Create(filepath.Join(dir, name+".png"))
	if err != nil {
		h.t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, tt.Image()); err != nil {
		h.t.Fatal(err)
	}
}

// click clicks the element of label and draws a frame.
func (h *harness) click(label string) {
	h.t.Helper()
	if err := h.tt.Click(label); err != nil {
		h.t.Fatal(err)
	}
	h.tt.Frame()
}

// start opens the first lesson from the welcome sheet of the first
// launch, with Enter.
func (h *harness) start() *practice {
	h.t.Helper()
	h.settle("the catalog", func() bool { return !h.app.catalog.loading })
	if !h.tt.HasText(h.app.t("desktop.welcome_question")) {
		h.t.Fatalf("no welcome: %q", h.tt.Texts())
	}
	h.tt.Key(0, ui.KeyEnter)
	h.settle("the lesson", func() bool { return h.app.practice != nil && h.app.practice.session != nil })
	return h.app.practice
}

// window returns the view of the other window of key the app opened last.
func (h *harness) window(key string) *ui.Tester {
	h.t.Helper()
	for i := len(h.windows) - 1; i >= 0; i-- {
		if w := h.windows[i]; w.Key == key {
			tt := ui.NewTester(w.View, int(w.Width), int(w.Height))
			tt.Frame()
			return tt
		}
	}
	h.t.Fatalf("no %s window", key)
	return nil
}

// typeText types text a character at a time, Enter for a line break.
func (h *harness) typeText(text string) {
	for _, r := range text {
		if r == '\n' {
			h.tt.Key(0, ui.KeyEnter)
		} else {
			h.tt.Type(string(r))
		}
		time.Sleep(3 * time.Millisecond) // a human's keystrokes vary
	}
	h.tt.Frame()
}

// findMenuItem returns the menu of the application menu that holds the
// item of label, and the item's index in it.
func findMenuItem(a *App, label string) (*mygo.MenuItem, int) {
	for _, top := range a.Menu().Items() {
		for i, it := range top.Submenu {
			if it.Label == label {
				return top, i
			}
		}
	}
	return nil, -1
}

// menuItem returns the item of label in the application menu, nil when
// there is none.
func menuItem(a *App, label string) *mygo.MenuItem {
	if menu, i := findMenuItem(a, label); menu != nil {
		return menu.Submenu[i]
	}
	return nil
}

func (h *harness) practice() *practice {
	h.t.Helper()
	p := h.app.practice
	if p == nil || p.session == nil {
		h.t.Fatal("no lesson open")
	}
	return p
}

func TestPracticeWithAnInputMethod(t *testing.T) {
	h := newHarness(t)
	tt := h.tt
	h.settle("the catalog", func() bool { return !h.app.catalog.loading })
	if !tt.HasText("开始练习") || !tt.HasText("小学二年级") {
		t.Fatalf("welcome in Chinese: %q", tt.Texts())
	}
	h.snapshot("welcome")

	h.start()
	if !tt.HasText("静夜思") || !tt.HasText(h.app.t("desktop.timer_hint")) || h.app.prefs.Collection != "grade-1" {
		t.Fatalf("lesson page of %q: %q", h.app.prefs.Collection, tt.Texts())
	}
	h.snapshot("lesson")
	if _, ok := tt.TextCaret(); !ok {
		t.Fatal("the typing area takes no input method text")
	}
	p := h.practice()
	s := p.session

	// The first composition starts the clock; cancelling it rolls back.
	tt.Compose("chuang", 6)
	tt.Frame()
	if p.composing != "chuang" || !s.Started() {
		t.Fatalf("composing %q, started %v", p.composing, s.Started())
	}
	h.snapshot("composing")
	tt.Compose("", 0)
	tt.Frame()
	if s.Started() || p.composing != "" {
		t.Fatal("a cancelled first composition kept the clock")
	}

	// A composition commits.
	tt.Compose("chuangqian", 10)
	tt.Type("床前")
	tt.Frame()
	if s.Index != 2 || s.Chars[0].Status != engine.Correct || s.Chars[1].Status != engine.Correct || p.composing != "" {
		t.Fatalf("index %d, chars %+v, composing %q", s.Index, s.Chars[:2], p.composing)
	}
	// A cancelled composition mid-run keeps the clock.
	tt.Compose("ming", 4)
	tt.Compose("", 0)
	tt.Frame()
	if !s.Started() {
		t.Fatal("a cancel mid-run stopped the clock")
	}

	// A mistake, deleted.
	tt.Type("名")
	tt.Frame()
	if s.Chars[2].Status != engine.Incorrect {
		t.Fatalf("mistake: %+v", s.Chars[2])
	}
	h.snapshot("mistake")
	tt.Key(0, ui.KeyBackspace)
	tt.Frame()
	if s.Index != 2 || s.Chars[2].Status != engine.Current {
		t.Fatalf("after backspace: index %d", s.Index)
	}

	// The rest, with half-width punctuation and Enter for the line break.
	tt.Type("明月光,疑是地上霜.")
	tt.Key(0, ui.KeyEnter)
	tt.Type("举头望明月，低头思故乡")
	tt.Frame()
	h.snapshot("almost")
	tt.Type("。")
	tt.Frame()
	if !s.Done || p.result == nil {
		t.Fatalf("not completed: index %d of %d", s.Index, len(s.Chars))
	}
	if st := p.result.stats; st.Accuracy != 100 || st.Total != len([]rune(testLesson)) {
		t.Fatalf("stats %+v", st)
	}
	if !tt.HasText(h.app.t("results")) || !tt.HasText(h.app.t("next_lesson")) {
		t.Fatalf("results: %q", tt.Texts())
	}
	h.snapshot("results")

	tt.Key(0, ui.KeyR)
	tt.Frame()
	if s.Started() || s.Index != 0 || p.result != nil {
		t.Fatal("R did not restart")
	}

	// Closed, the results leave the text in view, and their keys work.
	h.typeText(testLesson)
	if p.result == nil {
		t.Fatal("not completed again")
	}
	tt.Key(0, ui.KeyEscape)
	tt.Frame()
	if !p.result.dismissed || tt.HasText(h.app.t("next_lesson")) {
		t.Fatalf("the sheet stayed: %q", tt.Texts())
	}
	tt.Key(0, ui.KeyEnter)
	h.settle("the next lesson", func() bool { return h.app.currentPractice() != nil && h.app.lessonID == "cx" })
}

func TestEveryLanguageBuildsTheWelcome(t *testing.T) {
	h := newHarness(t)
	h.settle("the catalog", func() bool { return !h.app.catalog.loading })
	for _, code := range []string{"en", "ja", "ko", "de"} {
		l, _ := i18n.Find(code)
		h.app.setLanguage(l)
		h.settle("the catalog of "+code, func() bool { return !h.app.catalog.loading })
		if !h.tt.HasText(h.app.t("start")) && h.app.catalog.err == nil {
			t.Errorf("%s: %q", code, strings.Join(h.tt.Texts(), " | "))
		}
	}
}

func TestSignedInRunIsSubmitted(t *testing.T) {
	h := newHarness(t)
	tt, a := h.tt, h.app
	p := h.start()

	// Sign in with the email form: a wrong password first.
	h.click(a.t("auth.login"))
	h.click(a.t("auth.login_with_email"))
	tt.Type("ada@example.com")
	tt.Key(0, ui.KeyTab)
	tt.Type("wrong")
	tt.Key(0, ui.KeyEnter)
	h.settle("the error", func() bool { return a.dialogs.err != "" })
	if !tt.HasText(a.t("auth.invalid_credentials")) {
		t.Fatalf("no error shown: %q", tt.Texts())
	}
	h.snapshot("login-error")
	a.dialogs.password = "secret1"
	tt.Frame() // the field takes the new value
	tt.Key(0, ui.KeyEnter)
	h.settle("the profile", func() bool { return a.account.profile != nil })
	if _, ok := tt.Find("Ada"); a.dialogs.login || !ok {
		t.Fatalf("not signed in: dialog %v, texts %q", a.dialogs.login, tt.Texts())
	}
	h.snapshot("signed-in")

	// A run, recorded on the server.
	h.typeText(testLesson)
	if p.result == nil {
		t.Fatal("not completed")
	}
	var sub map[string]any
	select {
	case sub = <-h.backend.submitted:
	case <-time.After(5 * time.Second):
		t.Fatal("the run was not submitted")
	}
	n := float64(len([]rune(testLesson)))
	if sub["sessionId"] != "run-1" || sub["lessonId"] != "jys" || sub["language"] != "chinese" || sub["collectionId"] != "grade-1" ||
		sub["totalChars"] != n || sub["correctChars"] != n || sub["errorChars"] != 0.0 || sub["accuracy"] != 100.0 {
		t.Fatalf("submission %v", sub)
	}
	if trace, _ := sub["trace"].([]any); float64(len(trace)) != n {
		t.Fatalf("trace of %d entries for %v characters", len(trace), n)
	}
	st := p.result.stats
	if sub["cpm"] != float64(st.CPM) || sub["effectiveKeystrokes"] != float64(st.EffectiveKeystrokes) || sub["duration"] != float64(st.Duration) {
		t.Fatalf("submission %v, stats %+v", sub, st)
	}
	h.settle("the results' refresh", func() bool { return p.result.recent != nil })
	if !p.result.newRecord {
		t.Error("a first run is a new record")
	}

	// The user's statistics open in a window of their own.
	a.openStats()
	h.settle("the runs", func() bool { return a.stats.loaded })
	if st := h.window("stats"); !st.HasText(a.t("auth.no_records")) {
		t.Fatalf("statistics: %q", st.Texts())
	}
}

// The welcome sheet of the first launch chooses the collection, which the
// title bar's menu and the menu bar's change later.
func TestChoosingTheCollection(t *testing.T) {
	h := newHarness(t)
	tt, a := h.tt, h.app
	h.settle("the catalog", func() bool { return !a.catalog.loading })
	h.click("小学二年级")
	// Enter starts, though the tile has the focus.
	tt.Key(0, ui.KeyEnter)
	h.settle("the lesson", func() bool { return a.practice != nil && a.practice.session != nil })
	if a.prefs.Collection != "grade-2" || a.lessonID != "cx" {
		t.Fatalf("collection %q, lesson %q", a.prefs.Collection, a.lessonID)
	}

	// The title bar's button, named after the collection, opens its menu.
	h.click("小学二年级")
	if menu := tt.Menu(); len(menu) != 2 || menu[0] != "小学一年级" {
		t.Fatalf("menu %q", menu)
	}
	if err := tt.ChooseMenuItem("小学一年级"); err != nil {
		t.Fatal(err)
	}
	h.settle("the lesson", func() bool { return a.currentPractice() != nil && a.lessonID == "jys" })
	if a.prefs.Collection != "grade-1" {
		t.Fatalf("collection %q", a.prefs.Collection)
	}

	// The menu bar's Practice menu checks it, and chooses too.
	if grade1 := menuItem(a, "小学一年级"); !grade1.Checked || grade1.Accelerator != "CmdOrCtrl+1" {
		t.Errorf("%q: checked %v, %s", grade1.Label, grade1.Checked, grade1.Accelerator)
	}
	grade2 := menuItem(a, "小学二年级")
	grade2.Click(grade2, nil)
	h.settle("the lesson", func() bool { return a.currentPractice() != nil && a.lessonID == "cx" })
}

// Settings… opens the settings' window, which sets the language and the
// appearance, and shows the account.
func TestSettingsWindow(t *testing.T) {
	h := newHarness(t)
	a := h.app
	h.start()
	settings := menuItem(a, a.t("menu.settings"))
	if settings == nil || settings.Accelerator != "CmdOrCtrl+," {
		t.Fatalf("Settings… %+v", settings)
	}
	settings.Click(settings, nil)
	h.settle("the window", func() bool { return len(h.windows) > 0 })
	st := h.window("settings")
	if h.windows[0].Title() != "通用" || !st.HasText(a.t("settings.language_hint")) {
		t.Fatalf("title %q, texts %q", h.windows[0].Title(), st.Texts())
	}
	h.snapshotOf(st, "settings")

	if err := st.Click(a.t("settings.appearance_dark")); err != nil {
		t.Fatal(err)
	}
	st.Frame()
	if a.prefs.Theme != "dark" {
		t.Fatalf("theme %q", a.prefs.Theme)
	}

	if err := st.Click("中文"); err != nil {
		t.Fatal(err)
	}
	if err := st.ChooseMenuItem("English"); err != nil {
		t.Fatal(err)
	}
	st.Frame()
	if a.lang.Code != "en" || !st.HasText("Appearance") || a.lessonID != "" {
		t.Fatalf("language %s, lesson %q, texts %q", a.lang.Code, a.lessonID, st.Texts())
	}

	if err := st.Click("Account"); err != nil {
		t.Fatal(err)
	}
	st.Frame()
	if h.windows[0].Title() != "Account" || !st.HasText(a.t("auth.login_prompt")) {
		t.Fatalf("title %q, texts %q", h.windows[0].Title(), st.Texts())
	}
}

// Check for Updates… follows About on macOS and is in Help elsewhere, in
// the interface's language, and only when the app can check.
func TestCheckForUpdatesInTheMenu(t *testing.T) {
	a := newHarness(t).app
	if menuItem(a, a.t("menu.check_for_updates")) != nil {
		t.Fatal("an item without an updater")
	}

	checks := 0
	a.checkForUpdates = func() { checks++ }
	menu, i := findMenuItem(a, a.t("menu.check_for_updates"))
	switch {
	case menu == nil:
		t.Fatal("no item")
	case menu.Hidden:
		t.Fatalf("%q is hidden", menu.Label)
	case runtime.GOOS == "darwin" && (menu.Role != mygo.RoleAppMenu || i != 1 || menu.Submenu[0].Role != mygo.RoleAbout):
		t.Fatalf("item %d of %q, want after About", i, menu.Role)
	case runtime.GOOS != "darwin" && menu.Label != a.t("menu.help"):
		t.Fatalf("in %q, want Help", menu.Label)
	}
	menu.Submenu[i].Click(menu.Submenu[i], nil)
	if checks != 1 {
		t.Fatalf("%d checks", checks)
	}
}

func TestGoogleSignInComesBackThroughTheBrowser(t *testing.T) {
	h := newHarness(t)
	tt, a := h.tt, h.app
	h.start()

	// startGoogle opens the browser on Google's sign-in and returns where it
	// comes back to.
	startGoogle := func() string {
		t.Helper()
		h.click(a.t("auth.login"))
		h.click(a.t("auth.continue_with_google"))
		urls := tt.OpenedURLs()
		u, err := url.Parse(urls[len(urls)-1])
		if err != nil {
			t.Fatal(err)
		}
		redirect := u.Query().Get("redirect_to")
		if !strings.HasPrefix(redirect, "http://127.0.0.1:") || u.Query().Get("code_challenge") == "" {
			t.Fatalf("authorize URL %s", u)
		}
		// Supabase adds the code to the redirect's query.
		return redirect + "&"
	}
	// browse fetches the page the browser comes back to.
	browse := func(target string) string {
		t.Helper()
		resp, err := http.Get(target)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		page, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK || !strings.Contains(resp.Header.Get("Content-Type"), "text/html") {
			t.Fatalf("%s: %s", target, resp.Status)
		}
		return string(page)
	}

	// The user gives up at Google.
	// Another page cannot answer for Supabase: it does not know the token.
	redirect := startGoogle()
	forged, _ := url.Parse(redirect + "code=forged")
	q := forged.Query()
	q.Del("app_token")
	forged.RawQuery = q.Encode()
	if resp, err := http.Get(forged.String()); err != nil || resp.StatusCode != http.StatusNotFound {
		t.Fatalf("a request without the token: %v %v", resp, err)
	}
	page := browse(redirect + "error=access_denied&error_description=The+user+cancelled")
	if !strings.Contains(page, a.t("desktop.browser_failed_title")) || !strings.Contains(page, "The user cancelled") || !strings.Contains(page, `lang="zh"`) {
		t.Fatalf("failure page: %s", page)
	}
	h.settle("the failure's toast", func() bool { return tt.HasText("The user cancelled") })
	if a.userID() != "" || a.account.exchanging {
		t.Fatalf("signed in %q, exchanging %v", a.userID(), a.account.exchanging)
	}

	// Then signs in.
	redirect = startGoogle()
	page = browse(redirect + "code=good-code")
	if !strings.Contains(page, a.t("desktop.browser_signed_in_title")) || strings.Contains(page, "class=\"reason\"") {
		t.Fatalf("success page: %s", page)
	}
	h.settle("the profile", func() bool { return a.account.profile != nil })
	if _, ok := tt.Find("Ada"); a.dialogs.login || !ok {
		t.Fatalf("dialog %v, texts %q", a.dialogs.login, tt.Texts())
	}
	h.snapshot("google-signed-in")

	// The server stops once it has answered.
	deadline := time.Now().Add(2 * time.Second)
	for {
		resp, err := http.Get(redirect + "code=good-code")
		if err != nil {
			break
		}
		resp.Body.Close()
		if time.Now().After(deadline) {
			t.Fatal("the sign-in server still answers")
		}
		time.Sleep(20 * time.Millisecond)
	}
}
