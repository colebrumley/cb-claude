---
description: "Proactive code review. Use when about to commit, create a PR, push to remote, or claim a feature is done. Catches issues before they ship."
---
# Reviewing Code

Before committing, creating a PR, or declaring work complete, run a code review.

## Pre-flight

1. Confirm there are actual code changes to review (not just config or docs tweaks)
2. Determine the review scope:
   - If creating a PR or pushing: the full branch diff against the base branch
   - If committing: staged + unstaged changes
   - If claiming "done": all changes since the task started

## Invoke

Run `/cb:review` with appropriate arguments:

- **PR**: `/cb:review <PR-number>` or `/cb:review <branch-range>`
- **Local changes**: `/cb:review` (auto-detects uncommitted changes)
- **Deep review for large changes**: `/cb:review --depth deep`

Use `--depth quick` for small, low-risk changes (typo fixes, config tweaks). Use default depth for most work. Use `--depth deep` for security-sensitive code, public APIs, or complex logic.

## After Review

- Address any critical or major findings before proceeding
- Minor findings: fix if quick, otherwise note for later
- If the review is clean, proceed with the commit/PR/push
- Do not silently skip findings — tell the user what was found and what you did about it
