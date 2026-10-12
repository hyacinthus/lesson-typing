# Lesson Typing Desktop

The desktop app for macOS, Windows and Linux: native UI written in Go with
[MyGo](https://github.com/egoist/mygo)'s `ui` package and drawn on the GPU
(Metal, Direct3D 11, OpenGL). There is no webview: keys, input method
compositions and commits come straight from the system, and the app draws
the lesson text itself. It is a second client of the web app's Supabase
backend, with the same features. See
`docs/plans/2026-10-10-native-desktop-design.md` for the design.

## Requirements

- Go 1.27+ (the `mygo` CLI is a Go tool of this module, pinned in `go.mod`)
- The repository's `.env`, as for the web app: `go generate ./internal/config`
  copies `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (only those) into
  `internal/config/config_gen.go`, which git ignores
- To run the app: macOS 12+, Windows 10+, or Linux with GTK 3

## Commands

Run from the repository root:

| Command | |
|---|---|
| `npm run desktop:dev` | builds and starts a development app, rebuilt when the Go code changes |
| `npm run desktop:build` | packages the app for this machine in `desktop/build/` |
| `npm run desktop:build -- -platform darwin/universal,windows/amd64,linux/amd64` | cross-compiles other platforms (no cgo needed) |
| `npm run desktop:test` | the tests, including the UI's, which run without a window |

`go -C desktop tool mygo doctor` checks the machine. Windows installers need
NSIS (`makensis`); without it the build produces the bare `.exe`.

Generated files, committed, which CI checks against their sources
(`go -C desktop generate ./internal/i18n ./internal/engine ./app` after an
`npm install`):

- `internal/i18n/web/`: the web app's texts and languages, copied from
  `src/locales` and `src/i18n-meta.json`.
- `internal/engine/pinyin_weights.bin`: the pinyin length of every CJK
  ideograph, from the web app's pinyin-pro, so that Chinese CPM matches the
  web's.
- `app/icons/*.svg`: the lucide icons that `app/icons.go` names, from the
  web app's lucide-react; `app/icons/app.png`, the web app's icon.

## Layout

- `main.go`: the windows, the menu, single-instance handling and the
  `lessontyping://` deep links.
- `app/`: the interface: one window that opens on a lesson
  (`practice_view.go`, its title bar in `shell.go`), the welcome sheet of
  the first launch (`welcome.go`), the results' sheet (`results.go`), and
  the windows of the settings (`settings.go`) and of the user's statistics
  (`mystats.go`). `typing.go` and `textview.go` are the typing area:
  line breaks from the system's text engine, one layout per line styled by
  the characters' states, reshaped only where a keystroke changed it, and
  input through `HandleInput` + `TextCaret`.
- `internal/engine`: the typing session, stats and punctuation matching, a
  port of `src/hooks/useTypingEngine.ts` and `src/utils` with their tests.
- `internal/supa`: a small Supabase client (auth, PostgREST, edge
  functions, storage); `internal/data` the records on top of it.
- `internal/i18n`: the texts in nine languages: the web app's (`web/`,
  generated) and the desktop's own (`locales/`). The tests keep every
  language's keys equal to English's.
- `internal/prefs`: the user's choices, the session and the PKCE verifier,
  in the user data directory (the last two readable by the user alone).

## Sign-in

Email sign-in and sign-up use GoTrue directly. Google signs in in the
browser, as it refuses embedded sign-ins: the app listens on `127.0.0.1` at
a free port, opens Supabase's authorize URL with a PKCE challenge, and
Supabase sends the browser back to `http://127.0.0.1:<port>/auth/callback`.
The app trades the code for a session there and answers with a page saying
the user can close it. Supabase accepts loopback redirects at any port
without listing them (RFC 8252).

Confirmation links of sign-ups made in the app, which may be opened much
later, come back through `lessontyping://auth/callback?code=…` instead,
which must be in the Supabase project's redirect URLs (Authentication → URL
Configuration).

`lessontyping://lesson/<id>` opens a lesson.

## Releases

Publishing a GitHub release runs `.github/workflows/desktop-release.yml`:
it builds macOS (universal disk image, on a macOS runner), Windows (x64 and
arm64 installers) and Linux (x64 and arm64 `.deb`, archives and
`install.sh`) with the release's tag as the version, and attaches them to
the release. `workflow_dispatch` with a tag builds them again. The apps are
not signed: macOS asks to allow the app in System Settings → Privacy &
Security, and Windows SmartScreen warns, until signing certificates are set
up (see MyGo's `docs/github-actions.md`).

## Updates

Installed apps update themselves from the latest release with MyGo's
updater and its update window (`updates` in `mygo.json`; see MyGo's
`docs/updates.md` and `docs/plugins/updater.md` for how it checks and
installs, and where apps can update). Check for Updates… is in the app
menu on macOS and in Help elsewhere. What is ours:

- The release build signs each target's update archive with the
  `MYGO_UPDATER_PRIVATE_KEY` secret, whose public half is
  `updates.publicKey`, and fails without it. The manifests,
  `update-<target>.json`, go up after the archives, so that apps never read
  one whose archive is missing.
- The update window shows the version's section of `RELEASE_NOTES.md`; the
  build fails when it has none.
- The private key: installed apps accept only updates signed with it, so
  losing it strands them, and whoever has it can sign code for every user.
  Keep it in a password manager besides the repository secret, never in
  the repository. `go tool mygo keygen` made it; with a new key, every user
  has to install a release by hand.
- The `.deb` is updated by the package manager, not by the app.
- No delta updates (`deltas: 0`): they need the release to stay a draft
  while it builds, which `release: published` rules out.

## Shortcuts

| Key | |
|---|---|
| Enter | start (welcome), next lesson (results) |
| R | restart (results) |
| ⌘/Ctrl+R, ⌘/Ctrl+N | restart, change lesson (Practice menu) |
| ⌘/Ctrl+1 … 9 | choose a collection (Practice menu) |
| ⌘/Ctrl+, | settings |
