# cb-claude

A small suite of Claude Code plugins by Cole.

## Install

Add the marketplace, then install individual plugins:

```
/plugin marketplace add colebrumley/cb-claude
```

Install all plugins:

```
/plugin install critique anti-sycophancy requirements-interviewer reader-first-writing
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

### critique-lite

Experimental. The same review as `critique` in one pass: no subagents, no verification stage, same report format. It exists because early measurements showed the full pipeline taking much longer without clearly better findings. Not fully tested yet.

```
/critique-lite <target>
```

Skill: `critique-lite`

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

### reader-first-writing

Makes anything a person will read short, plain, and direct, without changing what it means. Applies to every genre, including the model's own chat replies. Works in rounds from the whole document down: first a picture of what this kind of document should look like for its reader, then the document (lead, what stays, order, shape in both directions), then paragraphs, then sentences, then words. Strips the habits that mark text as machine-written and keeps claim strength, conditions, owners, and numbers fixed while cutting. The rules are grounded in corpus studies of LLM prose, vendor style guidance, and the plain-language canon; `references/sources.md` maps each rule to its support.

Skill: `reader-first-writing` (proactive) | References: `revising`, `genre-contracts` (loaded on demand), `sources` (maintenance only)
