# Configuration

This doc explains the configuration of your permissions rules.


- [Structure overview](#structure-overview)
- [Rule load order](#rule-load-order)
- [Main file (`permissions.yaml`)](#main-file-permissionsyaml)
- [Layered files (`permissions.d/`)](#layered-files-permissionsd)
- [Command descriptor files (`commands/`)](#command-descriptor-files-commands)
- [Pattern matching](#pattern-matching)
- [Matching field values](#matching-field-values)
- [Short and long flag forms](#short-and-long-flag-forms)
- [Matching multiple fields](#matching-multiple-fields)
- [Positional argument matching](#positional-argument-matching)
- [Matching field values with OR](#matching-field-values-with-or)
- [Matching environment variables](#matching-environment-variables)
- [Matching the working directory](#matching-the-working-directory)
- [Matching file contents](#matching-file-contents)
- [Inverting matches](#inverting-matches)
- [Matching one of multiple rules](#matching-one-of-multiple-rules)
- [Nested rules](#nested-rules)
- [Subcommand matching](#subcommand-matching)
- [File tool rules](#file-tool-rules-read-write-edit-multi_edit)
- [WebFetch rules](#webfetch-rules)
- [Redirect path rules](#redirect-path-rules)
- [Grep rules](#grep-rules)
- [Generic tool rules](#generic-tool-rules)
- [Decision values](#decision-values)
- [Strictest wins](#strictest-wins)
- [Field form reference](#field-form-reference)
- [Field reference](#field-reference)
- [Rule examples](#rule-examples)


## Structure overview

The top-level keys are either **section names** (`bash`, `read`, `write`, `edit`, `multi_edit`, `webfetch`, `redirect`, `Grep`) or **generic tool patterns** for everything else (`ToolSearch`, `"mcp__*__delete_*"`, ...). Bash rules nest under the `bash:` section keyed by command name.

For commands that take subcommands (e.g. `git`, `npm`), nest rules under the subcommand name. For commands without subcommands (e.g. `rm`, `sudo`), put rules directly under the command name.

```yaml
bash:
  # Shell command
  ls:
    decide: allow          # allow | deny | ask
    reason: List directory # optional; shown to the user

  git:
    status:                # subcommand
      decide: allow
      reason: Readonly git status

# File tool section (also write, edit, multi_edit)
read:
  path: "${{PROJECT_DIR}}/**"
  decide: allow
  reason: Read files in the project

# WebFetch section: match by hostname
WebFetch:
  host: docs.anthropic.com
  decide: allow
  reason: Official docs

# Generic tool: top-level key is the tool name (or a glob)
ToolSearch:
  decide: allow
  reason: Search available tools
```

Configuration is reloaded automatically on the next hook run, so edits apply without `/reload-plugins`.

## Rule load order

Rules load in this order:

1. Built-ins (semantic rules for `cd`, `export`, and env-prefix handling; see [Built-in rules](HOW_IT_WORKS.md#built-in-rules))
2. Home main (`~/.claude/permissions.yaml`) → home `permissions.d` files (alphabetical)
3. Project main (`.claude/permissions.yaml`) → project `permissions.d` files (alphabetical)

All rules end up in one flat list. At each AST node, rules run in this order. A `deny` decision short-circuits remaining rules at the same node. For how multiple matching decisions combine, see [Strictest wins](#strictest-wins).

## Main file (`permissions.yaml`)

The main permissions file is a single YAML document:

- `.claude/permissions.yaml` (project)
- `~/.claude/permissions.yaml` (user-global)

Use this when you want one place for all rules. A missing file is fine; rules can live only in `permissions.d/` instead.

Project main rules load after home main rules. See [Layered files](#layered-files-permissionsd) for how `permissions.d` files fit into the full order.

## Layered files (`permissions.d/`)

In addition to the main `permissions.yaml` files, you can split rules across multiple YAML files inside a `permissions.d/` directory:

- `~/.claude/permissions.d/*.yaml` (home-level `permissions.d` files)
- `<project-dir>/.claude/permissions.d/*.yaml` (project-level `permissions.d` files)

Each `permissions.d` file is loaded as its own isolated layer:

- **Discovery**: files ending in `.yaml` or `.yml` are picked up. Dotfiles and subdirectories are ignored. Files are loaded in lexicographic order (`aws.yaml`, `bun.yaml`, `git.yaml`).
- **Per-file isolation**: each file is its own layer. Strictest-wins applies inside a file, deny short-circuits across files. A `deny` rule in any `permissions.d` file always wins over `allow` rules in sibling `permissions.d` files.
- **Layer order**: within each location, `permissions.d` files run **after** the corresponding main `permissions.yaml`. The full order is: home main → home `permissions.d` files (alphabetical) → project main → project `permissions.d` files (alphabetical). Deny anywhere in the chain short-circuits the rest.

This lets you copy a single curated file (e.g. `aws.yaml`, `git.yaml`) into the directory rather than hand-merging a monolithic config.

## Command descriptor files (`commands/`)

The Bash parser needs to know which flags consume a value (arity 1) versus which are boolean (arity 0, this is the default). It also needs to know which positional arguments are file paths (subject to `${{PROJECT_DIR}}` expansion and `cmd` glob matching) versus plain strings. This information comes from **command descriptor YAML files**.

Descriptor files live in the `commands/` subdirectory under the standard `permissions.d` directories:

- `~/.claude/permissions.d/commands/<command>.yaml` -- home-level (global)
- `<project-dir>/.claude/permissions.d/commands/<command>.yaml` -- project-level

The project layer wins: if both define a flag, the project descriptor takes precedence.

### Descriptor format

The top-level key is the command name. The `source` field is a URL to the official documentation for the command -- it is not used by the engine but serves as a reference when reviewing or auditing descriptor files. Under it:

```yaml
grep:
  description: Search file contents with patterns
  source: https://www.gnu.org/software/grep/manual/grep.html
  flags:
    e|expression:
      arity: 1
      kind: string
      description: Pattern to search for
    f|file:
      arity: 1
      kind: path
      description: File containing patterns
    r|recursive:
      arity: 0
      kind: string
      description: Recurse into directories
  positionals:
    - kind: string
      description: Pattern
    - kind: path
      description: File or directory to search
      variadic: true
```

**Flags:**

| Field | Values | Meaning |
|---|---|---|
| `arity` | `0` (default) | Boolean flag -- does not consume the next token |
| `arity` | `1` | Value flag -- consumes the next token as its value |
| `kind` | `path` | Value is a file path (expanded with `${{PROJECT_DIR}}`) |
| `kind` | `string` | Value is a plain string |

Flags not listed in the descriptor default to arity 0. You only need to list value-taking flags (arity 1); boolean flags can be omitted.

Use `|` to declare short and long forms together: `r|recursive` means both `-r` and `--recursive` resolve to this entry. The alias group is expanded at load time, so rules that match `options: [r|recursive]` work regardless of which form the user typed.

**Positionals:**

| Field | Values | Meaning |
|---|---|---|
| `kind` | `path` | Positional is a file path; matched by `cmd` glob rules and expanded with `${{PROJECT_DIR}}` |
| `kind` | `string` | Positional is a plain string; matched by `cmd` as a literal |
| `variadic` | `true` | All remaining positionals from this index onward share this descriptor |

### Without a descriptor

If no descriptor exists for a command, every flag defaults to arity 0 (boolean). This means `--context prod-cluster` is parsed as the flag `--context` with no value, and `prod-cluster` becomes a positional argument. Rules that match on `options: {context: prod-cluster}` will not fire; rules that match on `cmd: prod-cluster` will. Add a descriptor to get correct parsing for flags that take values.

### Example: kubectl descriptor

```yaml
# .claude/permissions.d/commands/kubectl.yaml
kubectl:
  description: Kubernetes CLI
  source: https://kubernetes.io/docs/reference/kubectl/
  flags:
    context:
      arity: 1
      kind: string
      description: Kubeconfig context name
    n|namespace:
      arity: 1
      kind: string
      description: Kubernetes namespace
    replicas:
      arity: 1
      kind: string
      description: Number of replicas
```

With this file in place, `kubectl delete pod mypod --context prod-cluster` correctly sets `options.context = "prod-cluster"` and `cmd = ["delete", "pod", "mypod"]`.

## Pattern matching

Every string value is pattern matched using one of the three following forms.

### Exact string

If the value contains no glob metacharacters and is not wrapped in `/`, it is matched literally.

### Globs

The default for values that contain metacharacters. Powered by [picomatch](https://www.npmjs.com/package/picomatch).

| Wildcard | Matches |
|---|---|
| `*` | Any sequence of characters within a single path segment (no `/`) |
| `**` | Any number of path segments (including none) |
| `?` | Any single character |
| `{a,b}` | Either `a` or `b` (alternation) |

Examples:
- `"**/.env*"` - any `.env` file at any depth
- `"src/**"` - anything under `src/`
- `"*.{ts,tsx}"` - any TypeScript file in the current directory

Note: `*` and `**` traverse hidden path segments (those beginning with `.`) the same as any other segment. So `"src/**"` matches `src/.git/HEAD`, and `"./**"` matches `./plugin/.claude-plugin/plugin.json`. (This is a deliberate departure from picomatch's default `dot: false`; users almost always mean "anything under here" when they write `./**`.)

### Regular expressions

Wrap in `/` slashes. The content between the slashes is passed to `new RegExp(...)`.

Examples:
- `"/(http|ftp)://"` - matches either HTTP or FTP URLs
- `"/^[0-9]+$/"` - matches strings that are purely numeric

## Matching field values

All patterns in an array or list are AND'd together (except `<field>-in` fields - explained in a moment). A rule only matches if every pattern in the array matches.

A single value matches directly against the field:

```yaml
bash:
  rm:
    cwd: /etc/**
    decide: deny
```

This example rule denies any `rm` command run from `/etc/` or any subdirectory beneath it.

For fields that can satisfy multiple patterns simultaneously, the array form requires all to match:

```yaml
bash:
  rm:
    options: [r, f]
    decide: deny
```

Or equivalently in list form:

```yaml
bash:
  rm:
    options:
      - r
      - f
    decide: deny
```

These example rules match only when both `-r` and `-f` are present.

The `-in` form switches any field to OR semantics. For `options-in`, the rule matches when any one of the listed flags is present:

```yaml
bash:
  git:
    push:
      options-in:
        - force
        - force-with-lease
      decide: ask
      reason: Confirm force push
```

This asks for confirmation before any `git push --force` or `git push --force-with-lease`.

For single-value fields like `cwd` or `path`, use the `-in` form to match any one of a list of patterns:

```yaml
bash:
  rm:
    cwd-in:
      - /etc/**
      - /usr/**
    decide: deny
```

This matches when the cwd is `/etc/` or `/usr/`, or any subdirectory beneath them.

See the [field form reference](#field-form-reference) at the end of this document for the full syntax table.

## Short and long flag forms

Use `|` in a flag name to match either the short or long form:

```yaml
bash:
  rm:
    options:
      - r|recursive
    decide: deny
```

This matches both `-r` and `--recursive`. The same syntax works as an object key:

```yaml
bash:
  rm:
    options:
      r|recursive: true
    decide: deny
```

## Matching multiple fields

All fields in a rule must match simultaneously (AND semantics). 

An example that matches the subcommand (`commit`) a particular argument (`m` or `message`) and the argument value (any string containing `wip`):

```yaml
bash:
  git:
    commit:
      options:
        m|message: "/wip/"
      decide: deny
      reason: Don't commit with WIP messages
```

This example rule only matches when both the subcommand and the argument value matches, for example `git commit -m "just a bit of wip"` would be a match.

All fields in a rule are AND'd together. This example matches a subcommand, an argument value, an environment variable, and a working directory, all of which must match simultaneously:

```yaml
bash:
  git:
    push:
      options:
        remote: origin
      env:
        CI: "true"
      cwd: /projects/**
      decide: deny
      reason: No pushes to origin from CI inside /projects
```

This matches only when `git push --remote origin` is called with `CI=true` set and the working directory is under `/projects/`.

## Positional argument matching

Use `cmd` to match positional arguments (non-flag values on the command line). Each word in the string is tested against the positional argument at the same index. Extra positional arguments beyond the pattern are ignored.

A single word tests only the first positional argument:

```yaml
bash:
  curl:
    cmd: "https://*"
    decide: allow
```

A space-separated string tests each word against the argument at the same position:

```yaml
bash:
  mv:
    cmd: "src/** dist/**"
    decide: ask
    reason: Confirm moving files from src to dist
```

This matches when the first argument matches `src/**` and the second matches `dist/**`, for example `mv src/main.ts dist/main.ts`.

You can also use an array to match multiple positional arguments -- it is equivalent to the space-separated string form:

```yaml
bash:
  mv:
    cmd:
      - "src/**"
      - "dist/**"
    decide: ask
    reason: Confirm moving files from src to dist
```

Each word can be any pattern, including a regex:

```yaml
bash:
  curl:
    cmd: "/(http|ftp):/"
    decide: deny
    reason: Only HTTPS allowed
```

## Matching field values with OR

The `-in` form works for all fields. For positional arguments, `cmd-in` matches when any positional argument matches any entry in the list:

```yaml
bash:
  curl:
    cmd-in:
      - http://*
      - ftp://*
    decide: deny
    reason: Only HTTPS allowed
```

**Environment variable expansion**: before a positional argument is matched (for both `cmd` and `cmd-in`), any `$NAME` or `${NAME}` reference in it is expanded using the variables known at that point in the command. Those come from `X=Y` assignments earlier in the same command, an inline prefix (`X=Y cmd`), or `export X=Y`, threaded through `;` and `&&`. So with `B=/tmp/out.txt; sed -i 's/a/b/' "$B"`, the rule sees `/tmp/out.txt` and a `cmd-in: ["/tmp/**"]` matcher fires. A reference whose variable is not known (set in an earlier, separate command, or only in the real shell's environment) is left literal, so it will not match an allowed path and falls through to the default ask.

For file paths, `path-in` matches when the path matches any entry:

```yaml
read:
  path-in:
    - "**/.env*"
    - "**/.netrc"
    - ~/.ssh/*
  decide: ask
  reason: Confirm before reading secrets
```

Or use glob alternation to match one value against one or more alternatives:

```yaml
read:
  path: "**/{.env*,.netrc,.ssh/*}"
  decide: ask
  reason: Confirm before reading secrets
```

## Matching environment variables

Use `env` to match against environment variables. All key/value pairs must match simultaneously (AND semantics):

```yaml
bash:
  git:
    push:
      env:
        CI: "true"
      decide: deny
      reason: No pushes from CI
```

Values follow the same pattern matching rules as other fields: exact string, glob, or `/regex/`.

## Matching the working directory

The `cwd` field accepts any pattern form.

### Anchoring rules to the project directory

Use `${{PROJECT_DIR}}` to anchor a rule to the project root. The engine substitutes the token with the value of `CLAUDE_PROJECT_DIR` before any pattern matching runs:

```yaml
bash:
  git:
    add:
      cwd: ${{PROJECT_DIR}}/**
      decide: allow
    commit:
      cwd: ${{PROJECT_DIR}}/**
      decide: allow
    push:
      cwd: ${{PROJECT_DIR}}/**
      decide: ask
      reason: Confirm push from project directory
```

That example allows `git add` and `commit` within the project you are currently working in (and no other project on your computer). `git push` is set to always `ask`.

Similarly, `${{HOME}}` expands to the value of the `HOME` environment variable:

```yaml
bash:
  rm:
    cwd: ${{HOME}}/**
    decide: ask
    reason: Confirm before deleting from home directories
```

Both tokens are expanded in every pattern field that can name a path: `cwd`, `cwd-in`, `cmd` (string and array forms), `cmd-in`, `options` values, and the `path` / `file` fields of the file-tool sections. A token in an `env` value is not expanded, because those match environment variables rather than paths.

Expanding them in `options` values is how a rule pins a flag that redirects the command at another directory. `git -C` is the example that matters: `cwd` says where the shell is, not which repository git changes, so without the flag pinned an otherwise well-scoped rule would allow `git -C /any/other/repo ...`.

```yaml
bash:
  git:
    merge:
      options:
        C: ${{PROJECT_DIR}}
      decide: allow
      reason: Merge in this project only
```

For positional `cmd` patterns, a leading `./` anchors to `${{PROJECT_DIR}}` (or the cwd when that env var is unset). Prefer `${{PROJECT_DIR}}` in `cwd:` patterns.

A glob matches any path under a directory:

```yaml
bash:
  rm:
    cwd: /home/**
    decide: ask
    reason: Confirm before deleting from home directories
```

A regex can match patterns that globs cannot express:

```yaml
bash:
  rm:
    cwd: /\/projects\/[^/]+-prod\//
    decide: deny
    reason: No deletions in production project directories
```

Use `cwd-in` to match any one of several directories:

```yaml
bash:
  rm:
    cwd-in:
      - /etc/**
      - /usr/**
    decide: deny
    reason: No deleting from system directories
```

Use absolute globs for system-wide restrictions:

```yaml
bash:
  rm:
    cmd: /etc/**
    decide: deny
    reason: No deleting from /etc
```

## Matching file contents

Use `file` to match based on the existence or contents of a file on disk. The key is the file path (tilde-expanded).

To check that a file exists:

```yaml
bash:
  kubectl:
    - file:
        ~/.kube/config: true
      decide: ask
      reason: A kubeconfig is present
```

To check that a file exists and its contents match a pattern, add a `contains:` key:

```yaml
bash:
  kubectl:
    - file:
        ~/.kube/config:
          contains: "current-context: sandbox"
      decide: allow
      reason: Anything goes in the sandbox context
```

The `contains:` value follows the same pattern matching rules as other fields: exact string, glob, or `/regex/`. For example, to match any non-production context:

```yaml
bash:
  kubectl:
    - file:
        ~/.kube/config:
          contains: "/current-context: (?!prod)/"
      decide: allow
      reason: Non-production context detected
```

The rule matches when the file exists and (if `contains:` is set) its contents match the pattern. If the file is absent, the condition does not match.

## Inverting matches

Use `not:` on bash entries to invert a set of conditions. Only these fields are allowed under `not:`: `env`, `file`, `cmd-in`, `options` (flag names as an array; presence AND), and `options-in` (flag names; presence OR). The rule matches when the fields inside `not:` do **not** all match simultaneously.

Invert an environment variable match:

```yaml
bash:
  aws:
    - not:
        env:
          AWS_PROFILE: sandbox
      decide: deny
      reason: AWS writes blocked outside sandbox
```

This matches any `aws` command where `AWS_PROFILE` is not `sandbox`.

Invert a positional match with `cmd-in`:

```yaml
bash:
  kubectl:
    - not:
        cmd-in:
          - get
      decide: ask
      reason: Confirm kubectl when get is not among the positionals
```

Invert a file condition:

```yaml
bash:
  kubectl:
    - not:
        file:
          ~/.kube/config:
            contains: "current-context: sandbox"
      decide: ask
      reason: Confirm kubectl outside sandbox context
```

This matches when `~/.kube/config` exists but does not contain the given string.

## Matching one of multiple rules

You can write a single rule (object) or a list of rules for the same entry. Use a list when you need multiple rules at the same subcommand level, for example to cover several distinct cases. The strictest matching decision wins across all rules that match (deny beats ask beats allow beats abstain).

Single rule:

```yaml
bash:
  rm:
    decide: deny
    reason: rm is not allowed
```

List of rules:

```yaml
bash:
  rm:
    - options:
        - r|recursive
        - f|force
      decide: deny
      reason: rm -rf is not allowed
    - options:
        - r|recursive
      decide: ask
      reason: Confirm before removing recursively
```

Distinct matchers in one list:

```yaml
bash:
  git:
    add:
      - cmd: .
        decide: deny
        reason: Use specific files instead of git add .
      - cwd: /etc/**
        decide: deny
        reason: No staging files from /etc
```

## Nested rules

Use a `rules:` key to group a set of rules under a shared set of matching fields. The sub-rules only run when the parent fields match -- any combination of `cmd`, `options`, `env`, `cwd`, `path`, or `file` can be used. This avoids repeating the same fields on every rule.

```yaml
bash:
  aws:
    # Only evaluate the sub-rules when the profile is not sandbox
    - env:
        AWS_PROFILE: /^(?!sandbox$)/
      rules:
        - cmd: "* delete-*"
          decide: deny
          reason: Deletes on non-sandbox profiles risk permanent data loss.
        - cmd: "* create-*"
          decide: deny
          reason: Creates on non-sandbox profiles may incur unexpected costs.
        - decide: ask
          reason: Confirm AWS operation on non-sandbox profile
```

The parent block contributes no `decide` of its own -- it is a pure filter. All normal matching fields (`cmd`, `options`, `env`, `cwd`, `path`, `file`) are supported.

Sub-rules are evaluated exactly like top-level rules: strictest-wins applies within the `rules:` list, and the winning outcome from the block propagates up and competes with any other rules at the outer level.

Nesting can go as deep as needed:

```yaml
bash:
  aws:
    - env:
        AWS_PROFILE: /^(?!sandbox$)/
      rules:
        - cmd: "iam *"
          rules:
            - options:
                - create-role
                - attach-role-policy
              decide: deny
              reason: Role changes require a change-control ticket.
            - decide: ask
              reason: Confirm IAM operation on non-sandbox profile
        - decide: ask
          reason: Confirm AWS operation on non-sandbox profile
```

Nested `rules:` blocks also work on non-Bash tools. For example, to gate file-tool rules on a working directory:

```yaml
write:
  - cwd: /projects/production/**
    rules:
      - path: "**/*.env"
        decide: deny
        reason: Env files in production are managed by the secrets pipeline.
      - decide: ask
        reason: Confirm write inside production project
```

## Subcommand matching

### Top-level command (no subcommand)

Rules sit directly under the command name, nested inside `bash:`:

```yaml
bash:
  sudo:
    decide: deny
    reason: sudo is not allowed

  curl:
    cmd: "https://*.internal.example.com/*"
    decide: allow
```

### Command with subcommands

Rules nest one level deeper under the subcommand name:

```yaml
bash:
  git:
    status:
      decide: allow
    log:
      decide: allow
    add:
      decide: ask
      reason: Confirm before staging
    push:
      decide: deny
      reason: Pushing is not allowed
```

### Commands with multi-word subcommand paths

For commands like `docker compose build` where the subcommand is multiple words, nest keys as deep as needed. Each key level consumes one positional word from the command line:

```yaml
bash:
  docker:
    compose:
      build:
        decide: ask
        reason: Confirm docker compose build
      up:
        decide: deny
        reason: docker compose up is not allowed
```

When a `cmd` matcher appears inside a deeply-nested rule, it addresses the positional arguments that come after the subcommand path words. For example, in the rule above, `cmd: "0"` would match the first argument after `docker compose build`, not `compose` or `build` themselves.

### Mixing subcommand rules and a flat rule for the same command

Use a list when you need both subcommand-specific rules and a flat rule that applies at the same level. Each list item is discriminated independently: an item without a `decide` key is a subcommand entry; an item with a `decide` key is a flat rule for the current level.

```yaml
bash:
  git:
    - push:
        decide: deny
        reason: Pushing is not allowed
    - add:
        decide: ask
    - decide: deny
      reason: No other git commands allowed
```

The last item has `decide` but no subcommand key, so it matches any `git` invocation not already matched by a subcommand entry above it.

This works at any nesting depth:

```yaml
bash:
  docker:
    compose:
      - build:
          decide: ask
      - decide: deny
        reason: Only docker compose build is allowed
```

### npm example

```yaml
bash:
  npm:
    install:
      decide: ask
      reason: Confirm before installing packages
    run:
      - build:
          decide: allow
      - test:
          decide: allow
      - lint:
          decide: allow
```

## File tool rules (read, write, edit, multi_edit)

These match against the file path using `path`:

```yaml
read:
  path: "**/.env*"
  decide: ask
  reason: Confirm before reading env files

write:
  path: "**/.env*"
  decide: deny
  reason: Env files are read-only

edit:
  path: src/**
  decide: allow
```

Use `path-in` to match any one of several paths:

```yaml
read:
  - path-in:
      - "**/.env*"
      - "**/.netrc"
      - "~/.ssh/*"
    decide: ask
    reason: Confirm before reading secrets
  - decide: allow
```

`multi_edit` works the same way as `edit`. File-tool entries support `path` / `path-in`, `cwd`, `decide`, `reason`, and nested `rules:` only (no `env` or `not:`).

## WebFetch rules

`WebFetch` is a single object (not a list). Match on optional `host` or `host-in`. Omit both to match every WebFetch call. Unknown hosts fall through to the default `ask` when no rule matches:

```yaml
WebFetch:
  host-in:
    - docs.anthropic.com
    - "*.github.com"
    - npmjs.com
  decide: allow
```

Allow any URL:

```yaml
WebFetch:
  decide: allow
  reason: Allow fetching any URL
```

Glob hosts with a single pattern:

```yaml
WebFetch:
  host: "*.internal.corp"
  decide: deny
  reason: Internal hosts not accessible externally
```

## Redirect path rules

Shell redirects (`>`, `>>`, `<`, `2>`, `&>`, `2>&1`, and similar) write to or read from file paths. Redirect path rules let you allow or deny those file targets globally, without writing a separate rule for every command that might redirect (`echo`, `tee`, `cat`, and so on).

Rules can match on the redirect operator and the resolved file path. Within `redirect.out` and within `redirect.in`, entries are evaluated in list order and **first match wins**.

### Shell operators and directions

| Direction | Shell operators |
|---|---|
| **out** (write) | `>`, `>>`, `2>`, `&>` |
| **in** (read) | `<` |

**Fd merges** such as `2>&1` redirect to a file descriptor number (for example `"1"`), not a file path. Redirect path matchers ignore fd merges; only file-path targets are checked.

**Heredocs** (`<<EOF`) feed the command literal text instead of a file, so redirect path matchers ignore them too. The body is not parsed as commands: with a quoted terminator (`<<'EOF'`) the shell never expands it, so it decides nothing and the verdict comes from the command itself. With an unquoted terminator the shell still expands the body, so it asks unless a rule allows it.

### Global `redirect:` section

Add a top-level `redirect:` section with `out:` and `in:` subsections. Each subsection accepts a single rule object or a list of rules (same list semantics as `write:` or `read:`). Use `path` and `path-in` to match redirect file targets: the same fields as file-tool rules. Direction comes from the subsection (`redirect.out` for write redirects, `redirect.in` for read redirects).

```yaml
redirect:
  out:
    - path-in: ["/tmp/**", "${{PROJECT_DIR}}/**"]
      decide: allow
    - decide: ask
      reason: Shell write outside allowed dirs
  in:
    - path-in: ["/tmp/**", "${{PROJECT_DIR}}/**"]
      decide: allow
    - decide: ask
      reason: Shell read outside allowed dirs
```

Global redirect rules apply to **every** Bash command that uses a redirect of the matching direction. An `echo hi > /tmp/out.txt` and a `cat > /tmp/log` both match `redirect.out` rules on their redirect targets without a separate `bash:` rule for each command.

Rule names in the audit log look like `yaml:redirect:out:allow`, `yaml:redirect:in:ask`, and so on.

Redirect path rules match redirect file targets, not the command itself. Use `bash:` for the command (`cmd`, `options`, and so on) as usual. Redirect entries support only `path` / `path-in`, `decide`, and optional `reason` (no `not:`).

### Matcher semantics

| Field | Semantics |
|---|---|
| `path: "/tmp/**"` | Redirect file target must match the pattern |
| `path-in: [A, B]` | Redirect file target must match **any** listed pattern (OR) |

When a redirect path matcher field is present, **every** file-target redirect of that direction on the command must match. Within `path-in`, any listed pattern may match each individual target (OR per target).

Example: `cmd > /tmp/a > /etc/b` has two out-redirects. A rule with `path-in: ["/tmp/**"]` under `redirect.out` does **not** match, because `/etc/b` fails the pattern check even though `/tmp/a` matches.

Redirect targets are resolved before pattern matching: expand `$VAR` when present in the tracked environment, resolve relative paths against `env.cwd`, leave absolute paths unchanged, and expand a leading `~` to the home directory. Targets that still contain unexpanded `$VAR` or `$(...)` after resolution fail to match path patterns (same posture as `cmd` env expansion). Patterns support the same forms as other path fields.

Catch-alls at the end of the list cover paths that earlier entries missed (first match wins):

```yaml
redirect:
  out:
    - path-in: ["/tmp/**", "${{PROJECT_DIR}}/**"]
      decide: allow
    - decide: ask
      reason: Shell write outside allowed dirs
```

How redirects interact with `bash:` rules (and how decisions combine) is covered in [HOW_IT_WORKS.md](HOW_IT_WORKS.md#tool-call--ast).

### Examples

Allow writes to `/tmp` and the project; ask elsewhere:

```yaml
redirect:
  out:
    - path-in: ["/tmp/**", "${{PROJECT_DIR}}/**"]
      decide: allow
    - decide: ask
      reason: Shell write outside allowed dirs
```

- `echo hi > /tmp/out.txt` → **allow**
- `echo hi > ./logs/out.txt` → **allow**
- `echo hi > /etc/passwd` → **ask**

Deny beats allow:

```yaml
redirect:
  out:
    - path: "/etc/**"
      decide: deny
      reason: Never write under /etc
    - path-in: ["/tmp/**", "${{PROJECT_DIR}}/**"]
      decide: allow
    - decide: ask
```

- `echo hi > /etc/shadow` → **deny**

## Grep rules

`Grep` is a dedicated section (capital `G`, matching the Claude Code tool name). It is a single object with `decide` and optional `reason`. There are no path or cwd matchers; the rule applies to every Grep tool call.

```yaml
Grep:
  decide: allow
  reason: Grep is read-only
```

## Generic tool rules

Top-level YAML keys that are not section names (`bash`, `read`, `write`, `edit`, `multi_edit`, `webfetch`, `redirect`, `Grep`) are interpreted as generic tool-name patterns matched against the Claude Code tool name. The key itself is the matcher; quote the key when it contains glob characters. Each entry is a single object (not a list) with `decide`, optional `reason`, and optional `tool` / `tool-in`.

Exact match against a single tool:

```yaml
ToolSearch:
  decide: allow
```

Glob match across multiple tools (the key must be quoted because of `*`):

```yaml
"mcp__*__delete_*":
  decide: deny
  reason: Delete operations not allowed
```

When the YAML key is just a label and the matching is driven by an explicit `tool` or `tool-in` field, the key becomes a human-readable identifier in audit logs:

```yaml
github-write:
  tool-in:
    - mcp__github__create_issue
    - mcp__github__create_pull_request
  decide: ask
  reason: Confirm before creating GitHub resources
```

## Decision values

| Field | Required | Description |
|---|---|---|
| `decide` | yes | If the rule matches the command, this field specifies the action to take. One of the "Decision" values below. |
| `reason` | no | Appears in the prompt shown to the user. |

| Decision | Precedence | Action |
|---|---|---|
| `deny` | 4 (strictest) | Block the command unconditionally. |
| `ask` | 3 | Pause and ask the user to confirm. |
| `allow` | 2 | Permit the command without prompting. |
| `abstain` | 1 (weakest) | The rule has no opinion. Useful for temporarily disabling a rule without removing it. |

## Strictest wins

When multiple rules match the same command, the strictest decision wins:

```
deny > ask > allow > abstain
```

A `deny` from any matching rule always wins. An `ask` wins over `allow`. This means you can safely add an `allow` catch-all at the end of a list without worrying that it will override a more specific `deny` above it:

```yaml
bash:
  git:
    add:
      - cmd: "."
        decide: deny
        reason: "use specific files"
      - decide: allow    # only matches when the deny above does NOT match
```

For more on how decisions combine when commands are chained with `&&`, `|`, or `;`, see [HOW_IT_WORKS.md](HOW_IT_WORKS.md).

## Field form reference

Every field follows this unified pattern:

| Form | Semantics | Applies to |
|---|---|---|
| `field: X` | Matches the field value against pattern X (exact string, glob, or `/regex/`) | all fields |
| `field: ["A", "B", "C"]` | AND: all patterns must match | multi-value fields only (`options`, `cmd`) |
| `field:`<br>`  - A`<br>`  - B`<br>`  - C` | AND: all patterns must match (list form) | multi-value fields only (`options`, `cmd`) |
| `field-in: ["A", "B", "C"]` | OR: any pattern must match | all fields |
| `field-in:`<br>`  - A`<br>`  - B`<br>`  - C` | OR: any pattern must match (list form) | all fields |

## Field reference

| Field | Type | Applies to | Behavior |
|---|---|---|---|
| `cmd` | string | Bash | Words match `cmd[0]`, `cmd[1]`, ... in order (AND). A single word matches only `cmd[0]`. |
| `cmd` | array | Bash | Each pattern matches `cmd[index]` in order (AND). Equivalent to a space-separated string. |
| `cmd-in` | array | Bash | Matches when any positional argument matches any entry (OR). |
| `options` | array | Bash | All listed flags must be present (AND). |
| `options-in` | array | Bash | Any listed flag must be present (OR). |
| `options` | object | Bash | All key/value pairs must match (AND). |
| `cwd` | string | bash, read, write, edit, multi_edit | cwd matches the pattern. |
| `cwd-in` | array | bash | cwd matches any pattern (OR). |
| `path` | string | read, write, edit, multi_edit, `redirect.out`, `redirect.in` | path matches the pattern. Under `redirect.out` / `redirect.in`, matches the redirect file target. |
| `path-in` | array | read, write, edit, multi_edit, `redirect.out`, `redirect.in` | path matches any pattern (OR). Under `redirect.out` / `redirect.in`, matches redirect file targets. |
| `env` | object | bash | All key/value pairs must be present (AND). |
| `file` | object | bash | File at the given path must exist. If `contains:` is set, the file's contents must also match the pattern (exact string, glob, or `/regex/`). |
| `host` | string | webfetch | Exact or glob match against the URL host. |
| `host-in` | array | webfetch | Host matches any entry (OR). |
| `tool` | string | generic tool rule | Glob match against the full tool name (e.g. `mcp__github__list_repos`). Use `mcp__*__list_*` to match all list operations across any server. When set, replaces the YAML key as the matcher; the key becomes a label only. |
| `tool-in` | array | generic tool rule | Tool name matches any entry (OR). When set, replaces the YAML key as the matcher; the key becomes a label only. |
| `examples` | object | any rule with `decide` | Example tool calls, listed under the decision each one should produce. The engine loads it and ignores it. See [Rule examples](#rule-examples). |

`path` / `path-in` on file-tool sections match tool input paths. Under `redirect.out` / `redirect.in`, they match redirect file targets.

For debugging unmatched rules, the REPL, and the MCP analyzer, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).


## Rule examples

Any rule that carries a `decide` can also carry an `examples` block: real tool calls, listed under the decision each one is expected to produce. The engine parses the block, checks nothing in it, and never matches against it. It is there so a rule can record what it covers, and so those calls can be decided again later, failing when a rule stops doing what it says.

`bun run check-config <config-dir>` does the deciding. It calls the engine directly (not the REPL), decides every collected example, and fails when a decision differs from the one the example was listed under, or when a rule carries no example at all. `<config-dir>` is the directory whose `.claude` holds `permissions.yaml` and `permissions.d`, and the rules load from there. The `.claude` directory itself may be passed in its place. `--filter <text>` checks only the examples whose command or file contains the text, and `--list` prints the collected examples without checking them.

The calls themselves are decided against a stand-in project directory, `/project`, wherever the config was loaded from. That is what `${{PROJECT_DIR}}` expands to while checking, what a relative `cwd` resolves against, and the working directory an example runs in unless it names its own. It does not have to exist, so an example names files the way a person would rather than naming one machine's directories.

```yaml
bash:
  git:
    branch:
      not:
        options-in: [u|set-upstream, set-upstream-to, unset-upstream, edit-description]
      decide: allow
      reason: Readonly git access (lists branches)
      examples:
        allow:
          - git branch
          - git branch --show-current
        ask:
          - git branch --set-upstream-to origin/main
```

The decision keys are `allow`, `deny` and `ask`. List under `allow` or `deny` the calls this rule is meant to decide, and under `ask` the near misses it deliberately leaves alone (nothing matches them, so they fall through to the default prompt).

Each entry is either a command string, or an object with `cmd` and the working directory the call is made from:

```yaml
      examples:
        allow:
          - terraform plan
          - cmd: terraform plan
            cwd: infra
        ask:
          - cmd: terraform plan
            cwd: /tmp
```

A relative `cwd` resolves against the stand-in project, so `cwd: infra` above means `/project/infra`. An absolute `cwd` is used as written. Prefer the relative form: it keeps an example off any one machine's paths, and the directory does not have to exist.

Keep the command itself off machine-specific paths too. A Bash path positional resolves against the working directory the example runs in, so write bash paths relative: `cat readme.md` reads the stand-in project's own readme without naming an absolute path.

Non-Bash rules use the prefix syntax the [REPL](REPL.md) takes, so the example reads the same way you would type it there:

```yaml
read:
  path: "${{PROJECT_DIR}}/**"
  decide: allow
  examples:
    allow:
      - read /project/src/index.ts
    ask:
      - read /etc/hosts
```

`read`, `write` and `edit` rules match `file_path` exactly as the example gives it, with no resolving against the working directory, so those examples name an absolute path under the stand-in project, for example `read /project/src/index.ts`. `${{PROJECT_DIR}}` still belongs in the rules themselves, where it expands to whatever project the engine is running in. It is the examples that no longer need it, because `/project` is already the only project they are decided against.

`examples` is a rule field, so (like `reason` or `env`) it cannot sit beside subcommand names: put it on the nested rule that carries the `decide`, not on the block that holds the subcommands.

A configuration whose rules carry these blocks, ready to check with the command above, lives in [agent-config](https://github.com/ashleydavis/agent-config).
