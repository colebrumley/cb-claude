# Backlog format

The backlog (`backlog` in `.build-loop.json`, `REQUIREMENTS.md` by default) is the whole product,
milestone by milestone, phase by phase. `build-loop docs` checks the parts of this format the loop
depends on; the rest is convention.

## Shape

```markdown
# <Project> — Requirements Backlog

<one paragraph: what this file is, where the loop protocol and the project's rules live>

Legend:
- `[ ]` not started, `[x]` done and verified, `[~]` in progress, `[!]` blocked (reason must follow)

## 0. Scope and non-negotiable constraints

Goals, constraints and the rules every item obeys. Every worker's prompt carries this section.

## Milestone M1 — <name>

Exit: <what is true when the milestone is done; the milestone review runs when its last item lands>

## Phase 1 — <name>

- [ ] **R-001 <title>**
  <acceptance bullets: what the product does, never how it is built>
  **Depends on:** nothing. | R-00x, R-00y.
  **Verify:** <the checks, with their fixed names, that are the definition of done>

## Planned work

- [ ] **R-120 <title>** — docs/specs/<slug>.md, item W1, size S.

## Appendix A — <name>

Tables of numbers items build from. An item that names an appendix gets it in its worker's prompt.
```

## Rules the docs check enforces

- An item heading is `- [<status>] **<ID> <title>**`, with `<ID>` as `<idPrefix>-<digits>`.
- Every ID appears once.
- Every item has an indented `**Depends on:**` line and an indented `**Verify:**` line with text
  after it. A planned-work line (one that points at a spec with ` — <specs>/<slug>.md`) has both in
  the spec instead, and the spec must exist.
- A `[!]` item gives its reason after the title or on the lines below.

## Conventions the skills follow

- Phases order the backlog; they do not gate it. An item is ready when it is `[ ]` and every item on
  its Depends-on line is `[x]` on the base branch.
- The worker ticks its own line in its own branch; nobody else edits it.
- Check names in Verify lines (`suite.name`) are fixed: the item's checks print them, so a Verify
  line can be checked against the log.
- New work from `/build-loop:plan` goes under `## Planned work`, IDs allocated after the highest in
  the file.
