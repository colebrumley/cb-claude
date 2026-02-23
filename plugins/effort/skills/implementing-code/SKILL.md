---
description: "Proactive rubric-scored implementation. Use when building new features, fixing bugs, refactoring, or making any code change that benefits from research context and quality scoring — but doesn't require the full multi-worker tournament. This is the default for most development work."
---
# Implementing Code

When asked to build a feature, fix a bug, or make a code change, use effort L0 for research-informed, rubric-scored implementation.

## Pre-flight

1. Confirm the task involves writing or modifying code (not just research, exploration, or questions)
2. Confirm the task doesn't require extreme rigor — if it's architectural, high-stakes, or cross-cutting, suggest a higher effort level instead
3. Check that the project is a git repository (effort requires git for worktree isolation)

## Invoke

Run `/effort 0` with the task:

- **New feature**: `/effort 0 add a retry mechanism to the API client`
- **Bug fix**: `/effort 0 fix the race condition in the session handler`
- **Refactor**: `/effort 0 extract the validation logic into a shared module`
- **Quick with preset options**: `/effort --level 0 --model inherited --instructions none --permissions approve add pagination to the list endpoint`

## When to Suggest Higher Levels

- **L1**: multiple valid approaches and you want to compare them
- **L2**: cross-cutting change, security-sensitive, or high importance
- **L3**: architectural change, novel/complex problem, or production-critical system

## After Effort

- Review the rubric scores with the user — they show exactly where the solution is strong or weak
- If the score triggered a retry, the feedback-driven fix is usually better than the original
- Apply the solution when the user approves
