# Design: Native Desktop App

## Problem

The first desktop build wrapped the web app in the system webview (MyGo's
web windows). Typing is the whole product, and in the webview input methods
were unreliable and every keystroke went through DOM events whose order
differs between engines (`useCompositionInput` exists to paper over
Safari vs Chrome). A typing app should take keys, compositions and commits
straight from the OS and draw the text itself.

## Solution

Rewrite the desktop app as native UI with MyGo's `ui` package (Go, drawn
on the GPU, no webview). The web app stays as it is; the desktop app is a
second client of the same Supabase backend, with feature parity.

The webview wrapper is removed: `src/` loses the `src/desktop/` glue, the
`mygo-runtime` dependency and the desktop PKCE branch.

## Why native input is better

`Element.HandleInput` + `TextCaret` give the typing surface:

- `InputKeyDown` for Backspace/Enter, never while an IME composes (keys
  are the IME's then);
- `InputCompose` with the preedit text and its caret;
- `InputText` for typed characters and IME commits, preceded by an empty
  `InputCompose` when a composition commits.

So "composition cancelled" is exactly "empty compose not followed by
text", with no timing heuristics. `TextCaret(rect)` puts the candidate
window at the current character.

## Layout

```
desktop/
  main.go            app bootstrap: single instance, deep links, window, menu
  mygo.json          name, identifier, url scheme, buildCommand (go generate)
  internal/
    config/          Supabase URL and anon key (config_gen.go, generated from
                     ../.env, gitignored)
    engine/          typing session, punctuation matching, stats, romaji and
                     pinyin keystroke weights (pure, tested; port of
                     src/hooks/useTypingEngine.ts and src/utils/*)
    supa/            minimal Supabase client: auth (password, sign-up, PKCE
                     OAuth, refresh), PostgREST, RPC, edge functions, storage
    data/            lessons, collections, practice logs, leaderboard,
                     profiles on top of supa
    i18n/            the desktop's own locale files (9 languages, key parity
                     tested like src/locales)
    prefs/           language, collection, theme, session, local history in
                     the user data directory
  app/               views: shell, home, practice, results, dialogs
```

## Typing surface

- The lesson splits into paragraphs at `\n`; a paragraph ending in a newline
  shows `↵` as its last target character.
- Line breaks come from the system text engine: `ui.ShapeText(paragraph,
  font, width)` once per lesson and width; the line of each character is
  read from `SelectionRects`. CJK kinsoku and word wrapping are therefore
  the platform's.
- Each line is drawn from its own `ui.ShapeRichText` layout with one span
  per status run (pending, correct, incorrect with wavy underline, current
  with highlight). A keystroke reshapes only the lines whose spans changed.
  Lines sit on a fixed, loose line height (2× the font size, as the web's
  `leading-loose`).
- The caret position comes from the line layout's `Caret`; it slides
  between characters and blinks while idle. The text scrolls (animated) to
  keep the current line in the upper part of the card.
- The IME preedit shows in a bubble above the caret, and `TextCaret` puts
  the candidate window under the current character.

## Stats parity

Stats must match the web byte for byte, because `submit-practice` checks
them against its own computation (CPM within 30%, trace, durations):

- Chinese keystroke weights use pinyin-pro's readings: `go generate` dumps
  the pinyin length of every CJK ideograph (U+3400–U+4DBF, U+4E00–U+9FFF,
  U+F900–U+FAFF) with the repo's pinyin-pro into a committed table, so no
  Go pinyin library is needed and the numbers are identical.
- Japanese romaji lengths and punctuation equivalence classes are ported
  with their tests.
- The trace holds one entry per committed character, in ms since the start.

## Auth

- Email sign-in and sign-up: GoTrue REST endpoints.
- Google: PKCE. The app builds the authorize URL with a code challenge,
  opens it in the browser, and receives the code on a loopback server
  (`http://127.0.0.1:<port>/auth/callback`, which Supabase accepts at any
  port, RFC 8252), which exchanges it (`grant_type=pkce`) and answers the
  browser with a page to close. A custom scheme left the browser spinning
  on Google's page.
- Email confirmation links of sign-ups made in the app come back through
  `lessontyping://auth/callback` (`App.OnOpenURL`), which must be in
  Supabase's redirect URLs.
- The session (refresh token) persists in the user data directory with
  0600 permissions and refreshes before expiry.

## Updates

MyGo's updater with its update window in native UI: the release workflow
attaches signed update archives and their manifests to the release, which
installed apps check in the latest release. No server of our own.

## Phases

1. Clean up the webview wrapper; skeleton window with theme, i18n, prefs.
2. Engine, layout and stats in Go with ported tests.
3. Practice screen against real lessons; IME verified with `ui.Tester`
   (`Compose`, `Type`) and on the real app.
4. Home (collection, language, theme, demo), results (grade, best, chart,
   leaderboard, confetti), navigation and shortcuts.
5. Accounts: sign-in/up, Google, session persistence, submissions through
   start-practice/submit-practice, profile with avatar crop and upload,
   personal stats.
6. Packaging, menus, CI, docs.
7. Updates from the GitHub releases.
