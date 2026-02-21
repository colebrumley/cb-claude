# cb-claude

A Claude Code plugin suite by Cole.

## Install

```
/plugin marketplace add colebrumley/cb-claude
/plugin install cb@cb-claude
```

## Commands

All commands are namespaced under `cb:`. Use `/cb:<command>` to invoke.

| Command | Description |
|---------|-------------|
| `/cb:effort` | Effort-scaled parallel implementation — throw compute at a problem with tournament-style multi-agent evaluation |
| `/cb:spec` | Technical spec writing — iterative questioning, rubric-gated completeness, and parallel adversarial critique |
| `/cb:review` | Multi-perspective code review — parallel adversarial critics with severity-calibrated findings |
| `/cb:test` | Multi-perspective test generation — parallel categorized writers with synthesis and verification against existing code |
| `/cb:critique` | Adversarial code red-teaming — parallel attackers probe existing code for vulnerabilities, bugs, fragility, and design problems |
| `/cb:docs` | Documentation generation — parallel researchers explore existing code while adversarial critics attack drafts |
| `/cb:anti-sycophancy` | Always-on critical feedback — installs pushback rules into CLAUDE.md with a hook to enforce persistence |
| `/cb:eval-spec` | External evaluation spec generator — SRE-minded black-box validation specs |
| `/cb:rewind` | Rewind to the last snapshot — reset working tree to Claude's last checkpoint |

## Agents

| Agent | Description |
|-------|-------------|
| `cb:effort-researcher` | Deep codebase exploration for effort-scaled implementations |
| `cb:effort-worker` | Multi-mode engineering worker (implement, write-tests, synthesize, refine) |
| `cb:effort-reviewer` | Scoring, adversarial review, and final quality gates |
| `cb:spec-drafter` | Writes and revises technical spec documents |
| `cb:spec-critic` | Adversarial reviewer that critiques specs |
| `cb:review-researcher` | Codebase context explorer for code review |
| `cb:review-critic` | Perspective-based code reviewer |
| `cb:test-researcher` | Code and test infrastructure explorer |
| `cb:test-writer` | Perspective-based test writer |
| `cb:critique-researcher` | Code context explorer for adversarial critique |
| `cb:critique-attacker` | Perspective-based adversarial critic |
| `cb:docs-researcher` | Codebase and documentation explorer |
| `cb:docs-writer` | Documentation generator |
| `cb:docs-critic` | Adversarial documentation critic |
| `cb:eval-spec-researcher` | Codebase explorer for evaluation spec generation |
| `cb:eval-spec-generator` | Evaluation spec generator |
| `cb:eval-spec-critic` | Adversarial evaluation spec critic |
