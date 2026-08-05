# expressive-permissions

_A robust, configurable, flexible and decidedly not annoying expressive permissions system for Claude._

A permissions plugin for Claude Code that intercepts every tool call and decides allow, deny, or ask based on rules you define in a YAML config file. All decisions are fully auditable: see the [audit log documentation](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/AUDIT-LOG.md).

For the full explanation of why this exists and how it works, see the [project README on GitHub](https://github.com/ashleydavis/expressive-permissions).

## Prerequisites

This plugin runs its hooks and MCP server with [Node.js](https://nodejs.org). Node.js must be installed and on your `PATH` before installing, otherwise the plugin's hooks fail and tool calls are not intercepted.

Do not use this plugin under Cursor. Disable **Include third-party Plugins, Skills, and other configs** under **Cursor Settings → Rules, Skills, Subagents** so Cursor does not load these Claude hooks. Cursor auto-loads them and mishandles `ask`, which can let dangerous commands run without approval. Details: [docs/CURSOR.md](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/CURSOR.md).

## Installation

```
/plugin marketplace add ashleydavis/expressive-permissions
/plugin install expressive-permissions@codecapers
/reload-plugins
```

After installing, confirm the plugin is intercepting tool calls (see [Verifying the plugin](#verifying-the-plugin) below).

## Configuration

Place your rules in `.claude/permissions.yaml` at your project root (or `~/.claude/permissions.yaml` for global rules).

Each rule sits under a top-level section key (`bash`, `read`, `write`, `edit`, `multi_edit`, `webfetch`, `redirect`, `Grep`, or a Claude tool-name pattern such as `ToolSearch` / `"mcp__*__delete_*"`), is optionally nested by command and subcommand for bash, and sets `decide: allow`, `deny`, or `ask`, with an optional `reason`. Any tool call that matches no rule defaults to `ask`.

```yaml
bash:
  git:
    status:
      decide: allow          # allow `git status` with no prompt
    add:
      decide: ask            # ask before `git add`
  rm:
    options:
      - r|recursive
      - f|force
    decide: deny             # deny `rm -rf` in any form
    reason: rm -rf in any format is not allowed
```

Then set Claude Code to allow all tools so the plugin is the sole decision-maker. Add the following to `~/.claude/settings.json` (global) or `.claude/settings.json` (project):

```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Read",
      "Write",
      "Edit",
      "MultiEdit",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch",
      "TodoWrite",
      "Agent",
      "NotebookEdit",
      "ExitPlanMode",
      "BashOutput",
      "KillShell",
      "mcp__*"
    ]
  }
}
```

See the [full configuration guide](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/CONFIGURATION.md) for the complete rule syntax.

Configuration is reloaded automatically on the next hook run; no `/reload-plugins` needed for rule edits.

## Verifying the plugin

The plugin writes an audit log every time its hook runs:

1. In Claude, ask it to run `echo hello`.
2. In a terminal, check the log directory:

```
ls <project>/.claude/permissions-log/
cat <project>/.claude/permissions-log/*
```

`<project>` is the directory where you launched Claude. Fresh entries mean the plugin is intercepting tool calls. If the directory is missing, the plugin is not active.

Once verified, you can safely set Claude Code itself to allow all tools (see [Configuration](#configuration) above). The plugin then handles every permission decision, defaulting to `ask` for any command you have not explicitly allowed or denied.

## Troubleshooting rules

Three tools help when a rule is not behaving as expected:

- **Audit log** -- every permission decision and tool result is written to `.claude/permissions-log/`. Check it first when you want to understand what just happened.
- **Permission REPL** -- interactive terminal session for testing commands against your rules (`bun run repl`). Only available if you have cloned the repository.
- **Permission Analyzer MCP** -- ask Claude to analyze a command: "Use analyze_permission to check why `git push --force` is denied." Claude calls the tool and explains the trace.

See the [full troubleshooting guide](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/TROUBLESHOOTING.md) for setup and usage of all three tools.

## Full documentation

- [Permissions quick reference](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/PERMISSIONS-QUICKREF.md)
- [Rule syntax reference](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/CONFIGURATION.md)
- [How it works](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/HOW_IT_WORKS.md)
- [Protecting production](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/PROTECTING-PRODUCTION.md)
- [Development guide](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/DEVELOPMENT.md)
- [Permission REPL](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/REPL.md)
- [MCP server](https://github.com/ashleydavis/expressive-permissions/blob/main/docs/MCP-SERVER.md)

## License

MIT. See [LICENSE](https://github.com/ashleydavis/expressive-permissions/blob/main/LICENSE).
