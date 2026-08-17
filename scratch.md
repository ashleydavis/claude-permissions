@src/parse.ts:5 Can we factor a separately tested `parseArgument` out of this? It consumes the tokens for the next argument, returns them and the remainder of the arguments.

@src/parse.ts:44 Why is `cmd` a string or an array? UNLESS YOU HAVE A GOOD REASON FOR IT BEING STRING, YOU SHOULD MAKE IT JUST AN ARRAY.

@src/parse.ts:44 Why is `cmd` a string or an array? UNLESS YOU HAVE A GOOD REASON FOR IT BEING STRING, YOU SHOULD MAKE IT JUST AN ARRAY.
---

I need a way to nest rules so the production part of this isn't repeated:

```yaml
aws:
  # Sandbox: allow everything without prompting
  - env:
      AWS_PROFILE: sandbox
    decide: allow

  # Production: deny known-destructive operations
  - env:
      AWS_PROFILE: production
    pos: ["*", delete-*]
    decide: deny
    reason: Destructive deletes blocked on the production profile
  - env:
      AWS_PROFILE: production
    pos: ["*", terminate-*]
    decide: deny
    reason: Termination blocked on the production profile
  - env:
      AWS_PROFILE: production
    pos: ["*", create-*]
    decide: deny
    reason: Resource creation blocked on the production profile
  - env:
      AWS_PROFILE: production
    pos: ["*", modify-*]
    decide: deny
    reason: Modifications blocked on the production profile
  - env:
      AWS_PROFILE: production
    pos: [iam, "*"]
    decide: deny
    reason: All IAM operations blocked on the production profile

  # Production catch-all: ask for anything not explicitly denied above
  - env:
      AWS_PROFILE: production
    decide: ask
    reason: Confirm AWS oPlease peration on production
```

I'd like `switch` or `if` statement that says, "if sandbox, do this, otherwise do that".

Be good to have an else block.

---

Test idea. Set AWS_PROFILE . run Claude . Have it print the env. Have my plugin print the env

ALL GOOD

`cwd` returns the current project dir as well.


```yaml
env:
    AWS_PROFILE: sandbox
```

```yaml
env:
    AWS_PROFILE: 
        not:
            sandbox
```

```yaml
cwd: ./ # Current project    
```


```yaml
cwd: 
    not: ./ # Not the current project    
```

```yaml
file:
    ~/.kube/config: true # File is present
```

```yaml
file:
    ~/.kube/config: "foobar" # <-- Exact file match.
```

```yaml
file:
    ~/.kube/config:
        contains: "current-context: sandbox"
```

```yaml
file:
    ~/.kube/config:
        not:
            contains: "current-context: sandbox"
```


```yaml
program:
    cwd: ./ # Current project
```


```yaml
program:
    "kubectl config get-context": sandbox
```


```yaml
program:
    "kubectl config get-context": 
        not: sandbox
```

---

Why so many `buildXXXScopedRule` functions?

Duplicate code.

---

Make sure all functions are exported and unit tested.

---

It would be good if the config file could list env vars and files to capture to the audit log. That way we can say we are interested in knowing the value of AWS_PROFILE when commands were invoked.


---

Testing


bun run scripts/run-e2e-test.ts e2e/bash/bash-git-diff-echo-and-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-git-status-short-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-ls-and-ls-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-ls-or-echo-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-ls-pipe-grep-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-find-xargs-head-pipe-allow
bun run scripts/run-e2e-test.ts e2e/bash/bash-bun-run-allow

---


Examples to test

To test

cat /home/ash/projects/expressive-permissions/.gitignore 2>/dev/null || echo "(no .gitignore)"

ls /home/ash/projects/expressive-permissions/e2e/bash/ | grep bun

find /home/ash/projects/expressive-permissions/e2e -maxdepth 2 -name "*.yaml" -not -path "*/fixtures/*" | sort | head -20

find /home/ash/projects/expressive-permissions/e2e -name "*.yaml" -not -path "*/fixtures/*" | wc -l && find /home/ash/projects/expressive-permissions/e2e -maxdepth 2 -mindepth 2 -type d | wc -l

find /home/ash/projects/expressive-permissions/e2e/bash/bash-git-diff-echo-and-allow -name "permissions.yaml" | xargs cat -n

grep -n "logger.log" /home/ash/projects/expressive-permissions/src/interpret.ts

grep -C 10 "function loadConfig" /home/ash/projects/expressive-permissions/src/load-config.ts | head -30

git stash list && git diff HEAD -- src/test/post-hook.test.ts | head -5

bun run compile 2>&1 && bun run test 2>&1 | tail -8

bun run test 2>&1 | grep "FAIL\|●" | head -20

08:20:57  TOOL     Bash      "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---" && git -C /home/ash/projects/expressive-permissions diff --cached --name-only"
08:20:57  NODE               "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---"" → ask
08:20:57  NODE               "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---" && git -C /home/ash/projects/expressive-permissions diff --cached --name-only" → ask
08:20:57  NODE               "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---" && git -C /home/ash/projects/expressive-permissions diff --cached --name-only" → ask
08:20:57  RESULT   Bash      "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---" && git -C /home/ash/projects/expressive-permissions diff --cached --name-only" → ASK
08:21:00  EXECUTE  Bash      "git -C /home/ash/projects/expressive-permissions diff --name-only && echo "---staged---" && git -C /home/ash/projects/expressive-permissions diff --cached --name-only"


---

Why does these come back as ask?

Prog:

08:05:44  TOOL     Bash      "grep -r "from.*rules" /home/ash/projects/expressive-permissions/src --include="*.ts" -n | grep -v node_modules | grep -v test"
08:05:44  NODE               "grep -r "from.*rules" /home/ash/projects/expressive-permissions/src --include="*.ts" -n | grep -v node_modules" → ask
08:05:44  NODE               "grep -r "from.*rules" /home/ash/projects/expressive-permissions/src --include="*.ts" -n | grep -v node_modules | grep -v test" → ask
08:05:44  NODE               "grep -r "from.*rules" /home/ash/projects/expressive-permissions/src --include="*.ts" -n | grep -v node_modules | grep -v test" → ask
08:05:44  RESULT   Bash      "grep -r "from.*rules" /home/ash/projects/expressive-permissions/src --include="*.ts" -n | grep -v node_modules | grep -v test" → ASK
08:05:57  EXECUTE  Bash      "grep -n "export function decide\|export const decide" /home/ash/projects/expressive-permissions/src/interpret.ts"

Waiting:

08:06:49  TOOL     Bash      "grep -n "Rule\[" /home/ash/projects/expressive-permissions/src/types.ts | head -20"
08:06:49  NODE               "grep -n "Rule\[" /home/ash/projects/expressive-permissions/src/types.ts | head -20" → ask
08:06:49  NODE               "grep -n "Rule\[" /home/ash/projects/expressive-permissions/src/types.ts | head -20" → ask
08:06:49  RESULT   Bash      "grep -n "Rule\[" /home/ash/projects/expressive-permissions/src/types.ts | head -20" → ASK
08:06:55  EXECUTE  Bash      "grep -n "function compileConfig\|export function compileConfig" /home/ash/projects/expressive-permissions/src/load-config.ts"


08:09:34  TOOL     Bash      "head -100 /home/ash/projects/expressive-permissions/src/interpret.ts | tail -50"
08:09:34  NODE               "head -100 /home/ash/projects/expressive-permissions/src/interpret.ts | tail -50" → ask
08:09:34  NODE               "head -100 /home/ash/projects/expressive-permissions/src/interpret.ts | tail -50" → ask
08:09:34  RESULT   Bash      "head -100 /home/ash/projects/expressive-permissions/src/interpret.ts | tail -50" → ASK

08:10:46  TOOL     Bash      "find /home/ash/projects/expressive-permissions -name "*.sh" -o -name "*.yaml" | grep -i smoke | head -20"
08:10:46  NODE               "find /home/ash/projects/expressive-permissions -name "*.sh" -o -name "*.yaml" | grep -i smoke" → ask
08:10:46  NODE               "find /home/ash/projects/expressive-permissions -name "*.sh" -o -name "*.yaml" | grep -i smoke | head -20" → ask
08:10:46  NODE               "find /home/ash/projects/expressive-permissions -name "*.sh" -o -name "*.yaml" | grep -i smoke | head -20" → ask
08:10:46  RESULT   Bash      "find /home/ash/projects/expressive-permissions -name "*.sh" -o -name "*.yaml" | grep -i smoke | head -20" → ASK

08:11:54  TOOL     Bash      "cat /home/ash/projects/expressive-permissions/package.json | grep -A 20 '"scripts"'"
08:11:55  NODE               "cat /home/ash/projects/expressive-permissions/package.json | grep -A 20 '"scripts"'" → ask
08:11:55  NODE               "cat /home/ash/projects/expressive-permissions/package.json | grep -A 20 '"scripts"'" → ask
08:11:55  RESULT   Bash      "cat /home/ash/projects/expressive-permissions/package.json | grep -A 20 '"scripts"'" → ASK
