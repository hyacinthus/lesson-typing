## v0.23.0 (2026-10-15)

### Features
- **A download page for the desktop app** — `lessontyping.com/<language>/download`, or just `/download`, offers the installer for the visitor's system: the macOS disk image, the Windows installer or the Debian package. It shows the latest release's version and file sizes, every platform's download, the one-line Linux install command, and how to open the app the first time on macOS and Windows. The account menu (Desktop App) and a link under the home page's features lead to it.
- The download page has its own title, description and language links for search engines and link previews, in every language, and is in the sitemap.

### Fixes
- **Pages that don't exist go to the home page** — `/en/nope` showed a blank page. Addresses without a language, such as `/download`, keep their page in the reader's language.
- Switching the language on the home page changes the tab's title too, and a new page opens at its top.

The desktop app itself has no changes in this version.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.22.0...v0.23.0
