---
description: "Proactive spec writing. Use when planning a new feature, significant change, or complex refactor — before writing implementation code. Especially useful when requirements are unclear, multiple approaches exist, or the change affects multiple systems."
---
# Writing Specs

When a task needs design before implementation, write a spec first.

## Pre-flight

1. Confirm the task is complex enough to warrant a spec — don't spec trivial changes
2. Check if a spec already exists for this feature (look for `spec-*.md` files or existing design docs)
3. Gather initial context: what problem is being solved, what constraints exist, what's been tried before

## Invoke

Run `/spec` with a description:

- **New feature**: `/spec user authentication with OAuth2 and JWT`
- **Refactor**: `/spec migrate payment processing from Stripe v2 to v3 API`
- **Complex change**: `/spec add real-time collaboration to the document editor`

The spec process will ask clarifying questions iteratively — answer them to produce a thorough spec.

## After Spec

- Review the spec with the user before implementing
- Use the spec as the implementation guide — don't deviate without updating it
- The spec is a living document; update it if requirements change during implementation
