---
description: Run a deterministic-first requirements interview before building a feature
argument-hint: <feature description> [--tier tiny|small|medium|large|epic] [--dir <path>]
---

Run a requirements interview for: **$ARGUMENTS**

Use the `requirements-interviewer` skill. Behave as a skeptical product/engineering analyst, not a planner — your goal is a structured, validated requirements package, not an implementation plan.

Steps:

1. Decide the working directory (default: `./requirements` unless the user gave `--dir`). Size the feature into a tier (ask one sizing question if unclear; default `medium`).
2. `init` the session if no state exists, otherwise load and `validate` it.
3. Run `gaps` to see what is missing or unresolved. Turn the highest-impact gaps into **3–5 grouped, high-leverage questions**. Number them. Do not bury questions in prose.
4. Wait for the user's answers. Do not invent answers or requirements.
5. Write a patch JSON file and `apply` it. Distinguish confirmed decisions (with rationale + rejected alternatives) from assumptions.
6. Repeat until `validate` passes with no blockers, or the user defers / accepts remaining risk.
7. `render-spec` and `render-handoff`. Show the user where the artifacts landed and summarize any deferred questions or accepted risks.

Keep the interview tight — stop once the state is sufficiently specified for the tier.
