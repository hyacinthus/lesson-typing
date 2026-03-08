# AGENTS.md

## Commands
- Install deps: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`
- Basic check: `node test-basic.js`

## Project Layout
- `src/` frontend code
- `lessons/` lesson data (synced to Supabase, not served to frontend)
- `agent_docs/` project conventions

## Tech Stack
- React 19 + TypeScript + Vite
- Zustand
- react-router-dom
- i18next
- shadcn/ui

## Data Maintenance
- After editing `lessons/**/grade-*.json`, run `npm run sync`

## Rules
- All code must be in English
- Conversation can use the user's language
- Never commit secrets or sensitive data
- Always use the app theme color (`#007FFF` / `--primary` in CSS) for primary interactive elements; do not use shadcn's default black primary
- When adding new UI, use shadcn components, and add i18n keys for the component texts
- All schema changes must be written to `supabase/schema/` and executed using `supabase cli`.

## Git
- If any git or release operation is needed, read `agent_docs/ci.md` first
