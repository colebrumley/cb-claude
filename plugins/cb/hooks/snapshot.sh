#!/bin/bash
# snapshot.sh
# UserPromptSubmit hook — creates git snapshot commits on each turn

INPUT=$(cat)

# Extract session_id — jq first (fast), python3 fallback
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('session_id', ''))" 2>/dev/null)
fi

# Extract cwd
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
if [ -z "$CWD" ]; then
  CWD=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('cwd', ''))" 2>/dev/null)
fi

# Bail if we couldn't parse the input
[ -z "$CWD" ] && exit 0
[ -z "$SESSION_ID" ] && exit 0

# cd to working directory; bail silently if it fails
cd "$CWD" 2>/dev/null || exit 0

# Must be inside a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Check for uncommitted changes; if clean, nothing to snapshot
[ -n "$(git status --porcelain 2>/dev/null)" ] || exit 0

# Stage tracked file changes only — NOT `git add -A` (avoids .env, credentials, untracked files)
git add -u >/dev/null 2>&1

# Check if staging actually produced something to commit
if git diff --cached --quiet 2>/dev/null; then
  exit 0
fi

# Turn counter
TURN_FILE="/tmp/claude-snapshot-${SESSION_ID}-turn"
if [ -f "$TURN_FILE" ]; then
  TURN=$(cat "$TURN_FILE" 2>/dev/null)
  TURN=$((TURN + 1))
else
  TURN=1
fi
echo "$TURN" > "$TURN_FILE"

# Timestamp in UTC ISO 8601
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create snapshot commit — stdout to /dev/null (hook runner parses stdout as JSON)
git commit --no-verify -m "[snapshot] Turn $TURN — $TIMESTAMP" >/dev/null 2>&1 || exit 0

# Signal success to hook runner
echo "{\"additionalContext\": \"Snapshot created (turn $TURN)\"}"
