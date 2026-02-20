# test

Multi-perspective test generation — throw rigor at existing code.

## What it does

`/test` generates comprehensive tests for existing code by spawning parallel writers that each focus on a different testing category (core, edge, error, integration, security). Writers produce tests that must PASS against the current codebase, then a synthesizer combines them into a unified test suite.

## Usage

```
/test src/utils/parser.ts                    # test a file
/test src/utils/parser.ts:parseConfig        # test a specific function
/test src/utils/                             # test a directory
/test "add tests for the payment flow"       # freeform description
```

## Input Modes

| Mode | Trigger | Example |
|------|---------|---------|
| File | path exists as file | `/test src/parser.ts` |
| Function | file path + `:functionName` | `/test src/parser.ts:parse` |
| Directory | path exists as directory | `/test src/utils/` |
| Description | anything else | `/test "test the auth module"` |

## Depth Modes

| Depth | Researchers | Writers | Categories |
|-------|-------------|---------|------------|
| quick | 0 | 1 | core (comprehensive) |
| standard | 1 | 3 | core, edge, error |
| deep | 2 | 5 | core, edge, error, integration, security |

## How it works

1. **Configure** — Choose depth, model, and optional focus areas
2. **Research** (standard+) — Researchers discover test framework, conventions, and coverage gaps
3. **Generate** — Writers produce tests in parallel, each in an isolated git worktree. Each writer covers a specific category
4. **Synthesize** (standard+) — A synthesizer combines writer outputs: deduplicates, unifies setup, resolves conflicts
5. **Verify** — Orchestrator runs the full test suite and confirms all tests pass
6. **Apply** — Present results and let you apply, modify, or discard

## Key difference from effort's test generation

Effort writes tests that should FAIL (driving TDD before implementation). This plugin writes tests that should PASS (validating existing code). The verification gate is inverted — failing tests mean the test is wrong, not the code.

## Writer Categories

| Category | Focus |
|----------|-------|
| **core** | Happy path, standard inputs, expected outputs, return values, state transitions |
| **edge** | Boundary values, null/undefined, off-by-one, unicode, empty inputs, concurrent calls |
| **error** | Invalid inputs, thrown exceptions, rejected promises, timeouts, missing dependencies |
| **integration** | Cross-module interactions, API contracts, data flow through layers, real dependencies |
| **security** | Injection prevention, auth boundaries, data exposure, malicious input handling |

## Agents

| Agent | Role |
|-------|------|
| `test-researcher` | Code and test infrastructure explorer — discovers frameworks, conventions, coverage gaps |
| `test-writer` | Perspective-based test writer (one category per spawn: core, edge, error, integration, security) and test synthesizer |

## Install

```
/plugin install test@cb-claude
```
