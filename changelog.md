## v0.20.0 (2026-10-10)

### Features
- **Native desktop app for macOS, Windows and Linux** — Lesson Typing now has a desktop app, written in Go with MyGo's native UI and drawn on the GPU: no webview, a single binary of about 13 MB. It is a second client of the same backend with the web app's features: lessons of nine languages by grade, live stats, results with grade, personal best, recent-activity chart and leaderboard, accounts (email, Google, profile with avatar cropping, personal stats) and light and dark themes. The installers are attached to this release.
- **Typing that takes input straight from the system** — keys, input-method compositions and commits come from the OS rather than DOM events: Backspace and Enter never reach the app while an IME composes, a cancelled composition is told apart exactly, the candidate window sits under the current character and the composition shows in a bubble above it. Line breaks come from the system's text engine (CJK line-breaking rules, word wrapping), and a keystroke reshapes only its own line (about 0.1 ms).
- **Stats identical to the web's** — the typing engine is a Go port of `useTypingEngine` with its tests; Chinese keystroke weights come from a table generated with the web's pinyin-pro, so CPM matches the web's character for character and passes `submit-practice`'s checks.
- **Google sign-in through the browser** — the app waits on `127.0.0.1` for Supabase's redirect (accepted at any port, RFC 8252), signs in, and the browser shows a page saying it can be closed. Confirmation links of sign-ups made in the app come back through `lessontyping://auth/callback`.
- **Desktop touches** — a Practice menu (⌘/Ctrl+R restart, ⌘/Ctrl+N next lesson, ⌘/Ctrl+[ home), `lessontyping://lesson/<id>` links that open a lesson, a remembered window position, and Enter on the home page always starts, choosing a grade or a language only while their list is open.

### Installing the desktop app
- **macOS** (Apple silicon and Intel): open `Lesson-Typing-0.20.0-macOS.dmg` and drag the app to Applications. The app is not signed by a developer certificate yet: on first launch, allow it in System Settings → Privacy & Security → Open Anyway.
- **Windows** (x64, ARM64): run `Lesson-Typing-Setup-0.20.0-windows-x64.exe` (or `-arm64`). SmartScreen may warn until the app is signed: More info → Run anyway.
- **Linux** (x64, ARM64): install the `.deb`, or put `install.sh` next to the `.tar.gz` of your architecture and run `sh install.sh`. Needs GTK 3.

### Maintenance
- New `desktop/` Go module: `npm run desktop:dev`, `npm run desktop:build`, `npm run desktop:test`. Its texts, icons and pinyin table are generated from the web's sources, and CI checks they stay in step (`.github/workflows/desktop.yml`, which also runs the UI tests and cross-compiles six targets).
- Publishing a release now also builds the desktop installers and attaches them (`.github/workflows/desktop-release.yml`).

**Supabase**: `lessontyping://auth/callback` must be in Authentication → URL Configuration → Redirect URLs, for email confirmations from the app.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.19.0...v0.20.0
