## v0.15.0 (2026-03-16)

### New Features
- **Lyrics collection** — Added a new "Lyrics" collection for all 9 languages, each containing 50 public domain song lyrics (traditional folk songs, hymns, children's songs, etc.) as typing practice content

### Refactoring
- **Rename chineseCharCount to cjkCharCount** — Renamed the `chineseCharCount` field to `cjkCharCount` across all lesson data, source code, and database schema to eliminate ambiguity; CJK character counting now correctly includes Han ideographs, Hiragana, Katakana, and Hangul

### Database
- New migration `09_rename_chinese_to_cjk.sql` to rename `chinese_char_count` column to `cjk_char_count`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.14.0...v0.15.0
