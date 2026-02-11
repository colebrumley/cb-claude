# effort

Effort-scaled parallel implementation — throw money at a problem.

## What it does

`/effort` spawns a multi-agent pipeline that attacks a coding task from multiple angles simultaneously, then evaluates, synthesizes, and refines the results into a single best solution.

## Usage

```
/effort add a hello endpoint          # auto-detect effort level
/effort 2 add user authentication     # explicit level 2
/effort 3 redesign the data layer     # level 3 (ludicrous mode)
```

## Effort Levels

| Level | Name | Workers | Pipeline |
|-------|------|---------|----------|
| 1 | Try harder | 3 | Research -> Tests -> 3 workers -> Review -> Synthesis -> Verify |
| 2 | High effort | 5 | Research (2) -> Tests -> 5 workers -> Review (2) -> Synthesis -> Adversarial -> Verify |
| 3 | Ludicrous mode | 7 | Research (3) -> Tests (3+synthesis) -> 7 workers -> Review (3 specialized) -> Refinement round -> Final synthesis -> Adversarial (2) -> Final review -> Verify |

## How it works

1. **Research** — Researchers explore the codebase and produce structured briefings
2. **Test generation** — Test-first: tests are written before any implementation
3. **Parallel implementation** — Workers implement the task from different perspectives (minimalist, architect, convention, resilience, performance, security, testability) in isolated git worktrees
4. **Evaluation** — Reviewers score each implementation on correctness, quality, codebase fit, completeness, and elegance (0-100)
5. **Synthesis** — The best elements of top solutions are combined
6. **Adversarial review** — Red-teamers try to break the winning solution
7. **Verification** — Tests, lint, type checking, and build verification
8. **Refinement** (L3) — Tournament-style rounds with re-evaluation

## Agents

| Agent | Role |
|-------|------|
| `effort-researcher` | Deep codebase exploration and context gathering |
| `effort-worker` | Multi-mode implementation (implement, write-tests, synthesize, refine) |
| `effort-reviewer` | Scoring, adversarial review, and final quality gates |

## Install

```bash
claude plugin add /path/to/plugins/effort
```
