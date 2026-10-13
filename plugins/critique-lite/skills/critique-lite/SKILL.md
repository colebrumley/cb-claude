---
name: critique-lite
description: "Reviews a file, function, directory, spec or plan for vulnerabilities, bugs, fragility and design problems, in one pass with no subagents, and reports findings by severity. Use when asked to critique, red-team or audit existing code or a spec. Usage: /critique-lite <target>"
---
# Critique

Review the target named in `$ARGUMENTS` for vulnerabilities, bugs, fragility, and design problems. The target is a file, a function written as `file:function`, or a directory. Flags from the older pipeline (`--model`, `--depth`, `--instructions`) and their values are ignored.

Do the review yourself, in one pass. Do not spawn subagents and do not ask the user questions. Read the target in full, and read surrounding files where you need context. This is read-only: do not modify or create files.

Report your findings as your final message. Describe the target, not how you reviewed it. The risk level is the highest severity among your findings; the number of findings never raises it (any critical is CRITICAL, otherwise any high is HIGH, otherwise any medium is MODERATE, otherwise LOW).

Use this exact format:
```
## Critique
**Target**: <file/function/directory/description> | **Type**: <code|spec>

### Critical Findings
1. **[CATEGORY]** `file:line` — Description
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no critical findings: "No critical findings."]

### High Findings
1. **[CATEGORY]** `file:line` — Description
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no high findings: "No high findings."]

### Medium Findings
1. **[CATEGORY]** `file:line` — Description
   > ```
   > <quoted content>
   > ```
   **Impact**: <what goes wrong>
   **Recommendation**: <specific fix>

[If no medium findings: "No medium findings."]

### Low Findings
1. **[CATEGORY]** `file:line` — Description — Fix: <suggestion>

[If no low findings: "No low findings."]

### What's Solid
- <specific positive citing file:line — not generic praise>

### Risk Assessment: <CRITICAL | HIGH | MODERATE | LOW>
<1-2 sentence rationale naming the findings that set the level>
```
