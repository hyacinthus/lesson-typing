## v0.18.5 (2026-09-06)

### Security
- **All npm audit findings resolved (10: 6 high, 3 moderate, 1 low)** — `npm audit` is clean again. Fixed transitive advisories include undici (5 high: response desynchronization via retry interceptor GHSA-8xcm-r25x-g524, cross-user cache-directive disclosure GHSA-4cwx-7wf7-3272 / GHSA-jr45-8vmc-qm54, CRLF injection via blob body type GHSA-m8rv-5g2x-5cg5, cookie attribute injection GHSA-v3r7-h72x-cjcm) and qs (array-limit bypass GHSA-x5fp-wj9c-mxmx, DoS via attacker-controlled isBuffer GHSA-4mjr-xmp4-gh2g).

### Maintenance
- **Dependencies** — all direct deps upgraded to latest: supabase-js 2.115, i18next 26.4.2 / react-i18next 17.0.13, lucide-react 1.41, pinyin-pro 3.29.3, react-router 8.3.1, zustand 5.0.15, vite 8.2.2, eslint 10.10 / typescript-eslint 8.69, shadcn 4.21, playwright 1.63, plus `@types/*` and patch bumps (sonner, uuid, autoprefixer, postcss, globals, eslint-plugin-react-refresh). Build, lint and tests verified green. The two known holds remain: `typescript` at ~6.0.x (typescript-eslint 8.69 still peers `<6.1.0`) and `@vitejs/plugin-react` pinned at 6.0.2 (6.1.1 still ERESOLVEs via its optional @rolldown/plugin-babel → babel 8 peer chain).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.18.4...v0.18.5
