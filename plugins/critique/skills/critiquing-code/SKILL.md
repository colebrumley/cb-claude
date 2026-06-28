---
description: "Proactive code critique. Use when reviewing existing code for security vulnerabilities, correctness issues, design problems, or fragility — especially before refactoring, during security audits, or when investigating suspicious behavior."
---
# Critiquing Code

When existing code needs adversarial scrutiny, run a critique. The same command also critiques **specs and plans** — non-code targets get a spec-specific perspective set (determinism, completeness, verifiability, etc.) aimed at how an LLM would misimplement them.

## Pre-flight

1. Identify the target — a specific file, module, subsystem, spec, or plan
2. Confirm the goal: security audit, correctness check, design review, spec hardening, or general red-teaming
3. Check if there are specific concerns to focus on (the user may have hinted at a problem area)

## Invoke

Run `/critique` with the target:

- **File**: `/critique src/auth/session.ts`
- **Directory**: `/critique src/payments/`
- **Spec/plan**: `/critique docs/design/new-billing.md`
- **Focused**: `/critique --instructions "focus on injection and auth bypass" src/api/`

Critical and high findings are independently verified before they drive the risk assessment, so false positives are filtered from the report.

Use `--depth quick` for a fast sanity check. Use default depth for routine review. Use `--depth deep` for security-sensitive code, code handling money, or code with a history of bugs.

## After Critique

- Triage findings by severity — critical and major findings need action
- Fix what you can immediately; flag the rest to the user
- Don't dismiss findings without explanation
