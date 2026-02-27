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
- `public/lessons/` lesson data
- `public/lessons/index.json` lesson index
- `agent_docs/` project conventions

## Tech Stack
- React 19 + TypeScript + Vite
- Zustand
- react-router-dom
- i18next
- shadcn/ui (Button, Input, Label, Dialog, DropdownMenu, Avatar, Select)

## Data Maintenance
- After editing `public/lessons/**/grade-*.json`, run `node rebuild_index.cjs`

## Rules
- All code must be in English
- Conversation can use the user's language
- Never commit secrets or sensitive data
- Always use the app theme color (`#90caf9` / `--primary` in CSS, hover `#64b5f6`) for primary interactive elements; do not use shadcn's default black primary
- When adding new shadcn/ui components, update the Tech Stack list in this file

## Git
- If any git or release operation is needed, read `agent_docs/ci.md` first
