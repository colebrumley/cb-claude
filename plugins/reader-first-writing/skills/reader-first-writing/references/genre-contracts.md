# Genre contracts

Load this reference when the document type is known. These obligations are
additive, proportional, and conditional. They guide emphasis; they are not
required headings. Include only concepts supported by the source or task.

- **Status update:** current state, significance, owner, and action or trigger.
  Make time, thresholds, uncertainty, and what is not needed easy to find.
- **Review reply:** conclusion or requested change, concrete reason, and evidence
  when needed to resolve the review. Keep an unresolved choice visibly a choice.
- **PR description:** what changed and why it needed to change. The reader is a
  reviewer deciding whether this diff is correct. Add rollout, compatibility, or
  risk detail only when it constrains merging. Adjacent problems found on the way,
  alternatives not taken, and anything the reviewer cannot act on while reviewing
  belong in the conversation or a ticket, not the description.
- **Change ticket:** intended outcome and scope, ordered execution, dependencies,
  validation, rollback or recovery, and accountable owners when present.
- **Leadership update:** decision or conclusion, consequence, confidence and its
  basis, constraint or risk, and the decision or escalation needed.
- **Research synthesis:** answer the research question first; distinguish current
  evidence, older or conflicting evidence, inference, unknowns, and the practical
  recommendation or reviewer choice.
- **Plan:** objective, recommended approach, work that can proceed in parallel,
  dependencies and order, irreversible points, capacity or constraints, gates,
  owners, and open decisions when they exist.
- **Technical specification:** desired behavior, interfaces and invariants,
  compatibility and sequencing, rollout and rollback, failure or unknown-field
  behavior, acceptance criteria, and out-of-scope decisions when relevant.
- **Cross-system coordination:** system roles, contract or compatibility
  boundary, landing and deployment order, safe parallelism, activation gates,
  validation, ownership, and rollback coordination.
- **Handoff:** settled facts with provenance, rejected options and reasons,
  unknowns, evidence locators, next objective, retrieval or reopening triggers,
  and a clear stop point. Do not copy supporting detail that the next person
  does not need to resume the work.

A missing concept does not require an empty section. If the source has no rollback
or open decision, do not invent one or add a placeholder merely to match another
contract. Conversely, do not omit a present condition, owner, dependency, or
proof obligation to make the document look lighter.

## External channel defaults

Length ceilings for comments, replies, and PR descriptions are in `SKILL.md`.

When a human must decide or act, put that decision or action first, as a plain
sentence. Do not label it or introduce it with a preamble.

For a review reply, prefer a complete, direct sentence over either padding or
shorthand:

- Padded: `Great point! I've updated the retry logic as suggested. Let me know if you'd like anything else!`
- Over-compressed: `retry → exp backoff per cmt, a3f21c`
- Preferred: `Done - switched to exponential backoff in a3f21c.`
