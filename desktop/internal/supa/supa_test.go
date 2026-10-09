package supa

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type memStore struct {
	s        *Session
	verifier string
}

func (m *memStore) LoadSession() (*Session, error) { return m.s, nil }
func (m *memStore) SaveSession(s *Session) error   { m.s = s; return nil }
func (m *memStore) LoadVerifier() string           { return m.verifier }
func (m *memStore) SaveVerifier(v string) error    { m.verifier = v; return nil }

func session(token string, expiresIn time.Duration) map[string]any {
	return map[string]any{
		"access_token":  "access-" + token,
		"refresh_token": "refresh-" + token,
		"expires_at":    time.Now().Add(expiresIn).Unix(),
		"user":          map[string]any{"id": "user-1", "email": "ada@example.com"},
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func TestSignInAndAuthorizedRequests(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("apikey") != "anon" {
			t.Errorf("%s without apikey", r.URL.Path)
		}
		switch r.URL.Path {
		case "/auth/v1/token":
			var body map[string]string
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["password"] != "secret" {
				writeJSON(w, 400, map[string]any{"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
				return
			}
			writeJSON(w, 200, session("1", time.Hour))
		case "/rest/v1/lt_lessons":
			if got := r.Header.Get("Authorization"); got != "Bearer access-1" {
				t.Errorf("authorization %q", got)
			}
			if r.URL.Query().Get("language") != "eq.chinese" {
				t.Errorf("query %s", r.URL.RawQuery)
			}
			writeJSON(w, 200, []map[string]any{{"id": "a"}})
		default:
			t.Errorf("unexpected %s", r.URL.Path)
		}
	}))
	defer srv.Close()

	store := &memStore{}
	c := New(srv.URL, "anon", store)
	err := c.SignInWithPassword(context.Background(), "ada@example.com", "wrong")
	if ErrorCode(err) != "invalid_credentials" {
		t.Fatalf("wrong password: %v", err)
	}
	if err := c.SignInWithPassword(context.Background(), "ada@example.com", "secret"); err != nil {
		t.Fatal(err)
	}
	if store.s == nil || store.s.User.ID != "user-1" {
		t.Fatalf("stored %+v", store.s)
	}
	var rows []struct{ ID string }
	if err := c.Select(context.Background(), "lt_lessons", Query{"language": {"eq.chinese"}}, &rows); err != nil || len(rows) != 1 {
		t.Fatalf("rows %v, err %v", rows, err)
	}
}

func TestAnonymousRequestsSendNoAuthorization(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "" {
			t.Errorf("anonymous request with authorization %q", got)
		}
		writeJSON(w, 200, []any{})
	}))
	defer srv.Close()
	c := New(srv.URL, "sb_publishable_x", nil)
	if err := c.Select(context.Background(), "lt_collections", Query{}, &[]any{}); err != nil {
		t.Fatal(err)
	}
}

func TestRefreshBeforeExpiry(t *testing.T) {
	var refreshes atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/auth/v1/token" && r.URL.Query().Get("grant_type") == "refresh_token":
			refreshes.Add(1)
			time.Sleep(20 * time.Millisecond) // let concurrent requests pile up
			writeJSON(w, 200, session("2", time.Hour))
		case r.URL.Path == "/functions/v1/start-practice":
			if got := r.Header.Get("Authorization"); got != "Bearer access-2" {
				t.Errorf("authorization %q", got)
			}
			writeJSON(w, 200, map[string]string{"sessionId": "s1"})
		}
	}))
	defer srv.Close()

	store := &memStore{}
	_ = json.Unmarshal(must(json.Marshal(session("1", 10*time.Second))), &store.s)
	c := New(srv.URL, "anon", store)

	done := make(chan struct{})
	for range 5 {
		go func() {
			var out struct{ SessionID string }
			if err := c.Invoke(context.Background(), "start-practice", map[string]string{"lessonId": "a"}, &out); err != nil || out.SessionID != "s1" {
				t.Errorf("invoke: %v %+v", err, out)
			}
			done <- struct{}{}
		}()
	}
	for range 5 {
		<-done
	}
	if n := refreshes.Load(); n != 1 {
		t.Errorf("%d refreshes, want 1", n)
	}
}

func TestRejectedRefreshSignsOut(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/v1/token" {
			writeJSON(w, 400, map[string]any{"error_code": "refresh_token_not_found", "msg": "Invalid Refresh Token"})
			return
		}
		if r.Header.Get("Authorization") != "" {
			t.Errorf("signed-out request with authorization")
		}
		writeJSON(w, 200, []any{})
	}))
	defer srv.Close()
	store := &memStore{}
	_ = json.Unmarshal(must(json.Marshal(session("1", -time.Minute))), &store.s)
	c := New(srv.URL, "anon", store)

	var signedOut bool
	c.OnAuthChange(func(s *Session) { signedOut = s == nil })
	if err := c.Select(context.Background(), "lt_lessons", Query{}, &[]any{}); err != nil {
		t.Fatalf("a public read failed after the session expired: %v", err)
	}
	if !signedOut || c.Session() != nil || store.s != nil {
		t.Fatal("still signed in")
	}
}

func TestPKCE(t *testing.T) {
	var challenge string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		if r.URL.Query().Get("grant_type") != "pkce" || body["auth_code"] != "code-1" {
			t.Errorf("exchange %s %v", r.URL, body)
		}
		sum := sha256.Sum256([]byte(body["code_verifier"]))
		if base64.RawURLEncoding.EncodeToString(sum[:]) != challenge {
			t.Error("the verifier does not match the challenge")
		}
		writeJSON(w, 200, session("1", time.Hour))
	}))
	defer srv.Close()
	c := New(srv.URL, "anon", nil)

	u, err := url.Parse(c.OAuthURL("google", "lessontyping://auth/callback"))
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	challenge = q.Get("code_challenge")
	if u.Path != "/auth/v1/authorize" || q.Get("provider") != "google" || q.Get("redirect_to") != "lessontyping://auth/callback" || q.Get("code_challenge_method") != "s256" || challenge == "" {
		t.Fatalf("authorize URL %s", u)
	}
	if err := c.ExchangeCode(context.Background(), "code-1"); err != nil {
		t.Fatal(err)
	}
	if c.Session() == nil {
		t.Fatal("not signed in")
	}
	if ErrorCode(c.ExchangeCode(context.Background(), "code-1")) != "pkce_code_verifier_not_found" {
		t.Fatal("a code exchanged twice")
	}
}

func TestNotConfigured(t *testing.T) {
	c := New("", "", nil)
	if err := c.SelectPublic(context.Background(), "lt_lessons", Query{}, &[]any{}); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("err %v", err)
	}
}

func TestSignUpAwaitingConfirmation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("redirect_to") != "lessontyping://auth/callback" {
			t.Errorf("redirect_to %q", r.URL.Query().Get("redirect_to"))
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), `"code_challenge_method":"s256"`) {
			t.Errorf("body %s", body)
		}
		writeJSON(w, 200, map[string]any{"id": "user-2", "email": "new@example.com", "identities": []any{}})
	}))
	defer srv.Close()
	store := &memStore{}
	c := New(srv.URL, "anon", store)
	u, err := c.SignUp(context.Background(), "new@example.com", "secret1", "lessontyping://auth/callback")
	if err != nil || u.ID != "user-2" || len(u.Identities) != 0 || c.Session() != nil {
		t.Fatalf("user %+v, err %v", u, err)
	}
	// The link may open after a restart: a new client takes the verifier.
	if store.verifier == "" || New(srv.URL, "anon", store).verifier != store.verifier {
		t.Fatal("no verifier kept for the confirmation link")
	}
}

func TestIn(t *testing.T) {
	if got := In([]string{"a", `b"c`}); got != `in.("a","b\"c")` {
		t.Fatal(got)
	}
}

func must[T any](v T, err error) T {
	if err != nil {
		panic(err)
	}
	return v
}
