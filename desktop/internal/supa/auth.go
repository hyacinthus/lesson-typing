package supa

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"time"
)

// Session is a signed-in user's tokens, as GoTrue returns them.
type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	// ExpiresAt is when the access token expires, in Unix seconds.
	ExpiresAt int64 `json:"expires_at"`
	ExpiresIn int64 `json:"expires_in,omitempty"`
	User      User  `json:"user"`
}

// User is a GoTrue user.
type User struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	UserMetadata map[string]any `json:"user_metadata"`
	Identities   []struct {
		ID string `json:"id"`
	} `json:"identities"`
}

// Metadata returns a string of the user's metadata, as "full_name".
func (u User) Metadata(key string) string {
	s, _ := u.UserMetadata[key].(string)
	return s
}

// expiryMargin refreshes access tokens this long before they expire.
const expiryMargin = time.Minute

// Session returns the current session, nil when signed out.
func (c *Client) Session() *Session {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.session
}

// OnAuthChange calls fn, on the goroutine that made the change, whenever
// the user signs in or out or the session refreshes.
func (c *Client) OnAuthChange(fn func(*Session)) {
	c.mu.Lock()
	c.listeners = append(c.listeners, fn)
	c.mu.Unlock()
}

// setSession makes s current, persists it and tells the listeners.
func (c *Client) setSession(s *Session) {
	if s != nil && s.ExpiresAt == 0 && s.ExpiresIn > 0 {
		s.ExpiresAt = time.Now().Unix() + s.ExpiresIn
	}
	c.mu.Lock()
	c.session = s
	listeners := append([]func(*Session){}, c.listeners...)
	c.mu.Unlock()
	if c.store != nil {
		_ = c.store.SaveSession(s)
	}
	for _, fn := range listeners {
		fn(s)
	}
}

// validSession returns the session with an access token that has not
// expired, refreshing it first when it is about to; nil when signed out.
func (c *Client) validSession(ctx context.Context) (*Session, error) {
	for {
		c.mu.Lock()
		s := c.session
		if s == nil || time.Until(time.Unix(s.ExpiresAt, 0)) > expiryMargin {
			c.mu.Unlock()
			return s, nil
		}
		if wait := c.refreshing; wait != nil {
			c.mu.Unlock()
			select {
			case <-wait:
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		done := make(chan struct{})
		c.refreshing = done
		c.mu.Unlock()

		err := c.refresh(ctx, s.RefreshToken)
		c.mu.Lock()
		c.refreshing = nil
		signedOut := c.session == nil
		c.mu.Unlock()
		close(done)
		if err != nil && !signedOut {
			return nil, err
		}
		// A rejected refresh token signed the user out: go on anonymously.
	}
}

// refresh trades a refresh token for a new session. A refresh token GoTrue
// rejects signs the user out; other errors, as no network, keep the
// session for later.
func (c *Client) refresh(ctx context.Context, token string) error {
	var s Session
	err := c.do(ctx, request{
		method: http.MethodPost,
		path:   "/auth/v1/token?grant_type=refresh_token",
		body:   map[string]string{"refresh_token": token},
	}, &s)
	var e *Error
	if errors.As(err, &e) && e.Status >= 400 && e.Status < 500 {
		c.setSession(nil)
		return err
	}
	if err != nil {
		return err
	}
	c.setSession(&s)
	return nil
}

// Restore refreshes the session kept from the last launch when its access
// token expired, as requests would, sharing their refresh.
func (c *Client) Restore(ctx context.Context) error {
	_, err := c.validSession(ctx)
	return err
}

// SignInWithPassword signs in with an email and a password.
func (c *Client) SignInWithPassword(ctx context.Context, email, password string) error {
	var s Session
	err := c.do(ctx, request{
		method: http.MethodPost,
		path:   "/auth/v1/token?grant_type=password",
		body:   map[string]string{"email": email, "password": password},
	}, &s)
	if err != nil {
		return err
	}
	c.setSession(&s)
	return nil
}

// SignUp registers an email and a password. With email confirmation on,
// it returns the user without signing in: the confirmation link, a PKCE
// code for redirectTo, signs in (ExchangeCode). For an address already
// registered, GoTrue returns a user without identities, so that addresses
// cannot be enumerated.
func (c *Client) SignUp(ctx context.Context, email, password, redirectTo string) (*User, error) {
	challenge := c.newPKCE()
	// The body is a session, or without one the user itself.
	var resp struct {
		Session
		User
	}
	err := c.do(ctx, request{
		method: http.MethodPost,
		path:   "/auth/v1/signup?redirect_to=" + url.QueryEscape(redirectTo),
		body: map[string]string{
			"email":                 email,
			"password":              password,
			"code_challenge":        challenge,
			"code_challenge_method": "s256",
		},
	}, &resp)
	if err != nil {
		return nil, err
	}
	if resp.AccessToken != "" {
		c.setSession(&resp.Session)
		u := resp.Session.User
		return &u, nil
	}
	return &resp.User, nil
}

// OAuthURL returns the URL that signs in with provider in the browser, as
// "google", which sends the browser to redirectTo with a PKCE code.
func (c *Client) OAuthURL(provider, redirectTo string) string {
	q := url.Values{
		"provider":              {provider},
		"redirect_to":           {redirectTo},
		"code_challenge":        {c.newPKCE()},
		"code_challenge_method": {"s256"},
	}
	return c.url + "/auth/v1/authorize?" + q.Encode()
}

// ExchangeCode completes a PKCE sign-in with the code of its redirect.
func (c *Client) ExchangeCode(ctx context.Context, code string) error {
	c.mu.Lock()
	verifier := c.verifier
	c.mu.Unlock()
	if verifier == "" {
		return &Error{Status: http.StatusBadRequest, Code: "pkce_code_verifier_not_found", Message: "no sign-in in progress"}
	}
	var s Session
	err := c.do(ctx, request{
		method: http.MethodPost,
		path:   "/auth/v1/token?grant_type=pkce",
		body:   map[string]string{"auth_code": code, "code_verifier": verifier},
	}, &s)
	if err != nil {
		return err
	}
	c.setVerifier("")
	c.setSession(&s)
	return nil
}

// newPKCE starts a PKCE flow: it keeps a new code verifier for
// ExchangeCode and returns its challenge.
func (c *Client) newPKCE() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	verifier := base64.RawURLEncoding.EncodeToString(b)
	c.setVerifier(verifier)
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// setVerifier keeps the PKCE verifier of the sign-in in progress, in the
// store too: its link may open after a restart.
func (c *Client) setVerifier(v string) {
	c.mu.Lock()
	c.verifier = v
	c.mu.Unlock()
	if c.store != nil {
		_ = c.store.SaveVerifier(v)
	}
}

// UpdateUser merges data into the signed-in user's metadata.
func (c *Client) UpdateUser(ctx context.Context, data map[string]any) error {
	var u User
	if err := c.do(ctx, request{method: http.MethodPut, path: "/auth/v1/user", body: map[string]any{"data": data}, auth: true}, &u); err != nil {
		return err
	}
	c.mu.Lock()
	s := c.session
	c.mu.Unlock()
	if s != nil && u.ID == s.User.ID {
		next := *s
		next.User = u
		c.setSession(&next)
	}
	return nil
}

// SignOut signs out on the server, and forgets the session whatever it
// answers.
func (c *Client) SignOut(ctx context.Context) error {
	c.mu.Lock()
	s := c.session
	c.mu.Unlock()
	if s == nil {
		return nil
	}
	err := c.do(ctx, request{method: http.MethodPost, path: "/auth/v1/logout", bearer: s.AccessToken}, nil)
	c.setSession(nil)
	return err
}
