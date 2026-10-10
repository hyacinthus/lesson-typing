
## CI/CD Guide

### Git Commit
When you generate git commit message, always start with one of feat/fix/chore/docs/test/refactor/improve. Title Format: `<type>: <subject>`, subject should start with lowercase. Only one-line needed, do not generate commit message body.

### Github Release
1. Make a `git pull --rebase` first.
2. Find the last version number using `gh release`, diff with it, summarize the release note to changelog.md for later use. Calculate the version number of this release by semantic versioning. Add a diff link to release note too, the from and to should be the version number.
3. Insert the release note to the beginning of RELEASE_NOTES.md
4. Make the final git add --all, commit, push to origin main.
5. Use `gh release create` command, use changelog.md as notes file in it.
6. Publishing the release builds the web Docker image and the desktop installers and updates (`.github/workflows/desktop-release.yml`), which it attaches to the release; check that run. The desktop build fails when RELEASE_NOTES.md has no section for the version, or without the `MYGO_UPDATER_PRIVATE_KEY` secret that signs the updates.
