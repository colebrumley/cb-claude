---
name: diff
description: "Open FileMerge to review changes since the last snapshot"
user_invocable: true
---
# /diff — Review Changes in FileMerge

Open FileMerge (opendiff) to visually review all changes since the last snapshot commit. You can accept, reject, or edit individual changes and save them back to the working tree.

## Steps

1. Run: `git log --oneline --grep='^\[snapshot\]' -1 --format='%H'`
2. If no result, use HEAD as the base: `git rev-parse HEAD`
3. If still no result: report "No commits found to diff against." and stop.
4. Export the base commit to a temp directory:
   ```bash
   TMPDIR=$(mktemp -d "/tmp/claude-diffview-XXXXXX")
   git archive <hash> | tar -x -C "$TMPDIR"
   ```
5. Launch FileMerge with merge support:
   ```bash
   opendiff "$TMPDIR" "$(git rev-parse --show-toplevel)" -merge "$(git rev-parse --show-toplevel)" &
   ```
6. Set up background cleanup: wait for opendiff to exit, then `rm -rf "$TMPDIR"`
7. Report: "Opened FileMerge — reviewing changes since snapshot `<short-hash>`. Edit and save in FileMerge to apply changes back to your working tree."
