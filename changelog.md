## v0.18.2 (2026-07-30)

### Security
- **All Dependabot alerts resolved (8: 4 high, 4 moderate)** — `npm audit` is now clean. Fixed advisories: react-router CSRF bypass (GHSA-qwww-vcr4-c8h2), fast-uri host confusion ×2, hono ×3, @hono/node-server path traversal, brace-expansion DoS ×2, body-parser DoS, and postcss source-map path traversal.

### Maintenance
- **react-router v7 → v8** — `react-router-dom` is discontinued upstream; the app now imports `BrowserRouter`/`Routes`/hooks from `react-router@8.3.0`. No behavior change (verified in-browser: routing, collection switching, lesson loading).
- **Dependencies** — all direct deps upgraded to latest (supabase-js, radix-ui, recharts, react 19.2.8, vite 8.1.5, eslint 10.8, tailwind 4.3.3, and friends). Two known holds remain: `typescript` at ~6.0.x (typescript-eslint peer allows <6.1.0) and `@vitejs/plugin-react` now pinned exactly to 6.0.2 (6.0.3+ still ERESOLVEs via its optional @rolldown/plugin-babel → babel 8 peer chain).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.1...v0.18.2
