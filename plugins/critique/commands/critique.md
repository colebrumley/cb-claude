---
name: critique
description: "Adversarial code red-teaming — parallel attackers probe existing code for vulnerabilities, bugs, fragility, and design problems. Usage: /critique [--model <model>] [--depth <depth>] [--instructions <text>] <target>"
user_invocable: true
arguments:
  - name: args
    description: "Optional flags and target (file path, file:function, directory, or description)"
    required: true
---
# Code Critique
Orchestrate parallel adversarial red-teaming of existing code in fixed phases.
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
1. **File**: path exists as a file (e.g. `src/utils/parser.ts`)
2. **Function**: contains `:` after a valid file path (e.g. `src/utils/parser.ts:parseConfig`)
3. **Directory**: path exists as a directory (e.g. `src/utils/`)
4. **Description**: anything else (e.g. `"our authentication architecture"`)

Validate:
- File mode: verify file exists. If not, report error and STOP.
- Function mode: verify file exists. Function name is extracted but not validated here (attackers will verify).
- Directory mode: verify directory exists. If not, report error and STOP.
- Description mode: no validation needed — researchers will resolve to code in Phase 2.

### Configure Run
**If ALL configuration values are determined from parsed arguments** (model is set, depth is set, and instructions is set or "none"):
- Set `AGENT_MODEL` from `--model` value (`inherited` maps to `null`)
- Set `DEPTH` from `--depth` value
- Set `USER_INSTRUCTIONS` from `--instructions` value (`none` maps to `null`)
- **Skip `AskUserQuestion` entirely** — proceed directly to Initialize Working Directory

**Otherwise**, use `AskUserQuestion` to ask ONLY for values not yet determined from arguments. Ask all remaining questions in a **single call**.

**Ask only if depth was NOT set from arguments:**

1. **Depth** (header: "Depth"): "How thorough should the critique be?"
   - "Standard (Recommended)" — 1 researcher, 5 attackers (security, correctness, resilience, performance, maintainability)
   - "Quick" — no researchers, 3 attackers (security, correctness, resilience)
   - "Deep" — 2 researchers, 7 attackers (all perspectives including architecture, data-integrity)

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
- `FUNCTION_NAME`: extracted function name (function mode only) or `null`
- `DEPTH`: `quick|standard|deep`
- `RESEARCHER_COUNT`: quick=0, standard=1, deep=2
- `ATTACKER_COUNT`: quick=3, standard=5, deep=7
- `AGENT_MODEL`: `opus|sonnet|haiku|null`. Set to the chosen model string, or `null` if "Inherited".
- `USER_INSTRUCTIONS`: free-text string or `null`.

### Attacker Perspectives by Depth
| Perspective | Quick | Standard | Deep |
|-------------|-------|----------|------|
| security | Y | Y | Y |
| correctness | Y | Y | Y |
| resilience | Y | Y | Y |
| performance | - | Y | Y |
| maintainability | - | Y | Y |
| architecture | - | - | Y |
| data-integrity | - | - | Y |

### Researcher Focus by Depth
| Focus | Quick | Standard | Deep |
|-------|-------|----------|------|
| context | - | Y | Y |
| dependencies | - | - | Y |

### Initialize Working Directory
```bash
if git rev-parse --is-inside-work-tree 2>/dev/null; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  CRITIQUE_ID="$(date +%Y%m%d-%H%M%S)-$$"
  CRITIQUE_DIR="${REPO_ROOT}/.critiques/critique-${CRITIQUE_ID}"
  grep -qxF '.critiques/' "${REPO_ROOT}/.gitignore" 2>/dev/null || echo '.critiques/' >> "${REPO_ROOT}/.gitignore"
else
  echo "ERROR: Not in a git repository. Critique requires a git repo."
  # STOP — cannot proceed without git
fi
mkdir -p "${CRITIQUE_DIR}/artifacts"
```

### Initialize State Tracking
Create `${CRITIQUE_DIR}/run.json`:
```json
{
  "critique_id": "<CRITIQUE_ID>",
  "target": "<TARGET>",
  "target_mode": "<file|function|directory|description>",
  "function_name": "<string or null>",
  "depth": "<quick|standard|deep>",
  "researcher_count": 0,
  "attacker_count": 3,
  "agent_model": "<opus|sonnet|haiku|null>",
  "user_instructions": "<string or null>",
  "status": "configuring"
}
```
Update `run.json` after every phase.

### Create Team
Use `TeamCreate` with `team_name: "critique-${CRITIQUE_ID}"`. All agents are spawned as **teammates** using the Task tool with the `team_name` parameter. **Never use `run_in_background`** — always spawn teammates.

### Announce the Plan
Report: target, target mode, depth, expected researcher count, expected attacker count, attacker perspectives, and the phase sequence.
---
## Phase 2: Resolve Target
### For File Mode
Read the target file. Save to `${CRITIQUE_DIR}/artifacts/target-code.md`:
```markdown
## Target Code
### <file path>
\`\`\`<language>
<file contents>
\`\`\`
```
Extract: file path, line count, language.

### For Function Mode
Read the target file. Extract the specified function (search for the function definition). Save to `${CRITIQUE_DIR}/artifacts/target-code.md`:
```markdown
## Target Code
### <file path>:<function name>
\`\`\`<language>
<function code>
\`\`\`
### Full File Context
\`\`\`<language>
<full file contents>
\`\`\`
```
If the function is not found in the file, report error and STOP.

### For Directory Mode
List all source files in the directory (exclude tests, node_modules, build artifacts). Read each file. Save to `${CRITIQUE_DIR}/artifacts/target-code.md`:
```markdown
## Target Code
### <file path 1>
\`\`\`<language>
<file contents>
\`\`\`
### <file path 2>
\`\`\`<language>
<file contents>
\`\`\`
...
```
If the directory contains more than 20 source files, select the most important ones (entry points, main modules) and note which files were excluded.

### For Description Mode
Spawn 1 researcher (critique-researcher, focus: context) to explore the codebase and identify relevant files matching the description:
```
Task: "You are a critique researcher with focus: context.
## Description
The user wants to critique: <DESCRIPTION>
## Instructions
Search the codebase to identify the files most relevant to this description. Read them and produce a briefing that includes the file paths and key code. Your output will be used to identify the target code for adversarial critique.
<USER_INSTRUCTIONS or 'None'>"
Agent: critique-researcher
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for the researcher. Extract the identified file paths. Read those files and save to `${CRITIQUE_DIR}/artifacts/target-code.md` in the same format as directory mode.

If the researcher finds no relevant code, report: "Could not identify code matching the description: <DESCRIPTION>" and STOP (run cleanup).

### Save File List
Save the resolved file list to `${CRITIQUE_DIR}/artifacts/target-files.txt` (one file path per line).

### Report
Report to the user:
```
Target: <file/function/directory/description>
Files: <count> (<total line count> lines)
Languages: <list>
```
---
## Phase 3: Research (standard+ only)
**Precondition**: `DEPTH` is `standard` or `deep`. Skip this phase entirely for `quick`.

### Launch Researchers
Spawn researchers as teammates based on depth:

**Standard** — 1 researcher (`context`):
```
Task: "You are a critique researcher with focus: context.
## Target Files
<list of file paths from target-files.txt>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Explore the callers, test coverage, recent change history, and conventions around these target files. Your briefing will be given to adversarial attackers to help them assess real-world risk."
Agent: critique-researcher
```

**Deep** — 2 researchers (`context`, `dependencies`):
Launch both in parallel. The `dependencies` researcher additionally maps the full dependency graph and trust boundaries.
```
Task: "You are a critique researcher with focus: dependencies.
## Target Files
<list of file paths from target-files.txt>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Map the full dependency graph of these target files — what they import, what imports them, shared state, external integrations, and trust boundaries. Your briefing will be given to adversarial attackers to help them assess blast radius and data flow risks."
Agent: critique-researcher
```

If `AGENT_MODEL` is set (not null), pass it as the `model` parameter.

### Compile Research Briefing
Wait for all researchers to complete. Combine their outputs into a single briefing (<=1500 words) saved to `${CRITIQUE_DIR}/artifacts/research-briefing.md`.

If a researcher fails, continue with remaining outputs. If all fail, proceed without research (attackers will explore context themselves at reduced confidence).
---
## Phase 4: Parallel Attack
### Select Perspectives
Use the Attacker Perspectives by Depth table from Phase 1 to determine which perspectives to spawn.

### Launch Attackers
Spawn all attackers as teammates in parallel (Task tool with `team_name`):
```
Task: "You are a critique attacker attacking from the <PERSPECTIVE> perspective.
## Target Files
Read the target code at these paths:
<list of file paths from target-files.txt>
## Research Briefing
<compiled research briefing, or 'No research briefing available — explore context yourself'>
## Your Perspective
<PERSPECTIVE>
## Instructions
<USER_INSTRUCTIONS or 'None'>

Read every target file in full. Attack from your perspective using all your attack vectors. Quote specific code for every finding. Check for what's NOT there — missing error handling, missing validation, missing timeouts. You MUST produce at least 2 findings."
Agent: critique-attacker
```
If `AGENT_MODEL` is set, pass it as `model`.

Wait for all attackers to complete.
---
## Phase 5: Aggregate & Present
The orchestrator (not an agent) processes all attacker outputs. **This is the final output — make it useful.**

### Collect & Deduplicate
1. Collect all findings from all attackers
2. Deduplicate: merge findings that reference the same file:line with the same issue
3. Note cross-perspective consensus: issues raised by 2+ attackers are stronger signals — mark these with the raising perspectives
4. Group by severity: critical, high, medium, low

### Compute Risk Assessment
Based on the findings:
- **Critical risk**: Any critical findings, or 3+ high findings
- **High risk**: 1-2 high findings, or 5+ medium findings
- **Moderate risk**: 1-4 medium findings, no high or critical
- **Low risk**: Only low findings

### Present Results
Use this exact format:
```
## Critique Complete
**Target**: <file/function/directory/description> | **Depth**: <depth> | **Attackers**: <count>

### Critical Findings (exploitable/crash/data-loss)
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted code>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no critical findings: "No critical findings."]

### High Findings (likely problems)
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted code>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no high findings: "No high findings."]

### Medium Findings (potential problems)
1. **[CATEGORY]** `file:line` — Description
   Raised by: <perspective(s)>
   > ```
   > <quoted code>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no medium findings: "No medium findings."]

### Low Findings (improvements)
1. **[CATEGORY]** `file:line` — Description — Fix: <suggestion>

[If no low findings: "No low findings."]

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

### Cleanup
1. Shut down all teammates: send `shutdown_request` via `SendMessage` to each teammate
2. Call `TeamDelete`
3. Remove working directory:
```bash
rm -rf "${CRITIQUE_DIR}"
# Remove .critiques/ if empty
rmdir "${REPO_ROOT}/.critiques" 2>/dev/null || true
```
---
## State Management
- Working directory: `${CRITIQUE_DIR}` (gitignored via `.critiques/`)
- State tracked in `run.json`
- Artifacts stored in `${CRITIQUE_DIR}/artifacts/`
- Target code saved as `target-code.md`, file list as `target-files.txt`
- No worktrees needed — critique is a read-only operation
---
## Error Handling
### Agent Failure
1. Log agent/phase/error.
2. If a researcher fails: continue with remaining researchers. If all fail, proceed without research briefing (attackers will explore context themselves).
3. If an attacker fails: continue with remaining attackers. If fewer than half succeed, note reduced coverage in the final report.
4. Do not retry failed agents.

### Target Not Found
1. If file/directory does not exist: report "Target not found: <path>" and exit cleanly.
2. If function not found in file: report "Function '<name>' not found in <file>" and exit cleanly.

### Description Resolution Failed
1. If the description researcher finds no relevant code: report "Could not identify code matching: <description>" and exit cleanly.
2. Clean up working directory.

### Not a Git Repo
1. Report error: "Critique requires a git repository."
2. Exit without creating working directory.

### Empty Target
1. If the resolved target has no source files: report "No source files found in target."
2. Clean up and exit.
---
## Important Notes
- **Always use teammates, never background agents.** Spawn every agent using the Task tool with the `team_name` parameter.
- **Orchestrator handles aggregation directly** — do not delegate Phase 5 to an agent.
- **Model**: If `AGENT_MODEL` is set (not null), pass it as the `model` parameter on every Task tool spawn. If null, omit the parameter.
- **User Instructions**: If `USER_INSTRUCTIONS` is set, prepend a `## User Instructions\n<USER_INSTRUCTIONS>` section in every agent's task prompt.
- Valid agent names: `critique-researcher`, `critique-attacker`.
- **This is read-only.** No worktrees, no stashing, no code modifications. Critique examines existing code — it does not change it.
- **No numeric scoring.** Findings with severity levels and a risk assessment are the output.
- **Target code is the source of truth.** Every finding must trace to a specific location in the target files or a specific absence.
---
## Phase Transitions
Check preconditions before each phase; if unmet, run fallback.
| Phase | Precondition | Fallback |
|-------|-------------|----------|
| Phase 2 | Valid target classified | Report error and STOP |
| Phase 3 | target-files.txt exists and is non-empty; depth is standard or deep | Skip research entirely |
| Phase 4 | target-files.txt exists and is non-empty | Abort with cleanup |
| Phase 5 | At least 1 attacker produced output | Report "critique could not complete" and cleanup |
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
- About to spawn attackers without verifying the target files exist
- About to present results without at least 1 attacker having completed
- Skipping Phase 3 research for standard/deep depth
- Spawning researchers for quick depth
- Presenting a risk assessment without checking finding counts
- Using "should be fine" or "looks good" without evidence
- Presenting generic praise in "What's Solid" without citing code lines
- Creating worktrees or modifying files (critique is read-only)
**All of these mean: STOP. Check the preconditions. Read the actual outputs. Follow the documented process.**
