---
name: plan
description: Turn a bug report, a problem description or a feature idea into a spec of work items that /build-loop:build dispatches to workers. The planning seat. Use at the start of any new piece of work on a repository set up for the build loop (it has a .build-loop.json) that is not already an item in its backlog.
argument-hint: <the bug, problem or feature, in a sentence or a pasted report>
---

# Plan

You are planning, not building. The output is `<specs>/<slug>.md` (from the spec template), one
backlog line per work item under `## Planned work` in the backlog, and a landed branch holding both.
Workers at a cheaper model then build each item from the spec alone, so the spec must stand on its
own. An item already in the backlog needs no spec: `/build-loop:build` dispatches it as it is.

`<specs>`, `<backlog>`, the ID prefix and the models come from `.build-loop.json` at the top of the
repository; read it first. If it is missing, stop and say to run `/build-loop:setup`. The worker
protocol your items will be built under is `${CLAUDE_PLUGIN_ROOT}/references/worker-protocol.md`,
and the backlog's format is `${CLAUDE_PLUGIN_ROOT}/references/backlog-format.md`.

## 1. Seat and place

Planning runs on `models.plan` (Fable at high effort by default). Before reading anything else, set
this session to it with the app's session tools (`set_session_model`, `set_session_effort` from
`ccd_session_mgmt`); if the tools are not in this session, say which model you are on and go on.

Work in a worktree of your own (the worker protocol, step 1); the guard hook refuses commits
anywhere else. Run `build-loop board` and read the notes: someone may be in the files you are about
to plan around.

## 2. Understand before writing

- **Bug** (the product does something it should not): find the code path, name the check and what
  its failing line would say, and state the root cause. Usually one item of size S.
- **Problem** (a felt gap, a confusing screen, a complaint): read the modules involved and the
  checks that pin them, then decide what change answers it.
- **Feature**: the same reading, plus the fact question: anything the change depends on that the
  code does not settle. If the project's CLAUDE.md names a source of truth for its domain, settle
  facts there first, then with the owner.

Read the request as incomplete until the code says otherwise:

- "Simple", "just" and "easy" mark what was left out. Find the part being skipped over.
- Where two reasonable builds would both satisfy the words, that is a fork: name both, do not pick
  silently.
- A word that could mean two things ("the user", "the report", "sync") gets pinned to the module,
  function or table it means in this code.
- A change to what the product already does has a cost in what exists: stored data made before it,
  checks that pin the old behaviour, callers, work in flight. Say what happens to each.

## 3. Ask, as little as the item needs

Size the interview to the work: a one-line bug with a clear cause gets no questions; most items get
one or two; only a feature whose forks change what gets built gets the full three.

Settle what reading can settle. Where a fork that changes what gets built is left, ask the owner in
one `AskUserQuestion` call with at most three questions, each with a recommended option. Lead with
the one most likely to make a worker build the wrong thing. Do not interview beyond that: a fork you
settled yourself goes in the spec as the planner's choice, with the alternative rejected. A departure
from the project's source of truth is a fork for the owner, never the planner's choice.

When the answers come back, before writing anything, check them against each other, against what the
owner said earlier and against what the code already does. If two conflict ("only admins export"
and "every user can download the report"), stop and put the conflict to the owner instead of
widening the spec to hold both.

Record what you learned by kind, in the spec's Facts and assumptions section:

- what the owner or the code confirmed is a fact, with where it came from;
- what you are taking for granted that nobody confirmed is **assumed**, and stays so until the
  owner says otherwise;
- an "I don't mind" or "either is fine" is a decision, **owner: either**: it gives the worker the
  choice, so write it down rather than drop it.

## 4. Write the spec

Copy `<specs>/TEMPLATE.md` to `<specs>/<slug>.md` and fill every section. Work items:

- independent of one another wherever the code allows; a shared surface (a data shape, a module's
  API, a table's columns, a storage version, the test kit) is changed by one item that goes first;
- each small enough for one worker session: S (an hour or less, a few files), M or L (more); every
  size is built by a subagent, so split an L that one session could not finish;
- each names its files, acceptance bullets a check can verify, the checks with their fixed names that
  are its definition of done, and what it depends on. Write the acceptance as the product's
  behaviour, not as code.

Every question you leave open gets a line `- Q: <question> Default: <what the worker builds>`; the
default is the smaller reading.

Allocate IDs after the highest in the backlog and add one line per item under `## Planned work`
(make the section if it is not there):
`- [ ] **R-120 <title>** — <specs>/<slug>.md, item W1, size S.`
The worker ticks that line in its own branch; nobody else edits it.

Run `build-loop docs`; fix what it reports. For a spec of size L or with more than four items, run
`/critique --depth quick <specs>/<slug>.md` and fold in what it finds.

## 5. Hand it over

Show the owner the goal, the item list with sizes, and the decisions, assumptions and open questions,
in a short message. On their go: set the spec's status to approved, commit as `R-xxx..R-yyy: plan
<slug>`, land it (a spec needs no review pass: `build-loop land`, or a merged pull request with a
remote), post a board note naming the spec and the shared surfaces, then run
`/build-loop:build <specs>/<slug>.md`. If the owner changes the plan, change the spec first: workers
build what the spec says, never what the conversation said.
