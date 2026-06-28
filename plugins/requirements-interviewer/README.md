# requirements-interviewer

A **deterministic-first requirements interviewer** for AI-assisted development. A skeptical analyst (the LLM) clarifies a feature *before* implementation; a dependency-free TypeScript CLI (the deterministic tooling) validates, persists, and renders the result. The output is a compact requirements package that downstream planner/builder agents cannot easily lose or reinterpret — even after context compaction.

## The problem it solves

LLM coding agents fail most expensively *before* they write any code: they build the wrong thing because the requirements were vague, the scope was never bounded, an assumption was silently wrong, or a decision got lost in a long chat. Planning frameworks help organize *how* to build — but they inherit the requirements as freeform prose, which drifts, gets re-summarized, and quietly mutates.

This harness puts the requirements in **structured state** and makes a deterministic validator the gatekeeper. The LLM does what it's good at (asking sharp questions, interpreting answers, naming risks). Deterministic code does what it's good at (enforcing completeness, normalizing shape, refusing an under-specified handoff).

## How it differs from planning harnesses (Superpowers, Spec Kit, GSD)

| | Planning harnesses | requirements-interviewer |
| --- | --- | --- |
| Primary output | An implementation plan / spec document | A **structured requirements state** (the spec is rendered *from* it) |
| Source of truth | Prose the LLM writes | JSON validated by deterministic rules |
| Completeness | Convention / reviewer judgment | **Enforced** — handoff is refused while required fields are missing |
| Scope of LLM | Plans *how* to build | Clarifies *what* to build; **does not plan the implementation** |
| Drift after compaction | Prose gets re-summarized and shifts | State persists; renders are deterministic and diffable |
| Decisions / rejected options | Often implicit in prose | First-class decision log with rationale + recorded alternatives |

It is **upstream** of those tools, not a replacement. Run the interview, then hand the package to your planner/builder of choice.

## Why the source of truth is structured state

Prose is lossy and mutable; structured state is checkable. Because the state is data:

- the **validator** can prove an acceptance criterion maps to a goal, that a confirmed decision has a rationale, that no blocking question is unanswered;
- the **renderer** produces a stable, diffable document instead of a freshly-improvised one each time;
- a builder agent that re-reads the handoff after compaction gets the *same* requirements, with an explicit contract that they may not be reinterpreted without updating the state.

## Architecture

```
  Human  ⇄  Interviewer (LLM, the skill)        ← judgment: which questions, how to interpret
                     │  proposes structured patches
                     ▼
        ┌──────────────────────────────────────┐
        │  Deterministic CLI (lib/, zero deps)  │   ← process integrity
        │  state store · validator · renderers  │
        └──────────────────────────────────────┘
                     │
   requirements.json + decision-log.json  ──►  spec.md      (human spec)
            (source of truth)             ──►  handoff.md   (builder package)
```

- **Interviewer** (`skills/requirements-interviewer`, `commands/requirements.md`) — the LLM. Asks 3–5 high-leverage questions, never freewrites artifacts.
- **State store** (`lib/src/state.ts`) — load/save across two files, deterministic patch apply, id/sequence/timestamp normalization.
- **Validator** (`lib/src/validate-requirements.ts`) — structural schema check + tier-driven completeness/integrity rules.
- **Gap analysis** (`lib/src/gaps.ts`) — computes *what is missing* (the boundary: facts for the LLM, which turns them into questions).
- **Renderers** (`lib/src/render-spec.ts`, `lib/src/render-handoff.ts`) — markdown from data; the handoff refuses to render from invalid/unready state.

## Install / run the CLI

No build step. Node 18+ and `tsx` (pulled on demand by `npx`).

```bash
cd plugins/requirements-interviewer/lib
npm install            # only needed for typecheck/test; the CLI itself has zero runtime deps

# or just run it from anywhere:
npx --yes tsx plugins/requirements-interviewer/lib/src/cli.ts --help
```

As a Claude Code plugin, run `/requirements <feature description>` and the interviewer drives the CLI for you.

### Commands

```
init <feature> --tier <tier>     create requirements.json + decision-log.json
validate                         structural + completeness validation (exit 1 if invalid)
gaps [--json]                    deterministic gap report (feeds the interviewer's questions)
blockers                         unresolved items blocking handoff (exit 1 if any)
apply <patch.json>               apply a structured update, then re-validate
decisions                        show the decision log
defer <questionId>               mark a blocking question deferred
accept-risk <questionId>         mark a question accepted as risk
render-spec [--out f]            render the human requirements spec
render-handoff [--out f] [--force]   render the builder handoff (refused unless ready)
```

Common flag: `--dir <path>` (default: cwd) — where the state files live.

## Complexity tiers control rigor

| Tier | Requires |
| --- | --- |
| `tiny` | feature name (+ problem). No interview required. |
| `small` | goals, non-goals, acceptance criteria, obvious risks. |
| `medium` | + actors, workflows, constraints, functional requirements, decisions, open questions. |
| `large` | full interview + ≥1 risk review + operational sections addressed. |
| `epic` | large + phased rollout, observability, operational readiness, dependency mapping. |

Pick the smallest tier that fits. The validator only enforces what the tier demands, so a small feature never triggers a large-feature interview.

## Validation rules (enforced deterministically)

- Every acceptance criterion must map to an existing goal **or** requirement.
- Every **confirmed** decision must have a rationale.
- Every blocking open question must be answered, deferred, or accepted-as-risk before handoff.
- Every assumption must be confirmed, rejected, or accepted-as-risk (a still-`proposed` assumption blocks handoff).
- Non-goals and out-of-scope items are preserved into the handoff's **Do NOT build** section.
- `large`/`epic` require at least one recorded risk review.
- Security / observability / operational sections may be empty **only** if explicitly marked `applicable: false` with a reason.
- `epic` requires rollout phases (or an explicit not-applicable reason).
- **No handoff is rendered if the schema is invalid** — the renderer refuses.

`errors` block validity; `blockers` (unanswered blocking questions, unresolved assumptions) block the *handoff* specifically. `render-handoff --force` emits a handoff stamped as risk-flagged, for when the user knowingly proceeds.

## Example walkthrough

A complete run of the example feature is committed under [`lib/fixtures/`](lib/fixtures): the final [`requirements.json`](lib/fixtures/requirements.json), [`decision-log.json`](lib/fixtures/decision-log.json), [`spec.md`](lib/fixtures/spec.md), [`handoff.md`](lib/fixtures/handoff.md), and an apply patch [`patch.example.json`](lib/fixtures/patch.example.json). `npm test` regenerates them via the same deterministic flow.

**1. Vague initial request**

> "Add CSV export to the reports page."

**2. Interviewer questions** (derived from the `gaps` report, grouped, high-leverage)

1. What exactly should the CSV contain — the rows *as currently filtered and sorted on screen*, or the full underlying dataset?
2. How large can a report get? Is there a row ceiling we should enforce, and what should happen past it?
3. Encoding/delimiter — UTF-8 + comma, or locale-aware? (Wrong encoding corrupts non-ASCII data.)
4. Anything explicitly **out of scope** for v1 — xlsx, scheduled/emailed exports?

**3. User answers** (paraphrased)

> Current filtered/sorted view. Cap at 100k rows, warn beyond. UTF-8 with BOM + comma is fine. No xlsx, no scheduled exports.

**4. Structured requirements state** — the interviewer writes a patch and runs `apply`; the CLI assigns ids, decision sequence numbers, and timestamps, then persists to `requirements.json` + `decision-log.json`. (One blocking question — encoding — was confirmed and recorded as decision `dec-2`.)

**5. Validation output**

```
$ req validate
valid: true  handoffReady: true  (tier: medium)
```

(Mid-interview, before the encoding question was resolved, this read `handoffReady: false` with a `question.blocking` blocker, and `render-handoff` refused.)

**6. Rendered spec** — `req render-spec` produces [`spec.md`](lib/fixtures/spec.md): problem, goals, non-goals, actors, confirmed decisions, requirements, workflows, an acceptance-criteria table, constraints, risks, assumptions.

**7. Builder handoff** — `req render-handoff` produces [`handoff.md`](lib/fixtures/handoff.md): a **Do build** / **Do NOT build** split, required behavior, the acceptance-criteria definition-of-done, relevant decisions *with their rejected alternatives*, known risks and assumptions, agent boundaries, and the contract clause: **builders must not reinterpret requirements without updating the requirements state.**

## Using the handoff with builder agents

Point your planner/builder at `handoff.md` (with `requirements.json` + `decision-log.json` as the authoritative backing). Instruct the agent:

> Implement only what is in *Do build* / *Required behavior*. Treat acceptance criteria as the definition of done. Honor confirmed decisions; do not revive rejected alternatives. If anything is ambiguous or contradictory, **stop and request a requirements-state update** — do not guess.

Because the handoff is rendered from validated state, re-reading it after a compaction yields the same requirements rather than a drifted summary.

## What the MVP does *not* attempt

- It is **not** a planner or architect — it clarifies *what*, never *how*.
- No database, server, or web UI — local JSON files only.
- No automated test generation, code generation, or estimation.
- No multi-user/locking/merge semantics — single working copy per feature.
- The dependency-free validator mirrors `requirements.schema.json` for structural checks; for full JSON-Schema validation point any external validator (`ajv`, `check-jsonschema`) at that file.
- It does not stop a determined user from forcing a risk-flagged handoff — it makes the risk explicit, not impossible.

## Development

```bash
cd lib
npm install
npm test          # full deterministic-loop test (17 invariants)
npm run typecheck  # tsc --noEmit
npx tsx test/run.ts --write   # regenerate fixtures
```
