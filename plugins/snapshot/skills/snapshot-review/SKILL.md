---
description: "Snapshot system awareness. Use when the user asks about undoing Claude's changes, reverting edits, or understanding the snapshot/rewind system. Also use when advising on snapshot cleanup or limitations."
---
# Snapshot System

This project uses automatic git snapshots to track Claude's edits turn-by-turn.

## How It Works

- A `UserPromptSubmit` hook runs `git add -u && git commit` before each user message is processed
- Each snapshot commit is tagged `[snapshot] Turn N — <timestamp>` on the current branch
- Only tracked files are staged (`git add -u`) — new untracked files are not included
- GitUp auto-launches on the first file edit to provide a visual diff viewer

## Undoing Changes

To undo Claude's last turn of edits, use `/rewind`. This runs `git reset --hard` to the most recent `[snapshot]` commit.

### Limitations

- **Single-undo only**: After rewinding, HEAD is on the snapshot commit. A second `/rewind` finds the same commit — no-op. For deeper undo, use `git log --grep='\[snapshot\]'` to find older snapshots and `git reset --hard <hash>` manually.
- **Turn 1 is not undoable**: The first snapshot is created when the user sends their second message. Claude's first turn of edits has no prior snapshot to rewind to.
- **Tracked files only**: `git add -u` does not stage new untracked files. Files Claude creates that aren't yet tracked by git won't appear in snapshots.

## Cleanup

Snapshot commits pollute the branch history. After a session:

```bash
# Soft reset to before the first snapshot and recommit:
git reset --soft <commit-before-first-snapshot>
git commit -m "your actual commit message"

# Or interactive rebase to drop snapshot commits:
git rebase -i HEAD~N  # drop every [snapshot] line
```

## When NOT to Use /rewind

- If you need to undo more than one turn — use manual `git reset --hard` with a specific snapshot hash
- If you want to preserve some changes from the last turn — use `git stash` or selective `git checkout` instead
- If you're not in a git repo — snapshots don't exist, /rewind won't work
