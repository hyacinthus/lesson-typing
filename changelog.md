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
