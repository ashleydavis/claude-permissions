# Disable this plugin in Cursor

This plugin is for [Claude Code](https://code.claude.com/) only. Do not let Cursor load its Claude hooks. Cursor auto-imports Claude configuration and mishandles those hooks, so you must turn that import off and use Cursor with the plugin disabled there.

Keep the hooks in `.claude/settings.json` for Claude Code. Only Cursor's third-party import needs to be off.

## Required Cursor setting

1. Open **Cursor Settings**.
2. Go to **Rules, Skills, Subagents**.
3. Disable **Include third-party Plugins, Skills, and other configs**.

If that stays on, Cursor loads this plugin's Claude `PreToolUse` / `PostToolUse` hooks and can run dangerous commands (for example `git commit`) without a real approval prompt. Claude Code ignores that Cursor toggle and still loads hooks from `.claude/settings.json` as usual.

See Cursor's [third-party hooks](https://cursor.com/docs/reference/third-party-hooks) docs for where it reads Claude config from.

## Why this is a Cursor flaw

Cursor automatically imports Claude Code configuration, including hooks from:

- `.claude/settings.json` (project)
- `.claude/settings.local.json` (project local)
- `~/.claude/settings.json` (user)

That import also pulls in permission hooks written for Claude Code's trust model, even when you only meant to use Cursor's own agent.

Claude Code's `PreToolUse` hooks return `allow`, `deny`, or `ask`. This plugin defaults to `ask` for anything not explicitly allowed or denied, and typical setups set Claude's own tool allow-list to "allow all" so the plugin is the sole decision-maker. That combination is safe under Claude Code: unmatched or sensitive calls surface an approval prompt.

Cursor does the wrong thing with that path:

- For Claude-style `preToolUse` / permission hooks, Cursor effectively supports `allow` and `deny`. Returning `ask` is not implemented the way Claude Code implements it (Cursor reports that `ask` for `preToolUse` is not supported).
- When a hook fails or returns a decision Cursor cannot apply, Cursor tends to **fail open**: the tool call proceeds instead of stopping for approval.
- So hooks that would prompt under Claude Code can, under Cursor, let the action run. With Claude settings that already allow tools at the host layer, that includes commands you never meant to auto-approve, such as `git commit`.

Empty or higher-priority `.cursor/hooks.json` entries do not fix this. Cursor merges hook sources and still runs matching Claude hooks when third-party import is enabled. Use Cursor with that import disabled so these Claude hooks are not loaded there at all.
