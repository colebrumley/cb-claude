/**
 * Self-contained test + fixture generator.
 *
 * Exercises the full deterministic loop on the example feature and asserts the
 * key invariants. Run with `npm test` (tsx test/run.ts). Pass `--write` to
 * (re)generate the committed fixtures from this same flow.
 */

import { strict as assert } from "node:assert";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { newState, applyPatch } from "../src/state.js";
import { validateRequirements } from "../src/validate-requirements.js";
import { analyzeGaps } from "../src/gaps.js";
import { renderSpec } from "../src/render-spec.js";
import { renderHandoff } from "../src/render-handoff.js";

const WRITE = process.argv.includes("--write");
const FIXTURES = join(import.meta.dirname, "..", "fixtures");

let passed = 0;
function check(name: string, cond: boolean) {
  assert.ok(cond, name);
  passed++;
}

// 1. New medium feature: "Add CSV export to the reports page" (initially vague).
let state = newState("CSV export for reports", "medium");

// Empty medium state must be invalid (missing required collections).
let report = validateRequirements(state);
check("empty medium state is invalid", !report.valid);
check("empty medium state is not handoff-ready", !report.handoffReady);

// Gap report should flag the missing required collections as high impact.
const gaps0 = analyzeGaps(state);
check("gap report flags high-impact gaps", gaps0.gaps.some((g) => g.impact === "high"));

// 2. Apply the structured update that the interviewer would propose after Q&A.
state = applyPatch(state, {
  set: {
    problemStatement:
      "Analysts manually copy report tables into spreadsheets; this is slow and error-prone. They need a one-click CSV export.",
  },
  upsert: {
    goals: [
      { id: "g-1", text: "Let analysts export any report table to CSV in one click." },
      { id: "g-2", text: "Exported CSV matches what is shown on screen (same filters/sort)." },
    ],
    nonGoals: [
      { id: "ng-1", text: "Excel/.xlsx export." },
      { id: "ng-2", text: "Scheduled or emailed exports." },
    ],
    actors: [{ id: "act-1", name: "Analyst", description: "Internal user viewing reports." }],
    userJourneys: [
      {
        id: "uj-1",
        name: "Export current report",
        actor: "act-1",
        steps: [
          "Analyst opens a report and applies filters/sort.",
          "Analyst clicks 'Export CSV'.",
          "Browser downloads a CSV reflecting the current view.",
        ],
      },
    ],
    constraints: [
      { id: "con-1", text: "Must run within existing request timeout (30s).", kind: "technical" },
    ],
    functionalRequirements: [
      { id: "fr-1", text: "Provide an 'Export CSV' action on every report table.", priority: "must" },
      { id: "fr-2", text: "CSV reflects active filters and sort order.", priority: "must" },
      { id: "fr-3", text: "Cap export at 100k rows; warn beyond that.", priority: "should", rationale: "Keeps export within the 30s timeout." },
    ],
    nonFunctionalRequirements: [
      { id: "nfr-1", text: "Export of 100k rows completes within 30s.", priority: "must" },
    ],
    risks: [
      { id: "risk-1", text: "Large exports could exhaust memory.", likelihood: "medium", impact: "high", mitigation: "Stream rows; enforce 100k cap.", status: "mitigated" },
    ],
    acceptanceCriteria: [
      { id: "ac-1", criterion: "Clicking Export CSV downloads a file reflecting current filters.", linkedRequirement: "fr-2", testability: "testable", priority: "must" },
      { id: "ac-2", criterion: "Exporting 100k rows finishes under 30s.", linkedRequirement: "nfr-1", testability: "testable", priority: "must" },
      { id: "ac-3", criterion: "Beyond 100k rows the user sees a clear warning.", linkedRequirement: "fr-3", testability: "testable", priority: "should" },
    ],
    assumptions: [
      { id: "asm-1", text: "Reports already expose a server-side query we can stream.", status: "confirmed", rationale: "Confirmed with backend team." },
    ],
    openQuestions: [
      { id: "q-1", question: "What encoding/delimiter — UTF-8 + comma, or locale-aware?", category: "format", whyItMatters: "Wrong encoding corrupts non-ASCII data for some users.", blocking: "blocking", possibleDefault: "UTF-8 with BOM, comma", status: "open" },
    ],
    decisions: [
      { id: "dec-1", decision: "Stream the export server-side rather than building it in-browser.", status: "confirmed", rationale: "In-browser export can't handle 100k rows within memory/time limits.", alternatives: ["Client-side CSV generation from loaded data"], source: "interviewer", confidence: "high", relatedRequirements: ["fr-1", "nfr-1"] },
    ],
  },
  riskReviews: [{ reviewer: "user", summary: "Reviewed memory/timeout risks; mitigations accepted." }],
});

// 3. Still blocked: one blocking open question is unanswered.
report = validateRequirements(state);
check("medium state with content is schema-valid", report.valid);
check("blocking question keeps it from handoff", !report.handoffReady);
check("blocker is reported", report.blockers.some((b) => b.code === "question.blocking"));

// 4. Resolve the blocker by answering it as a decision + marking the question answered.
state = applyPatch(state, {
  upsert: {
    openQuestions: [{ id: "q-1", status: "answered", linked: "dec-2" }],
    decisions: [
      { id: "dec-2", decision: "Use UTF-8 with BOM and comma delimiter.", status: "confirmed", rationale: "Opens cleanly in Excel for the analyst's locale; matches existing report encoding.", alternatives: ["Locale-aware delimiter detection"], source: "user", confidence: "high", relatedRequirements: ["fr-2"] },
    ],
  },
});

report = validateRequirements(state);
check("state is valid after resolving blocker", report.valid);
check("state is handoff-ready after resolving blocker", report.handoffReady);

// 5. Decision sequencing is deterministic and monotonic.
check("decisions got sequential numbers", state.decisions.map((d) => d.sequence).join(",") === "1,2");

// 6. Acceptance criterion mapping rule fires when a link is dangling.
const broken = applyPatch(state, {
  upsert: { acceptanceCriteria: [{ id: "ac-x", criterion: "dangling", linkedRequirement: "nope", testability: "testable", priority: "could" }] },
});
check("dangling acceptance criterion is an error", validateRequirements(broken).errors.some((e) => e.code === "ac.unmapped"));

// 7. Confirmed decision without rationale is an error.
const noRationale = applyPatch(state, {
  upsert: { decisions: [{ id: "dec-3", decision: "x", status: "confirmed", source: "user", confidence: "low", alternatives: [], relatedRequirements: [] }] },
});
check("confirmed decision without rationale is an error", validateRequirements(noRationale).errors.some((e) => e.code === "decision.rationale"));

// 8. Handoff is withheld while not ready, emitted when ready.
check("handoff withheld for broken state", renderHandoff(broken).ok === false);
const handoff = renderHandoff(state);
check("handoff emitted for ready state", handoff.ok === true);
if (handoff.ok) {
  check("handoff preserves non-goals (do not build)", handoff.markdown.includes("Excel/.xlsx export"));
  check("handoff carries the contract clause", handoff.markdown.includes("MUST NOT reinterpret"));
}

// 9. Spec renders from data.
const spec = renderSpec(state);
check("spec includes the feature name", spec.includes("CSV export for reports"));
check("spec includes confirmed decisions", spec.includes("dec-1"));

if (WRITE && handoff.ok) {
  writeFileSync(join(FIXTURES, "requirements.json"), JSON.stringify((({ decisions, ...r }) => r)(state), null, 2) + "\n");
  writeFileSync(join(FIXTURES, "decision-log.json"), JSON.stringify({ decisions: state.decisions }, null, 2) + "\n");
  writeFileSync(join(FIXTURES, "spec.md"), spec);
  writeFileSync(join(FIXTURES, "handoff.md"), handoff.markdown);
  // A patch fixture demonstrating the apply format.
  console.log("Fixtures written to", FIXTURES);
}

console.log(`\n✓ ${passed} checks passed`);
