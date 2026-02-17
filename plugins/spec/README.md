# spec

Technical spec writing — throw rigor at specification.

## What it does

`/spec` produces specs complete enough for an LLM to implement from. It iteratively questions you against a completeness rubric, then stress-tests the result with parallel adversarial critique from multiple expert personas.

## Usage

```
/spec add user authentication with OAuth    # auto-detect spec type
/spec design an API for payment processing  # detected as API spec
/spec plan migration from MySQL to Postgres # detected as migration spec
```

## Spec Types

| Type | Best For |
|------|----------|
| feature | New features and user-facing capabilities |
| api | API design with endpoints, schemas, error codes |
| system-architecture | High-level system design and component boundaries |
| migration | Moving between systems, databases, or platforms |
| integration | Connecting two or more systems |
| runbook | Operational procedures and playbooks |

## Depth Modes

| Depth | Question Rounds | Critic Personas | Best For |
|-------|----------------|-----------------|----------|
| quick | 2 | 3 (executive, peer-engineer, tech-founder) | Small features, time-sensitive specs |
| standard | 3 | 4 (+security-engineer) | Most specs |
| deep | 4 | 6 (all personas) | Complex systems, high-stakes changes |

## How it works

1. **Configure** — Choose spec type, depth, and model
2. **Rubric** — A type-specific completeness rubric is generated (6-8 weighted dimensions)
3. **Question** — Iterative rounds of targeted questions until the rubric threshold is met (weighted avg >= 2.0, no dimension at 0)
4. **Draft** — A drafter agent explores the codebase and writes the spec grounded in user answers and code evidence
5. **Critique** — Multiple critic personas attack the spec in parallel from different angles
6. **Review** — Findings are deduplicated, grouped by severity, and presented for your decision
7. **Refine** — If requested, the drafter revises the spec with critic feedback
8. **Finalize** — Final spec with traceability, assumptions, and TBD tracking

## Agents

| Agent | Role |
|-------|------|
| `spec-drafter` | Writes and revises specs grounded in user answers and codebase evidence |
| `spec-critic` | Adversarial reviewer (one perspective per spawn: executive, security-engineer, peer-engineer, qa-lead, tech-founder, ops-sre) |

## Install

```
/plugin install spec@cb-claude
```
