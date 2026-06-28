# cb-claude

A small suite of Claude Code plugins by Cole.

## Install

Add the marketplace, then install individual plugins:

```
/plugin marketplace add colebrumley/cb-claude
```

Install all plugins:

```
/plugin install critique anti-sycophancy
```

Or install only what you need:

```
/plugin install critique
```

## Plugins

### critique

Adversarial red-teaming — parallel attackers probe any target (code, specs, plans, documents) for vulnerabilities, bugs, fragility, and design problems. Critical and high findings are independently verified before they drive the risk assessment.

```
/critique <target>
/critique --depth deep src/auth/
/critique docs/design/new-billing.md   # specs and plans too
```

Agents: `critique-researcher`, `critique-attacker`, `critique-verifier` | Skill: `critiquing-code` (proactive)

### anti-sycophancy

Installs the Critical Feedback Protocol into CLAUDE.md with an enforcement hook. Makes Claude push back, challenge assumptions, and give honest critical feedback.

```
/anti-sycophancy install
/anti-sycophancy check
/anti-sycophancy remove
```

### requirements-interviewer

A deterministic-first requirements interview before you build. A skeptical analyst (the LLM) clarifies a vague feature into structured state; a dependency-free TypeScript CLI validates completeness, persists the decision log, and renders a builder handoff that downstream agents can't lose or reinterpret after compaction.

```
/requirements Add CSV export to the reports page
/requirements Multi-region failover --tier epic
```

Skill: `requirements-interviewer` | CLI: `plugins/requirements-interviewer/lib` (`init`, `validate`, `gaps`, `apply`, `render-spec`, `render-handoff`)
