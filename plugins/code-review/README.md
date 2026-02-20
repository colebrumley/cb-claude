# code-review

Multi-perspective code review — throw rigor at a diff.

## What it does

`/review` runs parallel adversarial critics against a PR, branch comparison, or local changes. Each critic attacks from a specific perspective (correctness, security, design, testing, maintainability, performance, codebase-fit), produces severity-calibrated findings grounded in actual code, and the orchestrator deduplicates, identifies cross-perspective consensus, and renders a verdict.

## Usage

```
/review                          # auto-detect PR on current branch
/review 123                      # review PR #123
/review https://github.com/org/repo/pull/123  # review by URL
/review main..feature-branch     # review branch comparison
```

If no PR is found and no branch range is given, falls back to reviewing local uncommitted changes.

## Input Modes

| Mode | Trigger | Diff Source |
|------|---------|-------------|
| PR | number, URL, or auto-detect | `gh pr diff` |
| Branch range | `base..head` syntax | `git diff base..head` |
| Local | fallback | `git diff HEAD` |

## Depth Modes

| Depth | Researchers | Critics | Perspectives |
|-------|-------------|---------|--------------|
| quick | 0 | 3 | correctness, security, design |
| standard | 1 | 5 | + testing, maintainability |
| deep | 2 | 7 | + performance, codebase-fit |

## How it works

1. **Configure** — Choose depth, model, and optional focus areas
2. **Gather** — Resolve diff from PR, branch range, or local changes; analyze changed files and affected areas
3. **Research** (standard+) — Researchers explore conventions and blast radius in affected areas
4. **Critique** — Critics attack the diff in parallel from their assigned perspectives, producing findings with severity and code evidence
5. **Aggregate** — Orchestrator deduplicates findings, identifies cross-perspective consensus, and presents grouped results with a verdict

## Output

No numeric scores. Findings are grouped by severity:
- **Critical** — must fix before merge (bugs, vulnerabilities, data loss)
- **Major** — should fix (likely problems, missing error handling, test gaps)
- **Minor** — nits (style, naming, minor improvements)

Verdict: `REQUEST CHANGES` / `APPROVE WITH SUGGESTIONS` / `APPROVE`

## Agents

| Agent | Role |
|-------|------|
| `review-researcher` | Codebase context explorer — conventions, patterns, blast radius in affected areas |
| `review-critic` | Perspective-based reviewer (one perspective per spawn: correctness, security, design, testing, maintainability, performance, codebase-fit) |

## Install

```
/plugin install code-review@cb-claude
```
