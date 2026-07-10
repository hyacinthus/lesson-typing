## v0.17.0 (2026-07-10)

### Features
- **Dark mode** — Full dark theme wired via `next-themes`: follows the system preference with a manual sun/moon toggle in the header. Dark surfaces are navy-tinted to harmonize with the header, and the brand blue lightens to `#4DA6FF` for contrast on dark backgrounds.
- **Home page** — Self-typing demo animation under the hero title (per-language sample text, respects reduced motion), foreground-colored title, and an `Enter ↵` shortcut hint under the start button. New i18n keys added for all 9 languages.
- **Completion celebration** — Large S/A/B/C/D grade badge, CSS-only confetti burst (no new dependency, skipped under reduced motion), and an entrance animation on the results panel.
- **Typing screen polish** — Stronger current-character highlight, progress bar as a slim strip on top of the text card, `tabular-nums` on all stats, and accuracy shows `—` before the first keystroke instead of a meaningless "100% / grade C".
- **New SVG logo** — Crisp blue keycap replaces the bitmap favicon image in the header.

### Fixes
- **IME preview readability in dark mode** — The floating composition preview now uses an opaque high-contrast amber pill with a border; it was translucent and unreadable over dark cards.
- **Enter no longer hijacked in dialogs** — The home-page Enter-to-start listener ignores key presses coming from form fields and open dialogs (previously it could start a lesson while typing in the login form).
- **Theme-aware charts** — Recharts CPM area charts use `var(--primary)` instead of hardcoded `#007FFF`, so they follow the dark-mode primary.
- **Contrast** — Pending lesson text, error red, and primary-as-text bumped to ≥4.5:1 (WCAG AA) on dark surfaces.

### Design
- **Grade colors** — S is now gold (was purple); the ladder reads gold > green > blue > gray > red, defined as light/dark token pairs.
- **Results panel** — New dedicated `--results` token: light keeps the pale blue, dark switches to a low-saturation elevated surface so the blue stats stand out (no more blue-on-blue).
- **Semantic tokens everywhere** — All hardcoded `gray-*`/`bg-white` classes in live components replaced with shadcn semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, …); char-state, grade, and success colors are defined once in `index.css` for both themes.

### Maintenance
- **Cleanup** — Removed unused `LessonCard`/`LessonList` components; deduplicated grade computation, duration formatting (`formatTime`), reduced-motion detection (new `usePrefersReducedMotion` hook), and the shared header pill class.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.16.2...v0.17.0
