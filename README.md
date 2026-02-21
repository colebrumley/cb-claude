# cb-claude

A Claude Code plugin marketplace by Cole.

## Install the marketplace

```
/plugin marketplace add colebrumley/cb-claude
```

## Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| [effort](plugins/effort) | Effort-scaled parallel implementation — throw compute at a problem with tournament-style multi-agent evaluation | `/plugin install effort@cb-claude` |
| [spec](plugins/spec) | Technical spec writing — iterative questioning, rubric-gated completeness, and parallel adversarial critique | `/plugin install spec@cb-claude` |
| [anti-sycophancy](plugins/anti-sycophancy) | Always-on critical feedback — installs pushback rules into CLAUDE.md with a hook to enforce persistence | `/plugin install anti-sycophancy@cb-claude` |
| [code-review](plugins/code-review) | Multi-perspective code review — parallel adversarial critics with severity-calibrated findings | `/plugin install code-review@cb-claude` |
| [test](plugins/test) | Multi-perspective test generation — parallel categorized writers with synthesis and verification against existing code | `/plugin install test@cb-claude` |
| [critique](plugins/critique) | Adversarial code red-teaming — parallel attackers probe existing code from security, correctness, resilience, performance, maintainability, and architecture perspectives | `/plugin install critique@cb-claude` |
| [docs](plugins/docs) | Documentation generation — parallel researchers explore existing code while adversarial critics attack drafts for accuracy, completeness, clarity, usability, and maintainability | `/plugin install docs@cb-claude` |

## Adding a new plugin

1. Create `plugins/<name>/` with the standard Claude Code plugin layout:

```
plugins/<name>/
  .claude-plugin/
    plugin.json       # Plugin metadata
  agents/             # Agent definitions (optional)
  commands/           # Slash commands (optional)
  README.md           # Plugin documentation
```

2. Add an entry to `.claude-plugin/marketplace.json`:

```json
{
  "name": "<name>",
  "source": "./plugins/<name>",
  "description": "...",
  "version": "1.0.0"
}
```
