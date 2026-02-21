# critique

Adversarial code red-teaming — throw attackers at existing code.

## What it does

`/critique` runs parallel adversarial attackers against existing code. Each attacker probes from a specific perspective (security, correctness, resilience, performance, maintainability, architecture, data-integrity), produces severity-calibrated findings grounded in actual code, and the orchestrator deduplicates, identifies cross-perspective consensus, and renders a risk assessment.

## Key difference from /review

`/review` takes a **diff** and asks "is this change safe?" `/critique` takes **existing code** and asks "what's broken/risky/fragile here?" Review is change-gated; critique is code-gated.

## Usage

```
/critique src/auth/login.ts                    # critique a file
/critique src/auth/login.ts:validateToken      # critique a specific function
/critique src/auth/                            # critique a module/directory
/critique "our authentication architecture"    # freeform — researchers find relevant code
```

## Input Modes

| Mode | Trigger | Example |
|------|---------|---------|
| File | path exists as file | `/critique src/auth.ts` |
| Function | file path + `:functionName` | `/critique src/auth.ts:login` |
| Directory | path exists as directory | `/critique src/auth/` |
| Description | anything else | `/critique "the payment flow"` |

## Depth Modes

| Depth | Researchers | Attackers | Perspectives |
|-------|-------------|-----------|--------------|
| quick | 0 | 3 | security, correctness, resilience |
| standard | 1 | 5 | + performance, maintainability |
| deep | 2 | 7 | + architecture, data-integrity |

## How it works

1. **Configure** — Choose depth, model, and optional focus areas
2. **Resolve target** — Read target code (or have a researcher find code matching a description)
3. **Research** (standard+) — Researchers explore callers, dependencies, trust boundaries, and test coverage
4. **Attack** — Attackers probe the code in parallel from their assigned perspectives, producing findings with severity and code evidence
5. **Aggregate** — Orchestrator deduplicates findings, identifies cross-perspective consensus, and presents grouped results with a risk assessment

## Output

Findings are grouped by severity:
- **Critical** — exploitable vulnerability, data loss/corruption, crash in production
- **High** — likely problems under normal use
- **Medium** — potential problems, edge cases, complexity debt
- **Low** — improvement opportunities

Risk assessment: `CRITICAL` / `HIGH` / `MODERATE` / `LOW`

## Attacker Perspectives

| Perspective | Focus |
|-------------|-------|
| **security** | Injection, auth gaps, data exposure, trust boundary violations, secret handling |
| **correctness** | Logic errors, null paths, race conditions, wrong comparisons, missing returns |
| **resilience** | Missing error handling, no retries, no timeouts, resource leaks, cascading failures |
| **performance** | Hot path issues, O(n^2), N+1 patterns, resource leaks, blocking async |
| **maintainability** | Cognitive complexity, magic values, god functions, poor naming, dead code |
| **architecture** | Coupling, dependency direction, layer leaks, SRP violations, extensibility traps |
| **data-integrity** | Missing validation, inconsistent state, silent corruption, race conditions on data |

## Agents

| Agent | Role |
|-------|------|
| `critique-researcher` | Code context explorer — callers, dependencies, trust boundaries, test coverage |
| `critique-attacker` | Perspective-based adversarial critic (one perspective per spawn) |

## Install

```
/plugin install critique@cb-claude
```
