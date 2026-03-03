## v0.3.0 (2026-03-03)

### New Features
- **Anti-Cheat System**: Track keystroke traces and validate session legitimacy.
- **Supabase Edge Functions**: Implement secure session initialization (`start-practice`), validation (`submit-practice`), and auth testing (`test-auth`).
- **Database Schema**: Add `unusual_practice` table and anti-cheat tracking columns to `practice_sessions` via SQL migrations.

### Bug Fixes & Improvements
- Fixed multiple session management bugs preventing proper start and submission of practice sessions.
- Fixed a bug causing the cursor to not return to the typing area.
- Fixed an authentication issue causing 401 Unauthorized errors during Edge Function API calls.
- `.npmrc` file is now properly ignored via `.gitignore` to avoid exposing local configuration.
- Add `japaneseRomaji` utility for Romaji processing.

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.2.0...v0.3.0
