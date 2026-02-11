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
Extract from `$ARGUMENTS`:
1. optional level `1|2|3`
2. task description
### Auto-Detect Effort Level
If level absent:
- **L1**: bounded/moderate ambiguity
- **L2**: broad/cross-cutting/high ambiguity or importance
- **L3**: architectural/high-stakes/novel/complex
Tie-break downward.
### Verify Prerequisites (Safe Run Isolation)
```bash
git rev-parse --is-inside-work-tree
REPO_ROOT="$(git rev-parse --show-toplevel)"; CURRENT_BRANCH="$(git branch --show-current)"
EFFORT_ID="$(date +%Y%m%d-%H%M%S)-$$"; EFFORT_DIR="/tmp/effort-${EFFORT_ID}"
mkdir -p "${EFFORT_DIR}/artifacts"
if [ -n "$(git status --porcelain)" ]; then git stash push -m "effort-auto-stash-${EFFORT_ID}"; STASH_REF="effort-auto-stash-${EFFORT_ID}"; fi
```
### Initialize State Tracking
Create `${EFFORT_DIR}/run.json`:
```json
{
  "effort_id": "<EFFORT_ID>",
  "task": "<task description>",
  "level": 1,
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
---
## Git Conventions
### Naming
- Effort directory: `/tmp/effort-${EFFORT_ID}`
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
| Phase 14 | User has confirmed "apply" | Do not merge; preserve branches for manual review |
---
## Phase 2: Research + Test Generation
Launch independent work in parallel with Task tool.
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
Launch all workers in parallel with:
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
## Phase 11: Retry (L2+, Conditional)
### Retry Trigger Conditions
**L2**: one retry if any true: score <80, adversarial critical issue, verification failure.
Retry steps: create new worktree from winner -> launch one definitive IMPLEMENT worker with task + research summary + winner path + all feedback/issues -> require fix-without-rewrite + tests + commit -> rerun verification only -> if still failing, present best-scoring solution with warning.
**L3**: one retry if any true: score <85, adversarial critical/moderate issue, verification failure.
After definitive run, rerun adversarial review; if definitive scores lower than original, keep original.
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
Run in exact order:
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
- Use Task tool for every agent launch with correct `subagent_type`.
- Parallelize independent launches.
- Pass focused context only and enforce context budgets.
- Track scores/leaderboard; update `run.json` after each scoring phase.
- Winning branch is the deliverable; ensure committed runnable code.
- Perform git/worktree operations in Bash.
- Do not set agent model parameter; agents inherit orchestrator model.
- Valid agent names: `effort-worker`, `effort-reviewer`, `effort-researcher`.
