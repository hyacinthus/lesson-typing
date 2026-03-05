# i18n Subpath Routing Design

## Goal

Enable Google to index each language version separately with correct titles and descriptions, using URL-based language paths (`/en/`, `/zh/`, `/es/`, etc.).

## Approach: Build-time Template Injection

Generate per-language `index.html` files at build time with correct `<head>` meta tags. The app remains a pure SPA — no SSR/SSG, no hydration, zero runtime risk.

## Architecture

```
dist/
├── index.html              ← root redirect (detect lang → navigate)
├── en/index.html           ← <html lang="en">, English meta tags
├── zh/index.html           ← <html lang="zh">, Chinese meta tags
├── es/index.html           ← <html lang="es">, Spanish meta tags
├── ja/index.html           ← ...
├── pt/index.html
├── fr/index.html
├── de/index.html
├── it/index.html
├── sitemap.xml             ← generated with hreflang entries
└── assets/                 ← shared JS/CSS bundles (unchanged)
```

## Changes Required

### 1. Build Script: `scripts/generate-i18n-pages.cjs`

Runs after `vite build`. For each of 8 languages:

- Copy `dist/index.html` → `dist/{lang}/index.html`
- Replace `<html lang="en">` → `<html lang="{lang}">`
- Replace `<title>` with localized title
- Replace `<meta name="description">` with localized description
- Replace `<meta property="og:title">`, `og:description`, `og:url`
- Replace `<meta name="twitter:title">`, `twitter:description`
- Replace `<link rel="canonical">` → `https://lessontyping.com/{lang}/`
- Replace structured data `name` and `description`
- Inject `<link rel="alternate" hreflang="xx" href="https://lessontyping.com/xx/" />` for all 8 languages + `x-default`
- Generate `sitemap.xml` with all language URLs and `xhtml:link` hreflang

Root `dist/index.html` is replaced with a lightweight page that:
- Has `<link rel="alternate" hreflang>` tags (for Google)
- Contains JS to detect language (localStorage → navigator.language → fallback en) and redirect

### 2. i18n Translations

Add `meta_description` key to each language in `src/i18n.ts`:

- en: "Free typing practice for elementary school students. Practice with real curriculum texts — nursery rhymes, poetry, and prose from Grades 1-6."
- zh: "免费小学语文打字练习。使用课本课文进行打字训练——涵盖1-6年级的儿歌、古诗和课文。"
- (similar for es, ja, pt, fr, de, it)

Also used by the build script (extracted as a shared data file or duplicated in the script).

### 3. React Router Integration

Replace direct `<HomePage />` rendering in `App.tsx` with react-router-dom:

```
Routes:
  /           → <RootRedirect />
  /:lang/*    → <LangLayout />  → <HomePage />
```

**RootRedirect**: Reads localStorage `lesson-typing-language` → browser language → defaults to `en`. Navigates to `/{lang}/` with `replace: true`.

**LangLayout**: Reads `:lang` param, validates it against supported languages, calls `i18n.changeLanguage(lang)`, renders `<Outlet />`.

**HomePage**: Mostly unchanged. Language selector `onValueChange` now navigates to `/{newLang}/` instead of just calling `i18n.changeLanguage()`. Also updates localStorage.

### 4. Caddy Configuration

Update `try_files` to serve sub-directory index files:

```
try_files {path} {path}/index.html /index.html
```

Add cache headers for language index files (no-cache, same as root).

### 5. Sitemap Generation

Build script generates `dist/sitemap.xml`:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://lessontyping.com/en/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://lessontyping.com/en/"/>
    <xhtml:link rel="alternate" hreflang="zh" href="https://lessontyping.com/zh/"/>
    <!-- ... all languages ... -->
    <xhtml:link rel="alternate" hreflang="x-default" href="https://lessontyping.com/"/>
  </url>
  <!-- repeat for each language -->
</urlset>
```

## What Does NOT Change

- LessonPractice component and typing experience
- Zustand stores (lessons, auth, history)
- Supabase authentication
- Lesson data loading
- All component code (except HomePage language selector handler)
- CSS/styling

## Build Pipeline

```
npm run build
  → tsc -b && vite build              (existing)
  → node scripts/generate-i18n-pages.cjs  (new post-build step)
```

Update `package.json` build script:
```json
"build": "tsc -b && vite build && node scripts/generate-i18n-pages.cjs"
```
