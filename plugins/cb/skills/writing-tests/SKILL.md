---
description: "Proactive test generation. Use when code has been written or modified that lacks test coverage — new functions, changed behavior, bug fixes without regression tests, or untested edge cases."
---
# Writing Tests

When code changes lack test coverage, generate tests before moving on.

## Pre-flight

1. Verify the code is in a testable state (compiles, no obvious syntax errors)
2. Check if tests already exist for the changed code — don't duplicate coverage
3. Identify the test framework and conventions used in the project (look for existing test files nearby)
4. Determine the target: specific file, function, or module that needs coverage

## Invoke

Run `/cb:test` with the target:

- **Specific file**: `/cb:test src/auth/login.ts`
- **Specific function**: `/cb:test src/auth/login.ts:validateToken`
- **With focus**: `/cb:test --instructions "focus on error paths" src/payments/charge.ts`

Use `--depth quick` for simple utility functions. Use default depth for business logic. Use `--depth deep` for security-critical or complex stateful code.

## After Tests

- Run the generated tests to confirm they pass
- If tests fail, fix them — don't leave broken tests behind
- If the test framework isn't set up, tell the user rather than inventing infrastructure
