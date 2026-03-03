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
