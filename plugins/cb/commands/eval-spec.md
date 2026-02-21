---
name: eval-spec
description: "External evaluation spec generator — SRE-minded black-box validation specs with strong oracles and reproducible scenarios. Usage: /eval-spec <system or change description>"
user_invocable: true
arguments:
  - name: args
    description: "Description of the system or change to generate an evaluation spec for"
    required: true
---
# External Evaluation Spec Generator
Orchestrate codebase research, iterative input gathering, and adversarial critique to produce a structured YAML evaluation specification for black-box validation.
## Phase 1: Parse & Configure
### Parse Arguments
Extract the system/change description from `$ARGUMENTS`.
### Configure Run
Use `AskUserQuestion` (single call) to let the user configure before starting. Ask all applicable questions together.

**Always ask:**

1. **Scope** (header: "Scope"): "What is the evaluation scope?"
   - "System evaluation (Recommended)" — evaluate an existing system or component
   - "Change evaluation" — evaluate a specific change, PR, or migration
   - "Incident-driven" — generate regression spec after an incident

2. **Depth** (header: "Depth"): "How thorough should the evaluation spec be?"
   - "Standard (Recommended)" — 2 question rounds, 3 researchers, 3 critics
   - "Quick" — 1 question round, 1 researcher, 2 critics (small changes, fast feedback)
   - "Deep" — 3 question rounds, 3 researchers, 5 critics (critical systems, high stakes)

3. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

4. **Instructions** (header: "Instructions"): "Any special instructions, constraints, or focus areas?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Security focus" — prioritize security-related evaluation scenarios
   - "Performance focus" — prioritize performance and reliability scenarios

   The user can also provide free-text via the "Other" option.

### Store Configuration
- `SCOPE`: `system|change|incident`
- `DEPTH`: `quick|standard|deep`
- `MAX_ROUNDS`: quick=1, standard=2, deep=3
- `RESEARCHER_COUNT`: quick=1, standard=3, deep=3
- `CRITIC_COUNT`: quick=2, standard=3, deep=5
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.
- `SYSTEM_DESCRIPTION`: the raw description from `$ARGUMENTS`

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  EVAL_ID="$(date +%Y%m%d-%H%M%S)-$$"
  EVAL_DIR="${REPO_ROOT}/.eval-specs/eval-${EVAL_ID}"
  grep -qxF '.eval-specs/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.eval-specs/' >> "${REPO_ROOT}/.gitignore"
else
  EVAL_ID="$(date +%Y%m%d-%H%M%S)-$$"
  EVAL_DIR="${HOME}/.claude/eval-specs/eval-${EVAL_ID}"
fi
mkdir -p "${EVAL_DIR}/artifacts"
```

### Initialize State Tracking
Create `${EVAL_DIR}/run.json`:
```json
{
  "eval_id": "<EVAL_ID>",
  "system_description": "<description>",
  "scope": "<scope>",
  "depth": "<depth>",
  "max_rounds": 2,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "input_log": [],
  "status": "questioning"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "eval-${EVAL_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: scope, depth, max question rounds, expected researcher count, critic count, and the phase sequence.
---
## Phase 2: Iterative Input Gathering
This is the core user interaction. The orchestrator drives this directly (not delegated to an agent) because it requires tight user interaction.

### Input Dimensions
Track completeness across these dimensions. Each starts at score 0. Scores: 0=unknown, 1=sketched, 2=defined, 3=specified.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| System Interfaces | 2.0 | External APIs, events, CLIs, AWS resources |
| Risk & Failure Modes | 2.0 | Known risks, failure scenarios, past incidents |
| Success Criteria | 1.5 | What "correct" means from an external observer's perspective |
| Environment Constraints | 1.0 | Where evals run (CI, staging, prod), what's available |
| Data & State | 1.5 | Input data sources, state dependencies, seed data |
| Observability | 1.0 | Available metrics, logs, traces, health checks |
| Change Context | 1.0 | What changed and why (if scope=change or incident) |

### Threshold
- **Pass**: weighted average >= 2.0 AND no dimension at 0 (except Change Context if scope=system)
- Weighted average = sum(score * weight) / sum(weight)

### Loop
```
round = 0
WHILE round < MAX_ROUNDS AND (weighted_average < 2.0 OR any_required_dimension_at_zero):
  round++

  1. IDENTIFY lowest-scoring dimensions (2-4, prioritize 0s)
  2. GENERATE targeted questions for those dimensions:
     - Concrete over abstract ("What HTTP endpoints does the service expose?" not "What are the interfaces?")
     - Offer 2-3 common options plus "other" where possible
     - Escalate specificity across rounds (round 1: broad surface area, round 2: failure modes & edge cases, round 3: adversarial scenarios & data)
     - Batch by theme within each round
  3. ASK via single AskUserQuestion call (1-4 questions per round)
  4. PARSE answers and update dimension scores:
     - Detailed answer with specifics -> score 3 (specified)
     - Answer with some detail -> score 2 (defined)
     - Brief/partial answer -> score 1 (sketched)
     - "I don't know" -> handle per tier below
  5. HANDLE "I don't know" (three tiers):
     - Selected a default/obvious option -> [USER_DEFERRED], score 1, generator uses reasonable defaults
     - "Don't know but it matters" -> [NEEDS_ASSUMPTION], score 1, generator makes explicit assumption
     - "I'll decide later" / skipped -> [TBD], score stays 0, spec gets a TBD section
  6. APPEND to input_log: {round, questions, answers, score_updates}
  7. SHOW dimension progress to user:
     Display a brief table of dimensions with current scores and the weighted average.

IF threshold met early (before MAX_ROUNDS):
  -> Tell the user the input gathering is sufficient and offer to proceed or continue adding detail

IF MAX_ROUNDS hit with gaps (weighted_average < 2.0 or zeros remain):
  -> Warn the user about remaining gaps
  -> Offer: continue for one more round, or proceed with assumptions noted
```

### Question Design by Round
**Round 1** (Surface area mapping):
- What interfaces does the system expose? (APIs, events, CLIs)
- What are the known risks or past incidents?
- What does "working correctly" look like from the outside?
- Where will evaluations run? (CI, staging, production)

**Round 2** (Failure modes & specifics):
- What happens when dependency X is down?
- What data sources are available for test inputs?
- What metrics/logs are available to observe behavior?
- What are the rollback triggers?

**Round 3** (Adversarial & data — deep only):
- What adversarial inputs should be tested?
- What timing/concurrency scenarios matter?
- What's the incident-to-regression pipeline?
- What irreversible operations exist?
---
## Phase 3: Codebase Research
### Launch Researchers by Depth
- **Quick**: 1 researcher (`general` focus)
- **Standard**: 3 researchers in parallel (`external-interfaces`, `failure-modes`, `observables`)
- **Deep**: 3 researchers in parallel (same as standard, but instruct for exhaustive exploration)

Spawn all researchers as teammates:
```
Task: "You are an eval spec researcher with focus: <FOCUS>.
## System Description
<SYSTEM_DESCRIPTION>
## Change Summary
<change_summary if scope=change|incident, else 'N/A'>
## Known Interfaces (from user)
<interfaces from input_log>
## Search Hints
<any specific paths, services, or patterns the user mentioned>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the codebase thoroughly from your focus area. Discover external interfaces, observables, and failure modes that an external evaluation harness could target."
Agent: eval-spec-researcher
```
If `AGENT_MODEL` is set (not null), pass it as the `model` parameter. If `USER_INSTRUCTIONS` is set, prepend as `## User Instructions` section.

Wait for all researchers to complete. Save reports to `${EVAL_DIR}/artifacts/research-<focus>.md`.

### Compile Research Summary
Merge all research reports into a single summary (max 2000 words):
- Deduplicate discovered interfaces
- Merge failure mode lists
- Combine observable inventories
- Note conflicts between researchers
- Preserve file:line citations

Save to `${EVAL_DIR}/artifacts/research-summary.md`.
---
## Phase 4: Generate Eval Spec
### Prepare Context
Compile for the generator:
- `SYSTEM_DESCRIPTION`
- `SCOPE`
- Change summary (if applicable)
- Full `input_log` from Phase 2
- Research summary from Phase 3
- Dimension scores and gaps
- `USER_INSTRUCTIONS` (if any)
- Output path: `${EVAL_DIR}/artifacts/eval-spec.yaml`

### Launch Generator
Spawn `eval-spec-generator` teammate in GENERATE mode:
```
Task: "You are in GENERATE mode.
## System Description
<SYSTEM_DESCRIPTION>
## Evaluation Scope
<SCOPE>
## Change Summary
<change_summary or 'N/A — baseline evaluation'>
## User Inputs
<full input_log from all rounds>
## Dimension Scores
<dimension names, weights, and current scores>
## Research Summary
<compiled research summary — max 2000 words>
## Output Path
Write the eval spec to: ${EVAL_DIR}/artifacts/eval-spec.yaml
## Instructions
<USER_INSTRUCTIONS or 'None'>

Generate a complete external evaluation specification in YAML. Ground every element in user inputs or codebase evidence. Prefer strong oracles. Include at least one metamorphic property. Tie every scenario to an identified risk."
Agent: eval-spec-generator
```
If `AGENT_MODEL` is set, pass it as `model`. If `USER_INSTRUCTIONS` is set, prepend as `## User Instructions` section.

Wait for completion. Verify the spec file was written and is valid YAML.
---
## Phase 5: Adversarial Critique
### Select Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| sre | Y | Y | Y |
| oracle-quality | Y | Y | Y |
| adversarial | - | Y | Y |
| completeness | - | - | Y |
| reproducibility | - | - | Y |

### Launch Critics
Spawn all critics as teammates in parallel:
```
Task: "You are an eval spec critic reviewing from the <PERSPECTIVE> perspective.
## Spec Path
Read the eval spec at: ${EVAL_DIR}/artifacts/eval-spec.yaml
## System Description
<SYSTEM_DESCRIPTION>
## Change Summary
<change_summary or 'N/A'>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Review the eval spec from your perspective. Quote YAML paths or identify specific absences for every finding. Focus on what class of bugs will slip through."
Agent: eval-spec-critic
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all critics to complete.
---
## Phase 6: Aggregate & Present Findings
The orchestrator (not an agent) processes critic outputs:

### Deduplication & Grouping
1. Collect all findings from all critics
2. Deduplicate: merge findings that reference the same YAML path with the same issue
3. Group by severity: critical, major, minor
4. Note cross-perspective consensus (issues raised by 2+ critics are stronger signals)
5. Summarize to `${EVAL_DIR}/artifacts/critic-summary.md`

### Present to User
Show:
- Count of findings by severity
- Critical issues (full detail with proposed fixes)
- Major issues (full detail)
- Minor issues (summary)
- Cross-perspective consensus highlights

### Ask User via AskUserQuestion
1. "Address all critical + major issues (Recommended)" — revise spec with all significant findings
2. "Address critical only" — revise spec with only critical findings
3. "Ship as-is" — proceed to finalize without revision
4. "Provide guidance" — user provides specific direction via "Other" free-text

If user selects "Ship as-is", skip Phase 7 and go to Phase 8.
---
## Phase 7: Refinement
### Prepare Revision Context
Based on user's choice:
- "Address all": include all critical + major findings
- "Address critical only": include only critical findings
- "Provide guidance": include user's free-text plus relevant findings

### Launch Generator in Revise Mode
Spawn `eval-spec-generator` teammate in REVISE mode:
```
Task: "You are in REVISE mode.
## Existing Spec
Read the eval spec at: ${EVAL_DIR}/artifacts/eval-spec.yaml
## Critic Findings
<filtered findings based on user's choice>
## User Guidance
<user's direction, or 'Address all critical and major issues'>
## Output Path
Write the revised spec to: ${EVAL_DIR}/artifacts/eval-spec-final.yaml
## Instructions
<USER_INSTRUCTIONS or 'None'>

Revise the eval spec to address the listed findings. Strengthen oracles, add missing scenarios, close coverage gaps. Preserve existing traceability. Add [REVISED: reason] comments to changed sections."
Agent: eval-spec-generator
```

Wait for completion. Verify `eval-spec-final.yaml` was written.
---
## Phase 8: Finalize & Present
### Summary
Present to the user:
```
## Eval Spec Complete: <system name>
**Scope**: <scope> | **Depth**: <depth> | **Rounds**: <rounds_used>/<max_rounds> | **Critics**: <critic_count>

### Input Dimension Final State
| Dimension | Weight | Score | Status |
|-----------|--------|-------|--------|
| <name> | <weight> | <score>/3 | <unknown/sketched/defined/specified> |
**Weighted Average**: X.X/3.0

### Spec Statistics
- **Identified risks**: X
- **External interfaces**: X
- **Invariants**: X (Y hard gates, Z soft gates)
- **Scenarios**: X (by category: happy_path=A, edge_case=B, adversarial=C, regression=D, metamorphic=E)
- **Metamorphic properties**: X

### Adversarial Summary
- **Critical issues**: X (Y addressed)
- **Major issues**: X (Y addressed)
- **Minor issues**: X
- **Cross-perspective consensus**: <key themes>

### Coverage Analysis
- **Risks with scenarios**: X/Y
- **Interfaces with scenarios**: X/Y
- **Risk categories covered**: <list>

### Assumptions Made
[List all [ASSUMPTION] items from the spec, or "None"]

### TBD Items
[List all [TBD] items from the spec, or "None"]

### Confidence Model Summary
- **Catches**: <from spec's confidence_model.what_this_catches>
- **Does not catch**: <from spec's confidence_model.what_this_does_not_catch>
- **Residual risk**: <from spec's confidence_model.residual_risk>
```

### Ask Where to Save
Use `AskUserQuestion`:
1. "Current directory (Recommended)" — copy final spec to `./eval-spec-<short-title>.yaml`
2. "Custom path" — user provides path via "Other"
3. "Artifacts only" — leave in `${EVAL_DIR}/artifacts/`, print the path

Copy the final spec (either `eval-spec-final.yaml` if Phase 7 ran, or `eval-spec.yaml` if shipped as-is) to the chosen location.

### Cleanup
1. Shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate
2. Call `TeamDelete`
3. Remove working directory:
```bash
rm -rf "${EVAL_DIR}"
# Remove .eval-specs/ if empty
rmdir "${REPO_ROOT}/.eval-specs" 2>/dev/null || true
```
---
## State Management
- Working directory: `${EVAL_DIR}` (gitignored via `.eval-specs/`)
- Falls back to `~/.claude/eval-specs/` if not in a git repo
- State tracked in `run.json`
- Artifacts stored in `${EVAL_DIR}/artifacts/`
- Input log accumulated across rounds in `run.json`
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If generator fails: retry once. If still fails, present partial results and offer to save what exists.
3. If a researcher fails: continue with remaining researchers. If none succeed, proceed with user inputs only and note reduced grounding.
4. If a critic fails: continue with remaining critics. If fewer than half succeed, note reduced review coverage.
5. Do not retry failed researchers or critics.

### No Codebase Context
If not in a git repo or codebase is empty:
1. Skip Phase 3 (research).
2. Generator will produce spec based on user answers only.
3. Note in final summary: "Spec not grounded in codebase — verify interfaces and observables against actual implementation."

### User Provides Minimal Input
If user provides minimal answers across rounds:
1. Warn that spec will have many assumptions and TBDs.
2. Offer to proceed or abort.
3. If proceeding, generator marks all gaps as `[ASSUMPTION]` or `[TBD]`.
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent using the Task tool with the `team_name` parameter.
- **Orchestrator handles questioning directly** — do not delegate Phase 2 to an agent.
- **Single AskUserQuestion per round** — batch all questions for a round into one call.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt.
- Valid agent names: `eval-spec-generator`, `eval-spec-researcher`, `eval-spec-critic`.
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
   - Phase 3 requires: at least 1 round of questioning completed (or scope=incident with sufficient context)
   - Phase 4 requires: at least 1 research report received (or no-codebase mode)
   - Phase 5 requires: eval-spec.yaml exists and is non-empty
   - Phase 6 requires: at least 1 critic produced output
   - Phase 7 requires: user chose to revise (not "ship as-is")
   - Phase 8 requires: final spec exists (draft or revised)
4. ONLY THEN: Enter the next phase
```
### Red Flags — STOP If You Notice
- About to spawn the generator without completing at least one question round
- About to spawn critics without verifying the spec file exists
- Skipping the input dimension threshold check
- Generating questions without looking at the dimension scores
- Presenting results without verifying artifacts exist
- Using "should be fine" or "probably complete" about spec quality
- Producing a YAML spec with zero [ASSUMPTION] markers (unrealistically confident)
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
