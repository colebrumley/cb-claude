---
name: reader-first-writing
description: Use when writing or revising anything a person will read, including pull request descriptions, commit messages, and review replies. Rewrites the whole document to serve its reader without changing what it means.
---

# Reader-first writing

Make writing easy for its reader to understand, decide from, or act on without
changing what it means.

## Revise, and revise the whole thing

Rewrite the document so it serves its reader. Restructure it, reorder it, merge
and split sections, and cut whatever does not earn its place. You do not need
permission to make a structural change, and you do not need to preserve the
shape you were given. A verdict that the organization is wrong is a rewrite, not
a note.

Work from the whole document down, never from the first sentence forward. Fix the
structure, then the paragraphs, then the words. Polishing a section that should
not exist is wasted work, so decide what stays before improving anything.

With no source to revise, write from the supplied facts and invent nothing.

Two limits apply to every revision:

- **Meaning is fixed.** Restructure and cut freely, but never change what is
  claimed, required, owed, conditional, uncertain, or owned. See "Preserve
  meaning" below.
- **Leave good writing alone.** When the source already fits its reader, return
  it unchanged and say so. Do not manufacture edits to show activity.

Do not infer permission to change substance from a perceived improvement. Making
prose shorter or clearer never licenses changing its recommendation, its
certainty, or its scope.

### When the request limits the revision

Silence means revise the whole thing. A stated limit is the only override, and it
reaches exactly as far as it was stated:

- **"Don't cut anything."** Keep every idea. Restructuring and reordering are
  still yours to make.
- **"Just fix the grammar."** Keep every idea and the existing organization.
  Improve clarity, grammar, and local flow only.
- **A named section to leave alone.** Leave that section as it stands and revise
  the rest of the document normally.

Do not widen a narrow limit into a general instruction to leave the document
alone, and do not read politeness, praise, or an expression of attachment to the
draft as a limit.

## Establish the reader contract

Determine who the reader is, what they already know, what they must understand or
do after one read, and which facts, risks, owners, and actions affect that
outcome.

When the writing is going to someone other than the person who asked for it,
tell the requester the reader and the outcome in one line before the draft, so a
wrong assumption can be corrected early. That line is a note to the requester,
not part of the draft, so the draft still opens with its own point. Skip the line
when the request asks for the deliverable alone. Keep the analysis silent
otherwise.

Ask one focused question only when the ambiguity changes the result and no
source-grounded default exists.

## Write from the reader's knowledge, not yours

Write for the least-informed intended reader. The reader did not watch you work,
so nothing you did to reach a conclusion is evidence to them. Name no activity
you performed: no review, backtest, test, search, agent, analysis, earlier draft,
or corrected mistake. Give the finding instead, with no account of how it was
obtained.

- Wrong: "The backtest and independent review support this change." The reader
  learns only that something happened offstage.
- Also wrong: "In backtesting across three events, the peak was 37.2." Naming the
  activity as the setting for a number is still self-reference. The reader cannot
  see the backtest, so the clause spends their attention and adds nothing.
- Right: "The largest single-host five-minute value was 37.2, below the warning
  threshold of 50."

Delete the clause that says where a fact came from and keep the fact. A finding
holds on its own; if it needs your process to stand up, it is not yet evidence.
Correct a claim you published earlier only where the reader can see that claim,
and cite it.

State who needs to do what before explaining architecture or rationale.

## Reduce reader effort

Lead with the point. Use familiar, concrete words and direct sentences. Use
structure only when it helps the reader find information.

Prefer the plain construction, not just the plain word. Density usually comes
from how a sentence is built, so work in this order:

- Name the concrete thing rather than the category it belongs to. Cite the
  operator, flag, field, or file the reader will actually look at.
- Turn nouns back into verbs. "Nothing in CI checks them" beats "no CI check
  covers them."
- Address the reader, and use the imperative for a request. "Please add" beats
  "worth adding."
- Split any sentence carrying a second idea in a relative clause or after a
  semicolon.
- Only then swap a remaining specialized word for its plain equivalent.

Keep a specialized term when the reader must match the exact string against
something else, such as an identifier, config key, error name, command, path, or
ticket, or when no short plain equivalent exists. Do not keep a term merely
because the reader would understand it: comprehension is not the test, effort is.

Cutting content does not fix density. A passage can hold exactly what the reader
needs and still read slowly, so run this check on the prose that survived the
cut.

Remove whole low-value ideas rather than compressing them into shorthand. Being
unique or true does not make an idea relevant. Omit repeated context, generic
praise, claims of care or thoroughness, greetings, and closing offers unless they
serve the task or social context. Judge brevity by reading effort, not character
count.

Default to at most three sentences for a comment or review reply, and about ten
lines for a pull request description. Treat those as ceilings, not targets.
Exceed one only when a named reader cannot complete a named action without the
extra material, never because the material is true, hard-won, or interesting.

## Preserve meaning

Preserve the source's claims and obligations, including recommendation versus
directive; modality and certainty; scope, conditions, causal links, risks,
dependencies, owners, and actions. Preserve names, numbers, dates, quotations,
citations, links, code, commands, paths, provenance, intentional terminology, and
voice. Never cut content whose omission changes meaning, obligations, evidence
boundaries, or the reader's task.

Treat meaning created by order, adjacency, grouping, transitions, and headings as
part of the semantics. Do not invent a causal, temporal, evidentiary, priority,
dependency, contrast, or hierarchical relationship the source does not establish.
Separate ideas neutrally, or report the gap, when the relationship is unknown.

Emphasis is meaning too. Position, prominence, and repetition mark what the source
treats as most important, so moving a lead claim into a subordinate clause or a
late bullet changes what the document says even when every proposition survives.
Reordering for the reader is expected; flattening the source's hierarchy is not.

Do not silently correct factual claims unless factual verification was requested.
Report unresolved uncertainty rather than resolving it in the prose.

## Before returning

Run these four checks on the result, in order:

1. **Provenance.** Scan the draft for words naming work: review, backtest, test,
   analysis, investigation, search, agent, draft, or a first-person verb of
   activity such as "I ran," "I found," or "I confirmed." Check subordinate
   clauses and prepositional phrases too, since self-reference hides in the setting
   of a sentence rather than its subject. Delete each hit that describes your own
   work and keep the fact it was attached to. Keep a listed word when it names a
   source fact, technical term, or condition, such as a rollback test that gates a
   launch. Then confirm the reader can identify every event, document,
   artifact, and person still named, from this artifact plus what they already
   hold.
2. **Meaning.** Compare against the source. Confirm every preserved claim keeps
   its scope, qualifier, actor, time, cause, confidence, and prominence. A claim
   the source led with must not end up subordinate.
3. **Structure.** Confirm every idea still serves the reader, appears after its
   prerequisites, and adds no detour or backtracking.
4. **Density.** Rerun the plain-construction check on the prose that survived,
   since cutting leaves the remainder's density untouched.

## Return the revision and nothing else

The result is the whole reply. Do not narrate what you changed, justify a cut,
list your edits, or offer to adjust the result. The reader of a revision wants the
revision; the requester can diff it.

Three cases cover every target:

- **A file.** Edit it in place. Reply with the path and one line on what changed
  structurally.
- **Text in the conversation.** Reply with the revised text alone.
- **Nothing to change.** Reply that the writing already fits its reader, and say
  what makes it fit.

Add anything beyond these only when the request asked for it. When the writing is
for someone other than the requester, the one-line reader-and-outcome statement
from "Establish the reader contract" comes before the draft unless the request
asks for the deliverable alone; it is the only permitted preamble.

## References

Load only what the task needs:

- `references/semantic-preservation.md` for preservation and drift checks.
- `references/genre-contracts.md` for document-specific obligations.
