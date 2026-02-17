# effort

Effort-scaled parallel implementation — throw money at a problem.

## What it does

`/effort` spawns a multi-agent pipeline that attacks a coding task from multiple angles simultaneously, then evaluates, synthesizes, and refines the results into a single best solution.

## Usage

```
/effort add a hello endpoint              # auto-detect effort level
/effort 2 add user authentication         # explicit level 2
/effort 3 redesign the data layer         # level 3 (ludicrous mode)
/effort --permissions approve 2 add auth  # skip permission prompt, auto-approve
```

## Effort Levels

| Level | Name | Workers | Pipeline |
|-------|------|---------|----------|
| 1 | Try harder | 3 | Research -> Tests -> 3 workers -> Review -> Synthesis -> Verify |
| 2 | High effort | 5 | Research (2) -> Tests -> 5 workers -> Review (2) -> Synthesis -> Adversarial -> Verify |
| 3 | Ludicrous mode | 7 | Research (3) -> Tests (3+synthesis) -> 7 workers -> Review (3 specialized) -> Refinement round -> Final synthesis -> Adversarial (2) -> Final review -> Verify |

## Configuration

Before spawning any agents, `/effort` prompts you to configure the run:

- **Model** — choose which model agents use (inherited from orchestrator by default, or explicitly set to opus/sonnet/haiku)
- **Instructions** — provide optional constraints or focus areas (e.g. "performance focus", "minimal changes", or free-text)
- **Effort level** — if not specified in the command, choose the level or let it auto-detect
- **Permissions** — pre-approve Bash commands so agents can work without interrupting you for every shell command. Detects your project's build tooling (npm, cargo, make, etc.) and writes permission rules to `.claude/settings.local.json` (gitignored, local-only)

## How it works

1. **Configure** — You're prompted to set model, instructions, and effort level
2. **Research** — Researchers explore the codebase and produce structured briefings
3. **Test generation** — Test-first: tests are written before any implementation
4. **Parallel implementation** — Worker teammates implement the task from different perspectives (minimalist, architect, convention, resilience, performance, security, testability) in isolated git worktrees (stored in `.worktrees/`)
5. **Evaluation** — Reviewers score each implementation on correctness, quality, codebase fit, completeness, and elegance (0-100)
6. **Synthesis** — The best elements of top solutions are combined
7. **Adversarial review** — Red-teamers try to break the winning solution
8. **Verification** — Tests, lint, type checking, and build verification
9. **Refinement** (L3) — Tournament-style rounds with re-evaluation

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
