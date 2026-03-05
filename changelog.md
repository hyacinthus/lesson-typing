## v0.8.0 (2026-03-05)

### New Features
- **Login prompt on results page** — When not logged in, the results screen now shows a message encouraging users to log in to track and analyze their results, with a login button that opens the unified login dialog
- **Unified login dialog** — Extracted login dialog (Google, email sign-in, email sign-up) into a standalone component available from any page, ensuring consistent login experience across the app

### Fixes
- Fix OAuth redirect losing auth token hash fragment when routing through language subpaths
- Fix "New Record" badge incorrectly showing for non-authenticated users
- Unify action button styles on results page (consistent rounded corners and shadows)

**Full diff**: https://github.com/hyacinthus/lesson-typing/compare/v0.7.0...v0.8.0
