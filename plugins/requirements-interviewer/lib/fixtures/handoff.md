# Builder Handoff: CSV export for reports
> Tier: **medium** · Source of truth: `requirements.json` + `decision-log.json`.

**Contract:** Builders MUST NOT reinterpret, expand, or narrow these requirements. If reality contradicts them, STOP and update the requirements state (re-run the interviewer) before writing code. This document is downstream of structured state, not a license to improvise.

## Do build
- [fr-1] Provide an 'Export CSV' action on every report table.
- [fr-2] CSV reflects active filters and sort order.
- [fr-3] Cap export at 100k rows; warn beyond that.
- Goal: Let analysts export any report table to CSV in one click.
- Goal: Exported CSV matches what is shown on screen (same filters/sort).

## Do NOT build
- Excel/.xlsx export.
- Scheduled or emailed exports.

## Required behavior
- [fr-1] (must) Provide an 'Export CSV' action on every report table.
- [fr-2] (must) CSV reflects active filters and sort order.
- [fr-3] (should) Cap export at 100k rows; warn beyond that.

Non-functional:
- [nfr-1] Export of 100k rows completes within 30s.

## Acceptance criteria (definition of done)
| ID | Criterion | Verifies | Priority | Testability |
| --- | --- | --- | --- | --- |
| ac-1 | Clicking Export CSV downloads a file reflecting current filters. | fr-2 | must | testable |
| ac-2 | Exporting 100k rows finishes under 30s. | nfr-1 | must | testable |
| ac-3 | Beyond 100k rows the user sees a clear warning. | fr-3 | should | testable |

## Relevant decisions
- **[dec-1]** Stream the export server-side rather than building it in-browser.
  - Why: In-browser export can't handle 100k rows within memory/time limits.
  - Rejected/alternatives: Client-side CSV generation from loaded data
- **[dec-2]** Use UTF-8 with BOM and comma delimiter.
  - Why: Opens cleanly in Excel for the analyst's locale; matches existing report encoding.
  - Rejected/alternatives: Locale-aware delimiter detection

## Known risks
- Large exports could exhaust memory. — medium/high, mitigated; mitigation: Stream rows; enforce 100k cap.

## Known assumptions
- Reports already expose a server-side query we can stream. _(confirmed)_

## Deferred / accepted-risk questions
- _(none)_

## Boundaries for planner/builder agents
- Implement only what is in *Do build* and *Required behavior*.
- Anything in *Do NOT build* is out of scope — do not add it even if it seems helpful.
- Treat acceptance criteria as the definition of done; do not mark complete until each is satisfiable.
- Honor confirmed decisions exactly; do not revisit rejected alternatives without updating the decision log.

---
_If you find a requirement ambiguous or contradictory, do not guess. Halt and request a requirements-state update._
