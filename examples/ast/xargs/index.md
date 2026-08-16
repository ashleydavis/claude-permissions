# xargs

Command:

```sh
find . | xargs rm
```

AST:

```mermaid
graph TD
  n0["bash"]
  n1["binop<br/>op: |"]
  n2["command<br/>binary: find<br/>cmd: ."]
  n1 --> n2
  n3["command<br/>binary: xargs"]
  n4["command<br/>binary: rm"]
  n3 -->|inner| n4
  n1 --> n3
  n0 --> n1
```
