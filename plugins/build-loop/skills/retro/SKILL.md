---
name: retro
description: Review how the build loop is working on this repository - read every instruction the owner typed since the last retro, find the ones that recur or that the process should have made unnecessary, and change CLAUDE.md, .build-loop.json, the project's checks or the plugin so they are not needed again. Run it every ten or so landed branches, or when the owner asks.
---

# Retro

The workflow is meant to be reviewed, not only followed. `build-loop retro` prints what the owner had
to say by hand to every session on this repository since the last retro, with a tally of the
instructions the process is meant to make unnecessary. `docs/STATUS.md` holds the flake register and
the blockers workers logged.

1. Run `build-loop retro` and read all of it. Read `docs/STATUS.md`.
2. Look for, and list with counts:
   - an instruction given in more than one session ("open a PR", "clean up", "run the gate");
   - a step the owner did by hand that a worker or a script could have done (landing, cleanup,
     pasting a review, moving work to a worktree, updating from the base branch);
   - a place a session asked a question the process should have answered, stalled, or was corrected;
   - a rule that had to be repeated in a hand-off prompt (it belongs in CLAUDE.md);
   - a flake seen more than once, or a check workers keep loosening.
3. For each, decide where the fix belongs, and prefer a mechanical fix (a hook, a check, a setting)
   over a sentence:
   - this project only: a rule in its CLAUDE.md, a setting in `.build-loop.json` (a heavy command, a
     protected path, a word list entry), a stage of its check command;
   - every project on the loop: the build-loop plugin itself (its worker protocol, a skill, a
     script). Say so; that change goes to the plugin's repository, not this one.
4. Report before changing anything: a table of the patterns with their counts and causes, the
   change you propose for each and where it goes, and the choices that are the owner's (a gate
   loosened, a stop removed, anything touching the main checkout) with the trade-off and your
   lean. Wait for the owner's answer. Then make the agreed changes in this repository in one branch
   titled `Workflow: <what changed>`, following the worker protocol.
5. Keep CLAUDE.md short: when you add a rule, look for one it makes redundant.
6. Run `build-loop retro --mark`.
