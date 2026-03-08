## v0.11.0 (2026-03-09)

### New Features
- **Migrate lessons to Supabase** — Lesson content is now stored server-side in `lt_lessons` table instead of static frontend files, reducing bundle size and enabling server-side validation
- **Anti-cheat character count validation** — Submit function now verifies submitted `totalChars` against server-side lesson data using `session.lesson_id`, preventing character count spoofing
- **Smart lesson preloading** — Frontend loads current language immediately; if not English, preloads English lessons in background via `requestIdleCallback`
- **Lesson sync script** — New `npm run sync` command to push local lesson files to Supabase

### Improvements
- Fix `lesson_id` column type back to UUID across all tables
- Remove lessons from frontend bundle (moved to `lessons/` at project root)
- Delete obsolete `rebuild_index.cjs`, `verify_index.cjs`, `verify_loader.cjs`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.10.0...v0.11.0
