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
	"strings"
	"testing"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

const testLesson = "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。"

// backend is what the fake Supabase saw.
type backend struct {
	submitted chan map[string]any
}

// fakeSupabase serves one Chinese lesson, an empty leaderboard, and the
// account of Ada, whose password is "secret1".
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
			lesson := map[string]any{
				"id": "jys", "title": "静夜思", "collection_id": "grade-1", "language": "chinese",
				"sort_order": 1, "character_count": len([]rune(testLesson)),
			}
			if q.Get("id") == "eq.jys" {
				lesson["content"] = testLesson
			}
			body = []any{lesson}
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
}

func newHarness(t *testing.T) *harness {
	srv, be := fakeSupabase(t)
	h := &harness{t: t, posted: make(chan func(), 64), backend: be}
	h.app = New(Options{
		Store:  data.New(supa.New(srv.URL, "anon", nil)),
		Post:   func(fn func()) { h.posted <- fn },
		Locale: "zh-CN",
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

// snapshot saves the last frame to LT_SNAPSHOT_DIR, for a look at it.
func (h *harness) snapshot(name string) {
	dir := os.Getenv("LT_SNAPSHOT_DIR")
	if dir == "" {
		return
	}
	f, err := os.Create(filepath.Join(dir, name+".png"))
	if err != nil {
		h.t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, h.tt.Image()); err != nil {
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
	if !tt.HasText("开始练习") {
		t.Fatalf("home in Chinese: %q", tt.Texts())
	}
	h.snapshot("home")

	tt.Key(0, ui.KeyEnter)
	h.settle("the lesson", func() bool { return h.app.practice != nil && h.app.practice.session != nil })
	if !tt.HasText("静夜思") {
		t.Fatalf("lesson page: %q", tt.Texts())
	}
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
}

func TestEveryLanguageBuildsTheHomePage(t *testing.T) {
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
	h.settle("the catalog", func() bool { return !a.catalog.loading })

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
	if a.dialogs.login || !tt.HasText("Ada") {
		t.Fatalf("not signed in: dialog %v, texts %q", a.dialogs.login, tt.Texts())
	}
	h.snapshot("signed-in")

	// A run, recorded on the server. The focus went back to the user's
	// button, which takes Enter: click.
	h.click(a.t("start"))
	h.settle("the lesson", func() bool { return a.practice != nil && a.practice.session != nil })
	p := a.practice
	for _, r := range testLesson {
		if r == '\n' {
			tt.Key(0, ui.KeyEnter)
		} else {
			tt.Type(string(r))
		}
		time.Sleep(3 * time.Millisecond) // a human's keystrokes vary
	}
	tt.Frame()
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
}

// Enter opens the lesson after a grade was chosen, as it does before: it
// chooses an option only while the list is open.
func TestEnterStartsAfterChoosingAGrade(t *testing.T) {
	h := newHarness(t)
	tt, a := h.tt, h.app
	h.settle("the catalog", func() bool { return !a.catalog.loading })
	h.click("小学一年级")
	if !tt.HasText("小学二年级") {
		t.Fatalf("the list did not open: %q", tt.Texts())
	}
	// Enter in the open list chooses the highlighted option.
	tt.Key(0, ui.KeyDown)
	tt.Key(0, ui.KeyEnter)
	tt.Frame()
	if a.prefs.Collection != "grade-2" || a.router.Path() != "/" {
		t.Fatalf("collection %q, page %s", a.prefs.Collection, a.router.Path())
	}
	// With the list closed, Enter starts, though the select has the focus.
	tt.Key(0, ui.KeyEnter)
	tt.Frame()
	if !strings.HasPrefix(a.router.Path(), "/lesson/") {
		t.Fatalf("Enter did not start: page %s, texts %q", a.router.Path(), tt.Texts())
	}
}

func TestGoogleSignInComesBackThroughTheBrowser(t *testing.T) {
	h := newHarness(t)
	tt, a := h.tt, h.app
	h.settle("the catalog", func() bool { return !a.catalog.loading })

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
	if a.dialogs.login || !tt.HasText("Ada") {
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
