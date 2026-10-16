// Package prefs keeps what the app remembers between launches, as files in
// its user data directory: the user's choices, and the signed-in session.
package prefs

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sync"

	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

// Prefs are the user's choices.
type Prefs struct {
	// Language is the interface's language code, "" until chosen.
	Language string `json:"language,omitempty"`
	// Collection is the collection last practiced, as "grade-1".
	Collection string `json:"collection,omitempty"`
	// Theme is "light" or "dark", "" to follow the system.
	Theme string `json:"theme,omitempty"`
	// Keyboard is how the practice shows the keys pressed: "large", on a
	// large keyboard, which "" is too, "corner" or "off".
	Keyboard string `json:"keyboard,omitempty"`
}

// Store reads and writes the files of a directory. It is safe for
// concurrent use.
type Store struct {
	dir string
	mu  sync.Mutex
}

// Open returns the store of dir, creating it.
func Open(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	return &Store{dir: dir}, nil
}

const (
	prefsFile    = "prefs.json"
	sessionFile  = "session.json"
	verifierFile = "pkce.json"
)

// Load returns the saved prefs, empty ones when there are none.
func (s *Store) Load() Prefs {
	var p Prefs
	_ = s.read(prefsFile, &p)
	return p
}

// Save writes p.
func (s *Store) Save(p Prefs) error { return s.write(prefsFile, p, 0o644) }

// LoadSession returns the saved session, nil when signed out.
func (s *Store) LoadSession() (*supa.Session, error) {
	var sess supa.Session
	if err := s.read(sessionFile, &sess); err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	return &sess, nil
}

// SaveSession writes the session, readable by the user alone, or removes
// it for nil.
func (s *Store) SaveSession(sess *supa.Session) error {
	if sess == nil {
		return s.remove(sessionFile)
	}
	return s.write(sessionFile, sess, 0o600)
}

// LoadVerifier returns the PKCE verifier of the sign-in in progress.
func (s *Store) LoadVerifier() string {
	var v struct{ Verifier string }
	_ = s.read(verifierFile, &v)
	return v.Verifier
}

// SaveVerifier keeps the PKCE verifier, readable by the user alone, as the
// session; "" clears it.
func (s *Store) SaveVerifier(v string) error {
	if v == "" {
		return s.remove(verifierFile)
	}
	return s.write(verifierFile, struct{ Verifier string }{v}, 0o600)
}

func (s *Store) remove(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(filepath.Join(s.dir, name))
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	return err
}

func (s *Store) read(name string, v any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, err := os.ReadFile(filepath.Join(s.dir, name))
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// write replaces a file atomically, so that a crash never leaves half of
// one.
func (s *Store) write(name string, v any, perm os.FileMode) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	tmp, err := os.CreateTemp(s.dir, name+".*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if err := tmp.Chmod(perm); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), filepath.Join(s.dir, name))
}
