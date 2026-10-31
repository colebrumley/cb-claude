<!-- build-loop -->
## How work gets done here

This repository is built by the build loop (the `build-loop` plugin). The backlog in
`<backlog>` is the product; `/build-loop:plan` turns new work into a spec under `<specs>/`,
`/build-loop:build` dispatches one worker per ready item, each in its own worktree and pull request,
and every worker follows the worker protocol that the plugin ships. Settings are in
`.build-loop.json`.

Many sessions work on this repository at the same time. Two rules are mandatory for every change:

1. **All code changes happen in a git worktree of your own** under `<worktrees>/`. If your
   working directory is there, that one is yours. If it is the main checkout, make one before you
   touch a file: `git worktree add <worktrees>/<short-name> -b <short-name> <base>`. A hook refuses
   commits, branch switches and checks in the main checkout. Uncommitted changes in the main
   checkout are someone else's: leave them exactly as they are.
2. **The board is how sessions tell each other things**: `build-loop board` shows who is doing
   what; `build-loop board claim <ID> "what"` before building, `build-loop board note "..."` when you
   change something others build on, `build-loop board release <ID>` when done.

The gate is `build-loop check` (one stage while working: `build-loop check <stage>`). A bug or small
change typed straight into a session is one item with no spec: follow the worker protocol to its
end, landing included, without waiting to be told.
<!-- /build-loop -->
