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

## Data Maintenance
- After editing `public/lessons/**/grade-*.json`, run `node rebuild_index.cjs`

## Rules
- All code must be in English
- Conversation can use the user's language
- Never commit secrets or sensitive data

## Git
- If any git or release operation is needed, read `agent_docs/ci.md` first
