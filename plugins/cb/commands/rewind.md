---
name: rewind
description: "Rewind to the last snapshot — reset working tree to Claude's last checkpoint"
user_invocable: true
---
# /rewind — Undo Claude's Last Turn

Reset the working tree to the most recent `[snapshot]` commit.

## Steps

1. Run: `git log --oneline --grep='^\[snapshot\]' -1 --format='%H %s'`
2. If no result: report "No snapshots found — nothing to rewind to." and stop.
3. Extract the commit hash and message.
4. Run: `git reset --hard <hash>`
5. Report: "Rewound to: <commit message>. Re-enter your prompt to retry."

## Known Limitation

After rewinding, HEAD is on the snapshot commit. A second `/rewind` finds the same commit — this is single-undo only. To rewind further, use `git log --grep='\[snapshot\]'` to find older snapshots and reset manually.
