---
name: docs
description: "Documentation generation — parallel researchers explore existing code while adversarial critics attack drafts for accuracy, completeness, and clarity. Usage: /docs [--model <model>] [--depth <depth>] [--instructions <text>] [--type <type>] [--persona <persona>] <target>"
user_invocable: true
arguments:
  - name: args
    description: "Optional flags and target (file path, directory, or description of what to document)"
    required: true
---
# Documentation Generator
Orchestrate parallel research, rubric-gated drafting, and adversarial critique to produce comprehensive documentation for existing code.
## Phase 1: Parse & Configure
### Parse Arguments
Extract from `$ARGUMENTS` in order:
1. **Inline flags** (optional, order-independent, consumed before target):
   - `--model <opus|sonnet|haiku|inherited>` — pre-sets AGENT_MODEL
   - `--depth <quick|standard|deep>` — pre-sets DEPTH
   - `--instructions "<text>"` or `--instructions none` — pre-sets USER_INSTRUCTIONS (`none` maps to `null`)
   - `--type <end-user|developer>` — pre-sets DOC_TYPE
   - `--persona <end-user|developer|operator|contributor>` — pre-sets PERSONA
2. **Remaining text** = documentation target (after all flags consumed)

Flag parsing rules:
- Flags start with `--` and consume exactly one following token as their value.
- Stop consuming flags at the first token that is neither a `--flag` nor a flag's value.
- Quoted values are supported: `--instructions "focus on security"`.
- Unknown flags are treated as part of the documentation target.

### Classify Target
Classify the remaining text as the documentation target:
1. **File**: path exists as a file (e.g. `src/utils/parser.ts`)
2. **Directory**: path exists as a directory (e.g. `src/utils/`)
3. **Description**: anything else (e.g. `"the authentication system"`)

Validate:
- File mode: verify file exists. If not, report error and STOP.
- Directory mode: verify directory exists. If not, report error and STOP.
- Description mode: no validation needed — researchers will resolve to code in Phase 4.

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, depth is set, instructions is set or "none", type is set, persona is set):
- Set all values from arguments (`inherited` maps to `null` for model, `none` maps to `null` for instructions)
- **Skip `AskUserQuestion` entirely** — proceed directly to Initialize Working Directory

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if type was NOT set from arguments:**

1. **Doc Type** (header: "Doc type"): "What type of documentation?"
   - "Developer (Recommended)" — API reference, architecture, setup, patterns
   - "End-user" — getting started, features, configuration, troubleshooting

**Ask only if depth was NOT set from arguments:**

2. **Depth** (header: "Depth"): "How thorough should the documentation be?"
   - "Standard (Recommended)" — 2 researchers, 2-3 question rounds, 4 critics, 1 revision
   - "Quick" — 1 researcher, 1 question round, 3 critics, no revision
   - "Deep" — 3 researchers, 3-5 question rounds, 5 critics, 2 revisions

**Ask only if persona was NOT set from arguments:**

3. **Persona** (header: "Persona"): "Who is the target reader?"
   - "Developer (Recommended)" — assumes programming knowledge, API-oriented
   - "End-user" — non-technical or semi-technical, task-oriented
   - "Operator" — DevOps/SRE, assumes infra knowledge, operations-oriented
   - "Contributor" — open-source contributor, assumes codebase familiarity

**Ask only if model was NOT set from arguments:**

4. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

**Ask only if instructions were NOT set from arguments:**

5. **Instructions** (header: "Instructions"): "Any special instructions, constraints, or focus areas?"
   - "None — use defaults (Recommended)" — no additional steering
   - "API focus" — prioritize API documentation
   - "Getting started focus" — prioritize onboarding and setup

   The user can also provide free-text via the "Other" option.

### Store Configuration
- `TARGET`: the classified target string
- `TARGET_MODE`: `file|directory|description`
- `DOC_TYPE`: `end-user|developer`
- `PERSONA`: `end-user|developer|operator|contributor`
- `DEPTH`: `quick|standard|deep`
- `MAX_ROUNDS`: quick=1, standard=3, deep=5
- `RESEARCHER_COUNT`: quick=1, standard=2, deep=3
- `CRITIC_COUNT`: quick=3, standard=4, deep=5
- `REVISION_ROUNDS`: quick=0, standard=1, deep=2
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.

### Researcher Focus by Depth
| Focus | Quick | Standard | Deep |
|-------|-------|----------|------|
| codebase | Y | Y | Y |
| existing-docs | - | Y | Y |
| usage | - | - | Y |

### Critic Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| accuracy | Y | Y | Y |
| completeness | Y | Y | Y |
| clarity | Y | Y | Y |
| usability | - | Y | Y |
| maintainability | - | - | Y |

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  DOCS_ID="$(date +%Y%m%d-%H%M%S)-$$"
  DOCS_DIR="${REPO_ROOT}/.docs/docs-${DOCS_ID}"
  grep -qxF '.docs/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.docs/' >> "${REPO_ROOT}/.gitignore"
else
  DOCS_ID="$(date +%Y%m%d-%H%M%S)-$$"
  DOCS_DIR="${HOME}/.claude/docs/docs-${DOCS_ID}"
fi
mkdir -p "${DOCS_DIR}/artifacts"
```

### Initialize State Tracking
Create `${DOCS_DIR}/run.json`:
```json
{
  "docs_id": "<DOCS_ID>",
  "target": "<TARGET>",
  "target_mode": "<file|directory|description>",
  "doc_type": "<end-user|developer>",
  "persona": "<end-user|developer|operator|contributor>",
  "depth": "<quick|standard|deep>",
  "max_rounds": 3,
  "researcher_count": 2,
  "critic_count": 4,
  "revision_rounds": 1,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "rubric": {},
  "clarification_log": [],
  "status": "configuring"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "docs-${DOCS_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: target, target mode, doc type, persona, depth, expected researcher count, expected critic count, question rounds, revision rounds, and the phase sequence.
---
## Phase 2: Generate Rubric
Select rubric based on `DOC_TYPE`. Each dimension has a weight and starts at score 0. Scores: 0=unknown, 1=sketched, 2=defined, 3=specified.

**end-user rubric:**
| Dimension | Weight |
|-----------|--------|
| Getting Started | 3 |
| Feature Coverage | 3 |
| Configuration | 2 |
| Troubleshooting | 2 |
| Examples | 2 |
| Clarity | 2 |

**developer rubric:**
| Dimension | Weight |
|-----------|--------|
| API Surface | 3 |
| Architecture | 2 |
| Setup & Dev Workflow | 2 |
| Patterns & Conventions | 2 |
| Extension Points | 2 |
| Error Handling | 2 |
| Clarity | 1 |

Initialize all dimension scores to 0. Store rubric in `run.json`.

### Rubric Scoring Reference

**end-user rubric scoring:**
| Dimension | 0 (Unknown) | 1 (Sketched) | 2 (Defined) | 3 (Specified) |
|-----------|-------------|--------------|-------------|---------------|
| Getting Started | No setup info | Lists dependencies | Step-by-step install + first run | Install + first run + "hello world" example verified against code |
| Feature Coverage | Features unlisted | Feature list exists | Each feature has description + usage | Each feature has description, usage, examples, and edge cases |
| Configuration | No config info | Config options listed | Each option has description + default | Each option has description, default, valid values, and effects verified in code |
| Troubleshooting | No troubleshooting | Common errors listed | Errors with solutions | Error scenarios traced through code with verified solutions |
| Examples | No examples | Some examples | Examples for major workflows | Working examples for all key workflows, verified against code |
| Clarity | Jargon-heavy | Mostly accessible | Clear with terms defined | Plain language, progressive disclosure, no assumed knowledge beyond stated prerequisites |

**developer rubric scoring:**
| Dimension | 0 (Unknown) | 1 (Sketched) | 2 (Defined) | 3 (Specified) |
|-----------|-------------|--------------|-------------|---------------|
| API Surface | No API docs | Functions listed | Functions with signatures + descriptions | Full signatures, params, returns, throws, examples — verified against code |
| Architecture | No structure info | Component list | Component relationships described | Data flow, dependency direction, design decisions with rationale |
| Setup & Dev Workflow | No dev setup | Basic setup steps | Full dev setup + test + build | Setup, test, build, lint, deploy — all commands verified |
| Patterns & Conventions | No patterns | Some patterns mentioned | Patterns with examples | Patterns with examples, rationale, and anti-patterns — grounded in code |
| Extension Points | Not documented | Extension points listed | Extension points with instructions | Step-by-step extension guide with examples, hooks, and plugin architecture |
| Error Handling | Not documented | Error types listed | Error types with causes | Error taxonomy, handling patterns, propagation paths — traced through code |
| Clarity | Disorganized | Structured | Well-organized with cross-references | Scannable, layered (overview → details), consistent terminology |

### Threshold
- **Pass**: weighted average >= 2.0 AND no dimension at 0
- Weighted average = sum(score * weight) / sum(weight)

Report rubric dimensions and thresholds to user.
---
## Phase 3: Iterative Questioning
This is the core UX. The orchestrator drives this directly (not delegated to an agent) because it requires tight user interaction.

### Loop
```
round = 0
WHILE round < MAX_ROUNDS AND (weighted_average < 2.0 OR any_dimension_at_zero):
  round++

  1. IDENTIFY lowest-scoring dimensions (3-5, prioritize 0s)
  2. GENERATE targeted questions for those dimensions:
     - Concrete over abstract ("What commands install this?" not "How is setup done?")
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
     - Selected a default/obvious option -> [USER_DEFERRED], score 1, writer uses reasonable defaults
     - "Don't know but it matters" / hedged answer -> [NEEDS_ASSUMPTION], score 1, writer makes explicit assumption, critics will attack it
     - "I'll decide later" / skipped -> [TBD], score stays 0, doc gets a TBD section
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
**Round 1** (Broad framing — always):
- What should this documentation cover? What's the scope?
- What should readers be able to do after reading this?
- What's the current pain point with documentation (or lack thereof)?
- Who is the primary reader and what do they already know?

**Round 2** (Gap filling — standard+):
- Target lowest-scoring rubric dimensions
- More specific: "What are the installation prerequisites?", "What errors do users commonly hit?"
- Structure preferences, key sections, what to emphasize

**Round 3+** (Edge cases — deep):
- Versioning, prerequisites, related docs, maintenance plan
- Examples to include, edge cases to document
- Config options to highlight, troubleshooting scenarios

### Save Clarification Log
Save to `${DOCS_DIR}/artifacts/clarification-log.md`.
---
## Phase 4: Codebase Research
### Resolve Target (description mode only)
If `TARGET_MODE` is `description`, spawn 1 researcher (docs-researcher, focus: codebase) to explore the codebase and identify relevant files:
```
Task: "You are a docs researcher with focus: codebase.
## Description
The user wants to document: <DESCRIPTION>
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Instructions
Search the codebase to identify the files most relevant to this description. Read them and produce a briefing that includes the file paths and key code. Your output will be used to identify the target code for documentation.
<USER_INSTRUCTIONS or 'None'>"
Agent: docs-researcher
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for the researcher. Extract the identified file paths. Save to `${DOCS_DIR}/artifacts/target-files.txt`.

If the researcher finds no relevant code, report: "Could not identify code matching the description: <DESCRIPTION>" and STOP (run cleanup).

### Resolve Target (file/directory mode)
For file mode: save the single file path to `${DOCS_DIR}/artifacts/target-files.txt`.
For directory mode: list all source files in the directory (exclude tests, node_modules, build artifacts). Save to `${DOCS_DIR}/artifacts/target-files.txt`.

### Launch Researchers
Spawn researchers as teammates based on depth:

**Quick** — 1 researcher (`codebase`):
```
Task: "You are a docs researcher with focus: codebase.
## Target Files
<list of file paths from target-files.txt>
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the target code to understand its public API, configuration options, error handling, data models, and internal structure. Your briefing will be given to a documentation writer to produce accurate, code-grounded docs."
Agent: docs-researcher
```

**Standard** — 2 researchers (`codebase`, `existing-docs`):
Launch both in parallel. The `existing-docs` researcher additionally finds READMEs, docstrings, changelogs, type annotations.
```
Task: "You are a docs researcher with focus: existing-docs.
## Target Files
<list of file paths from target-files.txt>
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Find existing documentation for these target files — READMEs, docstrings, JSDoc/TSDoc comments, type annotations, changelogs, wiki references. Flag any existing docs that contradict current code behavior. Your briefing will help the writer avoid redundancy and catch outdated info."
Agent: docs-researcher
```

**Deep** — 3 researchers (`codebase`, `existing-docs`, `usage`):
Launch all three in parallel. The `usage` researcher additionally finds tests-as-examples, callers, integration patterns.
```
Task: "You are a docs researcher with focus: usage.
## Target Files
<list of file paths from target-files.txt>
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Find how these target files are actually used — tests as examples, callers showing real workflows, integration patterns, example configs, CLI help text. Your briefing will help the writer produce docs that reflect reality, not just the author's intent."
Agent: docs-researcher
```

If `AGENT_MODEL` is set (not null), pass it as the `model` parameter.

### Compile Research Briefing
Wait for all researchers to complete. Combine their outputs into a single briefing (<=1500 words) saved to `${DOCS_DIR}/artifacts/research-briefing.md`.

If a researcher fails, continue with remaining outputs. If all fail, proceed without research (writer will explore codebase directly at reduced confidence).
---
## Phase 5: Draft Documentation
### Prepare Context
Compile for the writer:
- `DOC_TYPE`
- `PERSONA`
- `TARGET` and `TARGET_MODE`
- Full `clarification_log` from Phase 3
- Current `rubric` state with scores
- Compiled `research_briefing` from Phase 4
- `USER_INSTRUCTIONS` (if any)
- Output path: `${DOCS_DIR}/artifacts/draft.md`

### Launch Writer
Spawn `docs-writer` teammate in DRAFT mode:
```
Task: "You are in DRAFT mode.
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Target
<TARGET> (mode: <TARGET_MODE>)
## Target Files
<list of file paths from target-files.txt>
## Rubric State
<rubric with dimension names, weights, and current scores>
## Clarification Log
<full Q&A log from all rounds>
## Research Briefing
<compiled research briefing>
## Output Path
Write the documentation to: ${DOCS_DIR}/artifacts/draft.md
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the codebase thoroughly to ground the documentation in reality. Every factual claim about code behavior must cite file:line. Use traceability markers on every section: [User: Q1.2], [Codebase: file:line], [ASSUMPTION: rationale], [TBD]."
Agent: docs-writer
```
If `AGENT_MODEL` is set (not null), pass it as the `model` parameter. If `USER_INSTRUCTIONS` is set, prepend as `## User Instructions` section.

Wait for completion. Verify the doc file was written.
---
## Phase 6: Adversarial Critique
### Select Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| accuracy | Y | Y | Y |
| completeness | Y | Y | Y |
| clarity | Y | Y | Y |
| usability | - | Y | Y |
| maintainability | - | - | Y |

### Launch Critics
Spawn all critics as teammates in parallel (Task tool with `team_name`):
```
Task: "You are a docs critic reviewing from the <PERSPECTIVE> perspective.
## Doc Path
Read the documentation at: ${DOCS_DIR}/artifacts/draft.md
## Target Files
<list of file paths from target-files.txt>
## Research Briefing
<compiled research briefing, or 'No research briefing available — explore codebase yourself'>
## Doc Type
<DOC_TYPE>
## Persona
<PERSONA>
## Your Perspective
<PERSPECTIVE>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Review the documentation from your perspective. Quote the doc or identify specific absences for every finding. Cross-reference every factual claim against the actual code. You MUST produce at least 3 findings."
Agent: docs-critic
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all critics to complete.
---
## Phase 7: Review & Refine (standard+ only)
**Precondition**: `DEPTH` is `standard` or `deep` AND at least 1 critic produced output AND `REVISION_ROUNDS` > 0.

### Deduplication & Grouping
1. Collect all findings from all critics
2. Deduplicate: merge findings that reference the same doc section with the same issue
3. Group by severity: critical, major, minor
4. Note cross-perspective consensus (issues raised by 2+ critics are stronger signals)
5. Summarize to `${DOCS_DIR}/artifacts/critic-summary.md`

### Generate Proposed Fixes
For each critical and major finding, generate a **concrete proposed doc change**:
- What section to modify (or what new section/text to add)
- The specific text to add, change, or remove
- Number each proposed fix sequentially: **[R1]**, **[R2]**, **[R3]**, etc.

### Present to User
Show the full revision proposal with proposed fixes highlighted:
```
### Findings Summary
- Critical: X | Major: Y | Minor: Z

### Proposed Revisions

**[R1] Critical: <issue title>**
Raised by: <perspective(s)>
Doc reference: <quoted section or "ABSENT — no section addresses X">
> **Proposed fix:** <concrete doc change — what to add, modify, or remove>

**[R2] Major: <issue title>**
Raised by: <perspective(s)>
Doc reference: <quoted section or "ABSENT">
> **Proposed fix:** <concrete doc change>

...

### Minor Issues (no proposed fixes — for awareness only)
- <brief list>
```

### Ask User via AskUserQuestion
1. "Accept all proposed fixes (Recommended)" — apply all [R1], [R2], etc. to the doc
2. "Ship as-is" — proceed to finalize without revision
3. "Modify" — user specifies in "Other" which fixes to accept/reject/change (e.g., "Accept R1, R3. Skip R2. For R4, instead do X.")

If user selects "Ship as-is", skip revision and go to Phase 8.
If user selects guidance that indicates "start over" or "more detail", return to Phase 3 with current rubric state.

### Launch Writer in Revise Mode
Spawn `docs-writer` teammate in REVISE mode:
```
Task: "You are in REVISE mode.
## Existing Doc
Read the documentation at: ${DOCS_DIR}/artifacts/draft.md
## Approved Revisions
<numbered list of user-approved fixes, each with its [RN] identifier, the finding, and the concrete fix to apply. Only include fixes the user approved.>
## User Guidance
<any additional user direction, or 'None'>
## Output Path
Write the revised documentation to: ${DOCS_DIR}/artifacts/doc-final.md
## Instructions
<USER_INSTRUCTIONS or 'None'>

Apply ONLY the approved revisions listed above. Do not make autonomous changes beyond what is specified. Use inline citation markers [^RN] at each point of change, and collect all revision notes in a '## Revision Log' section at the end of the document."
Agent: docs-writer
```

Wait for completion. Verify `doc-final.md` was written.

### Deep: Second Revision Round
For `deep` depth only (2 total revision rounds), repeat the critique → revise cycle once more:
1. Launch critics against `doc-final.md` (same perspectives)
2. Deduplicate and present new findings
3. Ask user to approve/reject fixes
4. Launch writer in REVISE mode against `doc-final.md`, output to `doc-final-v2.md`
---
## Phase 8: Finalize & Present
### Score Rubric Against Final Draft
Re-score each rubric dimension against the final documentation by reading the doc and checking coverage of each dimension against the scoring reference.

### Summary
Present to the user:
```
## Documentation Complete: <title>
**Target**: <target> | **Type**: <doc_type> | **Persona**: <persona> | **Depth**: <depth>
**Researchers**: <count> | **Critics**: <count> | **Revisions**: <count>

### Rubric Final State
| Dimension | Weight | Score | Status |
|-----------|--------|-------|--------|
| <name> | <weight> | <score>/3 | <unknown/sketched/defined/specified> |
**Weighted Average**: X.X/3.0

### Critique Summary
- **Critical issues**: X (Y addressed)
- **Major issues**: X (Y addressed)
- **Minor issues**: X
- **Cross-perspective consensus**: <key themes>

### Assumptions Made
[List all [ASSUMPTION] items from the doc, or "None"]

### TBD Items
[List all [TBD] items from the doc, or "None"]

### User-Deferred Items
[List all [USER_DEFERRED] items from the doc, or "None"]
```

### Ask Where to Save
Use `AskUserQuestion`:
1. "Current directory (Recommended)" — copy final doc to `./<doc-title>.md`
2. "Custom path" — user provides path via "Other"
3. "Artifacts only" — leave in `${DOCS_DIR}/artifacts/`, print the path

Copy the final doc (either `doc-final.md` / `doc-final-v2.md` if Phase 7 ran, or `draft.md` if shipped as-is) to the chosen location.

### Cleanup
1. Shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate
2. Call `TeamDelete`
3. Remove working directory:
```bash
rm -rf "${DOCS_DIR}"
# Remove .docs/ if empty
rmdir "${REPO_ROOT}/.docs" 2>/dev/null || true
```
---
## State Management
- Working directory: `${DOCS_DIR}` (gitignored via `.docs/`)
- Falls back to `~/.claude/docs/` if not in a git repo
- State tracked in `run.json`
- Artifacts stored in `${DOCS_DIR}/artifacts/`
- Clarification log accumulated across rounds in `run.json`
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If writer fails: retry once. If still fails, present partial results and offer to save what exists.
3. If a researcher fails: continue with remaining researchers. If all fail, proceed without research (writer will explore codebase directly).
4. If a critic fails: continue with remaining critics. If fewer than half succeed, note reduced review coverage.
5. Do not retry failed critics or researchers.

### No Codebase Context
If not in a git repo or codebase is empty:
1. Use fallback directory `~/.claude/docs/`.
2. Writer will produce docs based on user answers and any files the user points to.
3. Note in final summary: "Docs not fully grounded in codebase — verify against actual implementation."

### Description Resolution Failed
1. If the description researcher finds no relevant code: report "Could not identify code matching: <DESCRIPTION>" and exit cleanly.
2. Clean up working directory.

### User Abandons Questioning
If user provides minimal answers across rounds:
1. Warn that docs will have many assumptions.
2. Offer to proceed or abort.
3. If proceeding, writer marks all gaps as `[ASSUMPTION]`.

### Empty Target
1. If the resolved target has no source files: report "No source files found in target."
2. Clean up and exit.
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent using the Task tool with the `team_name` parameter.
- **Orchestrator handles questioning directly** — do not delegate Phase 3 to an agent.
- **Single AskUserQuestion per round** — batch all questions for a round into one call.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt.
- Valid agent names: `docs-researcher`, `docs-writer`, `docs-critic`.
- **This produces documentation, not specifications.** Docs describe what exists. Every claim must trace to existing code. Forward-looking design decisions belong in `/spec`.
- **Persona calibration**: Pass persona to both writer and critics so they calibrate tone, assumed knowledge, and content focus accordingly.
---
## Phase Transitions
Check preconditions before each phase; if unmet, run fallback.
| Phase | Precondition | Fallback |
|-------|-------------|----------|
| Phase 2 | Valid target classified, configuration stored | Report error and STOP |
| Phase 3 | Rubric generated with all dimensions at 0 | Skip questioning, proceed with all assumptions |
| Phase 4 | At least 1 round of questioning completed; target-files.txt exists (file/dir) or description provided | Skip research if no target files; abort if no target at all |
| Phase 5 | target-files.txt exists and is non-empty; research briefing exists (or all researchers failed) | Abort with cleanup |
| Phase 6 | draft.md exists and is non-empty | Abort with cleanup |
| Phase 7 | depth is standard or deep; at least 1 critic produced output; revision rounds > 0 | Skip revision, go to Phase 8 |
| Phase 8 | Final doc exists (draft or revised) | Present whatever exists |
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
### Red Flags — STOP If You Notice
- About to spawn the writer without completing at least one question round
- About to spawn critics without verifying the doc file exists
- Skipping the rubric threshold check
- Generating questions without looking at the rubric scores
- Presenting results without verifying artifacts exist
- Using "should be fine" or "probably complete" about doc quality
- Spawning researchers for description mode without checking if code was found
- Skipping Phase 4 research when depth requires it
- Presenting generic praise in the final summary without citing evidence
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
