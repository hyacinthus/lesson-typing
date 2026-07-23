## v0.18.0 (2026-07-23)

### Features
- **Lenient punctuation matching** — IMEs make the exact punctuation form hard to control, so the typing engine now accepts equivalent variants as correct: full-width and half-width punctuation match each other (`，`/`,`, `。`/`.`, `（`/`(`, `！`/`!`, …), and quotes additionally match across left/right/straight forms (`“`/`”`/`"`, `‘`/`’`/`'`) since the keyboard has one key for both halves and the IME's alternation state rarely lines up with the text. The ideographic comma `、` deliberately stays distinct from `,`.
- **IME auto-paired punctuation handled** — When an auto-pairing IME commits both halves of a quote/bracket pair at once (e.g. typing `"` inserts `“”`), the engine now keeps only the half that belongs at the cursor instead of marking the next character wrong — both when opening a quote and when closing one. This also works for pairs embedded in a longer commit (e.g. pinyin words plus a trailing quote pair), and pairs genuinely present in the lesson text (empty quotes) are still consumed as two characters.

### Maintenance
- **Input pipeline** — IME commits now reach the typing engine as one batch instead of a per-character fan-out (one state update per commit instead of N).
- **Tests** — New unit suite for the punctuation matcher and pair resolution; `npm test` now discovers all `*.test.ts` files under `src/` (picking up the previously unwired `useCompositionInput` tests).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.17.1...v0.18.0
