---
name: anti-sycophancy
description: "Install the Critical Feedback Protocol into CLAUDE.md with enforcement hook. Usage: /anti-sycophancy [install|check|remove]"
user_invocable: true
arguments:
  - name: args
    description: "Action: install (default), check, or remove"
    required: false
---
# Anti-Sycophancy Setup
Install or manage the Critical Feedback Protocol in the current project's CLAUDE.md, with a PostToolUse hook that prevents accidental removal.

## Parse Arguments
Extract action from `$ARGUMENTS`. Default to `install` if empty or missing.
Valid actions: `install`, `check`, `remove`.

---
## Action: install

### Step 1: Locate or Create CLAUDE.md
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  CLAUDE_MD="${REPO_ROOT}/CLAUDE.md"
else
  CLAUDE_MD="./CLAUDE.md"
fi
```

Read the existing CLAUDE.md if it exists. If it doesn't exist, create it.

### Step 2: Add or Update the Critical Feedback Protocol
Check if the file already contains the marker `<!-- critical-feedback-protocol -->`.

**If the marker exists**: replace everything between `<!-- critical-feedback-protocol -->` and `<!-- /critical-feedback-protocol -->` with the canonical content below.

**If the marker does not exist**: append the canonical content to the end of the file.

#### Canonical Content
```markdown
<!-- critical-feedback-protocol -->
## Critical Feedback Protocol
NEVER agree just to be agreeable. You MUST push back on bad ideas, over-engineering, premature abstraction, and wrong approaches BEFORE writing code. Lead with problems, not praise. Say "this is more complex than needed", "YAGNI", or "the real issue is X not Y" when true. If you realize mid-task the direction is wrong, STOP and say so. Quantify trade-offs honestly. Be direct, not contrarian — if the approach is good, say why specifically. Push back once, then execute what the user decides.
<!-- /critical-feedback-protocol -->
```

### Step 3: Install the Enforcement Hook
Create the hook script at `.claude/hooks/enforce-critical-feedback.sh`:

```bash
#!/bin/bash
# enforce-critical-feedback.sh
# PostToolUse hook for Write|Edit — ensures Critical Feedback Protocol persists in CLAUDE.md

INPUT=$(cat)

# Extract file path — try python3 first (always available on macOS), fall back to jq
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
fi

# Only care about CLAUDE.md files
case "$FILE_PATH" in
  *CLAUDE.md) ;;
  *) exit 0 ;;
esac

# File must exist
[ -f "$FILE_PATH" ] || exit 0

# Check for the marker
if ! grep -q '<!-- critical-feedback-protocol -->' "$FILE_PATH" 2>/dev/null; then
  cat <<'HOOK_EOF'
{"decision":"allow","reason":"CLAUDE.md was modified and the Critical Feedback Protocol was removed. Run /anti-sycophancy install to restore it."}
HOOK_EOF
fi
```

Make the script executable:
```bash
chmod +x .claude/hooks/enforce-critical-feedback.sh
```

### Step 4: Register the Hook in Settings
Read `.claude/settings.json` (create if it doesn't exist). Add the PostToolUse hook entry if not already present:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": ".claude/hooks/enforce-critical-feedback.sh"
      }
    ]
  }
}
```

**Merge rules:**
- If `hooks` key doesn't exist, add it
- If `PostToolUse` array doesn't exist, add it
- If an entry with command `enforce-critical-feedback.sh` already exists, skip (idempotent)
- Preserve all other existing settings and hooks

### Step 5: Confirm
Report to user:
```
Anti-sycophancy installed:
- CLAUDE.md: Critical Feedback Protocol section added
- Hook: .claude/hooks/enforce-critical-feedback.sh
- Settings: PostToolUse hook registered for Write|Edit

The protocol is now active in every conversation. If CLAUDE.md is edited
and the section is removed, Claude will be reminded to re-add it.
```

---
## Action: check

1. Read CLAUDE.md and check for the `<!-- critical-feedback-protocol -->` marker
2. Check if `.claude/hooks/enforce-critical-feedback.sh` exists and is executable
3. Check if `.claude/settings.json` has the hook registered

Report status:
```
Anti-sycophancy status:
- CLAUDE.md section: [present | MISSING]
- Hook script: [present | MISSING]
- Hook registered: [yes | NO]
```

If anything is missing, offer to run `install` to fix it.

---
## Action: remove

1. Remove the section between `<!-- critical-feedback-protocol -->` and `<!-- /critical-feedback-protocol -->` from CLAUDE.md (inclusive of markers)
2. Remove `.claude/hooks/enforce-critical-feedback.sh`
3. Remove the hook entry from `.claude/settings.json` (preserve other hooks and settings)

Report:
```
Anti-sycophancy removed:
- CLAUDE.md section: removed
- Hook script: removed
- Hook registration: removed
```

---
## Important Notes
- **Idempotent**: Running `install` multiple times is safe — it updates rather than duplicates
- **Non-destructive**: The hook only fires on CLAUDE.md edits and only provides a reminder message — it never blocks writes
- **Merge-safe**: Settings are merged, not overwritten — existing hooks and settings are preserved
- The hook uses `python3` for JSON parsing with `jq` as fallback — both are commonly available
