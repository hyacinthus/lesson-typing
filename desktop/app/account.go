package app

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/config"
	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

// account is the signed-in user, as the interface shows them.
type account struct {
	session *supa.Session
	profile *data.Profile
	// exchanging is set while a sign-in's code is traded for a session.
	exchanging bool
	// avatar is the picture at avatarURL, once downloaded.
	avatarURL string
	avatar    *ui.Bitmap
}

// dialogs are the dialogs that may show, one at a time.
type dialogs struct {
	login   bool
	profile bool

	loginView string // "", "sign_in" or "sign_up"
	email     string
	password  string
	confirm   string
	busy      bool
	err       string
	sentEmail bool

	edit profileForm
}

func (d *dialogs) open() bool { return d.login || d.profile }

// userID returns the signed-in user's ID, "" when signed out.
func (a *App) userID() string {
	if s := a.account.session; s != nil {
		return s.User.ID
	}
	return ""
}

// watchAuth follows the session: it shows the session kept from the last
// launch at once, refreshes it, and loads the profile of whoever signs in.
func (a *App) watchAuth() {
	client := a.store.Client()
	client.OnAuthChange(func(s *supa.Session) {
		a.post(func() { a.sessionChanged(s) })
	})
	a.sessionChanged(client.Session())
	a.run(func(ctx context.Context) func() {
		if err := client.Restore(ctx); err != nil {
			log.Printf("restore session: %v", err)
		}
		return nil
	})
}

// sessionChanged shows the user who signed in, or that they signed out.
func (a *App) sessionChanged(s *supa.Session) {
	before := a.userID()
	a.account.session = s
	defer a.updateAvatar() // a refresh may change the metadata too
	if a.userID() == before {
		return
	}
	a.account.profile = nil
	if s != nil {
		a.loadProfile()
	}
	// The practice shows the user's best and place on the leaderboard.
	if p := a.practice; p != nil && p.lesson != nil {
		a.loadBest(p)
		a.loadLeaderboard(p)
	}
	a.refreshStats()
}

func (a *App) loadProfile() {
	user := a.userID()
	a.run(func(ctx context.Context) func() {
		prof, err := a.store.Profile(ctx, user)
		if err != nil {
			log.Printf("load profile: %v", err)
		}
		return func() {
			if a.userID() == user {
				a.account.profile = prof
				a.updateAvatar()
			}
		}
	})
}

// displayName is the user's nickname, else their name, else their email.
func (a *App) displayName() string {
	s := a.account.session
	if s == nil {
		return ""
	}
	if p := a.account.profile; p != nil && p.Nickname != nil && *p.Nickname != "" {
		return *p.Nickname
	}
	if n := s.User.Metadata("full_name"); n != "" {
		return n
	}
	return s.User.Email
}

// avatarURL is the picture of the user's profile, else of their account.
func (a *App) avatarURL() string {
	s := a.account.session
	if s == nil {
		return ""
	}
	if p := a.account.profile; p != nil && p.AvatarURL != nil && *p.AvatarURL != "" {
		return *p.AvatarURL
	}
	return s.User.Metadata("avatar_url")
}

// updateAvatar downloads the user's picture, unless it is the one shown.
func (a *App) updateAvatar() {
	u := a.avatarURL()
	if u == a.account.avatarURL {
		return
	}
	a.account.avatarURL, a.account.avatar = u, nil
	if u == "" {
		return
	}
	a.run(func(ctx context.Context) func() {
		bm, err := downloadBitmap(ctx, u)
		if err != nil {
			log.Printf("download avatar: %v", err)
			return nil
		}
		return func() {
			if a.account.avatarURL == u {
				a.account.avatar = bm
			}
		}
	})
}

func downloadBitmap(ctx context.Context, u string) (*ui.Bitmap, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, &supa.Error{Status: resp.StatusCode, Message: resp.Status}
	}
	img, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	return ui.DecodeBitmap(img)
}

// authError says what went wrong with signing in, in the user's language
// when the app knows the error.
func (a *App) authError(err error) string { return authErrorText(a.tr, err) }

// authErrorText is authError in the language of tr, for any goroutine.
func authErrorText(tr i18n.Translator, err error) string {
	switch supa.ErrorCode(err) {
	case "invalid_credentials", "invalid_grant":
		return tr.T("auth.invalid_credentials")
	case "user_already_exists":
		return tr.T("auth.email_already_exists")
	case "pkce_code_verifier_not_found", "bad_code_verifier", "flow_state_expired", "flow_state_not_found":
		return tr.T("desktop.sign_in_link_invalid")
	}
	if e := (*supa.Error)(nil); errors.As(err, &e) && e.Message != "" {
		return e.Message
	}
	return tr.T("auth.error_occurred")
}

func (a *App) openLogin() {
	d := &a.dialogs
	d.login, d.loginView, d.err, d.sentEmail, d.busy = true, "", "", false, false
	d.password, d.confirm = "", ""
}

// signInWithGoogle signs in in the browser, as Google refuses embedded
// sign-ins: the browser comes back to the app's loopback server, or, when
// it cannot listen, through the auth callback deep link.
func (a *App) signInWithGoogle(c *ui.Context) {
	redirect, err := a.startLoopback()
	if err != nil {
		log.Printf("sign-in server: %v", err)
		redirect = config.AuthCallbackURL
	}
	c.OpenURL(a.store.Client().OAuthURL("google", redirect))
	a.dialogs.login = false
	a.toast("", a.t("desktop.continue_in_browser"))
}

// completeSignIn completes a sign-in from its deep link.
func (a *App) completeSignIn(u *url.URL) {
	q := u.Query()
	if q.Get("code") == "" && q.Get("error_description") == "" {
		// Some failures come in the fragment.
		q, _ = url.ParseQuery(u.Fragment)
	}
	a.account.exchanging = true
	tr := a.tr
	a.run(func(ctx context.Context) func() {
		reason := a.exchangeSignIn(ctx, tr, q)
		return func() { a.finishSignIn(reason) }
	})
}

// exchangeSignIn completes a sign-in from the query of its callback, which
// holds a PKCE code to trade for a session, or why it failed. It returns
// that reason, in the language of tr, or "" once signed in.
func (a *App) exchangeSignIn(ctx context.Context, tr i18n.Translator, q url.Values) string {
	code := q.Get("code")
	if code == "" {
		reason := q.Get("error_description")
		if reason == "" {
			reason = tr.T("auth.error_occurred")
		}
		log.Printf("sign-in failed: %s", reason)
		return reason
	}
	if err := a.store.Client().ExchangeCode(ctx, code); err != nil {
		log.Printf("exchange sign-in code: %v", err)
		return authErrorText(tr, err)
	}
	return ""
}

// finishSignIn shows how a sign-in completed outside the app went: the
// session itself comes through watchAuth.
func (a *App) finishSignIn(reason string) {
	a.account.exchanging = false
	if reason != "" {
		a.toast("error", reason)
		return
	}
	a.dialogs.login = false
}

// signIn signs in with the email form.
func (a *App) signIn() {
	d := &a.dialogs
	email, password := strings.TrimSpace(d.email), d.password
	if email == "" || password == "" {
		return
	}
	d.busy, d.err = true, ""
	a.run(func(ctx context.Context) func() {
		err := a.store.Client().SignInWithPassword(ctx, email, password)
		return func() {
			d.busy = false
			if err != nil {
				d.err = a.authError(err)
				return
			}
			d.login, d.password = false, ""
		}
	})
}

// signUp registers with the email form. The confirmation link comes back
// to the app and signs in.
func (a *App) signUp() {
	d := &a.dialogs
	email := strings.TrimSpace(d.email)
	if email == "" || d.password == "" {
		return
	}
	if d.password != d.confirm {
		d.err = a.t("auth.passwords_mismatch")
		return
	}
	d.busy, d.err = true, ""
	password := d.password
	a.run(func(ctx context.Context) func() {
		u, err := a.store.Client().SignUp(ctx, email, password, config.AuthCallbackURL)
		return func() {
			d.busy = false
			switch {
			case err != nil:
				d.err = a.authError(err)
			case len(u.Identities) == 0 && a.userID() == "":
				// GoTrue's answer for an address already registered.
				d.err = a.t("auth.email_already_exists")
			case a.userID() != "":
				d.login = false // no confirmation required
			default:
				d.sentEmail = true
			}
		}
	})
}

// signOut signs out, here and on the server.
func (a *App) signOut() {
	a.run(func(ctx context.Context) func() {
		if err := a.store.Client().SignOut(ctx); err != nil {
			log.Printf("sign out: %v", err)
		}
		return nil
	})
}

// accountButton is the login button, or the signed-in user's picture,
// which opens their menu.
func (a *App) accountButton(c *ui.Context) {
	if !a.store.Client().Configured() {
		return
	}
	pal := a.pal
	s := a.account.session
	if s == nil {
		if a.capsuleButton(c, a.t("auth.login"), func() {
			ui.Icon(c, iconUser).FontSize(16)
			ui.Text(c, a.t("auth.login")).FontSize(13)
		}).Clicked() {
			a.openLogin()
		}
		return
	}
	name := a.displayName()
	b := ui.ButtonBase(c).Label(name).Tooltip(name).Size(capsuleHeight, capsuleHeight).
		Radius(capsuleHeight/2).Border(1, pal.capsuleBorder)
	b.Children(func() { a.avatarImage(c, capsuleHeight) })
	b.Menu(func(m *ui.Menu) {
		m.Item(s.User.Email).Disabled(true)
		m.Separator()
		if m.Item(a.t("auth.my_stats")).Chosen() {
			a.openStats()
		}
		if m.Item(a.t("auth.edit_profile")).Chosen() {
			a.openProfile()
		}
		m.Separator()
		if m.Item(a.t("auth.logout")).Chosen() {
			a.signOut()
		}
	})
}

// avatarImage shows the user's picture, else their initial, size wide.
func (a *App) avatarImage(c *ui.Context, size float32) {
	pal := a.pal
	if bm := a.account.avatar; bm != nil {
		ui.Image(c, bm).Size(size, size).Fit(ui.Cover).Radius(size / 2)
		return
	}
	ui.Box(c).Size(size, size).Radius(size / 2).Background(pal.primary.Mix(pal.background, 0.82)).Center().Children(func() {
		if initial := []rune(strings.ToUpper(a.displayName())); len(initial) > 0 {
			ui.Text(c, string(initial[0])).FontSize(size * 0.42).Bold().TextColor(pal.primary)
		} else {
			ui.Icon(c, iconUser).FontSize(size * 0.55).TextColor(pal.primary)
		}
	})
}

// accountDialogs builds the dialogs of the account, and the overlay of a
// sign-in completing.
func (a *App) accountDialogs(c *ui.Context) {
	a.loginDialog(c)
	a.profileDialog(c)
	if a.account.exchanging {
		// Modal, so that nothing behind takes keys meanwhile; it closes
		// when the sign-in completes, not on a click outside.
		open := true
		ui.DialogBase(c, &open, func(backdrop, panel ui.Element) {
			backdrop.Background(ui.RGBA(0, 0, 0, 0.5))
			panel.Padding(32).Gap(16).Radius(14).Background(a.pal.card).AlignItems(ui.Center)
			ui.Spinner(c)
			ui.Text(c, a.t("auth.signing_in"))
		})
	}
}

// dialogPanel is the look of the app's dialogs: sheets, which come down
// below the title bar over the dimmed window, width wide at most.
func (a *App) dialogPanel(c *ui.Context, open *bool, width float32, fn func()) {
	pal := a.pal
	w, _ := c.Size()
	ui.DialogBase(c, open, func(backdrop, panel ui.Element) {
		backdrop.Background(pal.backdrop).Justify(ui.Start).Padding(headerHeight+8, 16, 16, 16)
		panel.Width(min(width, w-32)).Padding(24).Gap(16).Radius(22).Background(pal.card).Border(1, pal.border).
			Shadow(0, 24, 64, 0, ui.RGBA(0, 0, 0, 0.28))
		panel.Transition(ui.ElementTransition{Enter: &ui.Motion{Y: -12}, Exit: &ui.Motion{Y: -12}})
		fn()
	})
}

func (a *App) loginDialog(c *ui.Context) {
	d := &a.dialogs
	pal := a.pal
	a.dialogPanel(c, &d.login, 400, func() {
		ui.Text(c, a.t("auth.welcome")).FontSize(20).Bold()
		switch d.loginView {
		case "":
			option := func(ic *ui.SVG, label string, colored bool, fn func()) {
				b := ui.Button(c, "").Label(label).FillWidth().Padding(12, 14).Radius(12)
				b.Children(func() {
					ui.Row(c).Gap(12).Children(func() {
						if colored {
							ui.Image(c, ic).Size(18, 18)
						} else {
							ui.Icon(c, ic).FontSize(18).TextColor(pal.mutedForeground)
						}
						ui.Text(c, label)
					})
				})
				if b.Clicked() {
					fn()
				}
			}
			option(googleSVG, a.t("auth.continue_with_google"), true, func() { a.signInWithGoogle(c) })
			option(iconMail, a.t("auth.login_with_email"), false, func() { d.loginView, d.err = "sign_in", "" })
			option(iconUserPlus, a.t("auth.register_with_email"), false, func() { d.loginView, d.err, d.sentEmail = "sign_up", "", false })
		default:
			signUp := d.loginView == "sign_up"
			ui.Row(c).Children(func() {
				back := ui.Button(c, "").Label(a.t("auth.back")).Children(func() {
					ui.Text(c, a.t("auth.back")).TextColor(pal.primary)
				})
				if back.Clicked() {
					d.loginView, d.err = "", ""
				}
				ui.Spacer(c)
				title := a.t("auth.email_login")
				if signUp {
					title = a.t("auth.email_register")
				}
				ui.Text(c, title).FontSize(14).TextColor(pal.mutedForeground)
			})
			if signUp && d.sentEmail {
				ui.Text(c, a.t("auth.check_email")).TextColor(pal.foreground)
				return
			}
			field := func(label string, value *string, placeholder string, password, focus bool) ui.Element {
				var in ui.Element
				ui.Column(c).Gap(6).Children(func() {
					ui.Text(c, label).FontSize(14).Bold()
					in = ui.TextInput(c, value).Placeholder(placeholder).Label(label)
					if password {
						in.Password()
					}
					if focus {
						in.AutoFocus()
					}
				})
				return in
			}
			email := field(a.t("auth.email_address"), &d.email, a.t("auth.email_placeholder"), false, true)
			pwPlaceholder := a.t("auth.password_placeholder")
			if signUp {
				pwPlaceholder = a.t("auth.password_placeholder_new")
			}
			pw := field(a.t("auth.password"), &d.password, pwPlaceholder, true, false)
			submitted := email.Submitted() || pw.Submitted()
			if signUp {
				if field(a.t("auth.confirm_password"), &d.confirm, a.t("auth.confirm_password_placeholder"), true, false).Submitted() {
					submitted = true
				}
			}
			if d.err != "" {
				ui.Text(c, d.err).FontSize(14).TextColor(pal.destructive).Padding(10).Radius(8).
					Background(pal.destructive.Alpha(0.1)).Border(1, pal.destructive.Alpha(0.2)).FillWidth()
			}
			label := a.t("auth.sign_in")
			if signUp {
				label = a.t("auth.sign_up")
			}
			if d.busy {
				label = a.t("auth.signing_in")
				if signUp {
					label = a.t("auth.signing_up")
				}
			}
			btn := ui.PrimaryButton(c, label).FillWidth().Disabled(d.busy)
			if (btn.Clicked() || submitted) && !d.busy {
				if signUp {
					a.signUp()
				} else {
					a.signIn()
				}
			}
		}
	})
}
