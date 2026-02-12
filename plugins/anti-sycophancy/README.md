# anti-sycophancy

Always-on critical feedback — pushback on bad ideas, over-engineering, and wrong directions without needing to invoke a command.

## What it does

Installs a **Critical Feedback Protocol** into your project's CLAUDE.md so that Claude always pushes back on questionable decisions. No skill to invoke — it's active in every conversation.

A PostToolUse hook ensures the section survives CLAUDE.md edits. If someone (or Claude itself) removes the section, the hook reminds Claude to re-add it.

## Usage

```
/anti-sycophancy              # Install (default)
/anti-sycophancy install      # Install or update
/anti-sycophancy check        # Check installation status
/anti-sycophancy remove       # Remove everything
```

## What gets installed

1. **CLAUDE.md section** — Critical Feedback Protocol with rules for:
   - Pushing back before starting tasks (wrong problem, over-engineering, known pitfalls)
   - Stopping mid-implementation when direction is wrong
   - Honest assessment of ideas (lead with problems, quantify trade-offs)
   - Calling out anti-patterns (premature abstraction, cargo-culting, YAGNI, gold-plating)

2. **Hook script** at `.claude/hooks/enforce-critical-feedback.sh` — fires on Write/Edit of CLAUDE.md files

3. **Settings entry** in `.claude/settings.json` — registers the PostToolUse hook

## What Claude will do differently

Before this:
> User: "Let's add a pub/sub event bus for this"
> Claude: "Great idea! Let me set up an event bus..."

After this:
> User: "Let's add a pub/sub event bus for this"
> Claude: "Push back: you have 2 services talking to each other. A direct function call or simple HTTP request handles this without the operational overhead of a message bus. An event bus makes sense when you have 5+ consumers or need async decoupling — neither applies here."

## How the enforcement hook works

The hook fires after every Write or Edit tool call. If the target file is a CLAUDE.md and the Critical Feedback Protocol section (identified by HTML comment markers) is missing, the hook sends a message telling Claude to re-add it.

The hook **never blocks** writes — it only provides post-write feedback. It uses `python3` for JSON parsing with `jq` as fallback.
