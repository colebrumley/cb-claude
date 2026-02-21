# docs

Documentation generation — throw rigor at documenting existing code.

## What it does

`/docs` produces comprehensive documentation for existing code, grounded in codebase evidence. It iteratively questions you against a completeness rubric, then parallel researchers explore the code while adversarial critics attack the draft from accuracy, completeness, clarity, usability, and maintainability perspectives.

## Usage

```
/docs src/auth/                         # document a directory
/docs src/utils/parser.ts               # document a specific file
/docs "the authentication system"       # freeform — researchers find the code
/docs --type end-user --depth deep src/ # inline flags
```

## Doc Types

| Type | Target Audience | Focus |
|------|----------------|-------|
| end-user | People who **use** the software | Install, configure, accomplish tasks |
| developer | People who **build with** or **contribute to** the software | API reference, architecture, patterns |

## Personas

| Persona | Assumed Knowledge | Content Style |
|---------|-------------------|---------------|
| end-user | Non-technical or semi-technical | Task-oriented, no jargon |
| developer | Programming knowledge | API-oriented, code examples |
| operator | Infrastructure knowledge | Operations-oriented, commands |
| contributor | Codebase familiarity | Architecture, patterns, conventions |

## Depth Modes

| Depth | Researchers | Question Rounds | Critics | Revisions | Best For |
|-------|-------------|----------------|---------|-----------|----------|
| quick | 1 (codebase) | 1 | 3 (accuracy, completeness, clarity) | 0 | Quick reference docs |
| standard | 2 (codebase, existing-docs) | 2-3 | 4 (+usability) | 1 | Most documentation |
| deep | 3 (codebase, existing-docs, usage) | 3-5 | 5 (all perspectives) | 2 | Comprehensive docs |

## How it works

1. **Configure** — Choose doc type, persona, depth, and model
2. **Rubric** — A type-specific completeness rubric is generated (6-7 weighted dimensions)
3. **Question** — Iterative rounds of targeted questions until the rubric threshold is met (weighted avg >= 2.0, no dimension at 0)
4. **Research** — Parallel researchers explore the codebase, existing docs, and usage patterns
5. **Draft** — A writer agent explores the codebase and produces documentation grounded in code evidence
6. **Critique** — Multiple critic perspectives attack the draft in parallel
7. **Refine** — If requested, the writer revises with approved critic feedback
8. **Finalize** — Final documentation with rubric scores, traceability, and assumptions

## Agents

| Agent | Role |
|-------|------|
| `docs-researcher` | Explores codebase, existing docs, and usage patterns (read-only) |
| `docs-writer` | Produces and revises documentation grounded in code evidence |
| `docs-critic` | Adversarial reviewer (one perspective per spawn: accuracy, completeness, clarity, usability, maintainability) |

## Key difference from /spec

`/spec` produces a *specification for something to be built* (forward-looking). `/docs` produces *documentation for something that already exists* (backward-looking). Both use iterative questioning and adversarial critique, but docs are grounded entirely in existing code behavior.

## Install

```
/plugin install docs@cb-claude
```
