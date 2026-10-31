# cb-claude

A small suite of Claude Code plugins by Cole.

## Install

Add the marketplace, then install individual plugins:

```
/plugin marketplace add colebrumley/cb-claude
```

Install all plugins:

```
/plugin install critique anti-sycophancy build-loop reader-first-writing garnish
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

### build-loop

A plan-build-land loop for many Claude Code sessions working on one repository at once. `/build-loop:plan` turns a bug, problem or feature into a spec of small work items, asking the owner only the forks that change what gets built. `/build-loop:build` dispatches one worker subagent per ready item, each in its own worktree and pull request, following a fixed worker protocol: build, verify, self-review, land. A board in the shared git directory carries claims and notes between sessions, a check queue meters how many test at once, hooks keep code changes out of the main checkout, and `/build-loop:retro` reads what the owner still had to type and changes the process so they need not. Opt in per repository with `/build-loop:setup`; the hooks do nothing elsewhere.

```
/build-loop:setup
/build-loop:plan Add CSV export to the reports page
/build-loop:build docs/specs/csv-export.md
build-loop board          # who is doing what
build-loop check unit     # one stage of the gate, queued
```

Skills: `setup`, `plan`, `build`, `bughunt`, `retro` | CLI: `build-loop` (`board`, `check`, `queue`, `land`, `tidy`, `review`, `retro`, `docs`, `words`, `judge`) | Hooks: board on session start, worktree and word-list guard on Bash, protected paths on edits

### reader-first-writing

Makes anything a person will read short, plain, and direct, without changing what it means. Applies to every genre, including the model's own chat replies. Works in rounds from the whole document down: first a picture of what this kind of document should look like for its reader, then the document (lead, what stays, order, shape in both directions), then paragraphs, then sentences, then words. Strips the habits that mark text as machine-written and keeps claim strength, conditions, owners, and numbers fixed while cutting. The rules are grounded in corpus studies of LLM prose, vendor style guidance, and the plain-language canon; `references/sources.md` maps each rule to its support.

Skill: `reader-first-writing` (proactive) | References: `revising`, `genre-contracts` (loaded on demand), `sources` (maintenance only)

### garnish

Puts a little whimsy back into projects that LLM-flattened writing has made dry. It's an LLM trying to be funny, so it sucks and does it badly. That's why it only suggests. Finds the project's conceit (or proposes two or three that fit what the project does), then suggests a few harmless spots to have fun with it: names, help text, empty states, changelog headers. Nothing changes until you pick. Accepted and rejected ideas go into a `LORE.md` at the repo root so the in-jokes stay consistent across sessions.

```
/garnish
/garnish README.md
```

Skill: `garnish` (on request only)
