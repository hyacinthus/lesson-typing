## v0.11.1 (2026-03-09)

### Bug Fixes
- **Fix chart tooltip mismatch** — When multiple practice records fall within the same minute, the tooltip now correctly associates with each data point instead of always pointing to one of them. Uses unique index as X-axis key instead of formatted time string.

### Dependencies
- Upgrade `recharts` from v2 to v3 (major), with updated chart.tsx type compatibility
- Patch updates: `i18next`, `lucide-react`, `postcss`, `react-i18next`, `@types/node`

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.11.0...v0.11.1
