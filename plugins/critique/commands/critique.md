---
name: critique
description: "Adversarial red-teaming — parallel attackers probe any target (code, specs, plans, documents) for vulnerabilities, bugs, fragility, and design problems, with critical/high findings independently verified. Usage: /critique [--model <model>] [--depth <depth>] [--instructions <text>] <target>"
user_invocable: true
arguments:
  - name: args
    description: "Optional flags and target (file path, file:function, directory, or description)"
    required: true
---
# Critique
Orchestrate parallel adversarial red-teaming of any target in fixed phases. Targets are classified as either **code** (source files, config) or **spec** (all non-code: documents, specs, plans, READMEs, etc.). Critical/high findings are independently verified before they drive the risk assessment.
## Phase 1: Parse & Configure
### Parse Arguments
Extract from `$ARGUMENTS` in order:
1. **Inline flags** (optional, order-independent, consumed before target):
   - `--model <opus|sonnet|haiku|inherited>` — pre-sets AGENT_MODEL
   - `--depth <quick|standard|deep>` — pre-sets DEPTH
   - `--instructions "<text>"` or `--instructions none` — pre-sets USER_INSTRUCTIONS (`none` maps to `null`)
2. **Remaining text** = critique target (after all flags consumed)

Flag parsing rules:
- Flags start with `--` and consume exactly one following token as their value.
- Stop consuming flags at the first token that is neither a `--flag` nor a flag's value.
- Quoted values are supported: `--instructions "focus on security"`.
- Unknown flags are treated as part of the critique target.

### Classify Target
Classify the remaining text as the critique target:
1. **File**: path exists as a file (e.g. `src/utils/parser.ts`, `docs/design.md`)
2. **Function**: contains `:` after a valid file path (e.g. `src/utils/parser.ts:parseConfig`)
3. **Directory**: path exists as a directory (e.g. `src/utils/`, `docs/specs/`)
4. **Description**: anything else (e.g. `"our authentication architecture"`)

Validate:
- File mode: verify file exists. If not, report error and STOP.
- Function mode: verify file exists. Function name is extracted but not validated here (attackers will verify).
- Directory mode: verify directory exists. If not, report error and STOP.
- Description mode: no validation needed — researchers will resolve in Phase 2.

### Detect Target Type
After resolving the target file(s), classify the content into one of two types:

- **Code**: source files (`.ts`, `.py`, `.go`, `.cs`, `.java`, `.rs`, `.sh`, `.js`, `.rb`, `.scala`, `.kt`, etc.) and structured config/data files (`.yaml`, `.yml`, `.json`, `.toml`, `.xml`, `.html`)
- **Spec**: all non-code files — specifications, plans, documents, READMEs, ADRs, runbooks, or any other narrative/text artifact (`.md`, `.txt`, `.adoc`, `.rst`, `.pdf`, etc.)

Set `TARGET_TYPE` to `code` or `spec`. For mixed directories, use whichever dominates. This determines which attacker perspectives to use. (In description mode, `TARGET_TYPE` is finalized after the researcher resolves files in Phase 2.)

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, depth is set, and instructions is set or "none"):
- Set `AGENT_MODEL` from `--model` value (`inherited` maps to `null`)
- Set `DEPTH` from `--depth` value
- Set `USER_INSTRUCTIONS` from `--instructions` value (`none` maps to `null`)
- **Skip `AskUserQuestion` entirely** — proceed directly to Phase 2

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if depth was NOT set from arguments:**

1. **Depth** (header: "Depth"): "How thorough should the critique be?"
   - "Standard (Recommended)" — 1 researcher, 5 attackers
   - "Quick" — no researcher, 3 attackers
   - "Deep" — 2 researchers, 7 attackers (code) / 5 attackers (spec), all perspectives

**Ask only if model was NOT set from arguments:**

2. **Model** (header: "Model"): "Which model should agents use?"
   - "Inherited (Recommended)" — agents use the orchestrator's current model
   - "Opus" — use `opus` for all spawned agents
   - "Sonnet" — use `sonnet` for all spawned agents
   - "Haiku" — use `haiku` for all spawned agents

**Ask only if instructions were NOT set from arguments:**

3. **Instructions** (header: "Instructions"): "Any special focus areas or context for this critique?"
   - "None — use defaults (Recommended)" — no additional steering
   - "Security focus" — prioritize security findings
   - "Performance focus" — prioritize performance findings

   The user can also provide free-text via the "Other" option.

### Store Configuration
- `TARGET`: the classified target string
- `TARGET_MODE`: `file|function|directory|description`
- `TARGET_TYPE`: `code|spec`
- `FUNCTION_NAME`: extracted function name (function mode only) or `null`
- `DEPTH`: `quick|standard|deep`
- `RESEARCHER_COUNT`: quick=0, standard=1, deep=2
- `ATTACKER_COUNT`: see the perspective tables below
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited" / no flag.
- `USER_INSTRUCTIONS`: free-text string or `null`.

### Select Attacker Perspectives
**For code targets** (`TARGET_TYPE = code`):
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| security | Y | Y | Y |
| correctness | Y | Y | Y |
| resilience | Y | Y | Y |
| performance | - | Y | Y |
| maintainability | - | Y | Y |
| architecture | - | - | Y |
| data-integrity | - | - | Y |

**For spec targets** (`TARGET_TYPE = spec`):
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| determinism | Y | Y | Y |
| completeness | Y | Y | Y |
| verifiability | Y | Y | Y |
| context-efficiency | - | Y | Y |
| anti-hallucination | - | Y | Y |

Only five spec perspectives exist, so spec attacker count tops out at 5. Deep depth on a spec target therefore adds the second researcher (dependencies focus) rather than additional attackers.

### Researcher Focus by Depth
| Focus | Quick | Standard | Deep |
|-------|-------|----------|------|
| context | - | Y | Y |
| dependencies | - | - | Y |

### Announce the Plan
Report: target, target mode, target type (code/spec), depth, researcher count, attacker count, attacker perspectives, and the phase sequence (including verification of critical/high findings in Phase 5).
---
## Phase 2: Resolve Target & Research
This phase resolves the target file list and, for standard+ depth, runs context research. State is held **in memory** — no working directory, no artifact files.

### Resolve Target Files
Determine the list of target file paths (`TARGET_FILES`) based on mode:

#### For File Mode
Read the target file. Record the file path, line count, and language/format.
`TARGET_FILES` = the single file path.

#### For Function Mode
Read the target file. Verify the function exists (search for the definition). Record the file path, function boundaries, and language.
`TARGET_FILES` = the single file path.
If the function is not found in the file, report error and STOP.

#### For Directory Mode
List all relevant files in the directory (for code: exclude tests, node_modules, build artifacts; for specs: include all non-binary files). Read each file.
`TARGET_FILES` = the list of file paths.
If the directory contains more than 20 files, select the most important ones (entry points, main modules, primary documents) and note which files were excluded.

#### For Description Mode
Spawn 1 researcher (`critique-researcher`, focus: context) using the Task tool with `Agent: critique-researcher` to identify relevant files matching the description:

```
Task: "You are a critique researcher with focus: context.
## Description
The user wants to critique: <DESCRIPTION>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Search the codebase to identify the files most relevant to this description. Read the identified files and produce a briefing that includes the file paths, key content, and contextual background. Your output will be used to identify the target for adversarial critique."
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for the researcher. Extract the identified file paths as `TARGET_FILES` and read those files. Finalize `TARGET_TYPE` from the resolved files.
The researcher's output serves as **both** the target resolution and the research briefing — skip the separate research launch below.

If the researcher finds no relevant files, report: "Could not identify content matching the description: <DESCRIPTION>" and STOP.

### Launch Research (standard+ depth, non-description modes only)
**Precondition**: `DEPTH` is `standard` or `deep`. Skip research entirely for `quick`.

For file, function, and directory modes, spawn researchers **as soon as `TARGET_FILES` is known** using the Task tool with `Agent: critique-researcher`. Run multiple researchers in parallel (multiple Task calls in one message).

**Standard** — 1 researcher (`context`):
```
Task: "You are a critique researcher with focus: context.
## Target Files
<list of file paths from TARGET_FILES>
## Target Type
<code|spec>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the context around these target files. For code: callers, test coverage, recent change history, and conventions. For specs: related documents, prior versions, referenced systems, and stakeholder context. Your briefing will be given to adversarial attackers to help them assess real-world risk and understand the intent behind the target."
```

**Deep** — 2 researchers (`context`, `dependencies`), launched in parallel. The `dependencies` researcher additionally maps the full dependency graph and trust boundaries:
```
Task: "You are a critique researcher with focus: dependencies.
## Target Files
<list of file paths from TARGET_FILES>
## Target Type
<code|spec>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Map the full dependency graph of these target files — what they import, what imports them, shared state, external integrations, and trust boundaries. Your briefing will be given to adversarial attackers to help them assess blast radius and data flow risks."
```

If `AGENT_MODEL` is set (not null), pass it as the `model` parameter.

### Compile Results
Wait for all researchers to complete. Combine their outputs into a single briefing (<=1500 words) and hold it in memory as `RESEARCH_BRIEFING`. Hold the resolved file list in memory as `TARGET_FILES`.

If a researcher fails, continue with remaining outputs. If all fail (or depth is `quick`), proceed without a briefing — attackers will explore context themselves at reduced confidence.

### Report
Report to the user:
```
Target: <file/function/directory/description>
Type: <code|spec>
Files: <count> (<total line count> lines)
```
---
## Phase 3: Parallel Attack
### Select Perspectives
Use the perspective table matching `TARGET_TYPE` and `DEPTH` from Phase 1.

### Launch Attackers
Spawn all attackers in parallel using the Task tool with `Agent: critique-attacker` (multiple Task calls in one message):

```
Task: "You are a critique attacker attacking from the <PERSPECTIVE> perspective.
## Target Files
Read the target at these paths:
<list of file paths from TARGET_FILES>
## Target Type
<code|spec>
## Research Briefing
<RESEARCH_BRIEFING content, or 'No research briefing available — explore context yourself'>
## Your Perspective
<PERSPECTIVE>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Read every target file in full. Attack from your perspective using all your attack vectors. Quote specific content for every finding. Check for what's NOT there — missing sections, missing handling, missing constraints. You MUST produce at least 2 findings."
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all attackers to complete.
---
## Phase 4: Verify Critical & High Findings
Critical and high findings drive the risk assessment, so each one gets an independent check before it can. Medium and low findings flow through unverified — they are triage fodder for the reader.

### Collect & Deduplicate (preliminary)
1. Collect all findings from all attackers.
2. Deduplicate: merge findings that reference the same location with the same issue.
3. Note cross-perspective consensus: issues raised by 2+ attackers are stronger signals — mark these with the raising perspectives.
4. Group by severity: critical, high, medium, low.

### Dispatch Verifiers
**Scope**: all critical and high findings after dedup. If there are none, skip this phase entirely. If there are more than 10, verify the first 10 (criticals first, then highs, in report order) and mark the rest `verification: skipped (cap)`.

Spawn one verifier per in-scope finding, all in parallel, using the Task tool with `Agent: critique-verifier`:

```
Task: "You are a critique verifier. Investigate this ONE finding and determine whether it is real by reading the actual target — do not take the attacker's reasoning at face value.
## Finding
<full finding text: severity, location, quoted content, impact, raising perspective(s)>
## Target Files
<list of file paths from TARGET_FILES>
## Target Type
<code|spec>"
```
If `AGENT_MODEL` is set, pass it as `model`.

### Apply Verdicts
After all verifiers return:
- `confirmed` -> keep the finding; record the verifier's evidence as its verification note.
- `uncertain` -> keep the finding; mark it `[unverified]` and record the verifier's note.
- `false-positive` -> drop the finding from its severity group and record it (with the refuting evidence) for the "Dropped as False Positives" section. **Security clamp**: findings raised by the `security` perspective are never dropped — clamp `false-positive` to `uncertain` and keep them, marked `[unverified]` with the verifier's evidence. A wrong security drop is costlier than a noisy security finding.
- Verifier failed or returned no parseable verdict -> keep the finding unannotated, log `verification failed` for it.

A `false-positive` verdict whose evidence lacks a refuting `file:line` citation is invalid — treat it as `uncertain`.
---
## Phase 5: Aggregate & Present
The orchestrator (not an agent) processes all surviving findings. **This is the final output — make it useful.**

### Compute Risk Assessment
Compute over findings that **survived verification** — dropped false positives do not count. Based on the surviving findings:
- **Critical risk**: Any critical findings, or 3+ high findings
- **High risk**: 1-2 high findings, or 5+ medium findings
- **Moderate risk**: 1-4 medium findings, no high or critical
- **Low risk**: Only low findings

### Present Results
Use this exact format:
```
## Critique Complete
**Target**: <file/function/directory/description> | **Type**: <code|spec> | **Depth**: <depth> | **Attackers**: <count>
**Verification**: <N confirmed, N unverified, N dropped as false positives | n/a — no critical/high findings>

### Critical Findings
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>
   **Verification**: <confirmed — evidence | [unverified] — verifier note | failed | skipped (cap)>

[If no critical findings: "No critical findings."]

### High Findings
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>
   **Verification**: <confirmed — evidence | [unverified] — verifier note | failed | skipped (cap)>

[If no high findings: "No high findings."]

### Medium Findings
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no medium findings: "No medium findings."]

### Low Findings
1. **[CATEGORY]** `file:line` — Description — Fix: <suggestion>

[If no low findings: "No low findings."]

### Dropped as False Positives
- **[CATEGORY]** `file:line` — <finding one-liner> — Refuted: <verifier's refuting evidence>

[Omit this section if nothing was dropped.]

### What's Solid
- <specific positive citing file:line — not generic praise>

### Attacker Consensus
- **Agreed**: <issues raised by 2+ attackers — these are high-confidence findings>
- **Split opinions**: <issues where attackers disagreed, if any>

### Risk Assessment: <CRITICAL | HIGH | MODERATE | LOW>
<1-2 sentence rationale based on finding counts and severity>
```

### Risk Logic
- Any critical findings -> `CRITICAL`
- 1-2 high findings, or 5+ medium -> `HIGH`
- 1-4 medium findings, no high or critical -> `MODERATE`
- Only low findings -> `LOW`
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If a researcher fails: continue with remaining researchers. If all fail, proceed without research briefing (attackers will explore context themselves).
3. If an attacker fails: continue with remaining attackers. If fewer than half succeed, note reduced coverage in the final report.
4. If a verifier fails: keep its finding unannotated, log `verification failed` for it, and continue. Verifier failures never drop findings.
5. Do not retry failed agents.

### Target Not Found
1. If file/directory does not exist: report "Target not found: <path>" and exit cleanly.
2. If function not found in file: report "Function '<name>' not found in <file>" and exit cleanly.

### Description Resolution Failed
1. If the description researcher finds no relevant content: report "Could not identify content matching: <description>" and exit cleanly.

### Empty Target
1. If the resolved target has no files: report "No files found in target."
2. Exit.
---
## Important Notes
- **Orchestrator handles aggregation directly** — do not delegate Phase 5 to an agent.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, include a `## Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt (already shown in the templates).
- Valid agent names: `critique-researcher`, `critique-attacker`, `critique-verifier`.
- **This is read-only.** No worktrees, no stashing, no modifications. Critique examines targets — it does not change them.
- **No file artifacts.** All state (target files, research briefing, findings) is held in-memory. No directories, no JSON state files, no markdown artifacts, no cleanup.
- **No numeric scoring.** Findings with severity levels and a risk assessment are the output.
- **Target content is the source of truth.** Every finding must trace to a specific location in the target files or a specific absence.
- **Works without git.** A git repo is not required. If in a git repo, researchers and attackers may use read-only git history for context. If not, they skip git-based research.
---
## Phase Transitions
Check preconditions before each phase; if unmet, run fallback.
| Phase | Precondition | Fallback |
|-------|-------------|----------|
| Phase 2 | Valid target classified | Report error and STOP |
| Phase 3 | TARGET_FILES is non-empty | Abort — nothing to critique |
| Phase 4 | At least 1 attacker produced output; 1+ critical/high finding exists | Skip verification, go to Phase 5 |
| Phase 5 | At least 1 attacker produced output | Report "critique could not complete" |
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
3. FALLBACK: If preconditions aren't met, execute the documented fallback — don't improvise
4. ONLY THEN: Enter the next phase
Skipping precondition checks = building on an unverified foundation.
```
### Red Flags — STOP If You Notice
- About to spawn attackers without verifying the target files exist
- About to present results without at least 1 attacker having completed
- Skipping Phase 2 research for standard/deep depth
- Spawning researchers for quick depth
- Presenting critical or high findings without having run (or explicitly capped/skipped) verification
- About to drop a security-perspective finding on a false-positive verdict (clamp to uncertain instead)
- Presenting a risk assessment without checking finding counts
- Computing the risk assessment over findings that verification dropped
- Using "should be fine" or "looks good" without evidence
- Presenting generic praise in "What's Solid" without citing specific content
- Creating worktrees or modifying files (critique is read-only)
- Writing files to disk (all state is in-memory)
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
