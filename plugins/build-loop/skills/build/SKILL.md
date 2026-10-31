---
name: build
description: Dispatch the ready items of a backlog phase or milestone, or of a spec, to workers, each an in-process subagent in its own worktree; dispatch newly unblocked items as their dependencies land; run the milestone review and tidy up at the end. Use for any building on a repository set up for the build loop (it has a .build-loop.json).
argument-hint: <Phase N | Milestone <name> | docs/specs/slug.md> [only these items: R-xxx R-yyy]
---

# Build

Read `.build-loop.json` at the top of the repository (the backlog, the specs folder, `models.build`);
if it is missing, stop and say to run `/build-loop:setup`. Read the target once: the phase or
milestone in the backlog (its items, the scope section and the appendices they name), or the spec.
Run `build-loop board`: an item another worktree has claimed is not yours to dispatch.

An item is **ready** when it is `[ ]` and every item on its Depends-on line is `[x]` on the base
branch; nothing else gates it. Phases order the backlog, they do not gate it: an item in a later
phase whose dependencies have landed is dispatched beside the earlier phase's items, so the work runs
as wide as the dependency graph allows. A milestone's exit still needs every item of its phases.
Re-check `[!]` items whose stated blocker is resolved. Testing is metered by the check queue, so
dispatch as many workers as are ready: they build at once and wait their turn to test.

## Dispatch each item that is ready

Every worker gets the same prompt. The process is the worker protocol, which the worker reads from
the plugin, so nothing else is pasted in:

```
Repo: <name> (this repository). Read ${CLAUDE_PLUGIN_ROOT}/references/worker-protocol.md and follow
it exactly: it is the whole process, including the self-review and the landing after it. The
project's CLAUDE.md holds its own rules; they bind every step.

Item: R-xxx <title>. Build only this item.

<the item's entry, verbatim: acceptance, Depends on, Verify>
<the backlog's scope section, verbatim>
<the appendices the item names, verbatim>
<for a spec: the item's section plus the spec's "Facts and assumptions", "Shared surfaces" and "Open questions and decisions", verbatim>
```

Every item, whatever its size, goes to the `Agent` tool: `subagent_type: general-purpose`, the
model and effort of `models.build` (Opus at medium by default), `isolation: worktree`,
`run_in_background: true`, the prompt above. Launch every ready item in the same message so they run
at once. Two workers never share a file: when two ready items name the same file (a spec's Files
line, or the board's claims), dispatch the lower-numbered one first and the other when it lands.
Backlog items name no files, so two of them may meet in a file; the second to land merges the base
branch before its gate run and resolves it.

## While they run

When a subagent reports, read its last paragraph: the branch or pull request, whether it landed, and
anything left open. If it landed, dispatch the items that were waiting on it. If it left findings or
a question, relay them to the owner in one or two sentences and move on; do not fix a worker's
branch yourself.

## When everything is in

Run `build-loop tidy`. If the target was a milestone and its last item landed, run the milestone
review in the worker protocol (the review against the last tag, fixes, re-review, the gate, the
STATUS.md row, the tag). Report in one paragraph: each item with its branch and whether it landed,
the items still open and why, and anything a worker found that the backlog did not foresee. If the
target was a spec and it is fully built, change its status line to `built` in a last small change.
