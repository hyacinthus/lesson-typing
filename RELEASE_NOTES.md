## v0.18.5 (2026-09-06)

### Security
- **All npm audit findings resolved (10: 6 high, 3 moderate, 1 low)** — `npm audit` is clean again. Fixed transitive advisories include undici (5 high: response desynchronization via retry interceptor GHSA-8xcm-r25x-g524, cross-user cache-directive disclosure GHSA-4cwx-7wf7-3272 / GHSA-jr45-8vmc-qm54, CRLF injection via blob body type GHSA-m8rv-5g2x-5cg5, cookie attribute injection GHSA-v3r7-h72x-cjcm) and qs (array-limit bypass GHSA-x5fp-wj9c-mxmx, DoS via attacker-controlled isBuffer GHSA-4mjr-xmp4-gh2g).

### Maintenance
- **Dependencies** — all direct deps upgraded to latest: supabase-js 2.115, i18next 26.4.2 / react-i18next 17.0.13, lucide-react 1.41, pinyin-pro 3.29.3, react-router 8.3.1, zustand 5.0.15, vite 8.2.2, eslint 10.10 / typescript-eslint 8.69, shadcn 4.21, playwright 1.63, plus `@types/*` and patch bumps (sonner, uuid, autoprefixer, postcss, globals, eslint-plugin-react-refresh). Build, lint and tests verified green. The two known holds remain: `typescript` at ~6.0.x (typescript-eslint 8.69 still peers `<6.1.0`) and `@vitejs/plugin-react` pinned at 6.0.2 (6.1.1 still ERESOLVEs via its optional @rolldown/plugin-babel → babel 8 peer chain).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.4...v0.18.5

## v0.18.4 (2026-08-01)

### Fixes
- **Timer now ticks while composing the first phrase** — v0.18.3 made the recorded time correct, but the visible timer stayed at 0:00 during the first IME composition and jumped to n seconds at the first commit. The session now starts provisionally at the first composition keystroke, so the timer ticks live from the moment you start typing. If the composition is cancelled before anything is committed (e.g. Esc), everything rolls back to the pristine not-started state: timer back to 0:00, article switching available again, and no backend practice session is created — session creation is now keyed on the first committed character. Mid-session cancelled compositions keep the clock running as before.

### Maintenance
- **Input plumbing** — `useCompositionInput` now takes an options object (`onTextInput`/`onDelete`/`onInputStart`/`onInputCancel`/`enabled`) instead of positional arguments, and the transitional `startedAt` backdating channel from v0.18.3 was removed: `markInputStart` at compositionstart is now the single owner of the clock origin.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.3...v0.18.4

## v0.18.3 (2026-08-01)

### Fixes
- **IME timing no longer starts late** — With an IME, the clock previously started only when the first composed text was committed, so the time spent composing the first phrase (potentially a whole sentence) was silently dropped, inflating CPM/WPM and shrinking the recorded duration. The session start is now backdated to the moment the first composition began, so composing time counts from the very first keystroke. Cancelled compositions (e.g. Esc before anything commits) still leave the session unstarted, exactly as before — no timer, no backend session, and the "change article" button stays available.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.2...v0.18.3

## v0.18.2 (2026-07-30)

### Security
- **All Dependabot alerts resolved (8: 4 high, 4 moderate)** — `npm audit` is now clean. Fixed advisories: react-router CSRF bypass (GHSA-qwww-vcr4-c8h2), fast-uri host confusion ×2, hono ×3, @hono/node-server path traversal, brace-expansion DoS ×2, body-parser DoS, and postcss source-map path traversal.

### Maintenance
- **react-router v7 → v8** — `react-router-dom` is discontinued upstream; the app now imports `BrowserRouter`/`Routes`/hooks from `react-router@8.3.0`. No behavior change (verified in-browser: routing, collection switching, lesson loading).
- **Dependencies** — all direct deps upgraded to latest (supabase-js, radix-ui, recharts, react 19.2.8, vite 8.1.5, eslint 10.8, tailwind 4.3.3, and friends). Two known holds remain: `typescript` at ~6.0.x (typescript-eslint peer allows <6.1.0) and `@vitejs/plugin-react` now pinned exactly to 6.0.2 (6.0.3+ still ERESOLVEs via its optional @rolldown/plugin-babel → babel 8 peer chain).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.1...v0.18.2

## v0.18.1 (2026-07-29)

### Content
- **"葡萄沟" moved to grade 2** — it is a grade-2 textbook text and was misplaced in the grade-3 collection; it now sits in grade 2 with difficulty 2.
- **"燕子" added to grade 3** — Zheng Zhenduo's classic from the grade-3 textbook fills the vacated slot.
- **Character-count fixes** — recalculated stale `characterCount`/`cjkCharCount` metadata for several grade-3/4/5 lessons (content unchanged).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.0...v0.18.1

## v0.18.0 (2026-07-23)

### Features
- **Lenient punctuation matching** — IMEs make the exact punctuation form hard to control, so the typing engine now accepts equivalent variants as correct: full-width and half-width punctuation match each other (`，`/`,`, `。`/`.`, `（`/`(`, `！`/`!`, …), and quotes additionally match across left/right/straight forms (`“`/`”`/`"`, `‘`/`’`/`'`) since the keyboard has one key for both halves and the IME's alternation state rarely lines up with the text. The ideographic comma `、` deliberately stays distinct from `,`.
- **IME auto-paired punctuation handled** — When an auto-pairing IME commits both halves of a quote/bracket pair at once (e.g. typing `"` inserts `“”`), the engine now keeps only the half that belongs at the cursor instead of marking the next character wrong — both when opening a quote and when closing one. This also works for pairs embedded in a longer commit (e.g. pinyin words plus a trailing quote pair), and pairs genuinely present in the lesson text (empty quotes) are still consumed as two characters.

### Maintenance
- **Input pipeline** — IME commits now reach the typing engine as one batch instead of a per-character fan-out (one state update per commit instead of N).
- **Tests** — New unit suite for the punctuation matcher and pair resolution; `npm test` now discovers all `*.test.ts` files under `src/` (picking up the previously unwired `useCompositionInput` tests).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.17.1...v0.18.0

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

## v0.17.0 (2026-07-10)

### Features
- **Dark mode** — Full dark theme wired via `next-themes`: follows the system preference with a manual sun/moon toggle in the header. Dark surfaces are navy-tinted to harmonize with the header, and the brand blue lightens to `#4DA6FF` for contrast on dark backgrounds.
- **Home page** — Self-typing demo animation under the hero title (per-language sample text, respects reduced motion), foreground-colored title, and an `Enter ↵` shortcut hint under the start button. New i18n keys added for all 9 languages.
- **Completion celebration** — Large S/A/B/C/D grade badge, CSS-only confetti burst (no new dependency, skipped under reduced motion), and an entrance animation on the results panel.
- **Typing screen polish** — Stronger current-character highlight, progress bar as a slim strip on top of the text card, `tabular-nums` on all stats, and accuracy shows `—` before the first keystroke instead of a meaningless "100% / grade C".
- **New SVG logo** — Crisp blue keycap replaces the bitmap favicon image in the header.

### Fixes
- **IME preview readability in dark mode** — The floating composition preview now uses an opaque high-contrast amber pill with a border; it was translucent and unreadable over dark cards.
- **Enter no longer hijacked in dialogs** — The home-page Enter-to-start listener ignores key presses coming from form fields and open dialogs (previously it could start a lesson while typing in the login form).
- **Theme-aware charts** — Recharts CPM area charts use `var(--primary)` instead of hardcoded `#007FFF`, so they follow the dark-mode primary.
- **Contrast** — Pending lesson text, error red, and primary-as-text bumped to ≥4.5:1 (WCAG AA) on dark surfaces.

### Design
- **Grade colors** — S is now gold (was purple); the ladder reads gold > green > blue > gray > red, defined as light/dark token pairs.
- **Results panel** — New dedicated `--results` token: light keeps the pale blue, dark switches to a low-saturation elevated surface so the blue stats stand out (no more blue-on-blue).
- **Semantic tokens everywhere** — All hardcoded `gray-*`/`bg-white` classes in live components replaced with shadcn semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, …); char-state, grade, and success colors are defined once in `index.css` for both themes.

### Maintenance
- **Cleanup** — Removed unused `LessonCard`/`LessonList` components; deduplicated grade computation, duration formatting (`formatTime`), reduced-motion detection (new `usePrefersReducedMotion` hook), and the shared header pill class.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.2...v0.17.0

## v0.16.2 (2026-06-26)

### Maintenance
- **Dependency upgrade** — Bumped direct dependencies to latest: `@types/node` 25→26 (major), `vite` 8.0.16→8.1.0, `radix-ui` 1.5.0→1.6.0, `lucide-react` 1.18.0→1.21.0, `recharts` 3.8.1→3.9.0, `react-router-dom` 7.17.0→7.18.0, `i18next` 26.3.1→26.3.3, `@supabase/supabase-js` 2.108.1→2.108.2, `uuid` 14.0.0→14.0.1, `playwright` 1.60.0→1.61.1, `typescript-eslint` 8.61.0→8.62.0, `shadcn` 4.11.0→4.11.1, `autoprefixer` 10.5.0→10.5.2, `eslint-plugin-react-refresh` 0.5.2→0.5.3, `globals` 17.6.0→17.7.0. Lint, unit tests, and the production build all pass.
- **`@vitejs/plugin-react` held at 6.0.2** — 6.0.3 makes npm try to opt-in its optional `@rolldown/plugin-babel` peer, whose transitive `@babel/plugin-transform-runtime` pulls `@babel/core` 8 and conflicts with the `@babel/core` 7 pinned by the dev toolchain (`eslint-plugin-react-hooks`, `shadcn`). Since the 6.0.2→6.0.3 delta is only a `@rolldown/pluginutils` patch, the bump was skipped rather than forcing a broken dependency tree.

### Security
- **`npm audit`: 2 dev-only advisories outstanding** — Newly-disclosed advisories now flag two build-time transitive packages — `@babel/core` ≤7.29.0 (low) via `eslint-plugin-react-hooks`/`shadcn`, and `js-yaml` ≤4.1.1 (moderate) via `shadcn` → `cosmiconfig`. Both are dev/build-time only and absent from the shipped bundle; neither has a patched release reachable without forcing `@babel/core` 8 (pinned to 7 by the React/ESLint tooling), so they are tracked for a future toolchain bump.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.1...v0.16.2

## v0.16.1 (2026-06-14)

### Security
- **Cleared all open Dependabot alerts** — Regenerated the dependency lockfile so every transitive package flagged by GitHub Advisory (all reached through the dev-only `shadcn` CLI → `@modelcontextprotocol/sdk` chain) is now on a patched release: `hono` 4.12.8→4.12.25, `@hono/node-server` 1.19.11→1.19.14, `qs` 6.15.0→6.15.2, `fast-uri` 3.1.0→3.1.2, `ip-address` 10.1.0→10.2.0, `picomatch` 2.3.1→2.3.2, `express-rate-limit` 8.3.0→8.5.2. `npm audit` now reports 0 vulnerabilities.

### Maintenance
- **Dependency upgrade** — Bumped direct dependencies to latest, including a major jump for `react-easy-crop` 5→6, plus `@supabase/supabase-js`, `radix-ui`, `react`/`react-dom` 19.2.7, `react-router-dom`, `i18next`, `lucide-react`, `vite`, `eslint`, `typescript-eslint`, `shadcn`, `tailwindcss`, `zustand`.
- **Lint** — Fixed two pre-existing ESLint errors: a useless `wpm` initializer in `statsCalculator.ts`, and a `react-hooks/set-state-in-effect` violation in `EditProfileDialog.tsx` (rule scoped-disabled with justification — a key-based remount would drop Radix's close animation).
- **Tests under Node 24** — Added `scripts/ts-ext-resolver.mjs`, a test-only loader that resolves extensionless `.ts` imports and shims Vite's `import.meta.env`, so `npm test` and the basic smoke check run under Node 24's native type stripping. Added a `test:basic` script.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.0...v0.16.1

## v0.16.0 (2026-05-23)

### Content
- **Lesson authenticity audit** — Replaced ~140 fabricated/AI-generated entries across all 9 languages (grade-1..6 + poetry-7) with verified public-domain works:
  - **English** — additional traditional Mother Goose rhymes, Aesop's fables, Andersen/Grimm tales, Kipling's *Just So Stories*
  - **Chinese** — real PEP (人教版) textbook lessons (赵州桥, 大自然的声音, 飞向蓝天的恐龙, 桂花雨, 珍珠鸟, 母鸡, 陶罐和铁罐), plus 朱自清《春》, 萧红《祖父的园子》
  - **French** — corrected 6 misattributed/fabricated poems in poetry-7 (Hugo, Rimbaud, Musset, Jammes); replaced Tournier (not PD) with verbatim Verne
  - **German** — traditional Kinderreime/Volkslieder, Grimm tales, Aesop, Goethe's *Der Fischer*
  - **Italian** — replaced ~75 generic *Sussidiario/Storia/Scienza/Geografia/Educazione Civica* entries with Rodari, De Amicis (*Cuore*), Collodi (*Pinocchio* chapters), Calvino (*Marcovaldo*), Pascoli, Carducci, Leopardi, Foscolo, Manzoni, Dante, Petrarca, Boccaccio, Pirandello, Verga, Svevo, D'Annunzio, Ariosto, Tasso; verbatim Italian Constitution Art. 1–3 and UDHR Art. 1–2
  - **Japanese** — 8 misattributed/fabricated 新美南吉 stories replaced with canonical Aozora Bunko texts; corrected 宮沢賢治 entry
  - **Korean** — replaced ~30 fabricated 수필/역사/동시 entries with traditional 전래동화 and canonical public-domain poems by 김소월, 한용운, 윤동주, 이육사, 정지용, 김영랑, 이상화 (빼앗긴 들에도 봄은 오는가), 이상; short-story excerpts by 김유정, 현진건, 이효석, 나도향
  - **Portuguese** — traditional Brazilian/Portuguese cantigas, Aesop, Machado de Assis (*A Cartomante*, *Missa do Galo*), Olavo Bilac, Castro Alves, Gonçalves Dias, Casimiro de Abreu, Cruz e Sousa, Florbela Espanca, Euclides da Cunha; verbatim Hino Nacional Brasileiro lyrics
  - **Spanish** — traditional canciones infantiles, Aesop, Juan Ramón Jiménez (*Platero y yo*), Gabriela Mistral, Rubén Darío (*Sonatina*, *Canción de Otoño en Primavera*), Bécquer, José Martí, Federico García Lorca, Cervantes (*Don Quijote* opening)

### Maintenance
- **Dependency upgrade** — Bumped all dependencies to latest, including major version jumps for TypeScript 5.9→6.0, Vite 7→8, ESLint 9→10, react-i18next 16→17, i18next 25→26, lucide-react 0.577→1.16, uuid 13→14, @vitejs/plugin-react 5→6, globals 15→17, shadcn 3→4
- **TypeScript 6 compatibility** — Removed deprecated `baseUrl` from `tsconfig.app.json` (paths now resolve relative to tsconfig location)
- **gitignore** — Added `.claude/scheduled_tasks.lock`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.15.3...v0.16.0

---

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
