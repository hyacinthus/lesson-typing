## v0.19.0 (2026-09-20)

### Features
- **Lesson deep links** — every lesson now has its own URL (`/<lang>/lesson/<id>`), so a practice page can be shared, bookmarked and reloaded. The next lesson is picked up front and its text warmed in the background, so "Next" switches without a loading screen. Caddy rewrites `/<lang>/…` deep links to that language's entry page so they survive a hard refresh.
- **Faster first load** — the main bundle dropped from 1.47 MB to 388 KB (gzip 490 KB → 122 KB). recharts, the avatar cropper, the pinyin dictionary and the eight non-English translation packs are now split into chunks that load only when needed; the result-screen chart is prefetched while you type, and the user-menu dialogs prefetch when the menu opens. The home page now fetches lesson metadata only (title, collection, counts); the text of a lesson is fetched when it is opened. Session check and lesson list start in parallel with the translation chunk.
- **Leaderboard in one round trip** — a new `lt_lesson_leaderboard` RPC returns the top 10 with nicknames plus the viewer's own rank, replacing four sequential queries. It refreshes as soon as the server has processed a submitted run instead of after a fixed one-second wait.

### Fixes
- **Long lessons no longer expire mid-run** — practice sessions lasted 30 minutes, but the longest lessons (6,000+ characters) take a slow typist far longer, and the finished run was rejected as "Session expired". Sessions now last 24 hours; anti-cheat already bounds the claimed duration against the session start, so the window is not load-bearing.
- **Sessions were never deleted** — the practice-log → session foreign key was RESTRICT, so the cleanup after each submission (and the expired-session sweep) failed silently and sessions piled up. The constraint is now `on delete set null`.
- **Flagged runs no longer count as a personal best** — best-record queries filter on `is_valid`, the "New record" badge compares against valid runs only, and a run the server flags is removed from local history.
- **Profiles are created by the database** — an `auth.users` insert trigger creates the profile row (existing users backfilled), removing the client-side create-on-first-load race and its timer-based de-duplication.
- **Anti-cheat details** — a later check could overwrite an earlier cheat reason; the CPM cross-check now has a 5 cpm floor so very slow runs are not flagged on rounding; anonymous viewers get `false` rather than `null` for `is_current_user`.
- **Enter on the home page** no longer starts a lesson while a select or menu popover is open.
- **Root redirect keeps the query string** (e.g. OAuth `?code=`), not just the hash.
- **Han character detection** covers CJK Extension A and compatibility ideographs, matching the lesson counter.

### Maintenance
- **Tests moved to vitest** — 111 tests cover the typing engine (IME provisional start/cancel, delete, trace, callbacks), the anti-cheat validator (extracted to a pure `validate.ts`), translation key parity across all nine locales, and lesson picking. The Node strip-types runner, `test:basic` and the resolver hook are gone; ESLint now covers `supabase/functions`.
- **One source of truth for languages** — UI codes, labels and the lesson-language mapping derive from `src/i18n-meta.json`; the duplicated desktop/mobile language pickers became a `LanguageSelect` component.
- **Translations split** into `src/locales/<lang>.json`; eight dead keys removed.
- **Trace retention** — a nightly pg_cron job clears keystroke traces older than 90 days, with a partial index so it touches only boundary rows.
- Removed 33 debug `console.log` calls and three unused dependencies (`@supabase/auth-ui-react`, `@supabase/auth-ui-shared`, `uuid`).

**Schema**: run `supabase/schema/10` through `13`. **Edge functions**: redeploy `start-practice` and `submit-practice`.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.5...v0.19.0
