# Semantic preservation

Load this reference when shortening, restructuring, translating, polishing,
or reviewing writing whose exact meaning matters.

## Preservation invariant

Deletion may remove only material whose omission does not change the
reader-relevant meaning, obligations, evidence boundaries, or task outcome. All
retained and decision-bearing content must preserve its semantics. When the reader
and task are explicit, delete a wholly unrelated idea even when it is unique and
true.

`SKILL.md` governs when to cut and how far a stated limit reaches. This reference
adds preservation and drift checks; it does not set the default.

## Preservation inventory

Before editing, inventory the source's decision-bearing elements:

- claims, conclusions, recommendations, directives, and alternatives;
- modality and certainty: must, should, may, likely, estimated, unknown;
- scope, exclusions, conditions, exceptions, causal links, and evidence limits;
- risks, dependencies, sequencing, parallelism, rollback behavior, owners, and
  required actions;
- names, numbers, units, dates, times, quotations, citations, and provenance;
- links, code, commands, paths, headings, tables, terminology, and intentional
  voice.

Mark elements as source fact, inference, recommendation, unknown, or open
question when that distinction is present. Preserve the relationship between
element and actor, target, time, condition, and evidence. Do not flatten a
provenance distinction merely because the sentence reads more smoothly.

Order, adjacency, grouping, transitions, and headings also create meaning. Do
not use them to introduce a causal, temporal, evidentiary, priority, dependency,
contrast, or hierarchical relationship that the source does not support. A new
heading must summarize source content neutrally without assigning new status,
ownership, certainty, or importance. When the relationship between ideas is
unknown, separate them neutrally or report the gap instead of bridging it.

## Common drift patterns

- **Recommendation to directive:** "We recommend enabling the flag after the
  test" becomes "Enable the flag after the test." The first leaves a decision;
  the second instructs one.
- **Conditional to unconditional:** "Launch if Tuesday's rollback test passes"
  becomes "Launch this week." The gate disappeared.
- **Calibrated to certain:** "Evidence suggests Atlas owns it today" becomes
  "Atlas owns it." An inference became a fact.
- **Scope loss:** "No action is needed unless errors exceed 1%" becomes "No
  action is needed." The exception disappeared.
- **Causal loss:** "Restart the loader because the connector freezes DNS at
  startup" becomes "Restart the loader." The reason that explains order and
  recovery disappeared.
- **Actor or ownership loss:** "Payments validates; SRE executes" becomes
  "The team validates and executes." Accountability changed.
- **Temporal or numeric drift:** "5% of traffic on Tuesday" becomes "a small
  pilot soon." Both the limit and date were weakened.
- **Evidence/provenance drift:** "The catalog names Atlas; git activity supports
  that inference" becomes "Atlas is the confirmed owner." Source authority and
  uncertainty were collapsed.
- **Structural implication drift:** independent observations become adjacent
  under "Cause," "Evidence," or "Priority," implying a relationship or status
  that the source did not establish.
- **Artifact drift:** a command, path, link, table cell, heading, quotation, or
  code token is silently altered while surrounding prose is improved.

## Verification pass

After editing, compare source and result in two passes. First check exact
artifacts and structured values. Then read each claim with its qualifiers and
ask whether the result preserves who does what, to which scope, when, under
what condition, why, with what confidence, and with what consequence. Also read
across adjacent ideas and headings: confirm that their order, grouping, and
transitions do not imply a relationship absent from the source.

If a required item is absent or changed, repair it or state that the requested
edit cannot be completed without substantive change. Do not silently guess.
If the task also calls for factual verification, run that as a separate pass:
semantic equivalence does not establish truth, and a true external fact does
not authorize changing the source during a style edit.
