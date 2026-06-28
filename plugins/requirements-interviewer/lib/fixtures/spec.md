# Requirements: CSV export for reports
> Tier: **medium** · Generated from `requirements.json` — do not edit by hand.

## Problem
Analysts manually copy report tables into spreadsheets; this is slow and error-prone. They need a one-click CSV export.

## Goals
- (g-1) Let analysts export any report table to CSV in one click.
- (g-2) Exported CSV matches what is shown on screen (same filters/sort).

## Non-goals
- (ng-1) Excel/.xlsx export.
- (ng-2) Scheduled or emailed exports.

## Actors
- **Analyst** — Internal user viewing reports.

## Confirmed decisions
- **[dec-1]** Stream the export server-side rather than building it in-browser.
  - Rationale: In-browser export can't handle 100k rows within memory/time limits.
  - Source: interviewer, confidence: high
  - Alternatives: Client-side CSV generation from loaded data
- **[dec-2]** Use UTF-8 with BOM and comma delimiter.
  - Rationale: Opens cleanly in Excel for the analyst's locale; matches existing report encoding.
  - Source: user, confidence: high
  - Alternatives: Locale-aware delimiter detection

## Requirements
### Functional
- **[fr-1]** (must) Provide an 'Export CSV' action on every report table.
- **[fr-2]** (must) CSV reflects active filters and sort order.
- **[fr-3]** (should) Cap export at 100k rows; warn beyond that. — _Keeps export within the 30s timeout._

### Non-functional
- **[nfr-1]** (must) Export of 100k rows completes within 30s.

## User workflows
**Export current report** _(actor: act-1)_
1. Analyst opens a report and applies filters/sort.
2. Analyst clicks 'Export CSV'.
3. Browser downloads a CSV reflecting the current view.

## Acceptance criteria
| ID | Criterion | Verifies | Priority | Testability |
| --- | --- | --- | --- | --- |
| ac-1 | Clicking Export CSV downloads a file reflecting current filters. | fr-2 | must | testable |
| ac-2 | Exporting 100k rows finishes under 30s. | nfr-1 | must | testable |
| ac-3 | Beyond 100k rows the user sees a clear warning. | fr-3 | should | testable |

## Constraints
- Must run within existing request timeout (30s). _(technical)_

## Risks
| Risk | Likelihood | Impact | Status | Mitigation |
| --- | --- | --- | --- | --- |
| Large exports could exhaust memory. | medium | high | mitigated | Stream rows; enforce 100k cap. |

## Assumptions
- Reports already expose a server-side query we can stream. _(confirmed)_

## Handoff notes
_None._
