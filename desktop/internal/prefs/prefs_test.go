package prefs

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

func TestPrefsRoundTrip(t *testing.T) {
	s, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if p := s.Load(); p != (Prefs{}) {
		t.Fatalf("fresh prefs %+v", p)
	}
	want := Prefs{Language: "zh", Collection: "grade-2", Theme: "dark", HideKeyboard: true}
	if err := s.Save(want); err != nil {
		t.Fatal(err)
	}
	if got := s.Load(); got != want {
		t.Fatalf("got %+v", got)
	}
}

func TestSessionFile(t *testing.T) {
	dir := t.TempDir()
	s, _ := Open(dir)
	if sess, err := s.LoadSession(); sess != nil || err != nil {
		t.Fatalf("fresh session %v %v", sess, err)
	}
	if err := s.SaveSession(&supa.Session{RefreshToken: "r", User: supa.User{ID: "u"}}); err != nil {
		t.Fatal(err)
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(filepath.Join(dir, sessionFile))
		if err != nil || info.Mode().Perm() != 0o600 {
			t.Fatalf("session file mode %v, %v", info.Mode(), err)
		}
	}
	sess, err := s.LoadSession()
	if err != nil || sess.RefreshToken != "r" || sess.User.ID != "u" {
		t.Fatalf("loaded %+v %v", sess, err)
	}
	if err := s.SaveSession(nil); err != nil {
		t.Fatal(err)
	}
	if err := s.SaveSession(nil); err != nil {
		t.Fatal("removing twice:", err)
	}
	if sess, _ := s.LoadSession(); sess != nil {
		t.Fatal("session kept after sign-out")
	}
}

func TestVerifier(t *testing.T) {
	s, _ := Open(t.TempDir())
	if s.LoadVerifier() != "" {
		t.Fatal("fresh verifier")
	}
	if err := s.SaveVerifier("v1"); err != nil || s.LoadVerifier() != "v1" {
		t.Fatalf("saved %q, %v", s.LoadVerifier(), err)
	}
	if err := s.SaveVerifier(""); err != nil || s.LoadVerifier() != "" {
		t.Fatal("not cleared")
	}
}
