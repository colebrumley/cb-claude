#!/bin/bash
# launch-gitup.sh
# PostToolUse hook — auto-launches GitUp on first edit of the session

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
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# Already launched this session? Exit early.
MARKER="/tmp/claude-snapshot-${SESSION_ID}-gitup-launched"
[ -f "$MARKER" ] && exit 0

# Create marker BEFORE attempting launch — avoids retries on failure
touch "$MARKER"

# macOS only
[ "$(uname)" = "Darwin" ] || exit 0

# Launch GitUp; warn to stderr if not installed
open -a GitUp "$REPO_ROOT" 2>/dev/null || echo "Warning: GitUp not installed or failed to launch" >&2

exit 0
