
## CI/CD Guide

### Git Commit
When you generate git commit message, always start with one of feat/fix/chore/docs/test/refactor/improve. Title Format: `<type>: <subject>`, subject should start with lowercase. Only one-line needed, do not generate commit message body.

### Github Release
1. Make a `git pull --rebase` first.
2. Find the last version number using `gh release`, diff with it, summarize the release note to changelog.md for later use, don't commit this temporary file. Regardless of release or pre-release, we all use the vX.X.X as the version number without adding a suffix. Calculate the version number of this release. Add a diff link to release note too, the from and to should be the version number.
3. If it is a production release, insert the release note to the beginning of RELEASE_NOTES.md (This file contains all history release notes, don't use it in gh command).
4. Made an extra git add, commit, push the changelog.md and RELEASE_NOTES.md.
5. Construct `gh release create` command, calculate the next version number, use changelog.md as notes file in gh command. If it is a pre-release, use `gh release create --prerelease` command.
6. Use gh to do release only, don't create branch, tag, or pull request.
7. You don't need to delete the changelog.md file after release, it is in gitignore file.