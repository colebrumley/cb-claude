---
name: review
description: "Multi-perspective code review — parallel adversarial critics with severity-calibrated findings. Usage: /review [--model <model>] [--depth <depth>] [--instructions <text>] [PR number|URL|branch-range]"
user_invocable: true
arguments:
  - name: args
    description: "Optional flags and PR number, PR URL, branch range (e.g. main..feature), or empty for auto-detect"
    required: false
---
# Code Review
Orchestrate parallel multi-perspective code review with severity-calibrated findings.
## Phase 1: Parse & Configure
### Parse Arguments
Extract from `$ARGUMENTS` in order:
1. **Inline flags** (optional, order-independent, consumed before target):
   - `--model <opus|sonnet|haiku|inherited>` — pre-sets AGENT_MODEL
   - `--depth <quick|standard|deep>` — pre-sets DEPTH
   - `--instructions "<text>"` or `--instructions none` — pre-sets USER_INSTRUCTIONS (`none` maps to `null`)
2. **Remaining text** = review target (after all flags consumed)

Flag parsing rules:
- Flags start with `--` and consume exactly one following token as their value.
- Stop consuming flags at the first token that is neither a `--flag` nor a flag's value.
- Quoted values are supported: `--instructions "focus on security"`.
- Unknown flags are treated as part of the review target.

Then classify the review target:
1. **PR number**: bare integer (e.g. `123`)
2. **PR URL**: GitHub URL containing `/pull/` (e.g. `https://github.com/org/repo/pull/123`)
3. **Branch range**: contains `..` (e.g. `main..feature-branch`)
4. **Empty / other text**: auto-detect PR on current branch

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, depth is set, and instructions is set or "none"):
- Set `AGENT_MODEL` from `--model` value (`inherited` maps to `null`)
- Set `DEPTH` from `--depth` value
- Set `USER_INSTRUCTIONS` from `--instructions` value (`none` maps to `null`)
- **Skip `AskUserQuestion` entirely** — proceed directly to Initialize Working Directory

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if depth was NOT set from arguments:**

1. **Depth** (header: "Depth"): "How thorough should the review be?"
   - "Standard (Recommended)" — 1 researcher, 5 critics (correctness, security, design, testing, maintainability)
   - "Quick" — no researchers, 3 critics (correctness, security, design)
   - "Deep" — 2 researchers, 7 critics (all perspectives including performance, codebase-fit)

**Ask only if model was NOT set from arguments:**

2. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

**Ask only if instructions were NOT set from arguments:**

3. **Instructions** (header: "Instructions"): "Any special focus areas or context for this review?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Security focus" — prioritize security findings
   - "Performance focus" — prioritize performance findings

   The user can also provide free-text via the "Other" option.

### Store Configuration
- `INPUT_MODE`: `pr|branch-range|local`
- `PR_NUMBER`: integer or `null`
- `BRANCH_RANGE`: string or `null`
- `DEPTH`: `quick|standard|deep`
- `RESEARCHER_COUNT`: quick=0, standard=1, deep=2
- `CRITIC_COUNT`: quick=3, standard=5, deep=7
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.

### Critic Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| correctness | Y | Y | Y |
| security | Y | Y | Y |
| design | Y | Y | Y |
| testing | - | Y | Y |
| maintainability | - | Y | Y |
| performance | - | - | Y |
| codebase-fit | - | - | Y |

### Researcher Focus by Depth
| Focus | Quick | Standard | Deep |
|-------|-------|----------|------|
| conventions | - | Y | Y |
| impact | - | - | Y |

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  REVIEW_ID="$(date +%Y%m%d-%H%M%S)-$$"
  REVIEW_DIR="${REPO_ROOT}/.reviews/review-${REVIEW_ID}"
  grep -qxF '.reviews/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.reviews/' >> "${REPO_ROOT}/.gitignore"
else
  echo "ERROR: Not in a git repository. Code review requires a git repo."
  # STOP — cannot proceed without git
fi
mkdir -p "${REVIEW_DIR}/artifacts"
```

### Initialize State Tracking
Create `${REVIEW_DIR}/run.json`:
```json
{
  "review_id": "<REVIEW_ID>",
  "input_mode": "<pr|branch-range|local>",
  "pr_number": null,
  "branch_range": null,
  "depth": "<depth>",
  "researcher_count": 0,
  "critic_count": 3,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "status": "gathering"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "review-${REVIEW_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: input mode (PR/branch/local), depth, expected researcher count, expected critic count, and the phase sequence.
---
## Phase 2: Gather Diff & Context
### Resolve Diff Source
Based on `INPUT_MODE`:

**PR mode** (`pr`):
```bash
# If PR_NUMBER is set from arguments
gh pr diff ${PR_NUMBER} > "${REVIEW_DIR}/artifacts/diff.patch"
gh pr diff ${PR_NUMBER} --stat > "${REVIEW_DIR}/artifacts/diff-stats.txt"
gh pr view ${PR_NUMBER} --json title,body,baseRefName,headRefName > "${REVIEW_DIR}/artifacts/pr-info.json"
```

**Auto-detect PR** (no arguments or non-matching text):
```bash
# Try to detect PR on current branch
PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)
if [ -n "${PR_NUMBER}" ]; then
  INPUT_MODE="pr"
  gh pr diff ${PR_NUMBER} > "${REVIEW_DIR}/artifacts/diff.patch"
  gh pr diff ${PR_NUMBER} --stat > "${REVIEW_DIR}/artifacts/diff-stats.txt"
  gh pr view ${PR_NUMBER} --json title,body,baseRefName,headRefName > "${REVIEW_DIR}/artifacts/pr-info.json"
else
  # Fall back to local changes
  INPUT_MODE="local"
  git diff HEAD > "${REVIEW_DIR}/artifacts/diff.patch"
  git diff HEAD --stat > "${REVIEW_DIR}/artifacts/diff-stats.txt"
  # If no diff against HEAD, try staged + unstaged
  if [ ! -s "${REVIEW_DIR}/artifacts/diff.patch" ]; then
    git diff > "${REVIEW_DIR}/artifacts/diff.patch"
    git diff --stat > "${REVIEW_DIR}/artifacts/diff-stats.txt"
  fi
fi
```

**Branch range** (`branch-range`):
```bash
git diff ${BRANCH_RANGE} > "${REVIEW_DIR}/artifacts/diff.patch"
git diff ${BRANCH_RANGE} --stat > "${REVIEW_DIR}/artifacts/diff-stats.txt"
```

### Validate Diff
```bash
if [ ! -s "${REVIEW_DIR}/artifacts/diff.patch" ]; then
  echo "ERROR: No diff found. Nothing to review."
  # Clean up and STOP
fi
```

### Analyze Changed Files
From the diff, extract:
- List of changed files (new, modified, deleted)
- Group files by directory/subsystem
- Count: files changed, lines added, lines removed
- Save changed file list to `${REVIEW_DIR}/artifacts/changed-files.txt`

### Report
Report to the user:
```
Reviewing: <PR #123 "title" | branch-range | local changes>
Files changed: X (+Y/-Z lines)
Areas: <list of directories/subsystems affected>
```
---
## Phase 3: Parallel Research (standard+ only)
**Precondition**: `DEPTH` is `standard` or `deep`. Skip this phase entirely for `quick`.

### Launch Researchers
Spawn researchers as teammates based on depth:

**Standard** — 1 researcher (`conventions`):
```
Task: "You are a review researcher with focus: conventions.
## Diff Path
Read the diff at: ${REVIEW_DIR}/artifacts/diff.patch
## Changed Files
<changed file list>
## Diff Stats
<diff stats>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the codebase conventions and patterns in the areas affected by this diff. Focus on neighboring files, error handling patterns, naming conventions, test patterns, and existing utilities. Your briefing will be given to code review critics to help them assess codebase fit."
Agent: review-researcher
```

**Deep** — 2 researchers (`conventions`, `impact`):
Launch both in parallel. The `impact` researcher additionally maps callers, dependents, and blast radius.
```
Task: "You are a review researcher with focus: impact.
## Diff Path
Read the diff at: ${REVIEW_DIR}/artifacts/diff.patch
## Changed Files
<changed file list>
## Diff Stats
<diff stats>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Map the blast radius of these changes. Find all callers and dependents of changed functions/types, identify related tests not in the diff, and check for similar implementations elsewhere. Your briefing will be given to code review critics to help them assess risk."
Agent: review-researcher
```

If `AGENT_MODEL` is set (not null), pass it as the `model` parameter.

### Compile Research Briefing
Wait for all researchers to complete. Combine their outputs into a single briefing (<=1500 words) saved to `${REVIEW_DIR}/artifacts/research-briefing.md`.

If a researcher fails, continue with remaining outputs. If all fail, proceed without research (critics will explore codebase themselves at reduced confidence).
---
## Phase 4: Parallel Critique
### Select Perspectives
Use the Critic Perspectives by Depth table from Phase 1 to determine which perspectives to spawn.

### Launch Critics
Spawn all critics as teammates in parallel (Task tool with `team_name`):
```
Task: "You are a code review critic reviewing from the <PERSPECTIVE> perspective.
## Diff Path
Read the diff at: ${REVIEW_DIR}/artifacts/diff.patch
## Changed Files
<changed file list>
## Research Briefing
<compiled research briefing, or 'No research briefing available — explore conventions yourself'>
## PR Description
<PR title and body from pr-info.json, or 'No PR description available'>
## Your Perspective
<PERSPECTIVE>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Review this diff from your perspective. Quote specific code from the diff or codebase for every finding. Check for what's NOT there — missing error handling, missing tests, missing validation."
Agent: review-critic
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all critics to complete.
---
## Phase 5: Aggregate & Present
The orchestrator (not an agent) processes all critic outputs. **This is the final output — make it useful.**

### Collect & Deduplicate
1. Collect all findings from all critics
2. Deduplicate: merge findings that reference the same file:line with the same issue
3. Note cross-perspective consensus: issues raised by 2+ critics are stronger signals — mark these with the raising perspectives
4. Group by severity: critical, major, minor

### Present Results
Use this exact format:
```
## Code Review Complete
**Source**: <PR #123 "title" | main..feature | local changes> | **Depth**: <depth> | **Critics**: <count>

### Critical Issues (must fix before merge)
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted code from diff>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no critical issues: "No critical issues found."]

### Major Issues (should fix)
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted code>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no major issues: "No major issues found."]

### Minor Issues (nits — not blocking)
1. **[CATEGORY]** `file:line` — Description — Fix: <suggestion>

[If no minor issues: "No minor issues found."]

### What's Well-Implemented
- <specific positive with diff/code reference — not generic praise>

### Reviewer Consensus
- **Agreed**: <issues raised by 2+ critics — these are high-confidence findings>
- **Split opinions**: <issues where critics disagreed, if any>

### Verdict: <REQUEST CHANGES | APPROVE WITH SUGGESTIONS | APPROVE>
<1-2 sentence rationale based on finding counts and severity>
```

### Verdict Logic
- Any critical issues -> `REQUEST CHANGES`
- Major issues but no criticals -> `APPROVE WITH SUGGESTIONS`
- Only minor issues or no issues -> `APPROVE`

### Cleanup
1. Shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate
2. Call `TeamDelete`
3. Remove working directory:
```bash
rm -rf "${REVIEW_DIR}"
# Remove .reviews/ if empty
rmdir "${REPO_ROOT}/.reviews" 2>/dev/null || true
```
---
## State Management
- Working directory: `${REVIEW_DIR}` (gitignored via `.reviews/`)
- State tracked in `run.json`
- Artifacts stored in `${REVIEW_DIR}/artifacts/`
- Diff saved as `diff.patch`, stats as `diff-stats.txt`, PR info as `pr-info.json`
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If a researcher fails: continue with remaining researchers. If all fail, proceed without research briefing (critics will explore codebase themselves).
3. If a critic fails: continue with remaining critics. If fewer than half succeed, note reduced review coverage in the final report.
4. Do not retry failed agents.

### No Diff Found
1. If PR auto-detect fails and no local changes exist: report "Nothing to review" and exit cleanly.
2. If branch range is invalid: report the error and exit.

### Not a Git Repo
1. Report error: "Code review requires a git repository."
2. Exit without creating working directory.

### Empty Diff
1. If the diff file exists but is empty: report "No changes found — nothing to review."
2. Clean up and exit.

### gh CLI Not Available (PR mode)
1. If `gh` is not installed or not authenticated: report the error.
2. Suggest alternatives: "Try `/review main..HEAD` for branch comparison or `/review` with local changes."
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent using the Task tool with the `team_name` parameter.
- **Orchestrator handles aggregation directly** — do not delegate Phase 5 to an agent.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt.
- Valid agent names: `review-researcher`, `review-critic`.
- **No numeric scoring.** Unlike effort (which scores to rank competing implementations), code review has one implementation. Findings with severity levels and a verdict are the output.
- **Diff is the source of truth.** Every finding must trace to a specific location in the diff or a specific absence.
---
## The Iron Law
```
NO PHASE ADVANCEMENT WITHOUT VERIFYING PRECONDITIONS
```
### Gate Function: Before Every Phase Transition
```
BEFORE advancing to any new phase:
1. CHECK: Did the previous phase produce its expected outputs?
2. VERIFY: Is run.json updated?
3. CONFIRM: Are preconditions for the next phase met?
   - Phase 2 requires: valid input mode determined, working directory created
   - Phase 3 requires: diff.patch exists and is non-empty, depth is standard or deep
   - Phase 4 requires: diff.patch exists and is non-empty, changed file list available
   - Phase 5 requires: at least 1 critic produced output
4. ONLY THEN: Enter the next phase
```
### Red Flags — STOP If You Notice
- About to spawn critics without verifying the diff file exists
- About to present results without at least 1 critic having completed
- Skipping Phase 3 research for standard/deep depth
- Spawning researchers for quick depth
- Presenting a verdict without checking finding counts
- Using "should be fine" or "looks good" without evidence
- Presenting generic praise in "What's Well-Implemented" without citing diff lines
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
