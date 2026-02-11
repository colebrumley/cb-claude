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

You are the orchestrator for an effort-scaled parallel implementation pipeline. You coordinate researchers, test writers, implementation workers, reviewers, synthesizers, and adversarial agents to produce the best possible solution to a task.

## Phase 1: Parse & Setup

### Parse Arguments

Parse `$ARGUMENTS` to extract:
1. **Effort level** (optional): A leading `1`, `2`, or `3` before the task description
2. **Task description**: Everything else

Examples:
- `/effort add a hello endpoint` → level=auto, task="add a hello endpoint"
- `/effort 2 add user authentication` → level=2, task="add user authentication"
- `/effort 3 redesign the data layer` → level=3, task="redesign the data layer"

### Auto-Detect Effort Level

If no explicit level is given, analyze the task to determine the appropriate level:

**Level 1 — "Try harder"** (default for most tasks):
- Moderate scope, some ambiguity
- Multiple valid approaches exist but scope is bounded
- Examples: "add input validation", "new API endpoint", "add dark mode", "fix the header bug"

**Level 2 — "High effort"**:
- Broad scope OR high ambiguity OR explicitly important
- Cross-cutting concerns, multiple systems touched
- Examples: "refactor auth", "build notification system", "add SSO", "implement caching layer"

**Level 3 — "Ludicrous mode"**:
- Architectural, high-stakes, novel, or deeply complex
- System-wide impact, requires careful design
- Examples: "migrate to new framework", "redesign the data layer", "build a new subsystem from scratch"

When in doubt between two levels, choose the lower one.

### Verify Prerequisites (Safe Run Isolation)

```bash
git rev-parse --is-inside-work-tree
REPO_ROOT="$(git rev-parse --show-toplevel)"
CURRENT_BRANCH="$(git branch --show-current)"
EFFORT_ID="$(date +%Y%m%d-%H%M%S)-$$"
EFFORT_DIR="/tmp/effort-${EFFORT_ID}"
mkdir -p "${EFFORT_DIR}/artifacts"
```

Check for clean working tree:
```bash
if [ -n "$(git status --porcelain)" ]; then
  git stash push -m "effort-auto-stash-${EFFORT_ID}"
  STASH_REF="effort-auto-stash-${EFFORT_ID}"
fi
```

### Initialize State Tracking

Create a state file at `${EFFORT_DIR}/run.json` to track progress:
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

Update this file after each phase. Use it as the single source of truth for branches, worktrees, scores, and statuses.

### Announce the Plan

Tell the user:
- Detected/selected effort level and what it means
- How many agents will be spawned (approximate)
- Which stages will run

Example:
> **Effort Level 2 — "High effort"**
> Task: add user authentication
> Pipeline: Research (2) → Tests (1) → Implementation (5 workers) → Evaluation (2 reviewers) → Synthesis → Adversarial (1) → Verification
> Estimated agents: ~12

---

## Git Conventions

### Naming
- Effort directory: `/tmp/effort-${EFFORT_ID}`
- Effort branches: `effort/${EFFORT_ID}/<role>` (e.g., `effort/${EFFORT_ID}/minimalist`)
- Worktree paths: `${EFFORT_DIR}/<role>`

### Worker Commit Convention
Each worker should make a single commit on its branch with message: `effort(${EFFORT_ID}): <worker-name> implementation of <task-summary>`

---

## Scoring Rubric (Used by All Reviewers)

All reviewers use the rubric defined in the `effort-reviewer` agent definition. When launching reviewers, remind them to use **MODE: SCORING** and the 0-20 per-dimension scale (Correctness, Quality, Codebase Fit, Completeness, Elegance = 100 total).

**Thresholds** (used throughout the pipeline):
- Score >= 80: Strong pass — advances to next phase
- Score 60-79: May advance if among top solutions
- Score < 60: Eliminated
- Any critical issues in review feedback: Must be addressed before final acceptance

---

## Context Flow

Each phase consumes specific inputs and produces specific outputs. Pass agents ONLY the inputs listed for their phase — do not pass the entire accumulated history.

| Phase | Inputs | Outputs | Max Size |
|-------|--------|---------|----------|
| Research | Task description, codebase access | Research reports (1-3) | 2000 words each |
| Test Generation | Task description, research reports | Test files (committed) | N/A (files) |
| Implementation R1 | Task description, research summary*, perspective, test command, worktree path | Git branches with implementations | N/A (branches) |
| Evaluation R1 | Task description, research summary*, diffs from each worker | Score output per worker per reviewer | 500 words feedback each |
| Synthesis | Top worker diffs, all review feedback, research summary* | Synthesized branch | N/A (branch) |
| Adversarial | Task description, winning diff, research summary* | Issue list with severity ratings | 1000 words |
| Verification | Winning branch, test/lint/build commands | Pass/fail + output logs | Truncate to last 100 lines |

*Research summary: Before Phase 3, condense all research reports into a single summary of no more than 1500 words. Use this summary (not the full reports) for all subsequent phases.

### Context Budget Rules

- Never inline full diffs for more than 2 solutions in a single agent prompt.
- Store all diffs/outputs as files under `${EFFORT_DIR}/artifacts/`.
- When passing context to reviewers or synthesizers, pass summaries first (max 250 words per candidate + patch stats).
- Reviewers and synthesizers may read full diffs from worktree paths directly.

---

## Phase Transitions

Before entering each phase, verify its preconditions. If preconditions are not met, execute the fallback.

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

Launch research and test writing in parallel. Use the Task tool for all agent launches.

### Research

Launch `effort-researcher` agent(s) based on level:

**Level 1** — 1 researcher:
```
Task: "Research the codebase for this task: <task description>. Produce a structured research briefing."
Agent: effort-researcher
```

**Level 2** — 2 researchers in parallel:
```
Researcher A: "Research the codebase ARCHITECTURE for this task: <task>. Focus on module structure, data flow, key abstractions, and dependency graph."
Researcher B: "Research SIMILAR FEATURES in the codebase for this task: <task>. Find the closest existing implementations, patterns, and conventions to follow."
```

**Level 3** — 3 researchers in parallel:
```
Researcher A: Architecture focus (same as L2)
Researcher B: Similar features focus (same as L2)
Researcher C: "Research SECURITY and EDGE CASES for this task: <task>. Focus on auth patterns, input validation, error handling, concurrency issues, and resource limits."
```

After all complete, combine outputs into a single **research summary** (max 1500 words) for use in all subsequent phases. Save full reports to `${EFFORT_DIR}/artifacts/`.

### Test Generation

Launch `effort-worker` agent(s) in Write Tests mode:

**Level 1** — 1 test writer:
```
Task: "You are in WRITE TESTS mode. Write tests for: <task description>. Focus on happy path and obvious edge cases. <research briefing>. Write tests in the main repo at <REPO_ROOT>. Match the existing test framework and style."
Agent: effort-worker
```

**Level 2** — 1 deep test writer:
```
Task: "You are in WRITE TESTS mode. Write COMPREHENSIVE tests for: <task description>. Cover: happy path, edge cases, error conditions, boundary values. <research briefing>. Write tests in the main repo at <REPO_ROOT>."
Agent: effort-worker
```

**Level 3** — 3 test writers in parallel (each in its own worktree to avoid conflicts), then 1 synthesis:

First create isolated test worktrees:
```bash
git worktree add "${EFFORT_DIR}/test-core" -b "effort/${EFFORT_ID}/test-core"
git worktree add "${EFFORT_DIR}/test-edge" -b "effort/${EFFORT_ID}/test-edge"
git worktree add "${EFFORT_DIR}/test-integration" -b "effort/${EFFORT_ID}/test-integration"
```

```
Test Writer A: "You are in WRITE TESTS mode. Focus: CORE functionality. Write happy path and core functionality tests for: <task>. <research briefing>. Write in ${EFFORT_DIR}/test-core. IMPORTANT: Name your test file(s) with a '.core' suffix before the test extension."
Test Writer B: "You are in WRITE TESTS mode. Focus: EDGE CASES. Write edge case and boundary value tests for: <task>. <research briefing>. Write in ${EFFORT_DIR}/test-edge. IMPORTANT: Name your test file(s) with a '.edge' suffix before the test extension."
Test Writer C: "You are in WRITE TESTS mode. Focus: INTEGRATION + SECURITY. Write integration and security tests for: <task>. <research briefing>. Write in ${EFFORT_DIR}/test-integration. IMPORTANT: Name your test file(s) with a '.integration' suffix before the test extension."
```

After all 3 complete, launch 1 synthesis agent:
```
Task: "You are in SYNTHESIZE mode for TEST SUITES. You have 3 test files written by different agents. Merge them into a single comprehensive, deduplicated test suite. Remove redundant tests. Resolve any conflicts. Ensure all tests can run together. The test files are: <paths from the 3 test writers>. Working directory: <REPO_ROOT>"
Agent: effort-worker
```

### Commit Tests & Create Worktrees

**IMPORTANT: Never commit directly on the user's current branch.** Create a dedicated effort base branch for the test commit:

```bash
cd "${REPO_ROOT}"
BASE_COMMIT="$(git rev-parse HEAD)"

# Create a dedicated effort base branch — do NOT commit on the user's branch
git checkout -b "effort/${EFFORT_ID}/base" "${BASE_COMMIT}"

# Stage only test files reported by the test writer agent(s)
git add <test file paths from test writer reports>
git commit -m "effort(${EFFORT_ID}): generated test suite for: <short task summary>"
TEST_COMMIT="$(git rev-parse HEAD)"

# Return to the user's original branch immediately
git checkout "${CURRENT_BRANCH}"
```

Now create worker worktrees (they'll include the test commit). Worker count by level: L1=3, L2=5, L3=7.

```bash
for WORKER in minimalist architect convention; do  # extend list by level
  git worktree add -b "effort/${EFFORT_ID}/${WORKER}" "${EFFORT_DIR}/${WORKER}" "${TEST_COMMIT}"
done

# Synthesizer worktree
git worktree add -b "effort/${EFFORT_ID}/synthesizer" "${EFFORT_DIR}/synthesizer" "${TEST_COMMIT}"
```

Update `run.json` with worktree paths.

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

Assign perspectives based on level:
- **L1**: workers 1-3 get perspectives 1-3
- **L2**: workers 1-5 get perspectives 1-5
- **L3**: workers 1-7 get all perspectives

### Launch Workers

Launch ALL workers in parallel using the Task tool. Each worker gets:

```
Task: "You are in IMPLEMENT mode.

## Task
<task description>

## Your Perspective: <perspective name>
Guiding question: <guiding question>

## Research Briefing
<condensed research summary — max 1500 words>

## Test Suite
Tests are already in your worktree. Run them with: <test command from research>

## Your Worktree
Work ONLY in: ${EFFORT_DIR}/<perspective>
Use absolute paths. All file operations must target your worktree.
Do NOT read or write files outside your worktree.
Commit all changes when done.

Implement the task from your perspective. Follow codebase conventions. Run tests. Commit."

Agent: effort-worker
```

Wait for all workers to complete.

---

## Phase 4: Evaluation Round 1

### Gather Diffs

For each worker, diff against the merge-base with the test commit:

```bash
cd "${EFFORT_DIR}/${WORKER}"
BASE_SHA="$(git merge-base HEAD effort/${EFFORT_ID}/synthesizer)"
git diff "${BASE_SHA}..HEAD" > "${EFFORT_DIR}/artifacts/${WORKER}.patch"
git diff --stat "${BASE_SHA}..HEAD" > "${EFFORT_DIR}/artifacts/${WORKER}.stats"
```

### Launch Reviewers

**Level 1** — 1 reviewer:
```
Task: "MODE: SCORING. Score these <N> implementations of: <task>.

<research summary>

<For each worker: name, perspective, diff stats, worktree path>

The full diffs are available in the worktrees. Read them directly.
Score each on Correctness, Quality, Codebase Fit, Completeness, Elegance (0-20 each). Rank all solutions. Recommend which should advance to synthesis."
Agent: effort-reviewer
```

**Level 2** — 2 reviewers in parallel:
```
Reviewer A: Same as L1 (independent scoring)
Reviewer B: Same as L1 (independent scoring)
```
After both complete, reconcile scores: average the two reviewers' scores for each solution per dimension. Compute weighted totals from averaged dimensions.

**Level 3** — 3 specialized reviewers in parallel:
```
Reviewer A: "MODE: SCORING. FOCUS: correctness-completeness. <same info as above>"
Reviewer B: "MODE: SCORING. FOCUS: security-resilience. <same info as above>"
Reviewer C: "MODE: SCORING. FOCUS: quality-fit-elegance. <same info as above>"
```
Reconcile by averaging all three reviewers' scores per dimension.

### Rank Solutions

After evaluation, produce a ranked list. Update `run.json` with scores.

---

## Phase 5: Synthesis / Advancement

### Level 1-2: Synthesize

Pick the top solutions (L1: top 2, L2: top 3).

Launch 1 `effort-worker` as synthesizer:
```
Task: "You are in SYNTHESIZE mode.

## Task
<task description>

## Solutions to Combine
<For each top solution: name, perspective, score, reviewer feedback summary (max 250 words each), worktree path for reading the full diff>

## Your Worktree
Work in: ${EFFORT_DIR}/synthesizer
Combine the best elements of these solutions into a single superior implementation.
Run tests. Commit."

Agent: effort-worker
```

After synthesis completes, get the synthesis diff and have the reviewer(s) score it alongside the original top solutions. The winner is whichever scores highest — original or hybrid.

### Level 3: Advancement

No synthesis yet. The top 3 scoring solutions from Round 1 advance to Round 2. Note which workers/perspectives won.

---

## Phase 6: Round 2 — Refinement (Level 3 Only)

Create refinement worktrees branching from each winner's branch:

```bash
# Assuming workers X, Y, Z are the top 3
git worktree add -b "effort/${EFFORT_ID}/refine-1" "${EFFORT_DIR}/refine-1" "effort/${EFFORT_ID}/<winner-X>"
git worktree add -b "effort/${EFFORT_ID}/refine-2" "${EFFORT_DIR}/refine-2" "effort/${EFFORT_ID}/<winner-Y>"
git worktree add -b "effort/${EFFORT_ID}/refine-3" "${EFFORT_DIR}/refine-3" "effort/${EFFORT_ID}/<winner-Z>"
```

Launch 3 refinement workers in parallel:
```
Task: "You are in REFINE mode.

## Task
<task description>

## Your Solution (to refine)
Worktree: ${EFFORT_DIR}/refine-<N>
<reviewer feedback summary for this solution>

## Competing Solutions (for inspiration)
<For each of the other two winners: worktree path, perspective, score, feedback summary>

## Your Worktree
Work in: ${EFFORT_DIR}/refine-<N>
Refine this solution. Address all reviewer feedback. Borrow good ideas from competitors. Run tests. Commit."

Agent: effort-worker
```

---

## Phase 7: Re-evaluation — Round 2 (Level 3 Only)

Launch 2 `effort-reviewer` agents to independently score the 3 refined solutions:

```
Task: "MODE: SCORING. Score these 3 REFINED implementations of: <task>.

<research summary>

<For each refined solution: original perspective, original score, worktree path>

Score each. Rank. Recommend the best."
Agent: effort-reviewer
```

Average the two reviewers' scores per dimension. Select the top 2 for final synthesis.

---

## Phase 8: Final Synthesis (Level 3 Only)

Create a final synthesis worktree:
```bash
git worktree add -b "effort/${EFFORT_ID}/final-synthesis" "${EFFORT_DIR}/final-synthesis" "effort/${EFFORT_ID}/refine-<best>"
```

Launch 1 `effort-worker`:
```
Task: "You are in SYNTHESIZE mode. This is the FINAL SYNTHESIS — the definitive implementation.

## Task
<task description>

## Top 2 Refined Solutions
<For each: perspective, score, feedback summary, worktree path>

## Your Worktree
Work in: ${EFFORT_DIR}/final-synthesis
Produce the single best possible implementation by combining the best of both. Run tests. Commit."

Agent: effort-worker
```

---

## Phase 9: Adversarial Review (Level 2+)

### Level 2 — 1 adversarial reviewer:
```
Task: "MODE: ADVERSARIAL. Your job is to BREAK this implementation.

## Task
<task description>

## Winning Implementation
Worktree: ${EFFORT_DIR}/<winner>
Read the diff and code directly from the worktree.

## Research Briefing
<research summary>

Characterize the attack surface first, then test relevant vectors: security holes, race conditions, edge cases, resource leaks, logic errors, injection, auth bypass. Be creative. Be thorough."
Agent: effort-reviewer
```

### Level 3 — 2 adversarial reviewers in parallel:
```
Adversary A: "MODE: ADVERSARIAL. FOCUS: SECURITY. <same info>. Focus on injection, auth bypass, data exposure, input validation, resource exhaustion."
Adversary B: "MODE: ADVERSARIAL. FOCUS: CORRECTNESS. <same info>. Focus on logic errors, race conditions, edge cases, incorrect state transitions, error handling gaps."
```

---

## Phase 10: Verification (All Levels)

Run verification checks against the winning implementation's worktree.

Determine the test/lint/type-check/build commands from the research briefing and project config files (package.json scripts, Makefile targets, etc.).

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

Report results clearly. Save output to `${EFFORT_DIR}/artifacts/verification.log`.

---

## Phase 11: Retry (L2+, Conditional)

### Retry Trigger Conditions

**L2** — Retry if ANY of:
- Weighted total score < 80
- Any adversarial finding with severity "critical"
- Verification (tests/lint/typecheck) fails

Maximum 1 retry. On retry:
1. Create a new worktree from the winning branch.
2. Launch a single "definitive" worker with: task description, research summary, winning diff worktree path, ALL review feedback, ALL adversarial issues.
3. Prompt: "You are in IMPLEMENT mode. This is a RETRY — previous implementations had issues. Fix ALL identified issues while preserving what works. Do not rewrite from scratch. Run tests. Commit."
4. Re-run verification only (no re-review).
5. If verification still fails, present the best-scoring solution to the user with a warning.

**L3** — Retry if ANY of:
- Weighted total score < 85
- Any adversarial finding with severity "critical" or "moderate"
- Verification fails

Launch a definitive worker as above, but also re-run adversarial review on the result. If the definitive worker's solution scores lower than the original, keep the original.

Never run more than one retry/final-definitive pass.

---

## Phase 12: Final Review (Level 3 Only)

Launch 1 `effort-reviewer` in Final Review mode:
```
Task: "MODE: FINAL_REVIEW. This is the last quality gate before presenting to the user.

## Task
<task description>

## Final Implementation
Worktree: ${EFFORT_DIR}/<final-winner>
Read the diff and code directly from the worktree.

## History
This solution went through: <N> workers → evaluation → synthesis → refinement → adversarial review → verification. It is the best of <total agents> agent invocations.

## Research Briefing
<research summary>

Conduct a comprehensive code review. Check correctness, security, performance, maintainability. This is a pull request review, not a score."
Agent: effort-reviewer
```

---

## Phase 13: Present Results

Present results to the user in this format:

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

Display the winning solution's diff:
```bash
cd "${EFFORT_DIR}/<winner>"
BASE_SHA="$(git merge-base HEAD "${CURRENT_BRANCH}")"
git diff "${BASE_SHA}..HEAD"
```

### Ask the User

Present options:
1. **Apply this solution** — merge the winning branch
2. **View alternative solutions** — show other implementations with their scores
3. **Modify** — make specific changes before applying
4. **Abort** — clean up without applying

---

## Phase 14: Merge & Cleanup

### If user approves:

```bash
cd "${REPO_ROOT}"
git merge "effort/${EFFORT_ID}/<winning-branch>" --no-ff -m "effort: <task summary>"
```

If merge produces conflicts, do NOT auto-resolve. Present the conflict to the user and ask them to choose: apply with conflicts marked, pick a different solution, or abort.

### Always clean up (even on failure):

Execute in this exact order:

```bash
# 1. Remove worktrees
for wt in $(git worktree list --porcelain | grep "^worktree ${EFFORT_DIR}" | sed 's/^worktree //'); do
  git worktree remove "$wt" --force 2>/dev/null
done

# 2. Remove effort branches
for branch in $(git branch --list "effort/${EFFORT_ID}/*"); do
  git branch -D "$branch" 2>/dev/null
done

# 3. Remove effort directory
rm -rf "${EFFORT_DIR}"

# 4. Restore stash if we stashed earlier (use apply + drop for safety)
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

Since tests are committed on the `effort/${EFFORT_ID}/base` branch (not the user's branch), no `git reset` is needed on abort — the user's branch is never modified until explicit merge approval.

---

## Error Handling

### Agent Failure (single agent in a parallel group fails)
1. Log the failure: note which agent, which phase, what error.
2. Continue with successful agents' outputs.
3. If fewer than half of the agents in a group succeed, add a warning to the final report.
4. Never retry a failed agent — the pipeline has redundancy by design.

### All Workers Fail in a Phase
1. Log the complete failure.
2. **If Phase 3 (Implementation R1)**: Launch a single fallback worker with the "convention" perspective and all research context. If this also fails, abort the pipeline.
3. **If Phase 4+ (Evaluation/Review)**: Skip the phase and proceed. Note in the final report that the phase was skipped.
4. Clean up all resources before reporting to the user.

### Minimum Success Thresholds
- Research: require >= 1 successful researcher, else proceed with no briefing (note reduced confidence).
- Test generation: require >= 1 successful test suite, else continue with explicit "no-new-tests" flag.
- Implementation: require >= 2 successful workers for L2/L3 (>= 1 for L1), else abort.
- Review: require >= 1 successful reviewer, else skip scoring and use orchestrator judgment.

### Worktree Creation Failure
1. If `git worktree add` fails, try with a different path (append timestamp).
2. If it keeps failing, fall back to regular branches. Workers on regular branches must be launched sequentially.
3. Note the degraded mode in the final report.

### Test Generation Failure
1. Proceed without tests.
2. In Phase 10 (Verification), run only lint/typecheck/build — skip test execution.
3. Note the absence of tests in the final report and adversarial review.

### Cleanup Protocol (runs on ANY exit path)
Always run the cleanup sequence from Phase 14, even if the pipeline fails partway through. If you're about to stop for any reason, clean up first.

If the user interrupts (e.g., types "stop" or "cancel"), clean up immediately.

---

## Important Notes

- **Use the Task tool** for ALL agent launches. Each agent is a separate Task invocation with the appropriate `subagent_type`.
- **Parallelize aggressively.** Launch independent agents in the same message (multiple Task calls). This is the whole point of effort scaling.
- **Pass focused context.** Each agent only sees what you give it. Include the research summary, test locations, worktree paths, and any relevant prior results — but respect the context budget rules above.
- **Track scores carefully.** You're managing a tournament. Keep a clear leaderboard. Update `run.json` after each scoring phase.
- **The winning branch is the deliverable.** Make sure it contains committed, working code.
- **Git operations happen in Bash.** Worktree management, branching, merging — all via Bash.
- **Agents inherit the model.** All agents use the same model as the orchestrator (opus). Do not specify a model parameter.
- All agent types are custom agents defined in this plugin. Use the agent name as the `subagent_type` — e.g., `subagent_type: "effort-worker"`, `subagent_type: "effort-reviewer"`, `subagent_type: "effort-researcher"`.
