# Issues

This doc lists known design and implementation problems. Add one section per issue; list affected examples under each.


## Redirect rules

There is one factory and two rules. Two rules might be necessary. Might be possible to refactor to one parameterized rule.


## User feedback

Make sure we have Rust or Elm style error messages that show the file and line that loaded a rule.


## Command substitutions use a sidecar field instead of AST nodes

Backtick and `$(...)` substitutions are not represented as proper intermediate nodes (unlike `redirect`). The outer `command` keeps the substitution as literal text in `cmd`, and inner commands are attached on `substitutions[]` on the same leaf.

For `echo $(whoami)` the tree should be three levels deep: a `command` node for `echo`, a child substitution node for `$(whoami)`, and a child `command` node for `whoami` inside that substitution. The mermaid diagrams in the affected examples already show this shape, but the YAML does not: `cmd` still holds the literal `$(whoami)` string and `whoami` is parked on a sibling `substitutions[]` array instead of nesting under a substitution node.

**Recommended fix:** Add a proper substitution AST node (like `redirect`) and put the inner command tree under it, instead of keeping backticks or `$(...)` as literal text in `cmd` with a sidecar `substitutions` array on the same leaf.

Illustrative target shape for `echo $(whoami)`:

```yaml
type: command
commandName: echo
options: {}
cmd: []   # or a structured word list; not the literal "$(whoami)"
envPrefix: {}
source: "echo $(whoami)"
substitution:          # new node type, analogous to redirect.command
  type: substitution   # or command_substitution
  source: "$(whoami)"
  command:
    type: command
    commandName: whoami
    options: {}
    cmd: []
    envPrefix: {}
    source: "whoami"
```

Same hierarchy applies to backtick form (`rm \`cat list\``: `rm` command → backtick substitution node → `cat` command).

**Affected examples:**

- `examples/ast/backtick-substitution/`
- `examples/ast/command-substitution/`


## AST child fields are ad hoc per node type

Each node type exposes children on differently named fields (`left`/`right`, `ast`, `body`, `child`, `condition`, `thenBranch`, `clauses`, `substitutions`, and so on). Walkers must special-case every type to find and recurse into children.

**Recommended fix:** Refactor every AST node so child references live under a single `children` object. Named children use their role as the key (e.g. `left`, `right`, `body`, `condition`). When a node has only a positional list of children, store them under `children._` as an array.

Example shapes (illustrative):

```yaml
# binop: named children
type: binop
op: "&&"
children:
  left: { ... }
  right: { ... }

# case_statement: positional children under _
type: case_statement
word: foo
children:
  _: [ { type: command, ... }, { type: command, ... } ]
```

A generic visitor can then walk any node by iterating `children` keys (and recursing into `children._` when present) instead of maintaining a separate dispatch table per node type.

**Affected:** entire AST representation (`src/types.ts`, `src/build-ast.ts`, all walkers and interpreters, all `examples/ast/`).


## File paths are flat fields, not AST child nodes

For Read, Write, Edit, and MultiEdit tool calls, `file_path` is a scalar field on the tool root node (e.g. `type: edit` with `file_path: /tmp/foo.ts`). Rules in `write:`, `edit:`, and similar sections match only when the walker is at that root and inspect `node.file_path` directly.

Bash shell redirects work differently and already expose file targets on intermediate nodes. Each redirect is a `redirect` node with a `target` field; `redirect.out` / `redirect.in` rules fire during tree traversal on those nodes, independent of the inner command. That gives granular, path-centric policy for shell file I/O without a separate `bash:` rule per command.

If file-tool targets were represented as child AST nodes (analogous to `redirect` wrapping a command with a `target`), the same walk-and-match model could apply to Edit, Write, and MultiEdit. A unified file-access policy could cover redirect targets, file-tool paths, `other`-tool paths, and Bash command arguments in one place, with path rules evaluated at the target node during traversal instead of only at the tool root or command leaf.

Illustrative target shape for `Edit` on `/tmp/foo.ts`:

```yaml
type: file_write          # new intermediate node, analogous to redirect
path: /tmp/foo.ts
operation:
  type: edit
  old_string: foo
  new_string: bar
```

Read tools could use a sibling `file_read` node with the same `path` field for symmetry.

The same applies to `other` tools whose `tool_input` carries path-like fields. For example, `Grep` with `path: /tmp` is today a single `other` leaf with the path buried in opaque `tool_input`; a child file-target node would allow path-centric rules during traversal instead of tool-specific matchers on the raw input blob.

Bash command arguments and flag values that are paths (including those marked `kind: path` in command descriptors) are still flat strings in `cmd` or `options` on the `command` leaf. A `cd /tmp`, `mv src/main.ts dist/main.ts`, or `git -C /some/path` does not yield path child nodes the way a redirect does.

**Recommended fix:** Introduce intermediate file-target AST nodes (`file_write`, `file_read`, or similar) that hold the resolved path and wrap the operation-specific payload. Teach walkers and YAML matchers to evaluate path rules on those nodes the way `redirect.out` / `redirect.in` work today. Extend the same model to descriptor-known path positionals and path-valued flags on Bash commands, and to path fields lifted out of `other` tool inputs.

**Reference examples (desired shape today for Bash redirects):**

- `examples/ast/redirect-and-binop/`: `echo hi > out.txt` after `cd /tmp`; `target: out.txt` on a `redirect` node separate from the inner `echo` command
- `examples/ast/redirect-append/`: `>> bar.txt`
- `examples/ast/redirect-fd-merge/`: `> out.log` with `2>&1`
- `examples/ast/redirect-stderr/`: `2> err.log`
- `examples/ast/redirect-stdin/`: `< in.txt`
- `examples/ast/redirect-stdout/`: `> out.log`
- `examples/ast/redirect-stdout-echo/`: `echo foo > bar.txt`

**Affected examples (file tools, flat `file_path` on tool root):**

- `examples/ast/read-basic/`
- `examples/ast/write-basic/`
- `examples/ast/edit-basic/`
- `examples/ast/edit-replace-all/`
- `examples/ast/multiedit-single/`
- `examples/ast/multiedit-multiple/`

**Affected examples (`other` tools, path buried in opaque `tool_input`):**

- `examples/ast/grep-basic/`: `path: /tmp`

**Affected examples (Bash commands, paths flat in `cmd` or `options`):**

- `examples/ast/and-operator/`: `cd /tmp`
- `examples/ast/backtick-substitution/`: `cat list` (path positional inside substitution)
- `examples/ast/cd/`: `cd /tmp`
- `examples/ast/flag-long-boolean/`: `rm ... /tmp`
- `examples/ast/flag-ls-combined/`: `ls ... /tmp`
- `examples/ast/flag-path-value/`: `git -C /some/path` (path in `options.C`, descriptor `kind: path`)
- `examples/ast/flag-short-separate/`: `rm ... /tmp`
- `examples/ast/if-in-for-loop/`: `cd /work/tf-config`, `diff ... variant-1a/$f variant-2/$f` (also contains redirect targets on `redirect` nodes; see reference examples above)
- `examples/ast/if-statement/`: `test -f f`
- `examples/ast/multiple-positionals/`: `mv src/main.ts dist/main.ts`
- `examples/ast/nested-and-pipe/`: `cd /some/path`
- `examples/ast/redirect-and-binop/`: `cd /tmp` (redirect half already correct; see reference examples above)
- `examples/ast/subshell/`: `cd src`
- `examples/ast/until-loop/`: `test -f /tmp/ready`
- `examples/ast/xargs/`: `find .`


## Standalone env assignments reuse an empty command node

A bare `FOO=bar` assignment is represented as a `command` node with `commandName: ""`, empty `cmd`, and the vars parked on `envPrefix`. That overloads the command leaf: it is not a command at all, and walkers must special-case `commandName === ""` to distinguish standalone assignment from `FOO=bar cmd` (where the same `envPrefix` field means something different semantically).

**Recommended fix:** Introduce a dedicated env-assignment AST node (e.g. `env_set` or `env_assignment`) that holds the variable map. Any command scoped by those vars becomes a child of that node instead of carrying `envPrefix` on the command leaf.

Illustrative target shapes:

```yaml
# standalone: FOO=bar
type: env_set
vars:
  FOO: "bar"
source: "FOO=bar"

# prefix: FOO=bar cmd
type: env_set
vars:
  FOO: "bar"
source: "FOO=bar cmd"
child:
  type: command
  commandName: cmd
  options: {}
  cmd: []
  source: "cmd"
```

For `FOO=bar && cmd`, the env-set node would be the left child of the `binop`; the right `cmd` command would not inherit `FOO` unless the shell semantics thread env through the sequence (today `envSetRule` updates env for subsequent siblings in a sequence).

Built-in rules `envSetRule` and `envPrefixRule` would move to match and walk the new node type instead of inspecting empty commands.

**Affected examples:**

- `examples/ast/env-assignment/`
- `examples/ast/env-prefix/`
- `examples/ast/multi-env-prefix/`
- (and any example where `envPrefix` appears on a `command` node)


## Shell quoting is incomplete

The Bash lexer in `src/parse-bash.ts` handles basic single and double quotes for typical agent commands (e.g. `echo "hello world"`, flag values, env-prefix values). Several Bash quoting rules are missing or wrong.

**Lexer gaps (`lex()`):**

- **Double-quote backslash rules:** Inside `"..."`, Bash only treats `\` as special before `$`, `` ` ``, `"`, `\`, or newline. Other sequences such as `"\n"` and `"\t"` keep the backslash. The lexer strips any `\` + character pair, so `"\n"` becomes `n` instead of `\n`.
- **Empty quoted words:** `""` and `''` are valid empty arguments in Bash (`echo "" foo` passes three words). The lexer drops words when `wordValue.length === 0`, so empty quoted args never become tokens.
- **ANSI-C quoting (`$'...'`):** Not interpreted; `$'hello\nworld'` is kept as the literal string `$hello\nworld` instead of expanding escape sequences.
- **Locale quoting (`$"..."`):** Not interpreted; `$"hello"` is kept as `$hello`.

**Substitution extraction ignores quote context (`extractSubstitutions()`):**

After lexing, `extractSubstitutions()` scans resolved word text for `$(...)` and backticks without knowing whether those characters were inside quotes or escaped. Bash does not run substitutions in those positions, but the permission hook still evaluates the inner command. This can over-enforce: deny or ask about a nested command that would never execute.

| Command | Bash runs inner command? | Hook today |
| --- | --- | --- |
| `echo '$(whoami)'` | No (literal text) | Yes |
| `echo "\$(whoami)"` | No (escaped `$`) | Yes |
| `echo $(whoami)` | Yes | Yes |
| `echo "$(whoami)"` | Yes | Yes |

**Recommended fix:** Teach `lex()` Bash-accurate double-quote backslash rules, emit tokens for empty quoted words, and optionally add `$'...'` / `$"..."` if needed. Track which spans of each word were single-quoted, double-quoted, or backslash-escaped during lexing (or extract substitutions during lex with quote context), and skip `extractSubstitutions()` matches inside single quotes or after an escaped `$` in double quotes.

**Affected examples:**

- `examples/ast/quoted-arg/` (basic double quotes work; documents the quoting surface)
- `examples/ast/command-substitution/` (unquoted and double-quoted `$(...)`; quote-context bug affects single-quoted and escaped forms not yet illustrated)
- `examples/ast/backtick-substitution/` (same for backticks inside quotes)


## `cmd-in` path globs match non-path positionals

When a `cmd-in` pattern is path-style (`/` or `./` prefix), every positional is resolved against cwd before glob matching. `cmd-in` is OR across all positionals, so a non-path argument that happens to look relative can satisfy a project-scoped path glob.

Example: with cwd in the project and rule `cmd-in: ["${{PROJECT_DIR}}/**"]`, `sed s/a/b/ /etc/passwd` allows because `s/a/b/` resolves to a path under the project, even though the only file argument is outside it.

**Recommended fix:** For path-style `cmd-in` patterns, only match positionals (and flag values) that command descriptors mark as `kind: path`, or otherwise skip arguments that are not path-like. Keep glob and `/regex/` matching for non-path patterns unchanged.

**Example to add** as `examples/decision/bash-cmd-in-path-ignores-non-path-positional/index.yaml` once fixed (must not land in the suite while it fails):

```yaml
description: "bash: cmd-in path glob should not match a non-path positional under the project"
input:
  tool_name: Bash
  tool_input:
    command: sed s/a/b/ /etc/passwd
  cwd: ${PROJECT_DIR}
rules:
  bash:
    sed:
      cmd-in:
        - ${{PROJECT_DIR}}/**
      decide: allow
      reason: Allow sed on files within the project directory
expected:
  decision: ask
```

**Affected examples:**

- `examples/decision/bash-cmd-in-projectdir-relative-allow/` (intended relative file match; also passes via the sed script positional)
