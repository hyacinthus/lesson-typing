## v0.15.3 (2026-03-20)

### Content
- **German lyrics curation** — Curated German lyrics for quality and diversity
- **Italian lyrics curation** — Curated Italian lyrics for quality and diversity
- **Japanese lyrics curation** — Curated Japanese lyrics: fixed 8 songs with wrong/corrupted content (romanized, English translations, JoJo fan lyrics), reduced artist over-representation (Official髭男dism 5→2), added 7 new songs from diverse artists (高橋洋子, 中島みゆき, 一青窈, LiSA, Aimer, スキマスイッチ, ヨルシカ), standardized title formatting

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.15.2...v0.15.3

---

## v0.15.2 (2026-03-18)

### Content
- **English lyrics curation** — Curated English lyrics for quality and diversity with full song lyrics
- **French lyrics curation** — Curated French lyrics with full lyrics for all 50 songs, improved artist diversity (41 distinct artists), standardized difficulty, and fixed title formatting

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.15.1...v0.15.2

---

## v0.15.1 (2026-03-18)

### Bug Fixes
- **SEO: remove noindex from root page** — Removed the `noindex` robots meta tag from the root redirect page that was preventing Google from indexing the site; added proper title and description meta tags

### Content
- **Chinese lyrics curation** — Curated Chinese lyrics collection with diverse artists and added curation guide

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.15.0...v0.15.1

---

## v0.15.0 (2026-03-16)

### New Features
- **Lyrics collection** — Added a new "Lyrics" collection for all 9 languages, each containing 50 public domain song lyrics (traditional folk songs, hymns, children's songs, etc.) as typing practice content

### Refactoring
- **Rename chineseCharCount to cjkCharCount** — Renamed the `chineseCharCount` field to `cjkCharCount` across all lesson data, source code, and database schema to eliminate ambiguity; CJK character counting now correctly includes Han ideographs, Hiragana, Katakana, and Hangul

### Database
- New migration `09_rename_chinese_to_cjk.sql` to rename `chinese_char_count` column to `cjk_char_count`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.14.0...v0.15.0

---

## v0.14.0 (2026-03-15)

### New Features
- **Leaderboard** — Added Top 10 leaderboard showing best CPM scores per lesson
- **Change article button** — A "Change" button appears in the top-right corner of the practice page before typing starts, allowing users to switch to a different article; disappears once the first character is typed

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.13.0...v0.14.0

---

## v0.13.0 (2026-03-12)

### New Features
- **Keyboard shortcuts** — Press Enter to start practice from the home page; press Enter/Space to restart or Escape to go back on the result page
- **Poetry collection** — Added new poetry lessons

### Bug Fixes
- **Fix collection filter not updating on language switch** — When switching to a previously loaded language, the collection dropdown now correctly updates to show that language's collections instead of staying on the old language

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.12.0...v0.13.0

---

## v0.12.0 (2026-03-11)

### New Features
- **Localized collection names** — Collection (grade) names are now stored in a dedicated `lt_collections` database table with per-language display names, fixing the bug where the collection filter dropdown always showed English regardless of the selected language

### Database
- New `lt_collections` table with composite PK `(id, language)` for localized collection metadata
- Sync script (`npm run sync`) now upserts collection names alongside lessons

### Improvements
- Remove hardcoded `collectionTitle` from lesson data model; collection names are fetched separately from DB
- Fix `preloadEnglish` to only warm loader caches, preventing empty collection dropdown when switching languages

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.11.1...v0.12.0

---

## v0.11.1 (2026-03-09)

### Bug Fixes
- **Fix chart tooltip mismatch** — When multiple practice records fall within the same minute, the tooltip now correctly associates with each data point instead of always pointing to one of them. Uses unique index as X-axis key instead of formatted time string.

### Dependencies
- Upgrade `recharts` from v2 to v3 (major), with updated chart.tsx type compatibility
- Patch updates: `i18next`, `lucide-react`, `postcss`, `react-i18next`, `@types/node`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.11.0...v0.11.1

---

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

---

## v0.10.0 (2026-03-07)

### New Features
- **Add Korean (한국어) as the 9th supported language** — Full support including UI translations, SEO metadata, routing, and 120 lessons across 6 grades:
  - Grade 1-2: Korean folk tales (전래동화) and children's poems (동시) — 콩쥐팥쥐, 흥부와 놀부, 토끼와 거북이, 의좋은 형제, 삼년고개, and more
  - Grade 3-4: Legends (설화), essays, poetry, and Korean history — 단군 신화, 춘향전, 심청전, 을지문덕, 이순신, 정지용, 김영랑
  - Grade 5-6: Classic Korean literature — 김소월 (진달래꽃, 산유화), 윤동주 (서시, 별 헤는 밤), 한용운 (님의 침묵), 김유정 (봄봄, 동백꽃), and modern Korean history

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.9.2...v0.10.0

---

## v0.9.2 (2026-03-07)

### Bug Fixes
- Fix Google Search Console "Duplicate without user-selected canonical" issue: added canonical tag to root redirect page, removed conflicting root URL from sitemap, updated `x-default` hreflang to point to `/en/`
- npm audit fix

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.9.1...v0.9.2

---

## v0.9.1 (2026-03-05)

### Bug Fixes
- Position IME composition overlay near the typing cursor instead of fixed at bottom-center of screen, improving visual association when using input methods (e.g., Chinese pinyin)

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.9.0...v0.9.1

---

## v0.9.0 (2026-03-05)

### Bug Fixes
- **Comprehensive quality review and corrections for all 8 language lesson texts** — Fixed typos, spelling errors, factual inaccuracies, punctuation issues, and recalculated character counts across all 48 lesson files (Chinese, English, Japanese, French, German, Spanish, Portuguese, Italian)
  - Chinese: Fixed quote formatting, typos (曹冲称象, 荷花, 普罗米修斯), historical error (开国大典), removed duplicate/AI-generated content
  - English: Fixed tense errors, missing words, incorrect metadata, removed duplicate lessons
  - Japanese: Fixed particle errors, katakana/hiragana confusion, classical text mistakes (徒然草, 論語)
  - French: Fixed accent marks, typography, spelling corrections in La Fontaine/Molière/Flaubert texts
  - German: Fixed grade progression inversion (swapped 8 stories between G3/G4↔G5), standardized Erlkönig spelling
  - Spanish: Fixed accents, gender agreement, renamed misattributed lesson title
  - Portuguese: Fixed spelling, tense, crase accent errors
  - Italian: Fixed vocabulary and verb form errors

### Other
- doc: a post

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.8.0...v0.9.0

## v0.8.0 (2026-03-05)

### New Features
- **Login prompt on results page** — When not logged in, the results screen now shows a message encouraging users to log in to track and analyze their results, with a login button that opens the unified login dialog
- **Unified login dialog** — Extracted login dialog (Google, email sign-in, email sign-up) into a standalone component available from any page, ensuring consistent login experience across the app

### Fixes
- Fix OAuth redirect losing auth token hash fragment when routing through language subpaths
- Fix "New Record" badge incorrectly showing for non-authenticated users
- Unify action button styles on results page (consistent rounded corners and shadows)

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.7.0...v0.8.0

---

## v0.7.0 (2026-03-05)

### What's New
- **Multilingual SEO with i18n subpath routing** — Each language now has its own URL path (`/en/`, `/zh/`, `/es/`, `/ja/`, `/pt/`, `/fr/`, `/de/`, `/it/`), enabling Google to index each language version separately with localized titles, descriptions, and meta tags
- Build-time template injection generates per-language `index.html` with localized Open Graph, Twitter Card, and Schema.org structured data
- Automatic hreflang tags and multilingual sitemap for proper search engine language targeting
- React Router integration with language-aware routing; language selector now updates URL
- Root URL auto-detects user language from browser settings and redirects accordingly
- Brand name updated to "Lesson Typing" (with space) for better readability in search results

### Fixes
- Fix typo in Grade 1 Chinese lesson (踢键 → 踢毽)

### Chores
- Remove supabase MCP configuration

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.6.0...v0.7.0

---

## v0.6.0 (2026-03-04)

### Improvements
- **Mobile-Optimized Homepage Header**: Reorganized into a 2-row layout on mobile — logo + user menu on the first row, collection and language selectors on the second row
- **Compact Stats Toolbar**: Replaced the 2x2 stats card grid with a single-row inline toolbar on mobile, freeing up screen space for the typing area
- **Mobile-Friendly Results Section**: Compressed completion results, personal best comparison, and activity chart for mobile viewports
- **Responsive Practice Header**: Title now truncates on narrow screens to prevent overlap with the back button; "Back to Home" text hidden on mobile
- **Improved Hero Section**: Scaled down hero text and reduced vertical spacing on mobile for a better first impression
- **Responsive Typography**: Reduced typing area text size and padding on mobile for better readability

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.5.0...v0.6.0

## v0.5.0 (2026-03-04)

### New Features
- **Personal Stats Dialog**: Added a "My Stats" option in the user menu that opens a dialog showing the user's 3 most recent practice results (with lesson names, CPM, WPM, accuracy, and score grade) and a progress chart of the last 20 sessions
- **Feedback Dialog**: Added a "Feedback" option in the user menu linking to GitHub Issues for bug reports and suggestions

### Technical
- Added `getAllRecentPracticeLogs` method to history store for cross-lesson practice log queries
- Added i18n translations for stats dialog across all 8 supported languages

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.4.0...v0.5.0

## v0.4.0 (2026-03-04)

### New Features
- **SEO Optimization**: Added Open Graph, Twitter Card meta tags, structured data (JSON-LD), canonical URL, and noscript fallback for search engine visibility
- **PWA Support**: Added web app manifest with icons for installable app experience
- **Features Section**: Added a visible features section on the homepage highlighting curriculum texts, progress tracking, and multilingual support (in all 8 languages)
- **Sitemap & Robots**: Added sitemap.xml and robots.txt for search engine crawling

### Improvements
- **Caching Headers**: Configured immutable caching for hashed assets, no-cache for HTML, and stale-while-revalidate for lesson data
- **Security Headers**: Added X-Content-Type-Options and X-Frame-Options headers
- **Sticky Header**: Homepage header now stays visible while scrolling
- **Dynamic Lang Attribute**: HTML lang attribute now updates automatically on language change

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.3.2...v0.4.0

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
