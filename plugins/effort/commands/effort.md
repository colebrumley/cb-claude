---
name: effort
description: "Effort-scaled parallel implementation — throw money at a problem. Auto-detects effort level or override with /effort <1|2|3> <task>"
user_invocable: true
arguments:
  - name: args
    description: "Optional effort level (1/2/3) followed by task description"
    required: true
---
# Effort-Scaled Parallel Implementation
Orchestrate multi-agent implementation in fixed phases.
## Phase 1: Parse & Setup
### Parse Arguments
Extract from `$ARGUMENTS` in order:
1. **Inline flags** (optional, order-independent, consumed before task text):
   - `--model <opus|sonnet|haiku|inherited>` — pre-sets AGENT_MODEL
   - `--instructions "<text>"` or `--instructions none` — pre-sets USER_INSTRUCTIONS (`none` maps to `null`)
   - `--level <1|2|3|auto>` — pre-sets effort level (alternative to bare number)
   - `--permissions <approve|skip>` — pre-sets command pre-approval (`approve` writes detected commands to settings, `skip` does nothing)
2. **Bare level** `1|2|3` (optional, legacy syntax, same as `--level`)
3. **Remaining text** = task description

Flag parsing rules:
- Flags start with `--` and consume exactly one following token as their value.
- Stop consuming flags at the first token that is neither a `--flag` nor a flag's value.
- Quoted values are supported: `--instructions "focus on performance"`.
- Unknown flags are treated as part of the task description.

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, instructions is set or "none", and level is set to a specific number):
- Set `AGENT_MODEL` from `--model` value (`inherited` maps to `null`)
- Set `USER_INSTRUCTIONS` from `--instructions` value (`none` maps to `null`)
- Set level from `--level` or bare level value
- **Skip `AskUserQuestion` entirely** — proceed directly to Auto-Detect or Verify Prerequisites

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if model was NOT set from arguments:**

1. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model (no `model` parameter set on spawned agents)
   - "Opus" — use `opus` for all spawned agents (highest capability, highest cost)
   - "Sonnet" — use `sonnet` for all spawned agents (balanced capability and cost)
   - "Haiku" — use `haiku` for all spawned agents (fastest, lowest cost)

**Ask only if instructions were NOT set from arguments:**

2. **Instructions** (header: "Instructions"): "Any special instructions, constraints, or focus areas for this task?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Performance focus" — prioritize runtime performance in all implementations
   - "Minimal changes" — make the smallest possible diff to achieve the goal
   The user can also provide free-text via the "Other" option.

**Ask only if level was NOT specified in arguments (neither `--level` nor bare `1|2|3`):**

3. **Effort Level** (header: "Effort"): "What effort level?"
   - "Auto-detect (Recommended)" — orchestrator classifies based on task characteristics
   - "L1 — Try harder" — 3 workers, single round, lightweight review
   - "L2 — High effort" — 5 workers, adversarial review, one retry
   - "L3 — Ludicrous mode" — 7 workers, two rounds, full pipeline

**Store configuration:**
- `AGENT_MODEL`: `opus`|`sonnet`|`haiku`|`null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`. If provided, prepend as a `## User Instructions` section in every agent's task prompt (before the task description).
- If user selected a specific effort level, use it directly (skip auto-detect). If "Auto-detect" or not asked, proceed to the Auto-Detect section below.

### Auto-Detect Effort Level
If level still unset after Configure Run:
- **L1**: bounded/moderate ambiguity
- **L2**: broad/cross-cutting/high ambiguity or importance
- **L3**: architectural/high-stakes/novel/complex
Tie-break downward.
### Verify Prerequisites (Safe Run Isolation)
```bash
git rev-parse --is-inside-work-tree
REPO_ROOT="$(git rev-parse --show-toplevel)"; CURRENT_BRANCH="$(git branch --show-current)"
EFFORT_ID="$(date +%Y%m%d-%H%M%S)-$$"; EFFORT_DIR="${REPO_ROOT}/.worktrees/effort-${EFFORT_ID}"
mkdir -p "${EFFORT_DIR}/artifacts"
grep -qxF '.worktrees/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.worktrees/' >> "${REPO_ROOT}/.gitignore"
if [ -n "$(git status --porcelain)" ]; then git stash push -m "effort-auto-stash-${EFFORT_ID}"; STASH_REF="effort-auto-stash-${EFFORT_ID}"; fi
```
### Pre-Approve Agent Commands
If `--permissions` was set to `approve`, skip the AskUserQuestion in Step 3 and write directly. If set to `skip`, skip this entire section.

Without `--dangerously-skip-permissions`, every agent Bash call triggers a user approval prompt — multiplied across a team of parallel agents, this creates unbearable context switching. Pre-approve known commands in `.claude/settings.local.json` to eliminate this.

**Step 1: Detect project commands.**
Scan `${REPO_ROOT}` for build tooling and record the matching permission patterns:
| File | Patterns to add |
|------|----------------|
| `package.json` | `Bash(npm *)`, `Bash(npx *)` |
| `yarn.lock` | `Bash(yarn *)` |
| `pnpm-lock.yaml` | `Bash(pnpm *)` |
| `bun.lockb` / `bun.lock` | `Bash(bun *)`, `Bash(bunx *)` |
| `Makefile` | `Bash(make *)` |
| `Justfile` | `Bash(just *)` |
| `Cargo.toml` | `Bash(cargo *)` |
| `pyproject.toml` / `setup.py` / `requirements.txt` | `Bash(python *)`, `Bash(pytest *)`, `Bash(pip *)` |
| `go.mod` | `Bash(go *)` |
| `Gemfile` | `Bash(bundle *)`, `Bash(rake *)` |

Only add patterns for tooling that actually exists in the repo.

**Step 2: Build the full permission list.**
Combine detected project patterns with effort's baseline needs:
```
Baseline (always included):
  Bash(git *)
  Bash(mkdir *)
  Bash(cd *)
  Bash(rm -rf .worktrees/*)
  Bash(grep *)
  Bash(echo *)

Detected (from Step 1):
  <project-specific patterns>
```

**Step 3: Present and ask.**
Use `AskUserQuestion` — single question:
- **Header**: "Permissions"
- **Question**: Format the full list as a readable block and ask:
  `"Pre-approve these Bash commands for agent use? Writes to .claude/settings.local.json (gitignored, local-only).\n\n<formatted list>"`
- **Options**:
  1. `"Approve all (Recommended)"` — write full list to settings
  2. `"Skip — I'll approve individually"` — do nothing, agents will prompt for each command

**Step 4: Write settings.**
If the user approved:
1. `mkdir -p "${REPO_ROOT}/.claude"`.
2. Read `${REPO_ROOT}/.claude/settings.local.json` if it exists, otherwise start with `{"permissions":{"allow":[]}}`.
3. Merge new entries into `permissions.allow` (skip duplicates).
4. Write the updated file.
5. Confirm: _"Pre-approved N commands in .claude/settings.local.json"_

If the user skipped, continue without writing. Agents will prompt for each command individually.

### Initialize State Tracking
Create `${EFFORT_DIR}/run.json`:
```json
{
  "effort_id": "<EFFORT_ID>",
  "task": "<task description>",
  "level": 1,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "base_branch": "<CURRENT_BRANCH>",
  "base_commit": "<SHA>",
  "stash_ref": "<ref or null>",
  "worktrees": {},
  "scores": {},
  "winner": null,
  "status": "running"
}
```
Update `run.json` after every phase.
### Announce the Plan
Report selected level, expected agent count, and stage sequence.
### Create Team
Use `TeamCreate` with `team_name: "effort-${EFFORT_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.
---
## Git Conventions
### Naming
- Effort directory: `${REPO_ROOT}/.worktrees/effort-${EFFORT_ID}`
- Branches: `effort/${EFFORT_ID}/<role>`
- Worktrees: `${EFFORT_DIR}/<role>`
### Worker Commit Convention
Single commit per worker: `effort(${EFFORT_ID}): <worker-name> implementation of <task-summary>`
---
## Scoring Rubric (Used by All Reviewers)
Use `effort-reviewer` rubric (Correctness, Quality, Codebase Fit, Completeness, Elegance; 100 total).
Thresholds:
- `>=80`: strong pass
- `60-79`: conditional advance
- `<60`: eliminate
- critical review finding: must fix before final acceptance
---
## Context Flow
Pass only phase-required inputs.
| Phase | Inputs | Outputs | Max Size |
|-------|--------|---------|----------|
| Research | Task description, codebase access | Research reports (1-3) | 2000 words each |
| Test Generation | Task description, research reports | Test files (committed) | N/A (files) |
| Implementation R1 | Task description, research summary*, perspective, test command, worktree path | Git branches with implementations | N/A (branches) |
| Evaluation R1 | Task description, research summary*, diffs from each worker | Score output per worker per reviewer | 500 words feedback each |
| Synthesis | Top worker diffs, all review feedback, research summary* | Synthesized branch | N/A (branch) |
| Adversarial | Task description, winning diff, research summary* | Issue list with severity ratings | 1000 words |
| Verification | Winning branch, test/lint/build commands | Pass/fail + output logs | Truncate to last 100 lines |
*Before Phase 3, compress research into one summary <=1500 words; pass summary only afterward.
### Context Budget Rules
- Never inline full diffs for >2 solutions in one prompt.
- Store outputs in `${EFFORT_DIR}/artifacts/`.
- Pass reviewer/synthesizer summaries first (<=250 words per candidate + patch stats).
- Let agents read full diffs from worktree paths.
---
## Phase Transitions
Check preconditions before each phase; if unmet, run fallback.
| Phase | Precondition | Fallback |
|-------|-------------|----------|
| Phase 3 | At least 1 research report received | Proceed with available context; log missing inputs |
| Phase 4 | At least 1 worker produced a non-empty diff | Abort with message to user |
| Phase 5 | At least 1 worker has been scored | Use unscored diffs; pick by orchestrator judgment |
| Phase 6 | At least 2 solutions from Phase 5 with score >= 60 | Use whatever solutions exist |
| Phase 9 | A winning solution has been selected | Skip adversarial; proceed to verification |
| Phase 10 | A winning branch exists | Abort with cleanup |
| Phase 11 | Retry conditions met AND user approved retry | Skip retry; proceed with current solution |
| Phase 14 | User has confirmed "apply" | Do not merge; preserve branches for manual review |
---
## Phase 2: Research + Test Generation
Spawn teammates for all independent work.
### Research
Launch `effort-researcher` by level:
- L1: 1 general
- L2: 2 (`architecture`, `similar-features`)
- L3: 3 (`architecture`, `similar-features`, `security+edge-cases`)
Save full reports to artifacts; create <=1500-word merged summary.
### Test Generation
Launch `effort-worker` in WRITE TESTS mode:
- L1: 1 writer
- L2: 1 comprehensive writer
- L3: 3 focused writers (`core`, `edge`, `integration-security`) in isolated worktrees, then 1 synthesizer
L3 test worktrees:
```bash
git worktree add "${EFFORT_DIR}/test-core" -b "effort/${EFFORT_ID}/test-core"
git worktree add "${EFFORT_DIR}/test-edge" -b "effort/${EFFORT_ID}/test-edge"
git worktree add "${EFFORT_DIR}/test-integration" -b "effort/${EFFORT_ID}/test-integration"
```
### Commit Tests & Create Worktrees
Never commit on user branch.
```bash
cd "${REPO_ROOT}"; BASE_COMMIT="$(git rev-parse HEAD)"
git checkout -b "effort/${EFFORT_ID}/base" "${BASE_COMMIT}"
git add <test file paths from test writer reports>
git commit -m "effort(${EFFORT_ID}): generated test suite for: <short task summary>"; TEST_COMMIT="$(git rev-parse HEAD)"
git checkout "${CURRENT_BRANCH}"
```
Create worker worktrees from `TEST_COMMIT` (count by level: L1=3, L2=5, L3=7):
```bash
for WORKER in minimalist architect convention; do  # extend list by level
  git worktree add -b "effort/${EFFORT_ID}/${WORKER}" "${EFFORT_DIR}/${WORKER}" "${TEST_COMMIT}"
done
git worktree add -b "effort/${EFFORT_ID}/synthesizer" "${EFFORT_DIR}/synthesizer" "${TEST_COMMIT}"
```
Update `run.json` worktree map.
---
## Phase 3: Implementation Round 1
### Perspective Assignments
| # | Perspective | Guiding Question |
|---|-------------|-----------------|
| 1 | minimalist | "What is the least code that solves this correctly?" |
| 2 | architect | "What will the team thank us for in six months?" |
| 3 | convention | "What would the original authors have written?" |
| 4 | resilience | "What happens when things go wrong?" |
| 5 | performance | "What is the fastest correct solution?" |
| 6 | security | "How would an attacker exploit this?" |
| 7 | testability | "How do we make this trivial to verify?" |
Assign L1 first 3, L2 first 5, L3 all 7.
### Launch Workers
Spawn all workers as teammates (Task tool with `team_name: "effort-${EFFORT_ID}"`):
```
Task: "You are in IMPLEMENT mode.
## Task
<task description>
## Your Perspective: <perspective name>
Guiding question: <guiding question>
## Research Briefing
<condensed research summary — max 1500 words>
## Test Suite
Tests are in your worktree. Run: <test command>
## Your Worktree
Work ONLY in: ${EFFORT_DIR}/<perspective>
Use absolute paths. Do NOT access other worktrees. Commit all changes.
Implement task from your perspective. Follow codebase conventions. Run tests. Commit."
Agent: effort-worker
```
Wait for completion.
---
## Phase 4: Evaluation Round 1
### Gather Diffs
```bash
cd "${EFFORT_DIR}/${WORKER}"
BASE_SHA="$(git merge-base HEAD effort/${EFFORT_ID}/synthesizer)"
git diff "${BASE_SHA}..HEAD" > "${EFFORT_DIR}/artifacts/${WORKER}.patch"
git diff --stat "${BASE_SHA}..HEAD" > "${EFFORT_DIR}/artifacts/${WORKER}.stats"
```
### Launch Reviewers
- L1: 1 scorer (`MODE: SCORING`)
- L2: 2 independent scorers; average per-dimension scores
- L3: 3 specialized scorers (`correctness-completeness`, `security-resilience`, `quality-fit-elegance`); average per-dimension scores
Require ranking and advancement recommendation.
### Rank Solutions
Store rankings/scores in `run.json`.
---
## Phase 5: Synthesis / Advancement
### Level 1-2: Synthesize
Select top solutions (L1 top 2, L2 top 3), then launch 1 `effort-worker` in SYNTHESIZE mode in `${EFFORT_DIR}/synthesizer` with task, candidate summaries (<=250 words each), reviewer feedback, and worktree paths. Require tests + commit. Re-score synthesis against top originals; keep highest scorer.
### Level 3: Advancement
Skip synthesis; advance top 3 Round-1 solutions.
---
## Phase 6: Round 2 — Refinement (Level 3 Only)
Create refinement worktrees from top 3 winners:
```bash
# Assuming workers X, Y, Z are the top 3
git worktree add -b "effort/${EFFORT_ID}/refine-1" "${EFFORT_DIR}/refine-1" "effort/${EFFORT_ID}/<winner-X>"
git worktree add -b "effort/${EFFORT_ID}/refine-2" "${EFFORT_DIR}/refine-2" "effort/${EFFORT_ID}/<winner-Y>"
git worktree add -b "effort/${EFFORT_ID}/refine-3" "${EFFORT_DIR}/refine-3" "effort/${EFFORT_ID}/<winner-Z>"
```
Launch 3 `effort-worker` REFINE agents in parallel; each gets task, assigned feedback, competing winners, and directive to address feedback, borrow strengths, run tests, commit.
---
## Phase 7: Re-evaluation — Round 2 (Level 3 Only)
Launch 2 independent `effort-reviewer` scorers for refined solutions; average per-dimension scores; advance top 2.
---
## Phase 8: Final Synthesis (Level 3 Only)
```bash
git worktree add -b "effort/${EFFORT_ID}/final-synthesis" "${EFFORT_DIR}/final-synthesis" "effort/${EFFORT_ID}/refine-<best>"
```
Launch 1 `effort-worker` in SYNTHESIZE mode with task, top-2 refined summaries, feedback, and paths; require tests + commit.
---
## Phase 9: Adversarial Review (Level 2+)
- L2: launch 1 `effort-reviewer` in `MODE: ADVERSARIAL`.
- L3: launch 2 in parallel (security focus, correctness focus).
Pass task, winner worktree, research summary.
---
## Phase 10: Verification (All Levels)
Resolve commands from research/config and run in winner worktree. Save output to `${EFFORT_DIR}/artifacts/verification.log`.
### Level 1
```bash
cd "${EFFORT_DIR}/<winner-worktree>"
<test command>
```
### Level 2
```bash
cd "${EFFORT_DIR}/<winner-worktree>"
<test command>
<lint command if available>
```
### Level 3
```bash
cd "${EFFORT_DIR}/<winner-worktree>"
<test command>
<lint command if available>
<type check command if available>
<build command if available>
```
Report pass/fail explicitly.
---
## Phase 11: Present Issues & Retry (L2+, Conditional)
### Retry Trigger Conditions
**L2**: retry eligible if any true: score <80, adversarial critical issue, verification failure.
**L3**: retry eligible if any true: score <85, adversarial critical/moderate issue, verification failure.

If no retry conditions are met, skip to Phase 12 (L3) or Phase 13.

### Present Issues to User
If retry conditions are met, present the issues before retrying:
```
### Issues Requiring Attention
**Score**: X/100 (threshold: <80|85>)

**Adversarial Findings** (if any):
- <bulleted list of critical/major issues from Phase 9>

**Verification Failures** (if any):
- <test/lint/build failures from Phase 10>
```

### Ask User
Use `AskUserQuestion`:
- **Header**: "Retry"
- **Question**: "Issues were found that may need addressing. How would you like to proceed?"
  - "Retry with fixes (Recommended)" — launch a worker to address the issues
  - "Ship as-is" — proceed with the current solution despite issues
  - "Provide guidance" — user specifies via "Other" what to prioritize or how to approach fixes

If user selects "Ship as-is", skip to Phase 12 (L3) or Phase 13. Note unresolved issues in the final report.

### Execute Retry
Retry steps: create new worktree from winner -> launch one definitive IMPLEMENT worker with task + research summary + winner path + all feedback/issues + user guidance (if any) -> require fix-without-rewrite + tests + commit -> rerun verification only -> if still failing, present best-scoring solution with warning.
**L3 additional**: After definitive run, rerun adversarial review; if definitive scores lower than original, keep original.
Never exceed one retry pass.
---
## Phase 12: Final Review (Level 3 Only)
Launch 1 `effort-reviewer` in `MODE: FINAL_REVIEW` with task, final winner worktree, process history, and research summary.
---
## Phase 13: Present Results
Use this exact format:
```
## Effort Complete: <task summary>
**Level**: <level> | **Workers**: <count> | **Agents Total**: <count>
### Scores
| Worker | Correctness | Quality | Codebase Fit | Completeness | Elegance | **Total** |
|--------|-------------|---------|-------------|-------------|----------|-----------|
| <name> | X/20 | X/20 | X/20 | X/20 | X/20 | **X/100** |
**Winner**: <worker-name> (score: X/100)
[If synthesized: "Final solution synthesized from <worker-a> and <worker-b>"]
### Adversarial Review
[If clean: "No critical issues found."]
[If issues: Bulleted list of issues and resolutions]
### Verification
- Tests: <pass/fail> (<n> passed, <m> failed)
- Lint: <pass/fail or "not run">
- Types: <pass/fail or "not run">
- Build: <pass/fail or "not run">
### Summary of Changes
[3-5 bullet points describing what was implemented]
### Final Review (L3 only)
[Include the final reviewer's assessment]
```
### Show the Diff
```bash
cd "${EFFORT_DIR}/<winner>"
BASE_SHA="$(git merge-base HEAD "${CURRENT_BRANCH}")"
git diff "${BASE_SHA}..HEAD"
```
### Ask the User
1. Apply this solution
2. View alternative solutions
3. Modify before applying
4. Abort and clean up
---
## Phase 14: Merge & Cleanup
### If user approves:
```bash
cd "${REPO_ROOT}"
git merge "effort/${EFFORT_ID}/<winning-branch>" --no-ff -m "effort: <task summary>"
```
If conflicts occur, do not auto-resolve; ask user to choose next action.
### Always clean up (even on failure):
First, shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate, then call `TeamDelete`.
Then run git/filesystem cleanup in exact order:
```bash
# 1. Remove worktrees
for wt in $(git worktree list --porcelain | grep "^worktree ${EFFORT_DIR}" | sed 's/^worktree //'); do git worktree remove "$wt" --force 2>/dev/null; done
# 2. Remove effort branches
for branch in $(git branch --list "effort/${EFFORT_ID}/*"); do git branch -D "$branch" 2>/dev/null; done
# 3. Remove effort directory
rm -rf "${EFFORT_DIR}"
# 4. Restore stash if we stashed earlier (use apply + drop for safety)
if [ -n "${STASH_REF}" ]; then
  STASH_INDEX=$(git stash list | grep "${STASH_REF}" | head -1 | sed 's/:.*//')
  if [ -n "${STASH_INDEX}" ]; then
    if git stash apply "${STASH_INDEX}"; then git stash drop "${STASH_INDEX}" 2>/dev/null; else echo "WARNING: stash apply failed due to conflicts. Your stashed changes are preserved in ${STASH_INDEX}. Recover manually with: git stash apply ${STASH_INDEX}"; fi
  fi
fi
```
Because tests are committed on `effort/${EFFORT_ID}/base`, no reset is needed on abort.
---
## Error Handling
### Agent Failure (single agent in a parallel group fails)
1. Log agent/phase/error.
2. Continue with successful outputs.
3. If fewer than half succeed, add warning to final report.
4. Do not retry failed agent.
### All Workers Fail in a Phase
1. Log full failure.
2. If Phase 3: launch one fallback `convention` worker; if it fails, abort.
3. If Phase 4+: skip phase and continue.
4. Clean up before reporting.
### Minimum Success Thresholds
- Research: >=1 success; else continue without briefing (reduced confidence).
- Test generation: >=1 success; else continue with explicit `no-new-tests` flag.
- Implementation: >=2 successes for L2/L3 (>=1 for L1); else abort.
- Review: >=1 success; else skip scoring and use orchestrator judgment.
### Worktree Creation Failure
1. Retry `git worktree add` with alternate path.
2. If still failing, use regular branches and run workers sequentially.
3. Report degraded mode.
### Test Generation Failure
1. Continue without tests.
2. In verification, run lint/typecheck/build only.
3. Report missing tests in final report and adversarial context.
### Cleanup Protocol (runs on ANY exit path)
Always run Phase 14 cleanup on success, failure, or user cancel.
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
BEFORE presenting results to the user (Phase 13):
1. Did verification (Phase 10) actually RUN? Check the logs, not your memory.
2. Did tests PASS? Read the exit code from verification.log — don't assume.
3. If adversarial review found critical issues, were they addressed?
4. Is the winning branch's diff actually committed and readable?
If you haven't confirmed all of these with evidence, you are not ready to present.
```
### Red Flags — STOP If You Notice
- About to advance a phase without checking its preconditions
- Trusting an agent's self-reported success without reading its output
- Presenting results to the user without having run verification
- Using words like "should be fine", "probably passed", "looks like it worked"
- Skipping cleanup because "the user can do it later"
- Ignoring a failed phase because "enough other phases succeeded"
**All of these mean: STOP. Check the precondition table. Read the actual outputs. Follow the documented fallback.**
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent as a teammate using the Task tool with the `team_name` parameter. Never use `run_in_background`. Never use the Task tool without `team_name` for agent launches.
- Parallelize independent teammate spawns.
- Pass focused context only and enforce context budgets.
- Track scores/leaderboard; update `run.json` after each scoring phase.
- Winning branch is the deliverable; ensure committed runnable code.
- Perform git/worktree operations in Bash.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter so agents inherit the orchestrator's model.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section at the top of every agent's task prompt (before `## Task`). This applies to researchers, test writers, implementation workers, synthesizers, refiners, and reviewers.
- Valid agent names: `effort-worker`, `effort-reviewer`, `effort-researcher`.
