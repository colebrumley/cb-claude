---
name: setup
description: Set a repository up for the build loop, or refresh its setup - writes .build-loop.json, the CLAUDE.md block, the spec template, the backlog and status files when missing, and lands them through a worktree. Run once per repository, and again after updating the plugin.
disable-model-invocation: true
argument-hint: [refresh]
---

# Setup

The loop's hooks do nothing in a repository until it has a `.build-loop.json` at its top level, so
this is what opts a repository in. Everything the loop needs from the project is in that file;
everything else ships with the plugin.

## 1. Read the project

From the main checkout: `git rev-parse --show-toplevel`, `git remote`, the default branch, the
existing CLAUDE.md, README, and whatever names the project's tests and checks (package.json scripts,
a Makefile, `scripts/`, CI workflows). Read `.build-loop.json` if it exists (a refresh): keep every
setting in it unless the owner changes it. The defaults are in `${CLAUDE_PLUGIN_ROOT}/lib/config.mjs`.

## 2. Settle the settings

Work out a proposal for each, from what you read:

- `check.command`: one command that runs the project's whole gate when given no argument and one
  stage when given a stage name, exiting 0 only on a pass. If the project has a single test command
  and no stages, propose a small `scripts/check.sh` that dispatches stages (lint, unit, and so on) to
  the commands it already has. `check.light`: the stages cheap enough to skip the queue.
  `check.heavy`: other commands (regular expressions) that start the expensive tools, so they run
  only in a worktree.
- `base`, `backlog`, `specs`, `idPrefix`, `worktrees`: the defaults unless the project already uses
  something else.
- `words`: a word list refused in commits, pushes and pull requests, for a project with a content
  rule. Off unless the owner wants one.
- `protect`: generated files nobody edits by hand (build output, lock files, caches), each with a
  reason that says what to do instead.
- `review`: `tool` codex if `codex --version` works, else none (the protocol uses `/critique`);
  `context`, one paragraph telling a reviewer what this repository is and where things live;
  `coderabbit` only if the repository has the app.
- `models`: the defaults (plan on Fable at high effort, build on Opus at medium) unless the owner
  says otherwise.

Ask the owner only what reading did not settle, in one `AskUserQuestion` call with at most three
questions, each with a recommended option: usually the check command and stages, and whether to keep
a word list.

## 3. Write it, in a worktree

Once `.build-loop.json` exists the guard refuses commits in the main checkout, so do the writing in a
worktree: `git worktree add <worktrees>/build-loop-setup -b build-loop-setup <base>`, then in it:

- `.build-loop.json` with only the settings that differ from the defaults, plus `review.context`.
- `CLAUDE.md`: the block in `${CLAUDE_PLUGIN_ROOT}/references/claude-md-block.md` with `<backlog>`,
  `<specs>`, `<worktrees>` and `<base>` filled in, between its `<!-- build-loop -->` markers. Replace
  the block if the markers are there; otherwise add it near the top. Leave the rest of the file as it
  is, but point out any rule in it that the block now contradicts.
- `<specs>/TEMPLATE.md`: a copy of `${CLAUDE_PLUGIN_ROOT}/references/spec-template.md` (replace it on
  a refresh).
- The backlog, only if it does not exist: the shape in
  `${CLAUDE_PLUGIN_ROOT}/references/backlog-format.md`, with the scope section filled from the README
  and an empty `## Planned work`.
- `docs/STATUS.md`, only if it does not exist: a heading, an empty flake register table (date,
  check, what happened, fixed by) and an empty milestones table (milestone, date, checks, tag).
- `.gitignore`: add `<worktrees>/` if it is not ignored.
- The check script, if step 2 proposed one.

Then `build-loop check docs` and `build-loop check`; fix what fails. Commit as `Set up the build
loop`, and land it: with a remote, push and open a pull request for the owner; without one,
`build-loop land`, then `build-loop tidy`.

## 4. Report

What was written, the settings chosen and why, the check command's stages, and the next step: put
the work in the backlog (or describe it to `/build-loop:plan`), then `/build-loop:build`. Note that
CI does not have the plugin: if the project's CI should also check the backlog's shape, it has to
run the project's own check command, which knows nothing of `build-loop docs`.
