# expressive-permissions

A robust, configurable, flexible and decidedly not annoying expressive permissions system for Claude Code. Easily allow everything that's safe. Easily deny everything that's dangerous. Prompt the user for everything else.

This is a plugin for Claude Code to handle permissions. You delegate all of Claude's permission requests to this plugin and then it decides, through rules you have laid down in YAML configuration files, whether to allow or deny any particular tool use or command invocation.

It converts each tool call into an abstract syntax tree (AST), threads a simulated environment (cwd + env vars) through the tree, and runs your rules at every node. This gives you permissions that work even when commands are embedded in a variable-order pipeline, paths are buried in arguments, or the working directory and environment change mid-pipeline.

> The project [README](https://github.com/ashleydavis/expressive-permissions#readme) covers installation, motivation, and a quick start. The pages below are the full documentation.

## Documentation

- [Permissions quick reference](PERMISSIONS-QUICKREF.md) - Concise permissions format reference. Point your AI at this doc when asking it to write or edit your `permissions.yaml`.
- [Configuration](CONFIGURATION.md) - Full rule syntax: matchers, AND/OR logic, file-path rules, redirect path rules, WebFetch rules, and cwd scoping.
- [How it works](HOW_IT_WORKS.md) - Architecture deep-dive with AST diagrams, env-threading details, and a guide to writing non-trivial rules.
- [Protecting production](PROTECTING-PRODUCTION.md) - Recipes for locking down production environments covering AWS CLI and kubectl.
- [Audit log](AUDIT-LOG.md) - Audit log format and retention policy for the machine-readable and human-readable logs.
- [Pending approvals](PENDING-APPROVALS.md) - Markdown files written when Claude asks you to approve a tool call; open these while deciding on a prompt.
- [Cursor](CURSOR.md) - Disable this plugin in Cursor: turn off third-party Claude hook import (Cursor mishandles those hooks).
- [Troubleshooting](TROUBLESHOOTING.md) - Troubleshooting rules: pending approval files, audit log, interactive REPL, and MCP server.
- [REPL](REPL.md) - Interactive REPL for testing commands against your `permissions.yaml`.
- [MCP server](MCP-SERVER.md) - MCP server that lets Claude explain permission decisions in natural language.
- [Development](DEVELOPMENT.md) - Instructions on cloning, building, and running the plugin locally.
- [Testing](TESTING.md) - Unit tests and smoke tests.
- [Publishing](PUBLISHING.md) - Packaging, marketplace release, and CI.

## License

MIT. See [LICENSE](https://github.com/ashleydavis/expressive-permissions/blob/main/LICENSE).
