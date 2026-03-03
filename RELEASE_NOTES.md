## v0.3.2 (2026-03-04)

### Improvements
- **New Record indicator**: Results screen now displays a 🎉 New Record badge when the current session's score exceeds the historical personal best.
- **Personal Best branding**: Results screen now clearly labels historical achievements as "Personal Best" across all languages.
- **Reliable Stats Comparison**: Improved sorting logic and pre-fetching of historical data to ensure accurate "New Record" detection.
- **Enhanced Activity Chart**: Improved deduplication and injection logic for the recent activity chart to ensure the latest session is always accurately reflected.

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.3.1...v0.3.2

## v0.3.1 (2026-03-03)

### Bug Fixes
- Fixed client avatar flash before profile is fully loaded
- Fixed cache issue in deployment causing app crash
- Fixed multiple Supabase Edge Function bugs

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.3.0...v0.3.1

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

## v0.2.0 (2026-03-03)

### New Features
- **Recent Activity Chart**: After completing a lesson, an area chart displays CPM trend across the most recent practice sessions for that lesson (requires ≥ 3 sessions)
- **Best Score Comparison**: Results screen now shows your personal best record alongside the current session's score
- **Practice Log Persistence**: Practice logs (including duration, CPM, WPM, accuracy) are now saved to Supabase for cross-device history
- **User Authentication**: Login/registration via Google OAuth and email, with profile editing and avatar upload
- **Collections Filter**: Lessons can be filtered by collection on the home page
- **Italian Language**: Added Italian (it) as the 8th supported language

### Improvements
- Brand/theme color updated to `#007FFF`
- Header background updated to solid `#E9F4FF`
- `CharacterRenderer` memoized for better typing performance
- Dependencies upgraded to latest versions

### Bug Fixes
- Fixed lint and TypeScript issues across multiple components
- Fixed login overlay and profile edit dialog accessibility warnings
- Fixed focus and lesson title display issues
- Fixed language selector dropdown behavior

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.1.0...v0.2.0

## v0.1.1 - 2026-01-28
- Polish translations for Portuguese, French, German, and Italian UI labels

Diff: https://github.com/hyacinthus/lesson-typing/compare/v0.1.0...v0.1.1

## v0.1.0 - 2026-01-26
- Add history-aware practice navigation on the home page
- Use explicit typing types import extension

Diff: https://github.com/hyacinthus/lesson-typing/compare/v0.0.1...v0.1.0

## v0.0.1 - 2026-01-24
- Initial React + Vite typing application with lesson browsing and practice flow
- Multi-language lesson sets for English, Chinese, Japanese, Spanish, Portuguese, French, and German
- Typing stats, auto-scrolling, and status i18n
- CI workflow, license, and contributor guidance

Diff: https://github.com/hyacinthus/lesson-typing/compare/v0.0.0...v0.0.1
