# Testing

This doc explains how to run unit tests and smoke tests.

## Commands

```bash
bun run test          # run all unit tests
bun run test:watch    # watch mode
bun run compile       # type-check only (no emit)
bun run smoke         # e2e + AST examples + decision examples
bun run test:all      # validate + unit + every smoke suite
```

## Unit tests

Unit tests live under `src/test/` mirroring the source tree. 

To run a single unit test file or a matching test name:

```bash
bun run test -- src/test/rules/bash-rule.test.ts
bun run test -- src/test/rules/bash-rule.test.ts -t "cmd-in regex"
```

## Smoke tests

AST examples live under [`examples/ast/`](../examples/ast). Decision examples live under [`examples/decision/`](../examples/decision).

Run all examples:

```bash
./scripts/smoke-tests-bash-parser.sh
./scripts/smoke-tests-decision.sh
```

Run one example:

```bash
bun scripts/check-example.ts and-operator
bun scripts/check-decision.ts bash-cmd-in
```

Run one e2e smoke test:

```bash
bun run scripts/run-e2e-test.ts e2e/bash/bash-and-both-allow
```

## Checking a config against the examples in its rules

The tests above cover this engine. `scripts/check-config.ts` checks a permissions configuration instead: it collects every [rule example](CONFIGURATION.md#rule-examples) written into a config, decides each one by calling `analyzePermission` from `src/analyze.ts` in process, and fails when the decision differs from the one the example is listed under, or when a rule carries no example at all. Nothing is replayed through the REPL: the REPL is for a human to type into, and this script never starts one.

```bash
bun run check-config <config-dir>
```

`<config-dir>` is the one positional argument: the `.claude` directory holding `permissions.yaml` and `permissions.d`. The project holding that directory is accepted in its place.

The rules load from the config directory you pass, and its parent supplies the home rules, so the config under test is the whole story.

The examples are decided against a stand-in project directory, `/project`. That is what `${{PROJECT_DIR}}` expands to while checking, what a relative `cwd` resolves against, and the working directory an example runs in unless the example names its own `cwd`. It does not have to exist, so an example names files the way a person would rather than naming one machine's directories.

Checking a config repo checked out beside this one, from this repo's directory:

```bash
bun run check-config ../agent-config/home/.claude
```

The two options are `--filter <text>`, which checks only the examples whose command or file contains the text, and `--list`, which prints the collected examples and exits without checking them.

```bash
bun run check-config ../agent-config/home/.claude --filter "git tag"
bun run check-config ../agent-config/home/.claude --list
```

It exits 1 when an example fails or a rule has no usable example.

[agent-config](https://github.com/ashleydavis/agent-config) runs this on every push and pull request, in a workflow that checks out both repos side by side.

## Deciding one call from another project

`scripts/decide.ts` answers a single tool call the way a session in another project would, which is what writing a new example needs before the example claims anything:

```bash
bun run decide <project-dir> "<tool call>"
```

The project directory is the first input: its `.claude` rules are loaded, `${{PROJECT_DIR}}` expands to it, and the call is judged as if it had been typed there. That project's `.claude` directory is accepted in its place. The global rules come from the home directory, as in a live session. The tool call is written in the same notation the REPL takes, so a bare command is Bash and a prefix names another tool (`read <path>`, `write <path>`, `edit <path>`, `webfetch <url>`, `tool <name>`).

```bash
bun run decide ../agent-config "git tag --list"
```

It prints the trace, which names the rule that decided and the file and line it lives on, then the decision and its reason. Like `check-config`, it decides in process through `analyzePermission` and does not start the REPL. It exits 1 on a bad argument or a config that fails to load.

## CI

The `ci` workflow runs on every push and pull request, compiles the code and runs all tests.
