# cb-claude

A suite of Claude Code plugins by Cole.

## Install

Add the marketplace, then install individual plugins:

```
/plugin marketplace add colebrumley/cb-claude
```

Install all plugins:

```
/plugin install effort spec code-review test critique docs anti-sycophancy snapshot eval-spec
```

Or install only what you need:

```
/plugin install effort
/plugin install spec
/plugin install code-review
```

## Plugins

### effort

Effort-scaled parallel implementation — throw compute at a problem with multi-agent workers, adversarial review, and synthesis.

```
/effort <task>
/effort 3 <task>   # override effort level (1-3)
```

Agents: `effort-researcher`, `effort-worker`, `effort-reviewer`

### spec

Technical spec writing — iterative questioning, rubric-gated completeness, and parallel adversarial critique.

```
/spec <description>
```

Agents: `spec-drafter`, `spec-critic` | Skill: `writing-specs` (proactive)

### code-review

Multi-perspective code review — parallel adversarial critics with severity-calibrated findings.

```
/review [PR number|URL|branch-range]
```

Agents: `review-researcher`, `review-critic` | Skill: `reviewing-code` (proactive)

### test

Multi-perspective test generation — parallel writers produce categorized tests for existing code.

```
/test <target>
```

Agents: `test-researcher`, `test-writer` | Skill: `writing-tests` (proactive)

### critique

Adversarial code red-teaming — parallel attackers probe existing code for vulnerabilities, bugs, fragility, and design problems.

```
/critique <target>
```

Agents: `critique-researcher`, `critique-attacker` | Skill: `critiquing-code` (proactive)

### docs

Documentation generation — parallel researchers explore code while adversarial critics attack drafts for accuracy and completeness.

```
/docs <target>
```

Agents: `docs-researcher`, `docs-writer`, `docs-critic` | Skill: `writing-docs` (proactive)

### eval-spec

External evaluation spec generator — SRE-minded black-box validation specs with strong oracles and reproducible scenarios.

```
/eval-spec <system or change description>
```

Agents: `eval-spec-researcher`, `eval-spec-generator`, `eval-spec-critic`

### anti-sycophancy

Installs the Critical Feedback Protocol into CLAUDE.md with an enforcement hook. Makes Claude push back, challenge assumptions, and give honest critical feedback.

```
/anti-sycophancy install
/anti-sycophancy check
/anti-sycophancy remove
```

### snapshot

Snapshot review and rewind — reset working tree to Claude's last checkpoint.

```
/rewind
```

Skill: `snapshot-review` (proactive)
