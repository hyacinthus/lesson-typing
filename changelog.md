## v0.24.0 (2026-10-17)

### Features
- **The keys you press, shown on a keyboard while you type** — by default, a large keyboard over the bottom half of the practice, as wide as the window and unseen but for the keys pressed, which glow dimly where they are and fade out. Keys go by their position, so those an input method composes with show too, with the labels of the keyboard's layout where the browser tells them (Chromium).
- **Three keyboard modes** — a button in the practice's toolbar switches between the large keyboard, a small faint one in the bottom right corner that lights the keys pressed, and none; the choice is remembered. On the desktop app, ⌘K (Ctrl+K) switches it too, and the Practice menu lists the three. On the web, the keyboards and their button show on screens of tablet width and up.
- **Desktop: an English switch in the title bar** — the EN capsule, on the practice and the start page, switches the interface and the lessons to English, and back to your language: the last one chosen in Settings other than English, or the system's. It is blue while English is on, and the Practice menu has it too (Practice in English). There is none when the app has no language other than English to go back to.

### Fixes
- **Desktop on Windows and Linux: the title bar's controls stay clear of the window's buttons** — in narrow windows, and during a run in windows wide enough to show its status in the title bar, the account button could slide under minimize, maximize and close.

### Maintenance
- Dependencies with known vulnerabilities updated (`npm audit fix`, lockfile only).

**Full Changelog**: https://github.com/hyacinthus/lesson-typing/compare/v0.23.0...v0.24.0
