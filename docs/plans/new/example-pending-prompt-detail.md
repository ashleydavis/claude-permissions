# Bash: ASK

Pending since 2026-06-19T18:17:43+10:00

## Verdict

```
decision: ASK
source: matched rule
rule: .claude/permissions.yaml:12
reason: "network access requires approval"
project directory: /home/ash/expressive-permissions

cmd: curl https://api.internal.corp/v1/deploy
command directory: /tmp
env: AWS_PROFILE=prod
decision: ASK
rule: .claude/permissions.yaml:12
reason: "network access requires approval"
```

## Command

```
export AWS_PROFILE=prod && cd /tmp && curl https://api.internal.corp/v1/deploy
```

## Context

/home/ash/expressive-permissions

## Parsed command tree

```
export AWS_PROFILE=prod && cd /tmp && curl ...
├── export AWS_PROFILE=prod
│
│     decision: ALLOW
│     rule: .claude/permissions.yaml:5
│
├── cd /tmp
│
│     cwd: /tmp
│     decision: ALLOW
│     rule: .claude/permissions.yaml:8
│
└── curl https://api.internal.corp/v1/deploy
│
      cwd: /tmp
      env: AWS_PROFILE=prod
      decision: ASK
      rule: .claude/permissions.yaml:12
      reason: "network access requires approval"
```
