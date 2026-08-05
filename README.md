# expressive-permissions

A robust, configurable, flexible and decidedly not annoying expressive permissions system for Claude. Easily allow everything that's safe. Easily deny everything that's dangerous. Prompt the user for everything else.

This is a plugin for Claude Code to handle permissions. You delegate all of Claude's permission requests to this plugin and then it will decide, through rules you have laid down in yaml configuration files, whether to allow or deny any particular tool use or command invocation.

Read the full documentation at [https://ashleydavis.github.io/expressive-permissions/](https://ashleydavis.github.io/expressive-permissions/).

See comprehensive examples of permissions configuration in [my personal Claude Code config repo](https://github.com/ashleydavis/claude-config/tree/main/home/.claude/permissions.d).

This gives you permissions that work, even when:
- Commands are embedded in a pipeline in a variable order.
- Arbitrary (and usually hard to match) paths are included in command arguments (both positional and labelled).
- The working directory or environment variables are changed within the pipeline.

## Table of contents

- [Why?](#why)
- [Examples](#examples)
- [Motivation](#motivation)
    - [Relative paths are matched against your project directory](#relative-paths-are-matched-against-your-project-directory)
    - [Absolute paths are matched against your entire computer](#absolute-paths-are-matched-against-your-entire-computer)
    - [Argument matching across flags and aliases](#argument-matching-across-flags-and-aliases)
    - [Environment variables and working directory are tracked](#environment-variables-and-working-directory-are-tracked)
- [Installation](#installation)
- [Verifying the plugin](#verifying-the-plugin)
- [Configuration](#configuration)
    - [Global configuration (applies to every project)](#global-configuration-applies-to-every-project)
    - [Local project configuration (applies to one project)](#local-project-configuration-applies-to-one-project)
- [Quick start: adding a rule](#quick-start-adding-a-rule)
- [Troubleshooting rules](#troubleshooting-rules)
- [Further reading](#further-reading)
- [License](#license)

## Why?

Claude Code's built-in permission system operates at the tool level: you can allow or deny entire tool categories by matching them against inflexible patterns, but it cannot make decisions based on individual commands within a pipeline, variable file paths in arguments, environment variables (whether set in the shell or inline in the command), the working directory (including `cd` calls mid-pipeline), or context-specific values like the active AWS profile or kubectl context.

This plugin goes further: it converts each tool call into an abstract syntax tree (AST), threads a simulated environment (cwd + env vars) through the tree, and runs your rules at every node in the AST. 

You have fine-grained control over what Claude is allowed to do and an expressive system for defining permissions so that you don't have to keep repeating yourself for every combination of commands that Claude might come up with.

It's all about allowing Claude the freedom to do what it needs to do, without constantly interrupting you for permissions, but at the same time protecting you from the most damaging things it can do. Rules can also be scoped by environment, so you can allow full read/write access in a sandbox AWS account or dev cluster while locking down production to read-only - or blocking writes entirely. See [docs/PROTECTING-PRODUCTION.md](docs/PROTECTING-PRODUCTION.md) for recipes covering AWS CLI and kubectl.

All decisions are fully auditable. Every permission decision (allow, deny, or ask) and every tool execution result is written to a machine-readable JSON Lines file and a human-readable plain-text log, both under `.claude/permissions-log/`. When a tool call returns `ask`, a separate Markdown file is also written under `.claude/permissions-log/pending/` so you can inspect the decision while the approval prompt is on screen. See [docs/AUDIT-LOG.md](docs/AUDIT-LOG.md) for the audit log format and [docs/PENDING-APPROVALS.md](docs/PENDING-APPROVALS.md) for pending approval files.

> **Safe by default:** if you add no rules, or if a tool call matches no rule, the plugin always falls back to `ask`. Claude will never run an unmatched command silently.

## Examples

Some examples of rules you can write:

| Scenario | Decision |
|---|---|
| `git status`, `git diff`, `git log` | always **allow**, no prompt |
| `rm -rf` anything | always **deny** |
| `sudo anything` | always **deny** |
| Edit or Write to a `.env` file | always **deny** |
| `git add ...` | **ask**: confirm before staging |
| Read `.env`, `~/.ssh/id_rsa`, `~/.aws/credentials` | **ask**: confirm before reading secrets |
| WebFetch to `docs.anthropic.com` | always **allow** |
| WebFetch to an unknown host | **ask** |
| `aws ... describe-*`, `list-*`, or `get-*` | always **allow** |
| `aws` anything when `AWS_PROFILE` is `sandbox` | always **allow** |
| `aws ... delete-*`, `create-*`, or `modify-*` when `AWS_PROFILE` is not `sandbox` | always **deny** |
| `kubectl get`, `describe`, or `logs` on any cluster | always **allow** |
| `kubectl` anything when kubeconfig `current-context` is `sandbox` | always **allow** |
| `kubectl apply`, `delete`, or `exec` when kubeconfig context is not `sandbox` | always **deny** |

## Motivation

Claude Code's built-in permission system works at the tool level. You can allow or deny `Bash` as a whole, or write glob patterns that match against the entire shell string Claude passes to the terminal. 

The problem is that Claude constructs pipelines, and a pipeline is an open-ended and variable combination of commands. You can write a rule for `git status`, but Claude will run `git status && git diff`, or `cd /some/path && git status | grep foo`, or something else entirely. Every new combination requires a new rule, and Claude will always produce combinations you have not seen before. Explicit pattern matching against full pipeline strings does not scale.

This plugin parses the pipeline into an abstract syntax tree (AST) and evaluates your rules against each node individually. A rule for `git status` matches whether the command appears alone, chained with `&&`, or buried inside a longer pipeline, regardless of what other arguments are passed to it or what the working directory is. You write one rule per command instead of a growing list of rules chasing every new combination Claude invents.

### Relative paths are matched against your project directory

Rules that use relative path patterns apply only within your project directory. This covers both path arguments passed to commands and the working directory of any command in the pipeline. A rule like `path: "**/.env"` matches any `.env` file anywhere inside the project, and a rule like `cwd: "**/worktrees/**"` matches any command whose effective working directory falls inside a git worktree within the project. Neither rule will trigger outside the project. You can also write relative patterns that extend beyond the project root, such as `path: "../*"` to match paths one level up, if you need a rule to cover directories adjacent to your project.

This also means your rules travel with the project. A pattern like `path: "**/.env"` works on Alice's laptop at `/home/alice/projects/myapp` and on Bob's machine at `/home/bob/work/myapp` without any changes.

### Absolute paths are matched against your entire computer

If you want a rule to apply globally across your whole machine rather than just within the current project, use an absolute path pattern. A rule like `path: "/home/**/.ssh/id_rsa"` or `cwd: "/etc/**"` will match regardless of which project Claude is working in. This is useful for protecting sensitive files or system directories that live outside any project, such as SSH keys, AWS credentials, or system configuration files.

### Argument matching across flags and aliases

Claude Code permission patterns match the raw command string. A rule written to catch `rm -rf` will miss `rm -r -f`, `rm --recursive --force`, `rm -fr`, or any other combination that means the same thing. You would need a separate pattern for every permutation, and Claude will always find one you missed.

This plugin parses flags individually and normalises them, so a single rule can cover every syntactic form. A rule declaring `options: ["r|recursive", "f|force"]` matches when all listed flags are present, regardless of how they are written: `rm -rf`, `rm -fr`, `rm -r -f`, `rm --recursive --force`, and every other equivalent form. Use `options-in: [r, f]` when any one of the listed flags is sufficient to match the rule.

### Environment variables and working directory are tracked

In a pipeline like `cd /restricted && SECRET=1 some-tool --flag`, the working directory and the environment change mid-sequence. Claude Code sees none of that; it only sees the raw string. By the time Claude Code would evaluate a permission rule, the context is already lost.

This plugin simulates `cd` and environment-variable assignments as it walks the AST, so every command node in the pipeline is evaluated with the cwd and env vars it would actually have at runtime. A rule that checks `cwd` or a specific env var will see the right values no matter where in the pipeline the command appears.

## Prerequisites

This plugin runs its hooks and MCP server with [Node.js](https://nodejs.org). Node.js must be installed and on your `PATH` before you install the plugin. If Node.js is missing, the plugin's hooks fail and tool calls are not intercepted. (Bun is only needed if you want to build the plugin from source; see the [development guide](docs/DEVELOPMENT.md).)

### Cursor users (required)

Do not use this plugin under Cursor. Cursor auto-loads Claude Code hooks and mishandles `ask`, which can let dangerous commands (for example `git commit`) run without a real approval prompt.

In **Cursor Settings → Rules, Skills, Subagents**, disable **Include third-party Plugins, Skills, and other configs** so Cursor does not load these hooks. Keep the Claude hooks in place for Claude Code. Details: [docs/CURSOR.md](docs/CURSOR.md).

## Installation

```
/plugin marketplace add ashleydavis/expressive-permissions
/plugin install expressive-permissions@codecapers
/reload-plugins
```

After installing, confirm the plugin is intercepting tool calls (see [Verifying the plugin](#verifying-the-plugin)).

## Verifying the plugin

The plugin writes an audit log every time its hook runs, so the log is the most reliable proof that it is active:

1. In Claude, ask it to run `echo hello`.
2. In a terminal, check the log directory:

```
ls <project>/.claude/permissions-log/
cat <project>/.claude/permissions-log/*
```

`<project>` is the directory where you launched Claude. Fresh entries in the log mean the plugin is intercepting tool calls. If the directory is missing, the plugin is not active.

Once verified, you can safely set Claude Code itself to allow all tools (see [Configuration](#configuration)). The plugin then handles every permission decision, defaulting to `ask` for any command you have not explicitly allowed or denied.

## Configuration

The plugin intercepts tool calls via a `PreToolUse` hook. When the plugin is installed, every tool call passes through the hook before it runs. The hook evaluates your `permissions.yaml` and `permissions.d` rules and returns `allow`, `deny`, or `ask`. This makes the plugin the sole decision-maker, so Claude Code's own permission system must be set to allow all tools. Otherwise Claude Code prompts separately before the hook even runs, resulting in double prompts.

> **Warning:** Only add the allow-all settings below after the plugin is installed and you have verified it is working (see [Verifying the plugin](#verifying-the-plugin)). Once the plugin is active, these settings are safe: every tool call is intercepted by the hook and evaluated against your permissions rules before anything runs, and any call with no matching rule defaults to `ask`. Without the plugin active, however, these settings remove all permission checks and Claude will run every tool call without prompting.

Add the following to your settings to allow all tools. This causes the plugin's hook to be the sole decision-maker. Claude Code still honors any `deny` entries from its other settings layers (for example `~/.claude/settings.json`, a project's `.claude/settings.json`, or managed/enterprise settings); those denies are separate from the plugin's `permissions.yaml` rules.

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

The plugin's PreToolUse hook fires on every tool call and enforces your permissions rules.

### Global configuration (applies to every project)

Add the block above to `~/.claude/settings.json`. Place your global rules in `~/.claude/permissions.yaml` and/or `~/.claude/permissions.d/`. These apply to every project on your machine.

### Local project configuration (applies to one project)

Add the block above to `.claude/settings.json` in your project root. Place your project rules in `.claude/permissions.yaml` and/or `.claude/permissions.d/` at the project root. These are layered on top of your global rules and take precedence when both match. See [Layered files (`permissions.d/`)](docs/CONFIGURATION.md#layered-files-permissionsd) for details.

With either (or both) in place, every tool call flows through your permissions rules and nothing prompts twice.

## Quick start: adding a rule

Add to `.claude/permissions.yaml` in your project root (or `~/.claude/permissions.yaml` for user-global rules). Configuration is reloaded automatically on the next hook run.

Following are some quick examples of rules.

Always allow `git status`:

```yaml
bash:
  git:
    status:
      decide: allow
```

Deny `rm -rf`:

```yaml
bash:
  rm:
    options:
      - r|recursive
      - f|force
    decide: deny
    reason: rm -rf in any format is not allowed
```

Ask before any `git add`, but deny `git add .` outright:

```yaml
bash:
  git:
    add:
      cmd: .
      decide: deny
      reason: Use specific files instead of "git add ."
```

For the full rule syntax (matchers, AND/OR logic, file-path rules, WebFetch rules, cwd scoping) see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Troubleshooting rules

Three tools help when a rule is not behaving as expected:

- **Pending approval files**: when Claude asks you to approve a tool call, open the Markdown file in `.claude/permissions-log/pending/` for the full command, parsed sub-commands, matched rules, and verdict. List outstanding prompts with `ls -t .claude/permissions-log/pending/`, then `cat` the newest file. See [docs/PENDING-APPROVALS.md](docs/PENDING-APPROVALS.md).
- **Audit log** -- every permission decision and tool result is written to `.claude/permissions-log/`. Check it first when you want to understand what just happened.
- **Permission REPL** -- interactive terminal session; type a command and see the full rule trace in colour (`bun run repl`). Requires the repo to be cloned locally.
- **Permission Analyzer MCP server** -- ask Claude to analyze a command: "Use analyze_permission to check why `git push --force` is denied."

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for the full guide.

## Further reading

- [docs/PERMISSIONS-QUICKREF.md](docs/PERMISSIONS-QUICKREF.md) - Concise permissions format reference. Point your AI at this doc when asking it to write or edit your `permissions.yaml`.
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md) - Full rule syntax: matchers, AND/OR logic, file-path rules, WebFetch rules, and cwd scoping.
- [docs/PROTECTING-PRODUCTION.md](docs/PROTECTING-PRODUCTION.md) - Recipes for locking down production environments covering AWS CLI and kubectl.
- [docs/AUDIT-LOG.md](docs/AUDIT-LOG.md) - Audit log format and retention policy for the machine-readable and human-readable logs.
- [docs/PENDING-APPROVALS.md](docs/PENDING-APPROVALS.md) - Pending approval Markdown files written when Claude asks you to approve a tool call.
- [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) - Architecture deep-dive with AST diagrams, env-threading details, and a guide to writing non-trivial rules.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Instructions on cloning, building, and running the plugin locally.
- [docs/TESTING.md](docs/TESTING.md) - Unit tests and smoke tests.
- [docs/PUBLISHING.md](docs/PUBLISHING.md) - Packaging, marketplace release, and CI.
- [docs/CURSOR.md](docs/CURSOR.md) - Disable this plugin in Cursor (Cursor auto-loads Claude hooks, mishandles `ask`, and can auto-allow dangerous commands).
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Troubleshooting rules: pending approval files, audit log, interactive REPL, and MCP server.
- [docs/REPL.md](docs/REPL.md) - Interactive REPL for testing commands against your `permissions.yaml`.
- [docs/MCP-SERVER.md](docs/MCP-SERVER.md) - MCP server that lets Claude explain permission decisions in natural language.

## License

MIT. See [LICENSE](LICENSE).
