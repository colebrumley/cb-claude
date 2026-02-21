---
name: spec
description: "Technical spec writing — iterative questioning, rubric-gated completeness, and parallel adversarial critique. Usage: /spec <description>"
user_invocable: true
arguments:
  - name: args
    description: "Description of what to spec"
    required: true
---
# Technical Spec Writer
Orchestrate iterative questioning and adversarial critique to produce implementation-ready specs.
## Phase 1: Parse & Configure
### Parse Arguments
Extract the spec description from `$ARGUMENTS`.
### Configure Run
Use `AskUserQuestion` (single call) to let the user configure before starting. Ask all applicable questions together.

**Always ask:**

1. **Spec Type** (header: "Spec type"): "What type of spec is this?"
   - "Auto-detect (Recommended)" — orchestrator infers from the description
   - "Feature" — new feature or user-facing capability
   - "API" — API design with endpoints, schemas, error codes
   - "System Architecture" — high-level system design and component boundaries

   The user can also provide free-text via the "Other" option to specify: migration, integration, or runbook.

2. **Depth** (header: "Depth"): "How thorough should the spec be?"
   - "Standard (Recommended)" — 3 question rounds, 4 critics
   - "Quick" — 2 rounds, 3 critics (small features, time-sensitive)
   - "Deep" — 4 rounds, 6 critics (complex systems, high-stakes)

3. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

4. **Instructions** (header: "Instructions"): "Any special instructions, constraints, or focus areas?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Security focus" — prioritize security concerns and threat modeling
   - "Simplicity focus" — favor minimal, pragmatic solutions

   The user can also provide free-text via the "Other" option.

### Auto-Detect Spec Type
If user selected "Auto-detect", classify based on description keywords:
- API/endpoint/schema/REST/GraphQL -> `api`
- migrate/migration/move/convert/upgrade -> `migration`
- integrate/connect/sync/webhook -> `integration`
- runbook/procedure/playbook/incident -> `runbook`
- architecture/system/design/infrastructure -> `system-architecture`
- Default -> `feature`

### Store Configuration
- `SPEC_TYPE`: `feature|api|system-architecture|migration|integration|runbook`
- `DEPTH`: `quick|standard|deep`
- `MAX_ROUNDS`: quick=2, standard=3, deep=4
- `CRITIC_COUNT`: quick=3, standard=4, deep=6
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.
- `ORIGINAL_IDEA`: the raw description from `$ARGUMENTS`

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  SPEC_ID="$(date +%Y%m%d-%H%M%S)-$$"
  SPEC_DIR="${REPO_ROOT}/.specs/spec-${SPEC_ID}"
  grep -qxF '.specs/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.specs/' >> "${REPO_ROOT}/.gitignore"
else
  SPEC_ID="$(date +%Y%m%d-%H%M%S)-$$"
  SPEC_DIR="${HOME}/.claude/specs/spec-${SPEC_ID}"
fi
mkdir -p "${SPEC_DIR}/artifacts"
```

### Initialize State Tracking
Create `${SPEC_DIR}/run.json`:
```json
{
  "spec_id": "<SPEC_ID>",
  "original_idea": "<description>",
  "spec_type": "<type>",
  "depth": "<depth>",
  "max_rounds": 3,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "rubric": {},
  "clarification_log": [],
  "status": "questioning"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "spec-${SPEC_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: spec type, depth, max question rounds, expected critic count, and the phase sequence.
---
## Phase 2: Generate Rubric
Select rubric based on `SPEC_TYPE`. Each dimension has a weight and starts at score 0. Scores: 0=unknown, 1=sketched, 2=defined, 3=specified.

**Feature rubric:**
| Dimension | Weight |
|-----------|--------|
| Problem Statement | 1.5 |
| User Stories / Scenarios | 1.5 |
| Functional Requirements | 2.0 |
| Non-Functional Requirements | 1.0 |
| Edge Cases & Error Handling | 1.5 |
| Dependencies & Constraints | 1.0 |
| Success Criteria | 1.0 |
| Scope Boundaries | 1.5 |

**API rubric:**
| Dimension | Weight |
|-----------|--------|
| Endpoints & Methods | 2.0 |
| Request/Response Schemas | 2.0 |
| Authentication & Authorization | 1.5 |
| Error Handling & Status Codes | 1.5 |
| Rate Limiting & Performance | 1.0 |
| Data Models | 1.5 |
| Versioning & Compatibility | 0.5 |
| Dependencies & Integrations | 1.0 |

**System Architecture rubric:**
| Dimension | Weight |
|-----------|--------|
| System Context & Boundaries | 1.5 |
| Component Design | 2.0 |
| Data Architecture | 1.5 |
| Integration Points | 1.5 |
| Non-Functional Requirements | 1.5 |
| Security Architecture | 1.0 |
| Deployment & Operations | 1.0 |
| Failure Modes & Recovery | 1.0 |

**Migration rubric:**
| Dimension | Weight |
|-----------|--------|
| Current State Documentation | 1.5 |
| Target State Design | 1.5 |
| Migration Strategy & Phases | 2.0 |
| Data Migration Plan | 2.0 |
| Rollback Plan | 1.5 |
| Risk Assessment | 1.0 |
| Testing Strategy | 1.0 |
| Cutover Plan | 1.0 |

**Integration rubric:**
| Dimension | Weight |
|-----------|--------|
| Systems & Roles | 1.5 |
| Data Contracts | 2.0 |
| Authentication & Security | 1.5 |
| Error Handling & Retries | 1.5 |
| Integration Architecture | 1.5 |
| Monitoring & Alerting | 1.0 |
| Testing Strategy | 1.0 |
| Rollout Plan | 0.5 |

**Runbook rubric:**
| Dimension | Weight |
|-----------|--------|
| Trigger Conditions | 1.5 |
| Prerequisites | 1.0 |
| Procedure Steps | 2.5 |
| Decision Points | 1.5 |
| Rollback Steps | 1.5 |
| Verification | 1.5 |
| Escalation Path | 0.5 |
| Known Issues | 0.5 |

Initialize all dimension scores to 0. Store rubric in `run.json`.
---
## Phase 3: Iterative Questioning Loop
This is the core UX. The orchestrator drives this directly (not delegated to an agent) because it requires tight user interaction.

### Threshold
- **Pass**: weighted average >= 2.0 AND no dimension at 0
- Weighted average = sum(score * weight) / sum(weight)

### Loop
```
round = 0
WHILE round < MAX_ROUNDS AND (weighted_average < 2.0 OR any_dimension_at_zero):
  round++

  1. IDENTIFY lowest-scoring dimensions (3-5, prioritize 0s)
  2. GENERATE targeted questions for those dimensions:
     - Concrete over abstract ("What happens when the DB is down?" not "How should errors work?")
     - Offer 2-3 common options plus "other" where possible
     - Escalate specificity across rounds (round 1: broad framing, round 2: gaps, round 3+: edge cases)
     - Batch by theme within each round
  3. ASK via single AskUserQuestion call (1-4 questions per round)
  4. PARSE answers and update dimension scores:
     - Detailed answer with specifics -> score 3 (specified)
     - Answer with some detail -> score 2 (defined)
     - Brief/partial answer -> score 1 (sketched)
     - "I don't know" responses -> handle per tier below
  5. HANDLE "I don't know" (three tiers):
     - Selected a default/obvious option -> [USER_DEFERRED], score 1, drafter uses reasonable defaults
     - "Don't know but it matters" / hedged answer -> [NEEDS_ASSUMPTION], score 1, drafter makes explicit assumption, critics will attack it
     - "I'll decide later" / skipped -> [TBD], score stays 0, spec gets a TBD section
  6. APPEND to clarification_log: {round, questions, answers, score_updates}
  7. SHOW rubric progress to user:
     Display a brief table of dimensions with current scores and the weighted average.

IF threshold met early (before MAX_ROUNDS):
  -> Tell the user the rubric is satisfied and offer to proceed or continue adding detail

IF MAX_ROUNDS hit with gaps (weighted_average < 2.0 or zeros remain):
  -> Warn the user about remaining gaps
  -> Offer: continue for one more round, or proceed with assumptions noted
```

### Question Design by Round
**Round 1** (Broad framing):
- Problem statement, primary users, core requirements
- "What problem does this solve?", "Who are the users?", "What does success look like?"

**Round 2** (Gap filling):
- Target lowest-scoring dimensions
- More specific: "What should happen when X fails?", "What data does this need access to?"

**Round 3+** (Edge cases & specifics):
- Edge cases, error handling, security, performance constraints
- "What's the maximum expected load?", "How should concurrent modifications be handled?"
---
## Phase 4: Draft Spec
### Prepare Context
Compile for the drafter:
- `SPEC_TYPE`
- `ORIGINAL_IDEA`
- Full `clarification_log` from Phase 3
- Current `rubric` state with scores
- `USER_INSTRUCTIONS` (if any)
- Output path: `${SPEC_DIR}/artifacts/spec-draft.md`

### Launch Drafter
Spawn `spec-drafter` teammate in DRAFT mode:
```
Task: "You are in DRAFT mode.
## Spec Type
<SPEC_TYPE>
## Original Idea
<ORIGINAL_IDEA>
## Rubric State
<rubric with dimension names, weights, and current scores>
## Clarification Log
<full Q&A log from all rounds>
## Output Path
Write the spec to: ${SPEC_DIR}/artifacts/spec-draft.md
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the codebase thoroughly to ground the spec in reality. Every requirement must trace to a user answer, codebase evidence (file:line), or an explicit [ASSUMPTION] marker."
Agent: spec-drafter
```
If `AGENT_MODEL` is set (not null), pass it as the `model` parameter. If `USER_INSTRUCTIONS` is set, prepend as `## User Instructions` section.

Wait for completion. Verify the spec file was written.
---
## Phase 5: Parallel Adversarial Critique
### Select Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| executive | Y | Y | Y |
| peer-engineer | Y | Y | Y |
| tech-founder | Y | Y | Y |
| security-engineer | - | Y | Y |
| qa-lead | - | - | Y |
| ops-sre | - | - | Y |

### Launch Critics
Spawn all critics as teammates in parallel (Task tool with `team_name`):
```
Task: "You are a spec critic reviewing from the <PERSPECTIVE> perspective.
## Spec Path
Read the spec at: ${SPEC_DIR}/artifacts/spec-draft.md
## Original Idea
<ORIGINAL_IDEA>
## Your Perspective
<PERSPECTIVE>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Review the spec from your perspective. Quote the spec or identify specific absences for every finding. Check for spec drift against the original idea."
Agent: spec-critic
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all critics to complete.
---
## Phase 6: Aggregate Findings & Critic-Driven Questioning
The orchestrator (not an agent) processes critic outputs. **Critic findings feed back into the question/rubric loop — no autonomous fixing.**

### Deduplication & Grouping
1. Collect all findings from all critics
2. Deduplicate: merge findings that reference the same spec section with the same issue
3. Group by severity: critical, major, minor
4. Note cross-perspective consensus (issues raised by 2+ critics are stronger signals)
5. Summarize to `${SPEC_DIR}/artifacts/critic-summary.md`

### Present Findings Summary
Show the critic findings grouped by severity (no proposed fixes — findings only):
```
### Findings Summary
- Critical: X | Major: Y | Minor: Z

### Critical Findings
**[F1] <issue title>**
Raised by: <perspective(s)>
Spec reference: <quoted section or "ABSENT — no section addresses X">
> <description of the issue and why it matters>

**[F2] <issue title>**
...

### Major Findings
**[F3] <issue title>**
...

### Minor Findings (for awareness only)
- <brief list>
```

### Convert Findings to Questions
Map critic findings back to the rubric and generate targeted questions:
1. For each critical/major finding, identify which rubric dimension(s) it affects
2. Re-score affected dimensions downward if the finding reveals a genuine gap (e.g., a dimension scored 2 but critics found a significant missing concern → drop to 1)
3. Generate 2-4 targeted questions that address the highest-impact findings
4. Questions must be concrete and specific to the issues critics raised — not generic rehashes of Phase 3 questions
5. Frame questions to elicit the user's intent, not to lead toward a predetermined fix

### Ask User
Use a single `AskUserQuestion` call combining the critic-driven questions with a proceed decision.

Include a final question:
- **Header**: "Proceed"
- **Question**: "The critics found issues that affect your rubric scores (see above). How would you like to proceed?"
  - "Answer questions and revise (Recommended)" — your answers will inform a revised draft
  - "Ship as-is" — finalize without changes

If user selects "Ship as-is", skip Phase 7 and go to Phase 8.

### Update Rubric
Parse user answers and update dimension scores (same scoring rules as Phase 3). Append to `clarification_log` as a new round tagged `source: critic-driven`. Show updated rubric progress to user.
---
## Phase 7: Revise with Enriched Context
### Prepare Context
Compile for the drafter:
- `SPEC_TYPE`
- `ORIGINAL_IDEA`
- Full `clarification_log` from Phase 3 AND Phase 6 (including critic-driven answers)
- Updated `rubric` state with re-scored dimensions
- Critic summary from `${SPEC_DIR}/artifacts/critic-summary.md`
- Previous draft path: `${SPEC_DIR}/artifacts/spec-draft.md`
- Output path: `${SPEC_DIR}/artifacts/spec-final.md`
- `USER_INSTRUCTIONS` (if any)

### Launch Drafter in Revise Mode
Spawn `spec-drafter` teammate in REVISE mode:
```
Task: "You are in REVISE mode.
## Spec Type
<SPEC_TYPE>
## Original Idea
<ORIGINAL_IDEA>
## Previous Draft
Read the previous draft at: ${SPEC_DIR}/artifacts/spec-draft.md
## Rubric State (Updated)
<rubric with dimension names, weights, and updated scores — highlight dimensions that changed after Phase 6>
## Full Clarification Log
<full Q&A log from all rounds, including the critic-driven round from Phase 6>
## Critic Summary
<aggregated critic findings from ${SPEC_DIR}/artifacts/critic-summary.md>
## Output Path
Write the revised spec to: ${SPEC_DIR}/artifacts/spec-final.md
## Instructions
<USER_INSTRUCTIONS or 'None'>

Revise the spec using the enriched context. Focus on dimensions where scores changed after critic-driven questioning. The user's new answers take precedence over your previous draft choices. Every requirement must trace to a user answer, codebase evidence (file:line), or an explicit [ASSUMPTION] marker."
Agent: spec-drafter
```
If `AGENT_MODEL` is set (not null), pass it as the `model` parameter. If `USER_INSTRUCTIONS` is set, prepend as `## User Instructions` section.

Wait for completion. Verify `spec-final.md` was written.
---
## Phase 8: Finalize & Present
### Summary
Present to the user:
```
## Spec Complete: <title>
**Type**: <spec_type> | **Depth**: <depth> | **Rounds**: <rounds_used>/<max_rounds> | **Critics**: <critic_count>

### Rubric Final State
| Dimension | Weight | Score | Status |
|-----------|--------|-------|--------|
| <name> | <weight> | <score>/3 | <unknown/sketched/defined/specified> |
**Weighted Average**: X.X/3.0

### Adversarial Summary
- **Critical issues**: X (Y addressed)
- **Major issues**: X (Y addressed)
- **Minor issues**: X
- **Cross-perspective consensus**: <key themes>

### Assumptions Made
[List all [ASSUMPTION] items from the spec, or "None"]

### TBD Items
[List all [TBD] items from the spec, or "None"]

### User-Deferred Items
[List all [USER_DEFERRED] items from the spec, or "None"]
```

### Ask Where to Save
Use `AskUserQuestion`:
1. "Current directory (Recommended)" — copy final spec to `./spec-<short-title>.md`
2. "Custom path" — user provides path via "Other"
3. "Artifacts only" — leave in `${SPEC_DIR}/artifacts/`, print the path

Copy the final spec (either `spec-final.md` if Phase 7 ran, or `spec-draft.md` if shipped as-is) to the chosen location.

### Cleanup
1. Shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate
2. Call `TeamDelete`
3. Remove working directory:
```bash
rm -rf "${SPEC_DIR}"
# Remove .specs/ if empty
rmdir "${REPO_ROOT}/.specs" 2>/dev/null || true
```
---
## State Management
- Working directory: `${SPEC_DIR}` (gitignored via `.specs/`)
- Falls back to `~/.claude/specs/` if not in a git repo
- State tracked in `run.json`
- Artifacts stored in `${SPEC_DIR}/artifacts/`
- Clarification log accumulated across rounds in `run.json`
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If drafter fails: retry once. If still fails, present partial results and offer to save what exists.
3. If a critic fails: continue with remaining critics. If fewer than half succeed, note reduced review coverage.
4. Do not retry failed critics.

### No Codebase Context
If not in a git repo or codebase is empty:
1. Continue without codebase grounding.
2. Drafter will produce spec based on user answers only.
3. Note in final summary: "Spec not grounded in codebase — verify against actual implementation."

### User Abandons Questioning
If user provides minimal answers across rounds:
1. Warn that spec will have many assumptions.
2. Offer to proceed or abort.
3. If proceeding, drafter marks all gaps as `[ASSUMPTION]`.
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent using the Task tool with the `team_name` parameter.
- **Orchestrator handles questioning directly** — do not delegate Phase 3 to an agent.
- **Single AskUserQuestion per round** — batch all questions for a round into one call.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt.
- Valid agent names: `spec-drafter`, `spec-critic`.
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
   - Phase 4 requires: at least 1 round of questioning completed
   - Phase 5 requires: spec-draft.md exists and is non-empty
   - Phase 6 requires: at least 1 critic produced output
   - Phase 7 requires: user answered critic-driven questions (not "ship as-is")
   - Phase 8 requires: final spec exists (draft or revised)
4. ONLY THEN: Enter the next phase
```
### Red Flags — STOP If You Notice
- About to spawn the drafter without completing at least one question round
- About to spawn critics without verifying the spec file exists
- Skipping the rubric threshold check
- Generating questions without looking at the rubric scores
- Presenting results without verifying artifacts exist
- Using "should be fine" or "probably complete" about spec quality
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
