# build-loop

A plan-build-land loop for many Claude Code sessions working on one repository at once. It came out
of a game built this way, item by item, by parallel workers; this is the process with the game taken
out.

```
/plugin install build-loop --marketplace colebrumley/cb-claude
```

Then, in each repository that should use it, `/build-loop:setup`.

## The flow

| Step | Who | Does |
|---|---|---|
| Set up | `/build-loop:setup` | writes `.build-loop.json`, the CLAUDE.md block, the spec template, the backlog and status files; lands them |
| Plan | `/build-loop:plan` (Fable, high effort) | reads the code, asks the owner the forks that matter (three at most), writes a spec and one backlog line per item, lands it |
| Build | `/build-loop:build` | one worker per ready item, as a subagent (Opus, medium effort) in its own worktree |
| Work | the worker | [the worker protocol](references/worker-protocol.md): build, verify, self-review, land, report |
| Milestone review | `/build-loop:build` | Codex (or `/critique`) reads the whole milestone as an adversary; fixes; tag |
| Bug hunt | `/build-loop:bughunt` | confirmed bugs with reproductions, as a spec of size-S items |
| Retro | `/build-loop:retro` | what the owner still had to type, and what to change so they need not |

## The machinery

`bin/build-loop` is on the Bash tool's PATH while the plugin is enabled:

```
build-loop board [claim <id> "what" | release <id> | note "words" | log [n]]
build-loop check [stage]       docs, words, then the project's gate; project stages wait for a slot
build-loop queue [status | slots <n>]
build-loop land [--dry-run]    fast-forward the base branch to this worktree's (no remote)
build-loop tidy [--dry-run]    remove merged worktrees, branches and lapsed claims
build-loop review [--base <ref>] [--full]
build-loop retro [--all | --mark]
build-loop docs | words | judge <log>
```

The board, the queue and review reports live in the repository's shared git directory, so every
worktree sees them and nothing is committed. The hooks (`hooks/hooks.json`) print the board when a
session starts, refuse tree changes and checks in the main checkout, refuse public text that matches
the word list, and refuse edits to protected paths. **They do nothing in a repository without
`.build-loop.json`.**

## Settings

`.build-loop.json` at the repository's top level, merged over the defaults in
[`lib/config.mjs`](lib/config.mjs):

| Key | Default | What |
|---|---|---|
| `base` | `main` | the branch work lands on |
| `worktrees` | `.claude/worktrees` | where each session's worktree lives |
| `backlog` / `specs` | `REQUIREMENTS.md` / `docs/specs` | the backlog ([format](references/backlog-format.md)) and the spec folder |
| `idPrefix` | `R` | item IDs are `R-104` |
| `requiredDocs` | `[]` | files the docs stage requires |
| `check.command` | `scripts/check.sh` | the gate; given a stage name, runs only that stage |
| `check.light` / `check.heavy` | `[]` | stages that skip the queue / more commands that run only in a worktree |
| `words` | `{ file: null, exempt: [] }` | a word list refused in commits, pushes and pull requests |
| `protect` | `[]` | `{ pattern, reason }` paths nobody edits by hand |
| `review` | codex, no CodeRabbit | the milestone reviewer, what it is told about the repository, what else it looks for |
| `models` | plan Fable/high, build Opus/medium | the planning and building seats |

## Limits

- CI does not have the plugin. `build-loop docs` and `build-loop words` run only where the plugin is
  installed; a project that wants them in CI has to call them some other way.
- Landing without a remote fast-forwards the main checkout's base branch, and only when that
  checkout is clean on that branch.

## Tests

```
node --test 'plugins/build-loop/test/*.test.mjs'
```
