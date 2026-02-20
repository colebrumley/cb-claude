---
name: test
description: "Multi-perspective test generation — parallel writers produce categorized tests for existing code. Usage: /test [--model <model>] [--depth <depth>] [--instructions <text>] <target>"
user_invocable: true
arguments:
  - name: args
    description: "Optional flags and target (file path, file:function, directory, or description)"
    required: true
---
# Test Generation
Orchestrate multi-perspective test generation for existing code in fixed phases.
## Phase 1: Parse & Configure
### Parse Arguments
Extract from `$ARGUMENTS` in order:
1. **Inline flags** (optional, order-independent, consumed before target):
   - `--model <opus|sonnet|haiku|inherited>` — pre-sets AGENT_MODEL
   - `--depth <quick|standard|deep>` — pre-sets DEPTH
   - `--instructions "<text>"` or `--instructions none` — pre-sets USER_INSTRUCTIONS (`none` maps to `null`)
2. **Remaining text** = target (after all flags consumed)

Flag parsing rules:
- Flags start with `--` and consume exactly one following token as their value.
- Stop consuming flags at the first token that is neither a `--flag` nor a flag's value.
- Quoted values are supported: `--instructions "focus on error handling"`.
- Unknown flags are treated as part of the target.

### Classify Target
Classify the remaining text as the test target:
1. **File**: path exists as a file (e.g. `src/utils/parser.ts`)
2. **Function**: contains `:` after a valid file path (e.g. `src/utils/parser.ts:parseConfig`)
3. **Directory**: path exists as a directory (e.g. `src/utils/`)
4. **Description**: anything else (e.g. `"add tests for the payment processing flow"`)

Validate:
- File mode: verify file exists. If not, report error and STOP.
- Function mode: verify file exists. Function name is extracted for writers but not validated here (writers will verify).
- Directory mode: verify directory exists. If not, report error and STOP.
- Description mode: no validation needed.

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, depth is set, and instructions is set or "none"):
- Set `AGENT_MODEL` from `--model` value (`inherited` maps to `null`)
- Set `DEPTH` from `--depth` value
- Set `USER_INSTRUCTIONS` from `--instructions` value (`none` maps to `null`)
- **Skip `AskUserQuestion` entirely** — proceed directly to Initialize Working Directory

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if depth was NOT set from arguments:**

1. **Depth** (header: "Depth"): "How thorough should test generation be?"
   - "Standard (Recommended)" — 1 researcher, 3 writers (core, edge, error), synthesis
   - "Quick" — no research, 1 comprehensive writer, no synthesis
   - "Deep" — 2 researchers, 5 writers (core, edge, error, integration, security), synthesis

**Ask only if model was NOT set from arguments:**

2. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

**Ask only if instructions were NOT set from arguments:**

3. **Instructions** (header: "Instructions"): "Any special instructions or focus areas for test generation?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Security focus" — prioritize security and adversarial input testing
   - "Error handling focus" — prioritize error path and failure mode testing

   The user can also provide free-text via the "Other" option.

### Store Configuration
- `TARGET`: the classified target string
- `TARGET_MODE`: `file|function|directory|description`
- `FUNCTION_NAME`: extracted function name (function mode only) or `null`
- `DEPTH`: `quick|standard|deep`
- `RESEARCHER_COUNT`: quick=0, standard=1, deep=2
- `WRITER_COUNT`: quick=1, standard=3, deep=5
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.

### Writer Categories by Depth
| Category | Quick | Standard | Deep |
|----------|-------|----------|------|
| core | Y (comprehensive — covers core+edge+error) | Y | Y |
| edge | - | Y | Y |
| error | - | Y | Y |
| integration | - | - | Y |
| security | - | - | Y |

### Researcher Focus by Depth
| Focus | Quick | Standard | Deep |
|-------|-------|----------|------|
| patterns | - | Y | Y |
| coverage-map | - | - | Y |

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  CURRENT_BRANCH="$(git branch --show-current)"
  TEST_ID="$(date +%Y%m%d-%H%M%S)-$$"
  TEST_DIR="${REPO_ROOT}/.tests/test-${TEST_ID}"
  grep -qxF '.tests/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.tests/' >> "${REPO_ROOT}/.gitignore"
else
  echo "ERROR: Not in a git repository. Test generation requires a git repo."
  # STOP — cannot proceed without git
fi
mkdir -p "${TEST_DIR}/artifacts"
```

### Stash Dirty Working Tree
```bash
if [ -n "$(git status --porcelain)" ]; then
  git stash push -m "test-auto-stash-${TEST_ID}"
  STASH_REF="test-auto-stash-${TEST_ID}"
fi
```

### Initialize State Tracking
Create `${TEST_DIR}/run.json`:
```json
{
  "test_id": "<TEST_ID>",
  "target": "<TARGET>",
  "target_mode": "<file|function|directory|description>",
  "function_name": "<string or null>",
  "depth": "<quick|standard|deep>",
  "researcher_count": 0,
  "writer_count": 1,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "base_branch": "<CURRENT_BRANCH>",
  "base_commit": "<SHA>",
  "stash_ref": "<ref or null>",
  "worktrees": {},
  "status": "running"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "test-${TEST_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: target, target mode, depth, expected researcher count, expected writer count, writer categories, and the phase sequence.
---
## Phase 2: Research (standard+ only)
**Precondition**: `DEPTH` is `standard` or `deep`. Skip this phase entirely for `quick`.

### Launch Researchers
Spawn researchers as teammates based on depth:

**Standard** — 1 researcher (`patterns`):
```
Task: "You are a test researcher with focus: patterns.
## Target
<TARGET> (mode: <TARGET_MODE>)
[If function mode: "Function: <FUNCTION_NAME>"]
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the test infrastructure and conventions for this target. Discover the test framework, test command, file naming, assertion style, mocking approach, and existing tests. Your briefing will be given to test writers to ensure they produce tests that fit the codebase."
Agent: test-researcher
```

**Deep** — 2 researchers (`patterns`, `coverage-map`):
Launch both in parallel. The `coverage-map` researcher additionally maps all code paths, branches, and untested areas.
```
Task: "You are a test researcher with focus: coverage-map.
## Target
<TARGET> (mode: <TARGET_MODE>)
[If function mode: "Function: <FUNCTION_NAME>"]
## Instructions
<USER_INSTRUCTIONS or 'None'>

Map all code paths in this target — every branch, error path, edge case, and integration point. Identify which paths have existing test coverage and which do not. Your briefing will be given to test writers to ensure comprehensive coverage."
Agent: test-researcher
```

If `AGENT_MODEL` is set (not null), pass it as the `model` parameter.

### Compile Research Briefing
Wait for all researchers to complete. Combine their outputs into a single briefing (<=1500 words) saved to `${TEST_DIR}/artifacts/research-briefing.md`.

If a researcher fails, continue with remaining outputs. If all fail, proceed without research (writers will discover test infrastructure themselves at reduced confidence).
---
## Phase 3: Parallel Test Generation
### Create Worktrees
```bash
BASE_COMMIT="$(git rev-parse HEAD)"
```

**Quick** — 1 writer (no synthesis needed):
```bash
git worktree add -b "test/${TEST_ID}/core" "${TEST_DIR}/core" "${BASE_COMMIT}"
```

**Standard** — 3 writers + synthesizer:
```bash
for WRITER in core edge error; do
  git worktree add -b "test/${TEST_ID}/${WRITER}" "${TEST_DIR}/${WRITER}" "${BASE_COMMIT}"
done
git worktree add -b "test/${TEST_ID}/synthesizer" "${TEST_DIR}/synthesizer" "${BASE_COMMIT}"
```

**Deep** — 5 writers + synthesizer:
```bash
for WRITER in core edge error integration security; do
  git worktree add -b "test/${TEST_ID}/${WRITER}" "${TEST_DIR}/${WRITER}" "${BASE_COMMIT}"
done
git worktree add -b "test/${TEST_ID}/synthesizer" "${TEST_DIR}/synthesizer" "${BASE_COMMIT}"
```

Update `run.json` worktree map.

### Launch Writers
Spawn all writers as teammates in parallel (Task tool with `team_name`):
```
Task: "You are in WRITE mode.
## Target
<TARGET> (mode: <TARGET_MODE>)
[If function mode: "Function: <FUNCTION_NAME>"]
## Your Category: <category>
[Quick mode gets category "core" with note: "This is a comprehensive pass — cover core happy paths, significant edge cases, and key error conditions in a single suite."]
## Research Briefing
<compiled research briefing, or 'No research briefing available — discover test infrastructure yourself'>
## Test Command
<test command from research, or 'Discover from project config'>
## Your Worktree
Work ONLY in: ${TEST_DIR}/<category>
Use absolute paths. Do NOT access other worktrees. Commit all changes.
## Instructions
<USER_INSTRUCTIONS or 'None'>

Read the target code. Write tests for your category. Run the test suite. ALL tests must pass — if a test fails, the test is wrong. Fix or remove failing tests. Commit."
Agent: test-writer
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all writers to complete.

### Validate Writer Outputs
For each writer, verify:
1. The worktree has a new commit (not just the base commit)
2. The commit includes test file(s)
If a writer produced no output, log it and continue with remaining writers.
If ALL writers failed, abort with message to user. Run cleanup (Phase 6).
---
## Phase 4: Synthesis (standard+ only)
**Precondition**: `DEPTH` is `standard` or `deep` AND at least 2 writers produced output. If only 1 writer produced output, skip synthesis and use that writer's output as the final result.

For `quick`: skip entirely — the single writer's output is the final result.

### Launch Synthesizer
Spawn 1 writer in SYNTHESIZE mode:
```
Task: "You are in SYNTHESIZE mode.
## Target
<TARGET> (mode: <TARGET_MODE>)
## Writer Worktrees
Read the test files from each writer's worktree:
<list of worktree paths with their categories>
## Research Briefing
<research briefing>
## Test Command
<test command>
## Your Worktree
Work ONLY in: ${TEST_DIR}/synthesizer
Use absolute paths. Commit all changes.
## Instructions
<USER_INSTRUCTIONS or 'None'>

Read all writer test suites. Combine them: deduplicate tests that cover the same behavior, unify setup/teardown, resolve naming conflicts. Maintain category attribution. Run the combined suite — ALL tests must pass. Commit."
Agent: test-writer
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for completion. If synthesis fails, fall back to the best individual writer (most tests, all passing).
---
## Phase 5: Verify
### Determine Winning Worktree
- Quick: `${TEST_DIR}/core`
- Standard/Deep with successful synthesis: `${TEST_DIR}/synthesizer`
- Standard/Deep with failed synthesis: best individual writer worktree

### Run Verification
The orchestrator (not an agent) runs the test suite in the winning worktree:
```bash
cd "${TEST_DIR}/<winner>"
<test command>
```
Read the full output. Record pass/fail counts and exit code.

If tests fail:
1. Report the failure with details
2. Continue to Phase 6 — present results with the failure noted
---
## Phase 6: Present & Apply
### Present Results
Use this exact format:
```
## Tests Generated: <target summary>
**Depth**: <depth> | **Writers**: <count> | **Test Framework**: <framework>

### Test Files
| File | Tests | Categories |
|------|-------|------------|
| path/to/test | N | core, edge |

### Coverage Summary
- **Core / happy path**: N tests
- **Edge cases**: N tests
- **Error conditions**: N tests
- **Integration**: N tests (deep only)
- **Security**: N tests (deep only)
- **Total**: N tests

### Test Results
`<test command>`: X passed, Y failed

### Generated Test Files
<show the test file contents — use code blocks with the appropriate language>
```

### Ask the User
1. Apply tests to current branch
2. View/modify before applying
3. Discard

### If Apply
Copy test files from the winning worktree to the user's working tree:
```bash
cd "${REPO_ROOT}"
# For each test file in the winning worktree, copy it to the same relative path in the repo
# Use git show or direct file copy from the winning branch
git checkout "test/${TEST_ID}/<winner>" -- <test file paths>
```
Report: "Applied N test file(s) to your working tree. Files are unstaged — review and commit when ready."

### If View/Modify
Show the full test file contents. Wait for user instructions. Apply modifications if requested, then re-run verification.

### If Discard
Skip to cleanup.

### Cleanup (runs on ANY exit path)
First, shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate, then call `TeamDelete`.
Then run git/filesystem cleanup in exact order:
```bash
# 1. Remove worktrees
for wt in $(git worktree list --porcelain | grep "^worktree ${TEST_DIR}" | sed 's/^worktree //'); do
  git worktree remove "$wt" --force 2>/dev/null
done
# 2. Remove test branches
for branch in $(git branch --list "test/${TEST_ID}/*"); do
  git branch -D "$branch" 2>/dev/null
done
# 3. Remove test directory
rm -rf "${TEST_DIR}"
# 4. Remove .tests/ if empty
rmdir "${REPO_ROOT}/.tests" 2>/dev/null || true
# 5. Restore stash if we stashed earlier
if [ -n "${STASH_REF}" ]; then
  STASH_INDEX=$(git stash list | grep "${STASH_REF}" | head -1 | sed 's/:.*//')
  if [ -n "${STASH_INDEX}" ]; then
    if git stash apply "${STASH_INDEX}"; then
      git stash drop "${STASH_INDEX}" 2>/dev/null
    else
      echo "WARNING: stash apply failed due to conflicts. Your stashed changes are preserved in ${STASH_INDEX}. Recover manually with: git stash apply ${STASH_INDEX}"
    fi
  fi
fi
```
---
## Phase Transitions
Check preconditions before each phase; if unmet, run fallback.
| Phase | Precondition | Fallback |
|-------|-------------|----------|
| Phase 2 | Depth is standard or deep | Skip research entirely |
| Phase 3 | Working directory exists, base commit resolved | Abort with cleanup |
| Phase 4 | At least 2 writers produced output; depth is standard+ | Use single writer output; skip synthesis |
| Phase 5 | A winning worktree exists with committed test files | Abort with cleanup |
| Phase 6 | Verification has been run (pass or fail) | Present with warning that verification was not run |
---
## Context Flow
Pass only phase-required inputs.
| Phase | Inputs | Outputs | Max Size |
|-------|--------|---------|----------|
| Research | Target, target mode, function name | Research briefings | 1000 words each |
| Generation | Target, research briefing, category, worktree path, test command | Git branches with tests | N/A (files) |
| Synthesis | Writer worktree paths, research briefing, test command | Synthesized branch | N/A (branch) |
| Verification | Winning worktree, test command | Pass/fail + output | Truncate to last 100 lines |
Before Phase 3, compress research into one briefing <=1500 words; pass briefing only afterward.
---
## Error Handling
### Agent Failure (single agent in a parallel group fails)
1. Log agent/phase/error.
2. Continue with successful outputs.
3. If fewer than half succeed, add warning to final report.
4. Do not retry failed agent.

### All Writers Fail
1. Log full failure.
2. Launch one fallback `core` writer. If it fails, abort.
3. Clean up before reporting.

### Worktree Creation Failure
1. Retry `git worktree add` with alternate path.
2. If still failing, abort with cleanup.
3. Report error to user.

### Not a Git Repo
1. Report error: "Test generation requires a git repository."
2. Exit without creating working directory.

### Target Not Found
1. Report error: "Target file/directory not found: <path>"
2. Exit without creating working directory.

### Cleanup Protocol (runs on ANY exit path)
Always run Phase 6 cleanup on success, failure, or user cancel.
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent as a teammate using the Task tool with the `team_name` parameter. Never use `run_in_background`. Never use the Task tool without `team_name` for agent launches.
- Parallelize independent teammate spawns.
- Pass focused context only and enforce context budgets.
- Update `run.json` after each phase.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter so agents inherit the orchestrator's model.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section at the top of every agent's task prompt (before `## Target`). This applies to researchers and writers.
- Valid agent names: `test-researcher`, `test-writer`.
- **Tests must PASS.** Unlike effort (where tests are written to FAIL before implementation), test plugin generates tests for EXISTING code. All tests must pass against the current codebase. Failing tests mean the test is wrong.
---
## The Iron Law
```
NO PHASE ADVANCEMENT WITHOUT VERIFYING PRECONDITIONS
```
No exceptions.
### Gate Function: Before Every Phase Transition
```
BEFORE advancing to any new phase:
1. CHECK: Are the preconditions from the Phase Transitions table met?
2. VERIFY: Did the previous phase actually produce its expected outputs?
3. CONFIRM: Is run.json updated with results from the completed phase?
4. FALLBACK: If preconditions aren't met, execute the documented fallback — don't improvise
5. ONLY THEN: Enter the next phase
Skipping precondition checks = building on an unverified foundation.
```
### Verification Before Completion
```
BEFORE presenting results to the user (Phase 6):
1. Did verification (Phase 5) actually RUN? Check the output, not your memory.
2. Did tests PASS? Read the exit code — don't assume.
3. Is the winning worktree's test files actually committed and readable?
If you haven't confirmed all of these with evidence, you are not ready to present.
```
### Red Flags — STOP If You Notice
- About to advance a phase without checking its preconditions
- Trusting a writer's self-reported success without verifying the worktree has a commit
- Presenting results to the user without having run verification
- Using words like "should be fine", "probably passed", "looks like it worked"
- Skipping cleanup because "the user can do it later"
- Ignoring a failed phase because "enough other phases succeeded"
- Presenting test counts without having read the actual test output
**All of these mean: STOP. Check the precondition table. Read the actual outputs. Follow the documented fallback.**
