# Claude Code Plugins

A collection of plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Plugins

| Plugin | Description |
|--------|-------------|
| [effort](plugins/effort) | Effort-scaled parallel implementation — throw money at a problem. Spawns parallel researchers, workers, and reviewers in isolated git worktrees with tournament-style evaluation. |

## Installation

Each plugin can be installed independently. From your project directory:

```bash
claude plugin add /path/to/claude-code-plugins/plugins/<plugin-name>
```

Or install directly from the repo:

```bash
git clone git@github.com:colebrumley/cb-claude.git
claude plugin add ./cb-claude/plugins/effort
```

## Plugin Structure

Each plugin lives in `plugins/<name>/` and follows the Claude Code plugin layout:

```
plugins/<name>/
  .claude-plugin/
    plugin.json       # Plugin metadata
  agents/             # Agent definitions (optional)
  commands/           # Slash commands (optional)
```

## Contributing

Add a new plugin by creating a directory under `plugins/` with the structure above.
