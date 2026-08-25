# Troubleshooting rules

This doc explains how to debug why a command was allowed, denied, or asked.


- [Finding tool calls that no rule matched](#finding-tool-calls-that-no-rule-matched)
- [My rule isn't matching: what should I check?](#my-rule-isnt-matching-what-should-i-check)
- [Confirming the config is loaded](#confirming-the-config-is-loaded)
- [Disable the plugin in one project](#disable-the-plugin-in-one-project)
- [Cursor is running dangerous commands without prompting](#cursor-is-running-dangerous-commands-without-prompting)
- [Pending approval files](#pending-approval-files)
- [Audit log](#audit-log)
- [Permission REPL](#permission-repl)
- [Permission Analyzer MCP server](#permission-analyzer-mcp-server)


## Finding tool calls that no rule matched

When a tool call falls through to `ask` because no rule recognised it, the audit log records a `NOMATCH` line for every AST node that every rule abstained on. The fastest way to discover the gaps in your `permissions.yaml` is to read the `.log` files under `.claude/permissions-log/`.

Open the current hour's log:

```sh
tail -f .claude/permissions-log/$(date +%Y-%m/%d/%H).log
```

A `NOMATCH` line looks like this: the second column is the AST node type (`command`, `read`, `write`, `edit`, `multiedit`, `other`), the third is the `cmd` value the engine tried to match (command text or file path):

```
10:23:01  TOOL     Bash      "ls && pwd"
10:23:01  RULE               "ls" → .claude/permissions.yaml:4 → allow
10:23:01  NOMATCH  command   "pwd"
10:23:01  NODE               "ls && pwd" → ask
10:23:01  RESULT   Bash      "ls && pwd" → ASK
```

To list every unmatched node across recent logs:

```sh
grep NOMATCH .claude/permissions-log/**/*.log
```

Each `NOMATCH` line is a candidate for a new rule. For Bash compounds like `cmd1 && cmd2`, only the unmatched sub-command is logged, so you can target the specific command or subcommand that needs a rule.

## My rule isn't matching: what should I check?

If a node you expected to match still appears as `NOMATCH`, the rule is loaded but its fields are not all matching simultaneously:

- All fields in a rule are AND'd together: a single mismatched `cwd`, `env`, or `options` entry causes the whole rule to abstain. See [Matching multiple fields](CONFIGURATION.md#matching-multiple-fields).
- For commands with subcommands, rules nest under the subcommand name. A rule under `git:` (no subcommand level) does not match `git push`. See [Subcommand matching](CONFIGURATION.md#subcommand-matching).
- For deeply-nested subcommand paths like `docker compose build`, every key level consumes one positional word from the command line. A `cmd:` matcher inside addresses arguments _after_ the subcommand path words.
- Glob patterns must be quoted in YAML when they start with `*` or contain `:`.
- Regex patterns must be wrapped in `/.../` slashes; otherwise they are treated as literal strings.

## Confirming the config is loaded

Each `permissions.yaml` load is recorded as a `CONFIG` line at the top of every hour's log:

```
10:00:00  CONFIG             LOADED .claude/permissions.yaml (12 rules)
```

If no `CONFIG` line appears for the file you edited, the path is wrong or the hook has not run since the edit. Malformed YAML or unknown fields cause the hook to fail with an error on stderr rather than silently dropping rules.

For more on log entry types, see [AUDIT-LOG.md](AUDIT-LOG.md).

## Disable the plugin in one project

Claude Code's `bypassPermissions` mode does not skip this plugin's PreToolUse hooks. To skip the plugin in one repo without turning off every other hook, set `EXPRESSIVE_PERMISSIONS` to `off`, `0`, or `false`.

The usual place is that project's `.claude/settings.local.json`:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  },
  "env": {
    "EXPRESSIVE_PERMISSIONS": "off"
  }
}
```

The pre-hook then returns allow without loading rules. Unset, or any other value, and the plugin runs as usual. Start a new Claude Code session after changing the file. See the README section [Disable the plugin in one project](../README.md#disable-the-plugin-in-one-project).

## Cursor is running dangerous commands without prompting

If Cursor executes commands this plugin would normally `ask` about (for example `git commit`) without a real approval step, Cursor is almost certainly loading the Claude `PreToolUse` hooks and mishandling `ask`.

In **Cursor Settings → Rules, Skills, Subagents**, disable **Include third-party Plugins, Skills, and other configs**, then reload the window. Do not remove the Claude hooks; Claude Code still needs them.

See [CURSOR.md](CURSOR.md): use Cursor with this plugin's Claude hooks disabled via that setting.

## Pending approval files

When Claude Code shows an approval prompt, the pre-hook writes a Markdown debug file for that tool call. Open it to see the full command, parsed sub-commands with rule outcomes, effective cwd and env vars, and the verdict that triggered the ask.

List outstanding prompts (newest first):

```sh
ls -t .claude/permissions-log/pending/
cat .claude/permissions-log/pending/<key>.md
```

The file is removed automatically after you approve and the tool executes. If you deny the prompt, the file stays until stale cleanup (1 day) or you delete it manually.

See [docs/PENDING-APPROVALS.md](PENDING-APPROVALS.md) for the file format and lifecycle.

## Audit log

Every permission decision and every tool result is written to two files under `.claude/permissions-log/`: a machine-readable JSON Lines file and a human-readable plain-text log. Check these first when a rule is not behaving as expected.

See [docs/AUDIT-LOG.md](AUDIT-LOG.md) for the log format and retention policy.

## Permission REPL

Requires the repo to be cloned locally. An interactive terminal session where you type commands and see the rule trace and decision immediately. It rebuilds the registry on every input, so edits to `permissions.yaml` are picked up without restarting.

```sh
bun run repl
```

One-shot mode (no interactive session, useful in scripts or CI):

```sh
bun run repl "git push --force"
```

To test non-Bash tool calls, use a prefix: `read /etc/passwd`, `write /tmp/out`, `webfetch https://api.example.com`, `tool mcp__github__delete_repo`.

See [docs/REPL.md](REPL.md) for the full reference including non-Bash tool prefixes and `:project` / `:cwd` session commands.

## Permission Analyzer MCP server

The MCP server lets you ask Claude in natural language: "Why is `kubectl delete pod` being denied?" Claude calls the `analyze_permission` tool and explains the trace. The server is registered via `.mcp.json` at the project root and requires no extra setup beyond `/reload-plugins`.

Once registered, ask Claude to analyze a command by name. Mentioning `analyze_permission` or the word "analyze" is the most reliable trigger:

- "Use analyze_permission to check why `git push --force` is denied."
- "Analyze the permission for `read /etc/passwd`."
- "Call analyze_permission on `kubectl delete pod` and explain what you find."

Without an explicit prompt, Claude may try to answer by reading `permissions.yaml` directly rather than calling the tool. If you see it doing that, ask again with one of the phrasings above.

See [docs/MCP-SERVER.md](MCP-SERVER.md) for setup and usage.
