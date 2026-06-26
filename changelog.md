## v0.16.2 (2026-06-26)

### Maintenance
- **Dependency upgrade** — Bumped direct dependencies to latest: `@types/node` 25→26 (major), `vite` 8.0.16→8.1.0, `radix-ui` 1.5.0→1.6.0, `lucide-react` 1.18.0→1.21.0, `recharts` 3.8.1→3.9.0, `react-router-dom` 7.17.0→7.18.0, `i18next` 26.3.1→26.3.3, `@supabase/supabase-js` 2.108.1→2.108.2, `uuid` 14.0.0→14.0.1, `playwright` 1.60.0→1.61.1, `typescript-eslint` 8.61.0→8.62.0, `shadcn` 4.11.0→4.11.1, `autoprefixer` 10.5.0→10.5.2, `eslint-plugin-react-refresh` 0.5.2→0.5.3, `globals` 17.6.0→17.7.0. Lint, unit tests, and the production build all pass.
- **`@vitejs/plugin-react` held at 6.0.2** — 6.0.3 makes npm try to opt-in its optional `@rolldown/plugin-babel` peer, whose transitive `@babel/plugin-transform-runtime` pulls `@babel/core` 8 and conflicts with the `@babel/core` 7 pinned by the dev toolchain (`eslint-plugin-react-hooks`, `shadcn`). Since the 6.0.2→6.0.3 delta is only a `@rolldown/pluginutils` patch, the bump was skipped rather than forcing a broken dependency tree.

### Security
- **`npm audit`: 2 dev-only advisories outstanding** — Newly-disclosed advisories now flag two build-time transitive packages — `@babel/core` ≤7.29.0 (low) via `eslint-plugin-react-hooks`/`shadcn`, and `js-yaml` ≤4.1.1 (moderate) via `shadcn` → `cosmiconfig`. Both are dev/build-time only and absent from the shipped bundle; neither has a patched release reachable without forcing `@babel/core` 8 (pinned to 7 by the React/ESLint tooling), so they are tracked for a future toolchain bump.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.1...v0.16.2
