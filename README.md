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

## Adding a new plugin

1. Create `plugins/<name>/` with the standard Claude Code plugin layout:

```
plugins/<name>/
  .claude-plugin/
    plugin.json       # Plugin metadata
  agents/             # Agent definitions (optional)
  commands/           # Slash commands (optional)
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
