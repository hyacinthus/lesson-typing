---
name: shadcn-ui
description: Use this skill when adding or modifying shadcn/ui components in this repository (React + TypeScript + Vite + Tailwind CSS v4).
---

# shadcn/ui skill for this repository

Follow these rules when working with shadcn/ui in this project.

## 1) Initialize only when needed

If `components.json` does not exist yet, initialize shadcn/ui first:

```bash
npx shadcn@latest init
```

Use Vite + TypeScript settings and target `src` for components.

## 2) Keep generated files in the standard locations

- UI components: `src/components/ui/*`
- Shared utils: `src/lib/utils.ts`

Do not move generated shadcn/ui files unless explicitly requested.

## 3) Keep aliases consistent

If alias support is missing, configure:

- `tsconfig.app.json`:
  - `compilerOptions.baseUrl = "."`
  - `compilerOptions.paths = { "@/*": ["./src/*"] }`
- `vite.config.ts`:
  - Add `resolve.alias` so `@` points to `./src`

## 4) Add components through the CLI

Generate components with:

```bash
npx shadcn@latest add <component-name>
```

Prefer generated components over hand-written copies.

## 5) Required helper dependencies

If missing, add:

```bash
npm install clsx tailwind-merge
```

Use a `cn` helper in `src/lib/utils.ts` for class name composition.

## 6) Project conventions

- Keep all source code and code comments in English.
- Reuse existing project architecture and naming.
- For user-facing text, use the existing i18next localization flow instead of hardcoded strings.
- After changes, run project checks that already exist (`npm run build`, `npm run lint`) when code was modified.
