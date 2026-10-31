# <Title>: spec for R-xxx to R-yyy

Written by `/build-loop:plan` on <date>. Status: proposed | approved | built.

**The request, in the owner's words:** one paragraph. What is wrong, or what is wanted, and why.

## Goal

One or two sentences a worker can hold in mind. What the product does when this is done.

## Non-goals

What this deliberately does not do, so that no worker widens it.

## Facts and assumptions

Every fact this touches that the code does not already settle, one line each: what the product will
do, and where the fact came from (the owner, a source the project's CLAUDE.md names, the code). An
assumption the owner has not confirmed is marked **assumed**; one the owner said they do not mind
either way is marked **owner: either**. Delete this section when there are none.

## Shared surfaces

A data shape, a module's API, a table's columns, a storage version, the test kit, a theme: anything
more than one item touches. Say which item changes each, and that it goes first. "None" when none.

## Work items

Independent where possible; each small enough for one worker session. Size S is an hour's work or
less in a few files; M and L are more. Every size is built by a subagent. An item names the files it
will touch, acceptance bullets a check can verify (what the product does, not how), the checks that
prove it (the definition of done, with their fixed names), and what it depends on.

### W1 — <title> (R-xxx, size S, depends on: nothing)

Files: `src/foo.ts`, `test/foo.test.ts` (suite `foo`)

Acceptance:
- ...

Verify: `build-loop check unit` passes with `foo.<name>`; `build-loop check`.

### W2 — <title> (R-yyy, size M, depends on: W1)

...

## Open questions and decisions

Decisions the owner made during planning, and the planner's own choices, each with the alternative
rejected. Questions left open, one line each as `- Q: <question> Default: <what a worker builds>`
(the default is the smaller reading; the worker says so in the pull request).
