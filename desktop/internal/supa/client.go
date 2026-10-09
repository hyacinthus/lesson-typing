// Package supa is a small client of the Supabase services the app uses:
// GoTrue auth, PostgREST tables and functions, edge functions and storage.
// It speaks their HTTP APIs directly, as supabase-js does.
package supa

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Client talks to one Supabase project, as the signed-in user once there
// is a session, else anonymously.
type Client struct {
	url, key string
	http     *http.Client
	store    SessionStore

	mu      sync.Mutex
	session *Session
	// refreshing is the refresh in flight, shared by concurrent requests.
	refreshing chan struct{}
	listeners  []func(*Session)
	verifier   string // PKCE code verifier of the sign-in in progress
}

// SessionStore keeps the session across launches, and the PKCE verifier
// of a sign-in completed by a link the browser opens, maybe after a
// restart.
type SessionStore interface {
	LoadSession() (*Session, error)
	SaveSession(*Session) error // nil clears it
	LoadVerifier() string
	SaveVerifier(string) error
}

// ErrNotConfigured is the error of every request of a client without a
// project, in builds made without one.
var ErrNotConfigured = errors.New("supabase: no project configured")

// New returns a client of the project at url with its anon (publishable)
// key, restoring the session store keeps.
func New(projectURL, key string, store SessionStore) *Client {
	c := &Client{
		url:   strings.TrimRight(projectURL, "/"),
		key:   key,
		http:  &http.Client{Timeout: 30 * time.Second},
		store: store,
	}
	if store != nil {
		if s, err := store.LoadSession(); err == nil && s != nil && s.RefreshToken != "" {
			c.session = s
		}
		c.verifier = store.LoadVerifier()
	}
	return c
}

// Configured reports whether the client has a project to talk to.
func (c *Client) Configured() bool { return c.url != "" && c.key != "" }

// Error is an error response of a Supabase service.
type Error struct {
	Status int
	// Code is the service's error code, as "invalid_credentials".
	Code    string
	Message string
}

func (e *Error) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("supabase: %s (%d %s)", e.Message, e.Status, e.Code)
	}
	return fmt.Sprintf("supabase: %s (%d)", e.Message, e.Status)
}

// ErrorCode returns the code of a Supabase error, "" for other errors.
func ErrorCode(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}

// parseError reads the error body of a response; the services use
// different shapes.
func parseError(status int, body []byte) error {
	var v struct {
		Code             any    `json:"code"`
		ErrorCode        string `json:"error_code"`
		Msg              string `json:"msg"`
		Message          string `json:"message"`
		Err              string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}
	_ = json.Unmarshal(body, &v)
	e := &Error{Status: status, Code: v.ErrorCode}
	if e.Code == "" {
		if s, ok := v.Code.(string); ok {
			e.Code = s
		} else if v.Err != "" && v.ErrorDescription != "" {
			e.Code = v.Err
		}
	}
	for _, m := range []string{v.Msg, v.Message, v.ErrorDescription, v.Err} {
		if m != "" {
			e.Message = m
			break
		}
	}
	if e.Message == "" {
		e.Message = strings.TrimSpace(string(body))
		if e.Message == "" {
			e.Message = http.StatusText(status)
		}
	}
	return e
}

// request is an HTTP request to the project.
type request struct {
	method  string
	path    string // with its query
	body    any    // JSON encoded, or raw []byte with contentType
	headers map[string]string
	// auth sends the user's access token, refreshed first when it
	// expires; without it, the request is anonymous.
	auth bool
	// bearer sends this token instead, as the access token of a session
	// being set up.
	bearer string
}

// do sends r and decodes the JSON response into out, when not nil.
func (c *Client) do(ctx context.Context, r request, out any) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	var body io.Reader
	contentType := "application/json"
	switch b := r.body.(type) {
	case nil:
	case []byte:
		body = bytes.NewReader(b)
		contentType = ""
	default:
		data, err := json.Marshal(b)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, r.method, c.url+r.path, body)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", c.key)
	if body != nil && contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("Accept", "application/json")
	token := r.bearer
	if r.auth && token == "" {
		s, err := c.validSession(ctx)
		if err != nil {
			return err
		}
		if s != nil {
			token = s.AccessToken
		}
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for k, v := range r.headers {
		req.Header.Set(k, v)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return parseError(resp.StatusCode, data)
	}
	if out == nil || len(bytes.TrimSpace(data)) == 0 {
		return nil
	}
	return json.Unmarshal(data, out)
}

// Query builds the query string of a PostgREST request: filters such as
// "language", "eq.chinese", select, order and limit.
type Query = url.Values

// Select reads rows of table into out, a pointer to a slice, as the user.
func (c *Client) Select(ctx context.Context, table string, q Query, out any) error {
	return c.do(ctx, request{method: http.MethodGet, path: "/rest/v1/" + table + "?" + q.Encode(), auth: true}, out)
}

// SelectPublic reads rows anyone may read, without waiting for the user's
// token to refresh.
func (c *Client) SelectPublic(ctx context.Context, table string, q Query, out any) error {
	return c.do(ctx, request{method: http.MethodGet, path: "/rest/v1/" + table + "?" + q.Encode()}, out)
}

// Upsert inserts row into table, or updates the row with its primary key.
func (c *Client) Upsert(ctx context.Context, table string, row any) error {
	return c.do(ctx, request{
		method:  http.MethodPost,
		path:    "/rest/v1/" + table,
		body:    row,
		headers: map[string]string{"Prefer": "resolution=merge-duplicates,return=minimal"},
		auth:    true,
	}, nil)
}

// RPC calls a database function with named arguments.
func (c *Client) RPC(ctx context.Context, fn string, args any, out any) error {
	return c.do(ctx, request{method: http.MethodPost, path: "/rest/v1/rpc/" + fn, body: args, auth: true}, out)
}

// Invoke calls an edge function with a JSON body, as the signed-in user.
func (c *Client) Invoke(ctx context.Context, fn string, body any, out any) error {
	return c.do(ctx, request{method: http.MethodPost, path: "/functions/v1/" + fn, body: body, auth: true}, out)
}

// Upload stores data at path in a public bucket, replacing what is there,
// and returns its public URL.
func (c *Client) Upload(ctx context.Context, bucket, path, contentType string, data []byte) (string, error) {
	err := c.do(ctx, request{
		method:  http.MethodPost,
		path:    "/storage/v1/object/" + bucket + "/" + path,
		body:    data,
		headers: map[string]string{"Content-Type": contentType, "x-upsert": "true"},
		auth:    true,
	}, nil)
	if err != nil {
		return "", err
	}
	return c.url + "/storage/v1/object/public/" + bucket + "/" + path, nil
}

// In formats values for an "in" filter, quoted for PostgREST.
func In(values []string) string {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = `"` + strings.ReplaceAll(strings.ReplaceAll(v, `\`, `\\`), `"`, `\"`) + `"`
	}
	return "in.(" + strings.Join(quoted, ",") + ")"
}
