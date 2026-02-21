---
description: "Proactive documentation generation. Use when documentation is needed for code, APIs, systems, or modules — new public APIs, complex subsystems, onboarding material, or when the user asks for docs."
---
# Writing Docs

When code needs documentation, generate it with rubric-gated quality.

## Pre-flight

1. Identify what needs documenting — a file, module, API surface, or system
2. Determine the audience: other developers, end users, or operators
3. Check for existing docs that should be updated rather than replaced
4. Determine the doc type if obvious (API reference, guide, architecture overview)

## Invoke

Run `/docs` with the target:

- **File**: `/docs src/api/routes.ts`
- **Module**: `/docs src/payments/`
- **Typed**: `/docs --type api-reference src/api/`
- **With audience**: `/docs --persona "new team member" src/core/`

Use `--depth quick` for a single file's inline docs. Use default depth for module-level documentation. Use `--depth deep` for system architecture docs or public API references.

## After Docs

- Review generated docs for accuracy against the actual code
- Place docs where the project conventions expect them (README, docs/, inline)
- Don't generate docs for trivial code that's self-explanatory
