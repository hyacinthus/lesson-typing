## v0.17.1 (2026-07-11)

### Fixes
- **Typing engine rewrite (pure state updates)** — Fixed a batch of bugs caused by side effects inside React state updaters: a timer-interval leak accumulating one orphaned 10 Hz interval per run, timing that only started at the 2nd–3rd keystroke (inflating CPM on short lessons), the first keystroke-trace entries being dropped, and `onStart` firing twice (duplicate backend sessions). The displayed duration now also keeps ticking while you pause between keystrokes instead of freezing.
- **Results-screen shortcuts no longer hijack dialogs** — `R`/`Enter` on the results screen previously fired even while typing in the login dialog (the letter *r* was untypeable in the email field) and swallowed browser shortcuts like `Cmd+R`. Shortcuts now ignore modifier keys, form fields, dialogs, menus, and focused buttons/links.
- **Safari IME** — The Enter that commits a composition no longer inserts a stray newline; keys consumed by the IME are ignored across the whole key handler (covers Backspace too).
- **Fast finishes no longer lose the run** — Completion now awaits the in-flight practice-session creation instead of silently submitting without one.
- **Sync failures are visible** — Failed server submissions, expired sessions, and runs flagged by validation now show a toast instead of failing silently (new i18n keys in all 9 languages).
- **Personal stats** — Lesson names are now resolved for records practiced under another language (previously showed a raw UUID).

### Security
- **`submit-practice` hardening (deployed)** — The submitted `lessonId` must match the anti-cheat session, so scores can no longer be planted on another lesson's leaderboard; a well-formed keystroke trace with at least one entry per typed character is now mandatory (empty/stub/malformed traces are flagged); accuracy and error counts are cross-validated against character counts; all numeric fields are validated (NaN-proof); raw character throughput is capped server-side; `language`/`collection` are taken from the lesson row instead of the client.

### Performance
- **Stats calculation off the O(n²) path** — Content-language detection is cached per lesson and pinyin keystroke weights per character, so each keystroke no longer rescans the whole lesson nor redoes pinyin lookups for every typed Han character.

### Accessibility & i18n
- **Light-mode reading contrast** — Untyped lesson text raised from ~2.5:1 to ≥4.5:1 (WCAG AA) on the card, matching the dark theme's documented standard.
- **Localized auth errors** — Common sign-in/sign-up errors (wrong credentials, existing account) now show translated messages via a shared `mapAuthError`; the avatar-crop "Zoom" label is localized.

### Maintenance
- **CI** — New GitHub Actions workflow runs lint, both test suites, and the full build on every push/PR (with superseded-PR-run cancellation).
- **Deploy correctness** — Caddy `no-cache` headers now actually apply to real page navigations (previously matched nothing post-rewrite, letting browsers serve stale HTML pointing at deleted hashed assets after a deploy); local `.env` files are excluded from the Docker build context so secrets can't be baked into images.
- **Tests** — First unit tests for `calculateStats` (English/Chinese weighting, accuracy, zero-duration, progress).
- **Dependencies** — Routine upgrades (supabase-js, i18next, react-router-dom, recharts, vite, eslint, tailwind, and friends).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.17.0...v0.17.1
