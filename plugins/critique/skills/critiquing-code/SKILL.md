---
description: "Proactive code critique. Use when reviewing existing code for security vulnerabilities, correctness issues, design problems, or fragility — especially before refactoring, during security audits, or when investigating suspicious behavior."
---
# Critiquing Code

When existing code needs adversarial scrutiny, run a critique.

## Pre-flight

1. Identify the target code — a specific file, module, or subsystem
2. Confirm the goal: security audit, correctness check, design review, or general red-teaming
3. Check if there are specific concerns to focus on (the user may have hinted at a problem area)

## Invoke

Run `/critique` with the target:

- **File**: `/critique src/auth/session.ts`
- **Directory**: `/critique src/payments/`
- **Focused**: `/critique --instructions "focus on injection and auth bypass" src/api/`

Use `--depth quick` for a fast sanity check. Use default depth for routine review. Use `--depth deep` for security-sensitive code, code handling money, or code with a history of bugs.

## After Critique

- Triage findings by severity — critical and major findings need action
- Fix what you can immediately; flag the rest to the user
- Don't dismiss findings without explanation
