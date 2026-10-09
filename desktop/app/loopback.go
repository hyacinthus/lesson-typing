package app

import (
	"context"
	"crypto/rand"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
)

// A Google sign-in comes back from the browser to a server the app runs on
// 127.0.0.1 while it waits: Supabase redirects to a loopback address at any
// port without it being among the project's redirect URLs (RFC 8252), and
// the browser shows the page the app answers with, where a custom scheme
// would leave it spinning on Google's last page.

// loopbackTimeout is how long the app waits for the browser to come back.
const loopbackTimeout = 10 * time.Minute

// loopback is the server waiting for the browser's return.
type loopback struct {
	srv     *http.Server
	timeout *time.Timer
}

// close stops the server once the request it serves, if any, is answered.
func (l *loopback) close() {
	l.timeout.Stop()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = l.srv.Shutdown(ctx)
	}()
}

// startLoopback starts the server that takes the browser back from a
// sign-in, closing any earlier one, and returns the URL to redirect to.
func (a *App) startLoopback() (string, error) {
	if a.loopback != nil {
		a.loopback.close()
		a.loopback = nil
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}
	// Any page in the browser could request the server: only the redirect
	// carries the token, which Supabase keeps in the URL as it adds the code.
	token := rand.Text()
	l := &loopback{srv: &http.Server{ReadHeaderTimeout: 10 * time.Second}}
	l.srv.Handler = a.loopbackHandler(a.lang.Code, token, l)
	l.timeout = time.AfterFunc(loopbackTimeout, func() { a.post(func() { a.endLoopback(l) }) })
	a.loopback = l
	go func() {
		if err := l.srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("sign-in server: %v", err)
		}
	}()
	return fmt.Sprintf("http://%s/auth/callback?%s=%s", ln.Addr(), loopbackTokenParam, token), nil
}

// loopbackTokenParam names the token of the redirect.
const loopbackTokenParam = "app_token"

// endLoopback closes l once it served or timed out, on the main thread.
func (a *App) endLoopback(l *loopback) {
	l.close()
	if a.loopback == l {
		a.loopback = nil
	}
}

// loopbackHandler completes the sign-in from the callback that carries
// token, answers the browser with a page in lang saying how it went, and
// ends l.
func (a *App) loopbackHandler(lang, token string, l *loopback) http.Handler {
	tr := i18n.For(lang)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /auth/callback", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get(loopbackTokenParam) != token {
			http.NotFound(w, r)
			return
		}
		a.post(func() { a.account.exchanging = true })
		reason := a.exchangeSignIn(r.Context(), tr, r.URL.Query())

		page := signInPage{Lang: lang, Logo: template.HTML(logoMarkup), Light: pageColors(&lightPalette), Dark: pageColors(&darkPalette)}
		if reason == "" {
			page.Title, page.Message = tr.T("desktop.browser_signed_in_title"), tr.T("desktop.browser_signed_in_body")
		} else {
			page.Failed, page.Title, page.Message, page.Reason = true, tr.T("desktop.browser_failed_title"), tr.T("desktop.browser_failed_body"), reason
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if err := signInPageTemplate.Execute(w, page); err != nil {
			log.Printf("sign-in page: %v", err)
		}

		a.post(func() {
			a.finishSignIn(reason)
			if a.showWindow != nil {
				a.showWindow()
			}
			a.endLoopback(l) // the server has done its job
		})
	})
	return mux
}

// signInPage is what the browser shows once back from a sign-in.
type signInPage struct {
	Lang                   string
	Logo                   template.HTML
	Light, Dark            colors
	Failed                 bool
	Title, Message, Reason string
}

// colors are the page's colors, the app's in light or dark.
type colors struct{ Bg, Card, Text, Muted, Border, Accent, Danger template.CSS }

func pageColors(p *palette) colors {
	css := func(c ui.Color) template.CSS {
		return template.CSS(fmt.Sprintf("rgba(%d,%d,%d,%.3f)", c.R, c.G, c.B, float32(c.A)/255))
	}
	return colors{
		Bg: css(p.background), Card: css(p.card), Text: css(p.foreground), Muted: css(p.mutedForeground),
		Border: css(p.border), Accent: css(p.primary), Danger: css(p.charIncorrect),
	}
}

var signInPageTemplate = template.Must(template.New("signin").Parse(`<!doctype html>
<html lang="{{.Lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.Title}} · Lesson Typing</title>
<style>
  :root { color-scheme: light dark;
    {{with .Light}}--bg: {{.Bg}}; --card: {{.Card}}; --text: {{.Text}}; --muted: {{.Muted}}; --border: {{.Border}}; --accent: {{.Accent}}; --danger: {{.Danger}};{{end}} }
  @media (prefers-color-scheme: dark) { :root {
    {{with .Dark}}--bg: {{.Bg}}; --card: {{.Card}}; --text: {{.Text}}; --muted: {{.Muted}}; --border: {{.Border}}; --accent: {{.Accent}}; --danger: {{.Danger}};{{end}} } }
  html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Hiragino Sans", "Microsoft YaHei", sans-serif; }
  main { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .card { max-width: 420px; width: 100%; text-align: center; background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 40px 32px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
  .logo svg { width: 56px; height: 56px; }
  .mark { width: 44px; height: 44px; margin: 20px auto 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-size: 24px; font-weight: 700; }
  .failed .mark { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); }
  h1 { font-size: 22px; margin: 8px 0; }
  p { margin: 8px 0 0; color: var(--muted); }
  .reason { font-size: 14px; color: var(--danger); }
</style>
</head>
<body>
<main>
  <div class="card{{if .Failed}} failed{{end}}">
    <div class="logo">{{.Logo}}</div>
    <div class="mark">{{if .Failed}}!{{else}}✓{{end}}</div>
    <h1>{{.Title}}</h1>
    <p>{{.Message}}</p>
    {{if .Reason}}<p class="reason">{{.Reason}}</p>{{end}}
  </div>
</main>
</body>
</html>
`))
