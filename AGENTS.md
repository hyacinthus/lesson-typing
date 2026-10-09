# AGENTS.md

## Commands
- Install deps: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`
- Test: `npm test`
- Desktop app (needs Go 1.27+): `npm run desktop:dev`, `npm run desktop:build`, `npm run desktop:test`; see `desktop/README.md`

## Project Layout
- `src/` frontend code
- `desktop/` desktop app: native UI in Go (MyGo), a second client of the same Supabase backend; it does not use `src/`
- `lessons/` lesson data (synced to Supabase, not served to frontend)
- `agent_docs/` project conventions

## Tech Stack
- React 19 + TypeScript + Vite
- Zustand
- react-router-dom
- i18next
- shadcn/ui
- Go + MyGo native UI (desktop app)

## Data Maintenance
- After editing `lessons/**/grade-*.json`, run `npm run sync`

## Rules
- All code must be in English
- Conversation can use the user's language
- Never commit secrets or sensitive data
- Always use the app theme color (`#007FFF` / `--primary` in CSS) for primary interactive elements; do not use shadcn's default black primary
- When adding new UI, use shadcn components, and add i18n keys for the component texts
- All schema changes must be written to `supabase/schema/` and executed using `supabase cli`.
- The desktop app (`desktop/`) has the web app's features in native UI: keep the two in step. It shares the web's texts (copied by `go -C desktop generate ./internal/i18n`, which CI checks); its own texts live in `desktop/internal/i18n/locales`, under the same key-parity rule as `src/locales`

## Git
- If any git or release operation is needed, read `agent_docs/ci.md` first
