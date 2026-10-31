---
name: bughunt
description: Find real bugs in an area of a repository set up for the build loop, each with a concrete reproduction, write them up as a spec of size-S items, and dispatch the fixes with /build-loop:build. Use when the owner asks for a bug hunt or a sweep of an area.
argument-hint: [area, such as src/billing/ or "the export screen"]
---

# Bug hunt

Run on `models.build` from `.build-loop.json` (Opus at medium by default).

1. Pick the area: the one given, or the module least recently touched by a bug fix
   (`git log --format=%s -- <dir> | grep -c Fix` per file is a fair guide). Read it with its
   callers, the docs that describe what it should do, and its checks.
2. Hunt for what is reachable and wrong: a step that leaves state no rule allows, a sequence of
   inputs that puts two views of the same state out of step, a place the code and its docs
   disagree, state left behind when an operation ends or fails, a check that passes for the wrong
   reason. `/critique --depth quick <file>` is a good opening move. Confirm each bug with a failing
   check or a written-out sequence of inputs; a suspicion is not a finding.
3. Write `<specs>/bugs-<area>-<date>.md` from the template: one size-S item per confirmed bug, each
   with the reproduction as the check to write, the root cause, and the smallest fix. Add the backlog
   lines, run `build-loop docs`, commit, land the spec, post a board note.
4. Run `/build-loop:build` on it. Report the bugs found, the ones fixed and landed, and any left open.
