## v0.21.0 (2026-10-10)

### Features
- **The desktop app updates itself** — once a day, and from Check for Updates… (the app menu on macOS, Help on Windows and Linux), the app looks for a newer release. A window shows what is new and offers to install it, skip it or wait; installing downloads the new version, checks its signature, replaces the app and restarts it. The window speaks the language the app started in. Updates are signed with a key of the project, which the app checks before installing anything.
- Apps installed on macOS (in Applications), Windows (the installer) and Linux (`install.sh`) update in place; the `.deb` is updated by the package manager. Installs of v0.20.0 have no updater: install this version by hand once.
- **Linux: install with one command** — `curl -fsSL https://github.com/hyacinthus/lesson-typing/releases/latest/download/install.sh | sh` downloads the app of the machine's architecture from the latest release and installs it for the user; `install.sh` next to a downloaded `.tar.gz` still installs that one.

### Fixes
- **Desktop: the Help menu shows on Windows and Linux** — it was hidden there, with its Feedback item.

### Maintenance
- Publishing a release now also signs an update archive of each desktop target with the `MYGO_UPDATER_PRIVATE_KEY` secret and attaches it with its manifest (`update-<target>.json`), uploaded last; the build fails without the key, or without the version's section in RELEASE_NOTES.md, which the update window shows.

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.20.0...v0.21.0
