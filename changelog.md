## v0.16.1 (2026-06-14)

### Security
- **Cleared all open Dependabot alerts** — Regenerated the dependency lockfile so every transitive package flagged by GitHub Advisory (all reached through the dev-only `shadcn` CLI → `@modelcontextprotocol/sdk` chain) is now on a patched release: `hono` 4.12.8→4.12.25, `@hono/node-server` 1.19.11→1.19.14, `qs` 6.15.0→6.15.2, `fast-uri` 3.1.0→3.1.2, `ip-address` 10.1.0→10.2.0, `picomatch` 2.3.1→2.3.2, `express-rate-limit` 8.3.0→8.5.2. `npm audit` now reports 0 vulnerabilities.

### Maintenance
- **Dependency upgrade** — Bumped direct dependencies to latest, including a major jump for `react-easy-crop` 5→6, plus `@supabase/supabase-js`, `radix-ui`, `react`/`react-dom` 19.2.7, `react-router-dom`, `i18next`, `lucide-react`, `vite`, `eslint`, `typescript-eslint`, `shadcn`, `tailwindcss`, `zustand`.
- **Lint** — Fixed two pre-existing ESLint errors: a useless `wpm` initializer in `statsCalculator.ts`, and a `react-hooks/set-state-in-effect` violation in `EditProfileDialog.tsx` (rule scoped-disabled with justification — a key-based remount would drop Radix's close animation).
- **Tests under Node 24** — Added `scripts/ts-ext-resolver.mjs`, a test-only loader that resolves extensionless `.ts` imports and shims Vite's `import.meta.env`, so `npm test` and the basic smoke check run under Node 24's native type stripping. Added a `test:basic` script.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.0...v0.16.1
