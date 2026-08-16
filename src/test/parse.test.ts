import { parse, parseArgument, parseArguments, parseBashExpression, parseBashCommand, parseBashToolCall, parseEqualsFlag, parseEnvPrefix, parseEnvPrefixToken, parseFilePathToolCall, parseGrepToolCall, parseWebFetchToolCall, parseAgentToolCall, parseToolNode, parseLongFlag, parseSingleShortFlag, parseShortFlag, skipSemicolonSeparators, parseStatement, parseSubshellGroup, parseBraceGroup, parseForLoop, parseWhileLoop, parseIfStatement, parseCaseStatement, isCaseClauseTerminator, parseSequenceUntilCaseClauseEnd, parseSequenceUntil, parsePipeExpr, parseOrExpr, parseAndExpr, parseSequence, makeBinopNode, tokenizeCommand, parseXargsNode, parseSubstitution, readShellWord, isWordTokenKind } from "../parse";
import { ICommandDescriptor } from "../types";
import { IToolCall } from "../tool-call";
import { CommandAstNode } from "../ast-nodes/command-ast-node";
import { Tokenizer, BashTokenKind } from "../tokenizer";

// makeCommandDef returns a descriptor whose named flags have arity 1.
function makeCommandDef(arity1Flags: string[]): ICommandDescriptor {

    const flags: Record<string, { arity: 0 | 1; kind: "string"; description: string }> = {};
    for (const flagName of arity1Flags) {
        flags[flagName] = { arity: 1, kind: "string", description: "" };
    }
    return {
        description: "",
        positionals: [],
        flags: flags,
    };
}

// makeArity0CommandDef returns a descriptor whose named flags have arity 0.
function makeArity0CommandDef(arity0Flags: string[]): ICommandDescriptor {

    const flags: Record<string, { arity: 0 | 1; kind: "string"; description: string }> = {};
    for (const flagName of arity0Flags) {
        flags[flagName] = { arity: 0, kind: "string", description: "" };
    }
    return {
        description: "",
        positionals: [],
        flags: flags,
    };
}

// makeDescriptors returns a registry with one command whose named flags have arity 1.
function makeDescriptors(commandName: string, arity1Flags: string[]): Map<string, ICommandDescriptor> {

    const flags: Record<string, { arity: 0 | 1; kind: "string"; description: string }> = {};
    for (const flagName of arity1Flags) {
        flags[flagName] = { arity: 1, kind: "string", description: "" };
    }
    const descriptor: ICommandDescriptor = {
        description: commandName,
        positionals: [],
        flags: flags,
    };
    return new Map([[commandName, descriptor]]);
}

function makeCall(command: string): IToolCall {
    return {
        tool_name: "Bash",
        tool_input: { command: command },
        cwd: "/project",
    };
}

function makeShellCall(command: string): IToolCall {
    return {
        tool_name: "Shell",
        tool_input: { command: command },
        cwd: "/project",
    };
}

describe("tokenizeCommand", () => {

    test("tokenize double-quoted word: preserves spaces inside quotes (quoted-arg)", () => {
        expect(tokenizeCommand('echo "hello world"')).toEqual(["echo", "hello world"]);
    });

    test("tokenize single-quoted word: preserves spaces inside quotes (single-quoted)", () => {
        expect(tokenizeCommand("echo 'hello world'")).toEqual(["echo", "hello world"]);
    });

    test("tokenize backslash escape: consumes next character literally (escaped-char)", () => {
        expect(tokenizeCommand("echo \\$HOME")).toEqual(["echo", "$HOME"]);
    });

    test("tokenize unquoted words: splits on whitespace (simple-command)", () => {
        expect(tokenizeCommand("ls /tmp /var")).toEqual(["ls", "/tmp", "/var"]);
    });

    test("tokenize quoted env prefix value: keeps assignment as one token (quoted-env-prefix)", () => {
        expect(tokenizeCommand('FOO="hello world" cmd')).toEqual(["FOO=hello world", "cmd"]);
    });

    test("tokenize empty input: returns empty array (empty)", () => {
        expect(tokenizeCommand("")).toEqual([]);
    });

    test("tokenize whitespace-only input: returns empty array (whitespace)", () => {
        expect(tokenizeCommand("   ")).toEqual([]);
    });

    test("skip trailing comment: omits comment tokens (comment-trailing)", () => {
        expect(tokenizeCommand("ls -la # list the directory")).toEqual(["ls", "-la"]);
    });

    test("skip comment: tokenizes command when no comment (no-comment)", () => {
        expect(tokenizeCommand("ls -la")).toEqual(["ls", "-la"]);
    });

    test("skip comment: tokenizes words with leading and trailing whitespace (whitespace)", () => {
        expect(tokenizeCommand("  ls  /tmp  ")).toEqual(["ls", "/tmp"]);
    });

    test("skip comment: preserves hash inside a word (hash-in-word)", () => {
        expect(tokenizeCommand("echo foo#bar")).toEqual(["echo", "foo#bar"]);
    });

    test("skip trailing comment: tokenizes words before comment (leading-whitespace)", () => {
        expect(tokenizeCommand("  ls  /tmp  # note")).toEqual(["ls", "/tmp"]);
    });

    test("skip comment-only input: returns empty array (comment-only)", () => {
        expect(tokenizeCommand("# set up the project")).toEqual([]);
    });
});

describe("isWordTokenKind", () => {

    test("accepts plain words and quote/substitution delimiter kinds", () => {
        expect(isWordTokenKind(BashTokenKind.Word)).toBe(true);
        expect(isWordTokenKind(BashTokenKind.SingleQuote)).toBe(true);
        expect(isWordTokenKind(BashTokenKind.DoubleQuote)).toBe(true);
        expect(isWordTokenKind(BashTokenKind.Backtick)).toBe(true);
        expect(isWordTokenKind(BashTokenKind.SubstitutionOpen)).toBe(true);
    });

    test("rejects operator kinds and undefined", () => {
        expect(isWordTokenKind(BashTokenKind.Semicolon)).toBe(false);
        expect(isWordTokenKind(BashTokenKind.Pipe)).toBe(false);
        expect(isWordTokenKind(undefined)).toBe(false);
    });
});

describe("readShellWord", () => {

    test("joins a plain word into its literal value", () => {
        const tokenizer = new Tokenizer("echo");
        const wordResult = readShellWord(tokenizer, new Map());
        expect(wordResult.value).toBe("echo");
        expect(wordResult.substitution).toBeUndefined();
        expect(wordResult.endPos).toBe(4);
        expect(tokenizer.peek()).toBeUndefined();
    });

    test("joins an env prefix with an adjacent quoted value into one word", () => {
        const tokenizer = new Tokenizer('FOO="hello world"');
        const wordResult = readShellWord(tokenizer, new Map());
        expect(wordResult.value).toBe("FOO=hello world");
        expect(wordResult.substitution).toBeUndefined();
        expect(wordResult.endPos).toBe(17);
    });

    test("stops at a whitespace gap between words", () => {
        const tokenizer = new Tokenizer("one two");
        const wordResult = readShellWord(tokenizer, new Map());
        expect(wordResult.value).toBe("one");
        expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "two", start: 4, end: 7 });
    });

    test("builds a substitution child for a command substitution word", () => {
        const tokenizer = new Tokenizer("$(whoami)");
        const wordResult = readShellWord(tokenizer, new Map());
        expect(wordResult.value).toBe("");
        expect(wordResult.substitution).toEqual({
            type: "substitution",
            source: "$(whoami)",
            children: {
                command: {
                    type: "command",
                    commandName: "whoami",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "whoami",
                },
            },
        });
        expect(wordResult.endPos).toBe(9);
    });
});

describe("parseSubstitution", () => {

    test("consumes the substitution word and parses its inner command", () => {
        const tokenizer = new Tokenizer("$(whoami)");
        expect(parseSubstitution(tokenizer, new Map())).toEqual({
            type: "substitution",
            source: "$(whoami)",
            children: {
                command: {
                    type: "command",
                    commandName: "whoami",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "whoami",
                },
            },
        });
        expect(tokenizer.peek()).toBeUndefined();
    });

    test("parses a backtick substitution's inner command", () => {
        const tokenizer = new Tokenizer("`cat list`");
        expect(parseSubstitution(tokenizer, new Map())).toEqual({
            type: "substitution",
            source: "`cat list`",
            children: {
                command: {
                    type: "command",
                    commandName: "cat",
                    options: {},
                    positionals: ["list"],
                    envPrefix: {},
                    source: "cat list",
                },
            },
        });
    });
});

describe("parseBashExpression", () => {

    test("parse newline-separated commands: builds left-associative binop tree (newline-separator)", () => {
        expect(parseBashExpression("echo a\necho b", new Map())).toEqual({
            type: "binop",
            op: ";",
            source: "echo a ; echo b",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["a"],
                    envPrefix: {},
                    source: "echo a",
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["b"],
                    envPrefix: {},
                    source: "echo b",
                },
            },
        });
    });

    test("parse semicolon-separated commands: builds left-associative binop tree (semicolon-separator)", () => {
        expect(parseBashExpression("echo a; echo b", new Map())).toEqual({
            type: "binop",
            op: ";",
            source: "echo a ; echo b",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["a"],
                    envPrefix: {},
                    source: "echo a",
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["b"],
                    envPrefix: {},
                    source: "echo b",
                },
            },
        });
    });

    test("parse background-separated commands: builds left-associative binop tree (background)", () => {
        expect(parseBashExpression("server & client", new Map())).toEqual({
            type: "binop",
            op: ";",
            source: "server ; client",
            children: {
                left: {
                    type: "command",
                    commandName: "server",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "server",
                },
                right: {
                    type: "command",
                    commandName: "client",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "client",
                },
            },
        });
    });

    test("parse comment between statements: builds binop tree skipping comment (comment-line)", () => {
        expect(parseBashExpression("echo a # note\necho b", new Map())).toEqual({
            type: "binop",
            op: ";",
            source: "echo a ; echo b",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["a"],
                    envPrefix: {},
                    source: "echo a",
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["b"],
                    envPrefix: {},
                    source: "echo b",
                },
            },
        });
    });

    test("parse and-separated commands: builds left-associative binop tree (and-operator)", () => {
        expect(parseBashExpression("cd /tmp && rm -rf *", new Map())).toEqual({
            type: "binop",
            op: "&&",
            source: "cd /tmp && rm -rf *",
            children: {
                left: {
                    type: "command",
                    commandName: "cd",
                    options: {},
                    positionals: ["/tmp"],
                    envPrefix: {},
                    source: "cd /tmp",
                },
                right: {
                    type: "command",
                    commandName: "rm",
                    options: {
                        r: true,
                        f: true,
                    },
                    positionals: ["*"],
                    envPrefix: {},
                    source: "rm -rf *",
                },
            },
        });
    });

    test("parse or-separated commands: builds left-associative binop tree (or-operator)", () => {
        expect(parseBashExpression("make || echo failed", new Map())).toEqual({
            type: "binop",
            op: "||",
            source: "make || echo failed",
            children: {
                left: {
                    type: "command",
                    commandName: "make",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "make",
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["failed"],
                    envPrefix: {},
                    source: "echo failed",
                },
            },
        });
    });

    test("parse pipe-separated commands: builds left-associative binop tree (pipe)", () => {
        expect(parseBashExpression("git status | grep modified", new Map())).toEqual({
            type: "binop",
            op: "|",
            source: "git status | grep modified",
            children: {
                left: {
                    type: "command",
                    commandName: "git",
                    options: {},
                    positionals: ["status"],
                    envPrefix: {},
                    source: "git status",
                },
                right: {
                    type: "command",
                    commandName: "grep",
                    options: {},
                    positionals: ["modified"],
                    envPrefix: {},
                    source: "grep modified",
                },
            },
        });
    });

    test("parse mixed and and pipe: binds pipe tighter than and (mixed-and-pipe-precedence)", () => {
        expect(parseBashExpression("a && b | c", new Map())).toEqual({
            type: "binop",
            op: "&&",
            source: "a && b | c",
            children: {
                left: {
                    type: "command",
                    commandName: "a",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "a",
                },
                right: {
                    type: "binop",
                    op: "|",
                    source: "b | c",
                    children: {
                        left: {
                            type: "command",
                            commandName: "b",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "b",
                        },
                        right: {
                            type: "command",
                            commandName: "c",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "c",
                        },
                    },
                },
            },
        });
    });

    test("parse mixed and and or: binds or tighter than and (mixed-and-or-precedence)", () => {
        expect(parseBashExpression("a && b || c", new Map())).toEqual({
            type: "binop",
            op: "&&",
            source: "a && b || c",
            children: {
                left: {
                    type: "command",
                    commandName: "a",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "a",
                },
                right: {
                    type: "binop",
                    op: "||",
                    source: "b || c",
                    children: {
                        left: {
                            type: "command",
                            commandName: "b",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "b",
                        },
                        right: {
                            type: "command",
                            commandName: "c",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "c",
                        },
                    },
                },
            },
        });
    });

    test("parse single command: returns command node without binop wrapper (simple-command)", () => {
        expect(parseBashExpression("ls", new Map())).toEqual({
            type: "command",
            commandName: "ls",
            options: {},
            positionals: [],
            envPrefix: {},
            source: "ls",
        });
    });

    test("parse command substitution: inner command becomes a substitution child (bash-command-substitution-inner-deny)", () => {
        expect(parseBashExpression("echo $(rm -rf /tmp/data)", new Map())).toEqual({
            type: "command",
            commandName: "echo",
            options: {},
            positionals: [],
            envPrefix: {},
            source: "echo $(rm -rf /tmp/data)",
            children: {
                substitution: {
                    type: "substitution",
                    source: "$(rm -rf /tmp/data)",
                    children: {
                        command: {
                            type: "command",
                            commandName: "rm",
                            options: { r: true, f: true },
                            positionals: ["/tmp/data"],
                            envPrefix: {},
                            source: "rm -rf /tmp/data",
                        },
                    },
                },
            },
        });
    });

    test("parse backtick substitution: inner command becomes a substitution child (backtick-substitution)", () => {
        expect(parseBashExpression("rm `cat list`", new Map())).toEqual({
            type: "command",
            commandName: "rm",
            options: {},
            positionals: [],
            envPrefix: {},
            source: "rm `cat list`",
            children: {
                substitution: {
                    type: "substitution",
                    source: "`cat list`",
                    children: {
                        command: {
                            type: "command",
                            commandName: "cat",
                            options: {},
                            positionals: ["list"],
                            envPrefix: {},
                            source: "cat list",
                        },
                    },
                },
            },
        });
    });

    test("parse stdout redirect: wraps command in redirect node (redirect-stdout)", () => {
        expect(parseBashExpression("cmd > out.log", new Map())).toEqual({
            type: "redirect",
            op: ">",
            source: "cmd > out.log",
            children: {
                left: {
                    type: "command",
                    commandName: "cmd",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "cmd > out.log",
                },
                right: {
                    type: "target",
                    path: "out.log",
                    source: "out.log",
                },
            },
        });
    });

    test("parse stdout redirect with positional: keeps argument on inner command (redirect-stdout-echo)", () => {
        expect(parseBashExpression("echo foo > bar.txt", new Map())).toEqual({
            type: "redirect",
            op: ">",
            source: "echo foo > bar.txt",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["foo"],
                    envPrefix: {},
                    source: "echo foo > bar.txt",
                },
                right: {
                    type: "target",
                    path: "bar.txt",
                    source: "bar.txt",
                },
            },
        });
    });

    test("parse append redirect: wraps command with >> operator (redirect-append)", () => {
        expect(parseBashExpression("echo foo >> bar.txt", new Map())).toEqual({
            type: "redirect",
            op: ">>",
            source: "echo foo >> bar.txt",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["foo"],
                    envPrefix: {},
                    source: "echo foo >> bar.txt",
                },
                right: {
                    type: "target",
                    path: "bar.txt",
                    source: "bar.txt",
                },
            },
        });
    });

    test("parse stderr redirect: wraps command with 2> operator (redirect-stderr)", () => {
        expect(parseBashExpression("cmd 2> err.log", new Map())).toEqual({
            type: "redirect",
            op: "2>",
            source: "cmd 2> err.log",
            children: {
                left: {
                    type: "command",
                    commandName: "cmd",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "cmd 2> err.log",
                },
                right: {
                    type: "target",
                    path: "err.log",
                    source: "err.log",
                },
            },
        });
    });

    test("parse stdin redirect: wraps command with < operator (redirect-stdin)", () => {
        expect(parseBashExpression("cat < in.txt", new Map())).toEqual({
            type: "redirect",
            op: "<",
            source: "cat < in.txt",
            children: {
                left: {
                    type: "command",
                    commandName: "cat",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "cat < in.txt",
                },
                right: {
                    type: "target",
                    path: "in.txt",
                    source: "in.txt",
                },
            },
        });
    });

    test("parse quoted heredoc: body is data, not commands (redirect-heredoc-quoted-body)", () => {

        // A quoted heredoc body is literal text that the shell never executes, so the only
        // command in this call is "git". Today each body line is parsed as its own command
        // node, so a commit message decides the verdict: every line is a NOMATCH, and the
        // whole call falls through to the default even when git itself is allowed.
        const collectCommandNames = (node: unknown): string[] => {

            if (node === null || typeof node !== "object") {
                return [];
            }

            const astNode = node as { type?: string; commandName?: string; children?: Record<string, unknown> };
            const names = astNode.type === "command" && astNode.commandName !== undefined ? [astNode.commandName] : [];

            for (const child of Object.values(astNode.children ?? {})) {
                names.push(...collectCommandNames(child));
            }

            return names;
        };

        const command = "git commit -F - <<'EOF'\nLorem ipsum dolor sit amet\nEOF";

        expect(collectCommandNames(parse(makeCall(command), new Map()))).toEqual(["git"]);
    });

    test("parse here-string: keeps the text as a redirect target, not a heredoc (redirect-here-string)", () => {
        expect(parseBashExpression('cat <<<"hi"', new Map())).toEqual({
            type: "redirect",
            op: "<<<",
            source: 'cat <<<"hi"',
            children: {
                left: {
                    type: "command",
                    commandName: "cat",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: 'cat <<<"hi"',
                },
                right: {
                    type: "target",
                    path: "hi",
                    source: '"hi"',
                },
            },
        });
    });

    test("parse unquoted heredoc: hangs terminator and body off the redirect (redirect-heredoc-body)", () => {
        expect(parseBashExpression("cat <<EOF\nline one\nEOF", new Map())).toEqual({
            type: "redirect",
            op: "<<",
            source: "cat <<EOF\nline one\nEOF",
            children: {
                left: {
                    type: "command",
                    commandName: "cat",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "cat",
                },
                right: {
                    type: "heredoc",
                    terminator: "EOF",
                    quoted: false,
                    body: "line one",
                    source: "<<EOF\nline one\nEOF",
                },
            },
        });
    });

    test("parse fd merge redirect: nests stdout redirect under 2>& merge (redirect-fd-merge)", () => {
        expect(parseBashExpression("cmd > out.log 2>&1", new Map())).toEqual({
            type: "redirect",
            op: "2>&",
            source: "cmd > out.log 2>&1",
            children: {
                left: {
                    type: "redirect",
                    op: ">",
                    source: "cmd > out.log",
                    children: {
                        left: {
                            type: "command",
                            commandName: "cmd",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "cmd > out.log 2>&1",
                        },
                        right: {
                            type: "target",
                            path: "out.log",
                            source: "out.log",
                        },
                    },
                },
                right: {
                    type: "target",
                    path: "1",
                    source: "1",
                },
            },
        });
    });

    test("parse redirect under and: applies redirect only to right command (redirect-and-binop)", () => {
        expect(parseBashExpression("cd /tmp && echo hi > out.txt", new Map())).toEqual({
            type: "binop",
            op: "&&",
            source: "cd /tmp && echo hi > out.txt",
            children: {
                left: {
                    type: "command",
                    commandName: "cd",
                    options: {},
                    positionals: ["/tmp"],
                    envPrefix: {},
                    source: "cd /tmp",
                },
                right: {
                    type: "redirect",
                    op: ">",
                    source: "echo hi > out.txt",
                    children: {
                        left: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["hi"],
                            envPrefix: {},
                            source: "echo hi > out.txt",
                        },
                        right: {
                            type: "target",
                            path: "out.txt",
                            source: "out.txt",
                        },
                    },
                },
            },
        });
    });

    test("parse quoted semicolon: does not split inside double quotes (quoted-semicolon)", () => {
        expect(parseBashExpression('echo "a;b"; echo c', new Map())).toEqual({
            type: "binop",
            op: ";",
            source: 'echo "a;b" ; echo c',
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["a;b"],
                    envPrefix: {},
                    source: 'echo "a;b"',
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["c"],
                    envPrefix: {},
                    source: "echo c",
                },
            },
        });
    });

    test("parse trailing semicolon: returns single command without binop (trailing-semicolon)", () => {
        expect(parseBashExpression("echo a;", new Map())).toEqual({
            type: "command",
            commandName: "echo",
            options: {},
            positionals: ["a"],
            envPrefix: {},
            source: "echo a",
        });
    });

    test("parse repeated semicolons: collapses separator run (repeated-semicolon)", () => {
        expect(parseBashExpression("echo a;; echo b", new Map())).toEqual({
            type: "binop",
            op: ";",
            source: "echo a ; echo b",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["a"],
                    envPrefix: {},
                    source: "echo a",
                },
                right: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["b"],
                    envPrefix: {},
                    source: "echo b",
                },
            },
        });
    });

    test("parse leading semicolon: skips empty leading separator (leading-semicolon)", () => {
        expect(parseBashExpression("; echo a", new Map())).toEqual({
            type: "command",
            commandName: "echo",
            options: {},
            positionals: ["a"],
            envPrefix: {},
            source: "echo a",
        });
    });
});

describe("parseEnvPrefixToken", () => {

    test("consume env prefix token: returns key and value with remaining tokens (env-prefix)", () => {
        expect(parseEnvPrefixToken(["FOO=bar", "cmd"])).toEqual({
            envAssignment: { key: "FOO", value: "bar" },
            remainingTokens: ["cmd"],
        });
    });

    test("consume env prefix token: returns undefined for command name (simple-command)", () => {
        expect(parseEnvPrefixToken(["cmd", "arg"])).toEqual({
            envAssignment: undefined,
            remainingTokens: ["cmd", "arg"],
        });
    });

    test("consume env prefix token: returns undefined for flag token (ls-one-simple-flag)", () => {
        expect(parseEnvPrefixToken(["-l", "/tmp"])).toEqual({
            envAssignment: undefined,
            remainingTokens: ["-l", "/tmp"],
        });
    });

    test("consume env prefix token: returns undefined for empty token list (empty)", () => {
        expect(parseEnvPrefixToken([])).toEqual({
            envAssignment: undefined,
            remainingTokens: [],
        });
    });

    test("consume env prefix token: preserves empty value after equals (empty-value)", () => {
        expect(parseEnvPrefixToken(["FOO=", "cmd"])).toEqual({
            envAssignment: { key: "FOO", value: "" },
            remainingTokens: ["cmd"],
        });
    });
});

describe("parseEqualsFlag", () => {

    test("parse flag body with equals value: sets string option (equals-value)", () => {
        expect(parseEqualsFlag("remote=origin", ["push"])).toEqual({
            argument: { options: { remote: "origin" }, positionals: [] },
            remainingTokens: ["push"],
        });
    });

    test("parse flag body without equals: sets boolean option (boolean)", () => {
        expect(parseEqualsFlag("all", ["/tmp"])).toEqual({
            argument: { options: { all: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse flag body alone: empty remaining tokens (alone)", () => {
        expect(parseEqualsFlag("all", [])).toEqual({
            argument: { options: { all: true }, positionals: [] },
            remainingTokens: [],
        });
    });
});

describe("parseLongFlag", () => {

    test("parse long flag body with equals value: delegates to parseEqualsFlag (equals-value)", () => {
        expect(parseLongFlag("remote=origin", ["push"], undefined)).toEqual({
            argument: { options: { remote: "origin" }, positionals: [] },
            remainingTokens: ["push"],
        });
    });

    test("parse arity-1 long flag with value: consumes next token (arity1-space-value)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseLongFlag("context", ["prod-cluster", "delete"], commandDef)).toEqual({
            argument: { options: { context: "prod-cluster" }, positionals: [] },
            remainingTokens: ["delete"],
        });
    });

    test("parse arity-1 long flag without value: sets boolean option (arity1-no-value)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseLongFlag("context", [], commandDef)).toEqual({
            argument: { options: { context: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse arity-0 long flag with descriptor: does not consume next token (arity0-descriptor)", () => {
        const commandDef = makeArity0CommandDef(["verbose"]);
        expect(parseLongFlag("verbose", ["file.txt"], commandDef)).toEqual({
            argument: { options: { verbose: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse unknown long flag with descriptor: sets boolean via resolveFlagArity default (unknown-flag-descriptor)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseLongFlag("unknown", ["file.txt"], commandDef)).toEqual({
            argument: { options: { unknown: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse long flag without descriptor: sets boolean option (no-descriptor)", () => {
        expect(parseLongFlag("context", ["prod-cluster"], undefined)).toEqual({
            argument: { options: { context: true }, positionals: [] },
            remainingTokens: ["prod-cluster"],
        });
    });
});

describe("parseSingleShortFlag", () => {

    test("parse arity-1 flag with value: consumes next token (arity1-space-value)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseSingleShortFlag("m", ["wip", "commit"], commandDef)).toEqual({
            argument: { options: { m: "wip" }, positionals: [] },
            remainingTokens: ["commit"],
        });
    });

    test("parse arity-1 flag without value: sets boolean option (arity1-no-value)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseSingleShortFlag("m", [], commandDef)).toEqual({
            argument: { options: { m: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse arity-0 flag with descriptor: does not consume next token (arity0-descriptor)", () => {
        const commandDef = makeArity0CommandDef(["v"]);
        expect(parseSingleShortFlag("v", ["file.txt"], commandDef)).toEqual({
            argument: { options: { v: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse unknown flag with descriptor: sets boolean via resolveFlagArity default (unknown-flag-descriptor)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseSingleShortFlag("x", ["file.txt"], commandDef)).toEqual({
            argument: { options: { x: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse flag without descriptor: sets boolean option (no-descriptor)", () => {
        expect(parseSingleShortFlag("m", ["wip"], undefined)).toEqual({
            argument: { options: { m: true }, positionals: [] },
            remainingTokens: ["wip"],
        });
    });
});

describe("parseShortFlag", () => {

    test("parse short flag with equals value: delegates to parseEqualsFlag (equals-value)", () => {
        expect(parseShortFlag("m=wip", ["commit"], undefined)).toEqual({
            argument: { options: { m: "wip" }, positionals: [] },
            remainingTokens: ["commit"],
        });
    });

    test("parse single-character short flag: delegates to parseSingleShortFlag (single-char)", () => {
        expect(parseShortFlag("l", ["/tmp"], undefined)).toEqual({
            argument: { options: { l: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse combined short flag: sets boolean option per character (combined-flags)", () => {
        expect(parseShortFlag("la", ["/tmp"], undefined)).toEqual({
            argument: { options: { l: true, a: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse bare short flag body: returns empty options (bare-dash)", () => {
        expect(parseShortFlag("", ["file"], undefined)).toEqual({
            argument: { options: {}, positionals: [] },
            remainingTokens: ["file"],
        });
    });
});

describe("parseEnvPrefix", () => {

    test("parse leading env prefix: collects assignments and returns remaining tokens (env-prefix)", () => {
        expect(parseEnvPrefix(["FOO=bar", "cmd"])).toEqual({
            envPrefix: { FOO: "bar" },
            remainingTokens: ["cmd"],
        });
    });

    test("parse leading env prefix: returns empty prefix when no assignments (simple-command)", () => {
        expect(parseEnvPrefix(["ls", "/tmp"])).toEqual({
            envPrefix: {},
            remainingTokens: ["ls", "/tmp"],
        });
    });

    test("parse leading env prefix: stops at command name (export)", () => {
        expect(parseEnvPrefix(["export", "FOO=bar"])).toEqual({
            envPrefix: {},
            remainingTokens: ["export", "FOO=bar"],
        });
    });

    test("parse leading env prefix: collects multiple assignments (multi-env-prefix)", () => {
        expect(parseEnvPrefix(["A=1", "B=2", "cmd"])).toEqual({
            envPrefix: { A: "1", B: "2" },
            remainingTokens: ["cmd"],
        });
    });

    test("parse leading env prefix: assignment only leaves empty remaining tokens (env-assignment)", () => {
        expect(parseEnvPrefix(["FOO=bar"])).toEqual({
            envPrefix: { FOO: "bar" },
            remainingTokens: [],
        });
    });
});

describe("parseArguments", () => {

    test("parse arguments: aggregates flags and positionals (ls-multiple-flags)", () => {
        expect(parseArguments(["-l", "-a"], undefined)).toEqual({
            options: { l: true, a: true },
            positionals: [],
        });
    });

    test("parse arguments: returns empty when no tokens (simple-command)", () => {
        expect(parseArguments([], undefined)).toEqual({
            options: {},
            positionals: [],
        });
    });

    test("parse arguments: consumes arity-1 flag value via descriptor (flag-space-value)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseArguments(["-m", "wip", "commit"], commandDef)).toEqual({
            options: { m: "wip" },
            positionals: ["commit"],
        });
    });

    test("parse arguments: consumes sub-command flag value via merged descriptor (bash-subcommand-descriptor-flag-arity-allow)", () => {
        const commandDef: ICommandDescriptor = {
            description: "Git version control",
            positionals: [],
            flags: {},
            cmds: {
                commit: {
                    description: "Commit",
                    positionals: [],
                    flags: {
                        "m|message": { arity: 1, kind: "string", description: "Commit message" },
                    },
                },
            },
        };
        expect(parseArguments(["commit", "-m", "my fix"], commandDef)).toEqual({
            options: { m: "my fix" },
            positionals: ["commit"],
        });
    });

    test("parse arguments: skips top-level arity-1 flag before sub-command merge (bash-subcommand-descriptor-toplevel-skip-allow)", () => {
        const commandDef: ICommandDescriptor = {
            description: "Git version control",
            positionals: [],
            flags: {
                C: { arity: 1, kind: "path", description: "Run as if git was started in this directory" },
            },
            cmds: {
                commit: {
                    description: "Commit",
                    positionals: [],
                    flags: {
                        "m|message": { arity: 1, kind: "string", description: "Commit message" },
                    },
                },
            },
        };
        expect(parseArguments(["-C", "/tmp/repo", "commit", "-m", "msg"], commandDef)).toEqual({
            options: { C: "/tmp/repo", m: "msg" },
            positionals: ["commit"],
        });
    });
});

describe("parseBashCommand", () => {

    test("parse bare command: command name only, empty options (simple-command)", () => {
        expect(parseBashCommand("ls", new Map())).toEqual({
            type: "command",
            commandName: "ls",
            options: {},
            positionals: [],
            envPrefix: {},
            source: "ls",
        });
    });

    test("parse command with flags and positionals: aggregates all tokens (flag-value-and-positional)", () => {
        const registry = makeDescriptors("grep", ["e"]);
        expect(parseBashCommand("grep -e pattern file.txt", registry)).toEqual({
            type: "command",
            commandName: "grep",
            options: { e: "pattern" },
            positionals: ["file.txt"],
            envPrefix: {},
            source: "grep -e pattern file.txt",
        });
    });

    test("parse short flag with space-separated value via pipe-separated descriptor alias (descriptor-flag-value-space)", () => {
        const registry = makeDescriptors("grep", ["e|expression"]);
        expect(parseBashCommand("grep -e pattern", registry)).toEqual({
            type: "command",
            commandName: "grep",
            options: { e: "pattern" },
            positionals: [],
            envPrefix: {},
            source: "grep -e pattern",
        });
    });

    test("parse long flag via pipe-separated descriptor alias: path stays positional (bash-long-flag-alias-allow)", () => {
        const descriptor: ICommandDescriptor = {
            description: "Remove files or directories",
            positionals: [],
            flags: {
                "r|recursive": { arity: 0, kind: "string", description: "Remove directories recursively" },
            },
        };
        const registry = new Map([["rm", descriptor]]);
        expect(parseBashCommand("rm --recursive fixtures/data.txt", registry)).toEqual({
            type: "command",
            commandName: "rm",
            options: { recursive: true },
            positionals: ["fixtures/data.txt"],
            envPrefix: {},
            source: "rm --recursive fixtures/data.txt",
        });
    });

    test("parse arity-0 short flag before path: path stays first positional (bash-cat-flag-before-path-allow)", () => {
        const descriptor: ICommandDescriptor = {
            description: "Concatenate files",
            positionals: [],
            flags: {
                "n|number": { arity: 0, kind: "string", description: "Number all output lines" },
            },
        };
        const registry = new Map([["cat", descriptor]]);
        expect(parseBashCommand("cat -n fixtures/data.txt", registry)).toEqual({
            type: "command",
            commandName: "cat",
            options: { n: true },
            positionals: ["fixtures/data.txt"],
            envPrefix: {},
            source: "cat -n fixtures/data.txt",
        });
    });

    test("parse trimmed command string: ignores leading and trailing whitespace (trim)", () => {
        expect(parseBashCommand("  ls  /tmp  ", new Map())).toEqual({
            type: "command",
            commandName: "ls",
            options: {},
            positionals: ["/tmp"],
            envPrefix: {},
            source: "  ls  /tmp  ",
        });
    });

    test("parse arity-1 short flag with path value: consumes path, leaves positional and combined flags (flag-path-value)", () => {
        const registry = makeDescriptors("git", ["C"]);
        expect(parseBashCommand("git -C /some/path status -sb", registry)).toEqual({
            type: "command",
            commandName: "git",
            options: { C: "/some/path", s: true, b: true },
            positionals: ["status"],
            envPrefix: {},
            source: "git -C /some/path status -sb",
        });
    });

    test("parse leading env prefix: assigns vars and leaves command name (env-prefix)", () => {
        expect(parseBashCommand("FOO=bar cmd", new Map())).toEqual({
            type: "command",
            commandName: "cmd",
            options: {},
            positionals: [],
            envPrefix: { FOO: "bar" },
            source: "FOO=bar cmd",
        });
    });

    test("parse leading env prefix: assigns multiple vars and leaves command name (multi-env-prefix)", () => {
        expect(parseBashCommand("A=1 B=2 cmd", new Map())).toEqual({
            type: "command",
            commandName: "cmd",
            options: {},
            positionals: [],
            envPrefix: { A: "1", B: "2" },
            source: "A=1 B=2 cmd",
        });
    });

    test("parse env assignment only: empty command name with env prefix (env-assignment)", () => {
        expect(parseBashCommand("FOO=bar", new Map())).toEqual({
            type: "command",
            commandName: "",
            options: {},
            positionals: [],
            envPrefix: { FOO: "bar" },
            source: "FOO=bar",
        });
    });

    test("parse double-quoted positional: one positional with embedded space (quoted-arg)", () => {
        expect(parseBashCommand('echo "hello world"', new Map())).toEqual({
            type: "command",
            commandName: "echo",
            options: {},
            positionals: ["hello world"],
            envPrefix: {},
            source: 'echo "hello world"',
        });
    });
});

describe("parseBashToolCall", () => {

    test("parse Bash tool call: wraps command node in bash AST (bash-tool-call)", () => {
        expect(parseBashToolCall(makeCall("ls -l"), new Map())).toEqual({
            type: "bash",
            source: "ls -l",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { l: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls -l",
                },
            },
        });
    });
});

describe("parseArgument", () => {

    test("parse positional token: returns positional and remaining tokens (positional)", () => {
        expect(parseArgument(["/tmp", "/var"], undefined)).toEqual({
            argument: { options: {}, positionals: ["/tmp"] },
            remainingTokens: ["/var"],
        });
    });

    test("parse long flag token: sets boolean option and advances (long-flag)", () => {
        expect(parseArgument(["--all", "/tmp"], undefined)).toEqual({
            argument: { options: { all: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse long flag with equals value: sets string option (long-flag-equals)", () => {
        expect(parseArgument(["--remote=origin", "push"], undefined)).toEqual({
            argument: { options: { remote: "origin" }, positionals: [] },
            remainingTokens: ["push"],
        });
    });

    test("parse short flag token: sets boolean option (short-flag)", () => {
        expect(parseArgument(["-l", "/tmp"], undefined)).toEqual({
            argument: { options: { l: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse short flag with equals value: sets string option (short-flag-equals)", () => {
        expect(parseArgument(["-m=wip", "commit"], undefined)).toEqual({
            argument: { options: { m: "wip" }, positionals: [] },
            remainingTokens: ["commit"],
        });
    });

    test("parse combined short flag token: sets boolean option per character (combined-flags)", () => {
        expect(parseArgument(["-la", "/tmp"], undefined)).toEqual({
            argument: { options: { l: true, a: true }, positionals: [] },
            remainingTokens: ["/tmp"],
        });
    });

    test("parse arity-1 short flag with value: consumes next token (arity1-space-value)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseArgument(["-m", "wip", "commit"], commandDef)).toEqual({
            argument: { options: { m: "wip" }, positionals: [] },
            remainingTokens: ["commit"],
        });
    });

    test("parse arity-1 short flag without value: sets boolean option (arity1-no-value)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseArgument(["-m"], commandDef)).toEqual({
            argument: { options: { m: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse positional token alone: empty remaining tokens (positional-alone)", () => {
        expect(parseArgument(["/tmp"], undefined)).toEqual({
            argument: { options: {}, positionals: ["/tmp"] },
            remainingTokens: [],
        });
    });

    test("parse long flag token alone: empty remaining tokens (long-flag-alone)", () => {
        expect(parseArgument(["--all"], undefined)).toEqual({
            argument: { options: { all: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse long flag with equals value alone: empty remaining tokens (long-flag-equals-alone)", () => {
        expect(parseArgument(["--remote=origin"], undefined)).toEqual({
            argument: { options: { remote: "origin" }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse short flag token alone: empty remaining tokens (short-flag-alone)", () => {
        expect(parseArgument(["-l"], undefined)).toEqual({
            argument: { options: { l: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse short flag with equals value alone: empty remaining tokens (short-flag-equals-alone)", () => {
        expect(parseArgument(["-m=wip"], undefined)).toEqual({
            argument: { options: { m: "wip" }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse combined short flag token alone: empty remaining tokens (combined-flags-alone)", () => {
        expect(parseArgument(["-la"], undefined)).toEqual({
            argument: { options: { l: true, a: true }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse long flag with space-separated value: consumes next token (arity1-space-value)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseArgument(["--context", "prod-cluster", "delete"], commandDef)).toEqual({
            argument: { options: { context: "prod-cluster" }, positionals: [] },
            remainingTokens: ["delete"],
        });
    });

    test("parse long flag with space-separated value alone: empty remaining tokens (arity1-space-value-alone)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseArgument(["--context", "prod-cluster"], commandDef)).toEqual({
            argument: { options: { context: "prod-cluster" }, positionals: [] },
            remainingTokens: [],
        });
    });

    test("parse arity-0 long flag with descriptor: sets boolean and does not consume next token (arity0-descriptor)", () => {
        const commandDef = makeArity0CommandDef(["verbose"]);
        expect(parseArgument(["--verbose", "file.txt"], commandDef)).toEqual({
            argument: { options: { verbose: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse unknown long flag with descriptor: sets boolean via resolveFlagArity default (unknown-flag-descriptor)", () => {
        const commandDef = makeCommandDef(["context"]);
        expect(parseArgument(["--unknown", "file.txt"], commandDef)).toEqual({
            argument: { options: { unknown: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse long flag without descriptor: treats flag as boolean (no-descriptor)", () => {
        expect(parseArgument(["--context", "prod-cluster"], undefined)).toEqual({
            argument: { options: { context: true }, positionals: [] },
            remainingTokens: ["prod-cluster"],
        });
    });

    test("parse bare dash token: returns empty options (bare-dash)", () => {
        expect(parseArgument(["-", "file"], undefined)).toEqual({
            argument: { options: {}, positionals: [] },
            remainingTokens: ["file"],
        });
    });

    test("parse arity-0 short flag with descriptor: sets boolean and does not consume next token (arity0-descriptor)", () => {
        const commandDef = makeArity0CommandDef(["v"]);
        expect(parseArgument(["-v", "file.txt"], commandDef)).toEqual({
            argument: { options: { v: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse unknown short flag with descriptor: sets boolean via resolveFlagArity default (unknown-flag-descriptor)", () => {
        const commandDef = makeCommandDef(["m"]);
        expect(parseArgument(["-x", "file.txt"], commandDef)).toEqual({
            argument: { options: { x: true }, positionals: [] },
            remainingTokens: ["file.txt"],
        });
    });

    test("parse short flag without descriptor: treats single char as boolean (no-descriptor)", () => {
        expect(parseArgument(["-m", "wip"], undefined)).toEqual({
            argument: { options: { m: true }, positionals: [] },
            remainingTokens: ["wip"],
        });
    });
});

describe("parse", () => {

    test("parse bare command: command name only, empty options (simple-command)", () => {
        expect(parse(makeCall("ls"), new Map())).toEqual({
            type: "bash",
            source: "ls",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "ls",
                },
            },
        });
    });

    test("parse short flag token: sets boolean option (ls-one-simple-flag)", () => {
        expect(parse(makeCall("ls -l"), new Map())).toEqual({
            type: "bash",
            source: "ls -l",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { l: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls -l",
                },
            },
        });
    });

    test("parse long flag token: sets boolean option (ls-one-long-flag)", () => {
        expect(parse(makeCall("ls --all"), new Map())).toEqual({
            type: "bash",
            source: "ls --all",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { all: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls --all",
                },
            },
        });
    });

    test("parse multiple short flag tokens: sets boolean option per token (ls-multiple-flags)", () => {
        expect(parse(makeCall("ls -l -a"), new Map())).toEqual({
            type: "bash",
            source: "ls -l -a",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { l: true, a: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls -l -a",
                },
            },
        });
    });

    test("parse combined short flag token: sets boolean option per character (ls-combined-flags)", () => {
        expect(parse(makeCall("ls -la"), new Map())).toEqual({
            type: "bash",
            source: "ls -la",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { l: true, a: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls -la",
                },
            },
        });
    });

    test("parse one positional argument: positionals is a one-element array (ls-one-positional)", () => {
        expect(parse(makeCall("ls /tmp"), new Map())).toEqual({
            type: "bash",
            source: "ls /tmp",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: {},
                    positionals: ["/tmp"],
                    envPrefix: {},
                    source: "ls /tmp",
                },
            },
        });
    });

    test("parse multiple positional arguments: positionals is an array (ls-multiple-positionals)", () => {
        expect(parse(makeCall("ls /tmp /var"), new Map())).toEqual({
            type: "bash",
            source: "ls /tmp /var",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: {},
                    positionals: ["/tmp", "/var"],
                    envPrefix: {},
                    source: "ls /tmp /var",
                },
            },
        });
    });

    test("parse short flag with space-separated value: sets string option (flag-space-value)", () => {
        const registry = makeDescriptors("git", ["m"]);
        expect(parse(makeCall("git commit -m wip"), registry)).toEqual({
            type: "bash",
            source: "git commit -m wip",
            children: {
                command: {
                    type: "command",
                    commandName: "git",
                    options: { m: "wip" },
                    positionals: ["commit"],
                    envPrefix: {},
                    source: "git commit -m wip",
                },
            },
        });
    });

    test("parse short flag with equals value: sets string option (flag-short-with-value)", () => {
        const registry = makeDescriptors("git", ["m"]);
        expect(parse(makeCall("git commit -m=wip"), registry)).toEqual({
            type: "bash",
            source: "git commit -m=wip",
            children: {
                command: {
                    type: "command",
                    commandName: "git",
                    options: { m: "wip" },
                    positionals: ["commit"],
                    envPrefix: {},
                    source: "git commit -m=wip",
                },
            },
        });
    });

    test("parse short flag with space-separated value and positional: consumes value token, leaves positional (flag-value-and-positional)", () => {
        const registry = makeDescriptors("grep", ["e"]);
        expect(parse(makeCall("grep -e pattern file.txt"), registry)).toEqual({
            type: "bash",
            source: "grep -e pattern file.txt",
            children: {
                command: {
                    type: "command",
                    commandName: "grep",
                    options: { e: "pattern" },
                    positionals: ["file.txt"],
                    envPrefix: {},
                    source: "grep -e pattern file.txt",
                },
            },
        });
    });

    test("parse long flag with equals value: sets string option (flag-long-with-value)", () => {
        expect(parse(makeCall("git push --remote=origin"), new Map())).toEqual({
            type: "bash",
            source: "git push --remote=origin",
            children: {
                command: {
                    type: "command",
                    commandName: "git",
                    options: { remote: "origin" },
                    positionals: ["push"],
                    envPrefix: {},
                    source: "git push --remote=origin",
                },
            },
        });
    });

    test("parse short flag with path value and positional: consumes path, leaves subcommand and combined flags (flag-path-value)", () => {
        const registry = makeDescriptors("git", ["C"]);
        expect(parse(makeCall("git -C /some/path status -sb"), registry)).toEqual({
            type: "bash",
            source: "git -C /some/path status -sb",
            children: {
                command: {
                    type: "command",
                    commandName: "git",
                    options: { C: "/some/path", s: true, b: true },
                    positionals: ["status"],
                    envPrefix: {},
                    source: "git -C /some/path status -sb",
                },
            },
        });
    });

    test("parse long flag with space-separated value and positional: consumes value token, leaves positional (flag-long-space-value)", () => {
        const registry = makeDescriptors("kubectl", ["context"]);
        expect(parse(makeCall("kubectl delete --context prod-cluster"), registry)).toEqual({
            type: "bash",
            source: "kubectl delete --context prod-cluster",
            children: {
                command: {
                    type: "command",
                    commandName: "kubectl",
                    options: { context: "prod-cluster" },
                    positionals: ["delete"],
                    envPrefix: {},
                    source: "kubectl delete --context prod-cluster",
                },
            },
        });
    });

    test("parse Shell tool call: same as Bash (shell-tool)", () => {
        expect(parse(makeShellCall("ls -l"), new Map())).toEqual({
            type: "bash",
            source: "ls -l",
            children: {
                command: {
                    type: "command",
                    commandName: "ls",
                    options: { l: true },
                    positionals: [],
                    envPrefix: {},
                    source: "ls -l",
                },
            },
        });
    });

    test("parse Read tool call: maps file_path (read-basic)", () => {
        const readCall: IToolCall = {
            tool_name: "Read",
            tool_input: { file_path: "/etc/hosts" },
            cwd: "/project",
        };
        expect(parse(readCall, new Map())).toEqual({
            type: "read",
            source: "Read /etc/hosts",
            file_path: "/etc/hosts",
        });
    });

    test("parse Write tool call: maps file_path and source (write-basic)", () => {
        const writeCall: IToolCall = {
            tool_name: "Write",
            tool_input: { file_path: "/tmp/out.txt", content: "hello world" },
            cwd: "/project",
        };
        expect(parse(writeCall, new Map())).toEqual({
            type: "write",
            source: "Write /tmp/out.txt",
            file_path: "/tmp/out.txt",
        });
    });

    test("parse Edit tool call: maps file_path and source (edit-basic)", () => {
        const editCall: IToolCall = {
            tool_name: "Edit",
            tool_input: { file_path: "/tmp/foo.ts", old_string: "foo", new_string: "bar" },
            cwd: "/project",
        };
        expect(parse(editCall, new Map())).toEqual({
            type: "edit",
            source: "Edit /tmp/foo.ts",
            file_path: "/tmp/foo.ts",
        });
    });

    test("parseFilePathToolCall: maps file_path and source (file-path-tool)", () => {
        const writeCall: IToolCall = {
            tool_name: "Write",
            tool_input: { file_path: "/tmp/out.txt", content: "hello world" },
            cwd: "/project",
        };
        expect(parseFilePathToolCall(writeCall)).toEqual({
            type: "write",
            source: "Write /tmp/out.txt",
            file_path: "/tmp/out.txt",
        });
    });

    test("parseGrepToolCall: maps pattern and path (grep-basic)", () => {
        const grepCall: IToolCall = {
            tool_name: "Grep",
            tool_input: { pattern: "TODO", path: "/tmp" },
            cwd: "/project",
        };
        expect(parseGrepToolCall(grepCall)).toEqual({
            type: "grep",
            source: "Grep TODO /tmp",
            pattern: "TODO",
            path: "/tmp",
        });
    });

    test("parse Grep tool call: maps pattern and path (grep-basic)", () => {
        const grepCall: IToolCall = {
            tool_name: "Grep",
            tool_input: { pattern: "TODO", path: "/tmp" },
            cwd: "/project",
        };
        expect(parse(grepCall, new Map())).toEqual({
            type: "grep",
            source: "Grep TODO /tmp",
            pattern: "TODO",
            path: "/tmp",
        });
    });

    test("parse MultiEdit tool call: maps file_path and source (multiedit-single)", () => {
        const multiEditCall: IToolCall = {
            tool_name: "MultiEdit",
            tool_input: { file_path: "/tmp/foo.ts" },
            cwd: "/project",
        };
        expect(parse(multiEditCall, new Map())).toEqual({
            type: "multiedit",
            source: "MultiEdit /tmp/foo.ts",
            file_path: "/tmp/foo.ts",
        });
    });

    test("parse WebFetch tool call: maps url (web-fetch-basic)", () => {
        const webFetchCall: IToolCall = {
            tool_name: "WebFetch",
            tool_input: { url: "https://example.com" },
            cwd: "/project",
        };
        expect(parse(webFetchCall, new Map())).toEqual({
            type: "webfetch",
            source: "WebFetch https://example.com",
            url: "https://example.com",
        });
    });

    test("parse Agent tool call: maps description and prompt (agent-basic)", () => {
        const agentCall: IToolCall = {
            tool_name: "Agent",
            tool_input: { description: "test agent", prompt: "do stuff" },
            cwd: "/project",
        };
        expect(parse(agentCall, new Map())).toEqual({
            type: "agent",
            source: "Agent test agent",
            description: "test agent",
            prompt: "do stuff",
        });
    });

    test("parseToolNode: passes through tool_name and tool_input (mcp-github-list-repos)", () => {
        const mcpCall: IToolCall = {
            tool_name: "mcp__github__list_repos",
            tool_input: { owner: "octocat" },
            cwd: "/project",
        };
        expect(parseToolNode(mcpCall)).toEqual({
            type: "tool",
            tool_name: "mcp__github__list_repos",
            tool_input: { owner: "octocat" },
            source: "mcp__github__list_repos",
        });
    });

    test("parse mcp__github__list_repos tool call: produces generic tool node (mcp-github-list-repos)", () => {
        const mcpCall: IToolCall = {
            tool_name: "mcp__github__list_repos",
            tool_input: { owner: "octocat" },
            cwd: "/project",
        };
        expect(parse(mcpCall, new Map())).toEqual({
            type: "tool",
            tool_name: "mcp__github__list_repos",
            tool_input: { owner: "octocat" },
            source: "mcp__github__list_repos",
        });
    });

    test("parse unmodeled tool: produces generic tool node (unmodeled-tool)", () => {
        const taskCall: IToolCall = {
            tool_name: "TaskList",
            tool_input: {},
            cwd: "/project",
        };
        expect(parse(taskCall, new Map())).toEqual({
            type: "tool",
            tool_name: "TaskList",
            tool_input: {},
            source: "TaskList",
        });
    });

    test("parse trailing comment: skips comment in tokens, preserves full raw (comment-trailing)", () => {
        expect(parse(makeCall("ls -la # list the directory"), new Map())).toEqual({
            type: "bash",
            source: "ls -la # list the directory",
            children: {
                command: {
                    type: "command",
                    source: "ls -la # list the directory",
                    commandName: "ls",
                    options: { l: true, a: true },
                    positionals: [],
                    envPrefix: {},
                },
            },
        });
    });

    test("parse leading env prefix: assigns vars on command node (env-prefix)", () => {
        expect(parse(makeCall("FOO=bar cmd"), new Map())).toEqual({
            type: "bash",
            source: "FOO=bar cmd",
            children: {
                command: {
                    type: "command",
                    commandName: "cmd",
                    options: {},
                    positionals: [],
                    envPrefix: { FOO: "bar" },
                    source: "FOO=bar cmd",
                },
            },
        });
    });

    test("parse leading env prefix: assigns multiple vars on command node (multi-env-prefix)", () => {
        expect(parse(makeCall("A=1 B=2 cmd"), new Map())).toEqual({
            type: "bash",
            source: "A=1 B=2 cmd",
            children: {
                command: {
                    type: "command",
                    commandName: "cmd",
                    options: {},
                    positionals: [],
                    envPrefix: { A: "1", B: "2" },
                    source: "A=1 B=2 cmd",
                },
            },
        });
    });

    test("parse env assignment only: empty command name with env prefix (env-assignment)", () => {
        expect(parse(makeCall("FOO=bar"), new Map())).toEqual({
            type: "bash",
            source: "FOO=bar",
            children: {
                command: {
                    type: "command",
                    commandName: "",
                    options: {},
                    positionals: [],
                    envPrefix: { FOO: "bar" },
                    source: "FOO=bar",
                },
            },
        });
    });

    test("parse double-quoted positional: one positional with embedded space (quoted-arg)", () => {
        expect(parse(makeCall('echo "hello world"'), new Map())).toEqual({
            type: "bash",
            source: 'echo "hello world"',
            children: {
                command: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["hello world"],
                    envPrefix: {},
                    source: 'echo "hello world"',
                },
            },
        });
    });

    test("parse newline-separated commands: builds binop under bash root (newline-separator)", () => {
        expect(parse(makeCall("echo a\necho b"), new Map())).toEqual({
            type: "bash",
            source: "echo a\necho b",
            children: {
                command: {
                    type: "binop",
                    op: ";",
                    source: "echo a ; echo b",
                    children: {
                        left: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["a"],
                            envPrefix: {},
                            source: "echo a",
                        },
                        right: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["b"],
                            envPrefix: {},
                            source: "echo b",
                        },
                    },
                },
            },
        });
    });

    test("parse semicolon-separated commands: builds binop under bash root (semicolon-separator)", () => {
        expect(parse(makeCall("echo a; echo b"), new Map())).toEqual({
            type: "bash",
            source: "echo a; echo b",
            children: {
                command: {
                    type: "binop",
                    op: ";",
                    source: "echo a ; echo b",
                    children: {
                        left: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["a"],
                            envPrefix: {},
                            source: "echo a",
                        },
                        right: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["b"],
                            envPrefix: {},
                            source: "echo b",
                        },
                    },
                },
            },
        });
    });

    test("parse background-separated commands: builds binop under bash root (background)", () => {
        expect(parse(makeCall("server & client"), new Map())).toEqual({
            type: "bash",
            source: "server & client",
            children: {
                command: {
                    type: "binop",
                    op: ";",
                    source: "server ; client",
                    children: {
                        left: {
                            type: "command",
                            commandName: "server",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "server",
                        },
                        right: {
                            type: "command",
                            commandName: "client",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "client",
                        },
                    },
                },
            },
        });
    });

    test("parse and-separated commands: builds binop under bash root (and-operator)", () => {
        expect(parse(makeCall("cd /tmp && rm -rf *"), new Map())).toEqual({
            type: "bash",
            source: "cd /tmp && rm -rf *",
            children: {
                command: {
                    type: "binop",
                    op: "&&",
                    source: "cd /tmp && rm -rf *",
                    children: {
                        left: {
                            type: "command",
                            commandName: "cd",
                            options: {},
                            positionals: ["/tmp"],
                            envPrefix: {},
                            source: "cd /tmp",
                        },
                        right: {
                            type: "command",
                            commandName: "rm",
                            options: {
                                r: true,
                                f: true,
                            },
                            positionals: ["*"],
                            envPrefix: {},
                            source: "rm -rf *",
                        },
                    },
                },
            },
        });
    });

    test("parse or-separated commands: builds binop under bash root (or-operator)", () => {
        expect(parse(makeCall("make || echo failed"), new Map())).toEqual({
            type: "bash",
            source: "make || echo failed",
            children: {
                command: {
                    type: "binop",
                    op: "||",
                    source: "make || echo failed",
                    children: {
                        left: {
                            type: "command",
                            commandName: "make",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "make",
                        },
                        right: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["failed"],
                            envPrefix: {},
                            source: "echo failed",
                        },
                    },
                },
            },
        });
    });

    test("parse pipe-separated commands: builds binop under bash root (pipe)", () => {
        expect(parse(makeCall("git status | grep modified"), new Map())).toEqual({
            type: "bash",
            source: "git status | grep modified",
            children: {
                command: {
                    type: "binop",
                    op: "|",
                    source: "git status | grep modified",
                    children: {
                        left: {
                            type: "command",
                            commandName: "git",
                            options: {},
                            positionals: ["status"],
                            envPrefix: {},
                            source: "git status",
                        },
                        right: {
                            type: "command",
                            commandName: "grep",
                            options: {},
                            positionals: ["modified"],
                            envPrefix: {},
                            source: "grep modified",
                        },
                    },
                },
            },
        });
    });

    test("parse find piped to xargs rm: right operand is xargs node with rm child (xargs)", () => {
        expect(parse(makeCall("find . | xargs rm"), new Map())).toEqual({
            type: "bash",
            source: "find . | xargs rm",
            children: {
                command: {
                    type: "binop",
                    op: "|",
                    source: "find . | xargs rm",
                    children: {
                        left: {
                            type: "command",
                            commandName: "find",
                            options: {},
                            positionals: ["."],
                            envPrefix: {},
                            source: "find .",
                        },
                        right: {
                            type: "xargs",
                            source: "xargs rm",
                            options: {},
                            children: {
                                child: {
                                    type: "command",
                                    commandName: "rm",
                                    options: {},
                                    positionals: [],
                                    envPrefix: {},
                                    source: "rm",
                                },
                            },
                        },
                    },
                },
            },
        });
    });

    test("parse and with nested pipe: builds nested binop tree (nested-and-pipe)", () => {
        expect(parse(makeCall("cd /some/path && git status | grep foo"), new Map())).toEqual({
            type: "bash",
            source: "cd /some/path && git status | grep foo",
            children: {
                command: {
                    type: "binop",
                    op: "&&",
                    source: "cd /some/path && git status | grep foo",
                    children: {
                        left: {
                            type: "command",
                            commandName: "cd",
                            options: {},
                            positionals: ["/some/path"],
                            envPrefix: {},
                            source: "cd /some/path",
                        },
                        right: {
                            type: "binop",
                            op: "|",
                            source: "git status | grep foo",
                            children: {
                                left: {
                                    type: "command",
                                    commandName: "git",
                                    options: {},
                                    positionals: ["status"],
                                    envPrefix: {},
                                    source: "git status",
                                },
                                right: {
                                    type: "command",
                                    commandName: "grep",
                                    options: {},
                                    positionals: ["foo"],
                                    envPrefix: {},
                                    source: "grep foo",
                                },
                            },
                        },
                    },
                },
            },
        });
    });

});

describe("skipSemicolonSeparators", () => {

    test("skip repeated semicolons: advances past separator run (repeated-semicolon)", () => {
        const tokenizer = new Tokenizer(";; echo a");
        skipSemicolonSeparators(tokenizer);
        expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "echo", start: 3, end: 7 });
    });
});

describe("parseStatement", () => {

    test("parse subshell group: wraps inner expression in subshell node (subshell)", () => {
        const source = "(cd src && make)";
        const tokenizer = new Tokenizer(source);
        expect(parseStatement(tokenizer, source, new Map())).toEqual({
            type: "subshell",
            source: "(cd src && make)",
            children: {
                body: {
                    type: "binop",
                    op: "&&",
                    source: "cd src && make",
                    children: {
                        left: {
                            type: "command",
                            commandName: "cd",
                            options: {},
                            positionals: ["src"],
                            envPrefix: {},
                            source: "cd src",
                        },
                        right: {
                            type: "command",
                            commandName: "make",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "make",
                        },
                    },
                },
            },
        });
    });

    test("parse brace group: wraps inner expression in brace_group node (brace-group)", () => {
        const source = "{ echo a; echo b; }";
        const tokenizer = new Tokenizer(source);
        expect(parseStatement(tokenizer, source, new Map())).toEqual({
            type: "brace_group",
            source: "{ echo a; echo b; }",
            children: {
                body: {
                    type: "binop",
                    op: ";",
                    source: "echo a ; echo b",
                    children: {
                        left: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["a"],
                            envPrefix: {},
                            source: "echo a",
                        },
                        right: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["b"],
                            envPrefix: {},
                            source: "echo b",
                        },
                    },
                },
            },
        });
    });

    test("parse stdout redirect: wraps command in redirect node (redirect-stdout)", () => {
        const source = "cmd > out.log";
        const tokenizer = new Tokenizer(source);
        expect(parseStatement(tokenizer, source, new Map())).toEqual({
            type: "redirect",
            op: ">",
            source: "cmd > out.log",
            children: {
                left: {
                    type: "command",
                    commandName: "cmd",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "cmd > out.log",
                },
                right: {
                    type: "target",
                    path: "out.log",
                    source: "out.log",
                },
            },
        });
    });

    test("parse stdout redirect with positional: keeps argument on inner command (redirect-stdout-echo)", () => {
        const source = "echo foo > bar.txt";
        const tokenizer = new Tokenizer(source);
        expect(parseStatement(tokenizer, source, new Map())).toEqual({
            type: "redirect",
            op: ">",
            source: "echo foo > bar.txt",
            children: {
                left: {
                    type: "command",
                    commandName: "echo",
                    options: {},
                    positionals: ["foo"],
                    envPrefix: {},
                    source: "echo foo > bar.txt",
                },
                right: {
                    type: "target",
                    path: "bar.txt",
                    source: "bar.txt",
                },
            },
        });
    });
});

describe("parseSubshellGroup", () => {

    test("parse subshell with and expression: builds subshell node with binop body (subshell)", () => {
        const source = "(cd src && make)";
        const tokenizer = new Tokenizer(source);
        expect(parseSubshellGroup(tokenizer, source, new Map())).toEqual({
            type: "subshell",
            source: "(cd src && make)",
            children: {
                body: {
                    type: "binop",
                    op: "&&",
                    source: "cd src && make",
                    children: {
                        left: {
                            type: "command",
                            commandName: "cd",
                            options: {},
                            positionals: ["src"],
                            envPrefix: {},
                            source: "cd src",
                        },
                        right: {
                            type: "command",
                            commandName: "make",
                            options: {},
                            positionals: [],
                            envPrefix: {},
                            source: "make",
                        },
                    },
                },
            },
        });
    });
});

describe("parseBraceGroup", () => {

    test("parse brace group with semicolon sequence: builds brace_group node with binop body (brace-group)", () => {
        const source = "{ echo a; echo b; }";
        const tokenizer = new Tokenizer(source);
        expect(parseBraceGroup(tokenizer, source, new Map())).toEqual({
            type: "brace_group",
            source: "{ echo a; echo b; }",
            children: {
                body: {
                    type: "binop",
                    op: ";",
                    source: "echo a ; echo b",
                    children: {
                        left: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["a"],
                            envPrefix: {},
                            source: "echo a",
                        },
                        right: {
                            type: "command",
                            commandName: "echo",
                            options: {},
                            positionals: ["b"],
                            envPrefix: {},
                            source: "echo b",
                        },
                    },
                },
            },
        });
    });
});

describe("parseSequenceUntil", () => {

    test("parse until close paren: stops before subshell terminator (subshell)", () => {
        const source = "cd src && make)";
        const tokenizer = new Tokenizer(source);
        expect(parseSequenceUntil(tokenizer, source, new Map(), [BashTokenKind.CloseParen])).toMatchObject({
            type: "binop",
            op: "&&",
        });
        expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.CloseParen, value: ")", start: 14, end: 15 });
    });

    test("parse until close brace: stops before brace group terminator (brace-group)", () => {
        const source = "echo a; echo b; }";
        const tokenizer = new Tokenizer(source);
        expect(parseSequenceUntil(tokenizer, source, new Map(), [BashTokenKind.CloseBrace])).toMatchObject({
            type: "binop",
            op: ";",
        });
        expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.CloseBrace, value: "}", start: 16, end: 17 });
    });

    test("parse until done token: stops before for-loop body terminator (for-loop)", () => {
        const source = "echo $f; done";
        const tokenizer = new Tokenizer(source);
        expect(parseSequenceUntil(tokenizer, source, new Map(), [BashTokenKind.Done])).toMatchObject({
            type: "command",
            commandName: "echo",
            positionals: ["$f"],
        });
        expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Done, value: "done", start: 9, end: 13 });
    });
});

describe("parseForLoop", () => {

    test("parse for loop: variable, items, and body (for-loop)", () => {
        const source = "for f in a b c; do echo $f; done";
        const tokenizer = new Tokenizer(source);
        expect(parseForLoop(tokenizer, source, new Map())).toEqual({
            type: "for_loop",
            source: "for f in a b c; do echo $f; done",
            variable: "f",
            items: ["a", "b", "c"],
            children: {
                body: {
                    type: "command",
                    source: "echo $f",
                    commandName: "echo",
                    options: {},
                    positionals: ["$f"],
                    envPrefix: {},
                },
            },
        });
    });

    test("parse for loop body sequence: left-associative semicolon tree (for-loop)", () => {
        const source = "for f in a; do echo a; echo b; done";
        const tokenizer = new Tokenizer(source);
        const forLoop = parseForLoop(tokenizer, source, new Map());
        expect(forLoop).toMatchObject({
            children: {
                body: {
                    type: "binop",
                    op: ";",
                    children: {
                        left: { type: "command", commandName: "echo", positionals: ["a"] },
                        right: { type: "command", commandName: "echo", positionals: ["b"] },
                    },
                },
            },
        });
    });
});

describe("parseBashExpression for-loop", () => {

    test("parse for loop expression: builds for_loop root (for-loop)", () => {
        expect(parseBashExpression("for f in a b c; do echo $f; done", new Map())).toEqual({
            type: "for_loop",
            source: "for f in a b c; do echo $f; done",
            variable: "f",
            items: ["a", "b", "c"],
            children: {
                body: {
                    type: "command",
                    source: "echo $f",
                    commandName: "echo",
                    options: {},
                    positionals: ["$f"],
                    envPrefix: {},
                },
            },
        });
    });
});

describe("parseWhileLoop", () => {

    test("parse while loop: condition and body (while-loop)", () => {
        const source = "while read line; do echo $line; done";
        const tokenizer = new Tokenizer(source);
        expect(parseWhileLoop(tokenizer, source, new Map())).toEqual({
            type: "while_loop",
            source: "while read line; do echo $line; done",
            until: false,
            children: {
                condition: {
                    type: "command",
                    source: "read line",
                    commandName: "read",
                    options: {},
                    positionals: ["line"],
                    envPrefix: {},
                },
                body: {
                    type: "command",
                    source: "echo $line",
                    commandName: "echo",
                    options: {},
                    positionals: ["$line"],
                    envPrefix: {},
                },
            },
        });
    });

    test("parse until loop: condition and body with until true (until-loop)", () => {
        const source = "until test -f /tmp/ready; do sleep 1; done";
        const tokenizer = new Tokenizer(source);
        expect(parseWhileLoop(tokenizer, source, new Map())).toEqual({
            type: "while_loop",
            source: "until test -f /tmp/ready; do sleep 1; done",
            until: true,
            children: {
                condition: {
                    type: "command",
                    source: "test -f /tmp/ready",
                    commandName: "test",
                    options: {
                        f: true,
                    },
                    positionals: ["/tmp/ready"],
                    envPrefix: {},
                },
                body: {
                    type: "command",
                    source: "sleep 1",
                    commandName: "sleep",
                    options: {},
                    positionals: ["1"],
                    envPrefix: {},
                },
            },
        });
    });
});

describe("parseBashExpression while-loop", () => {

    test("parse while loop expression: builds while_loop root (while-loop)", () => {
        expect(parseBashExpression("while read line; do echo $line; done", new Map())).toEqual({
            type: "while_loop",
            source: "while read line; do echo $line; done",
            until: false,
            children: {
                condition: {
                    type: "command",
                    source: "read line",
                    commandName: "read",
                    options: {},
                    positionals: ["line"],
                    envPrefix: {},
                },
                body: {
                    type: "command",
                    source: "echo $line",
                    commandName: "echo",
                    options: {},
                    positionals: ["$line"],
                    envPrefix: {},
                },
            },
        });
    });

    test("parse until loop expression: builds while_loop root with until true (until-loop)", () => {
        expect(parseBashExpression("until test -f /tmp/ready; do sleep 1; done", new Map())).toEqual({
            type: "while_loop",
            source: "until test -f /tmp/ready; do sleep 1; done",
            until: true,
            children: {
                condition: {
                    type: "command",
                    source: "test -f /tmp/ready",
                    commandName: "test",
                    options: {
                        f: true,
                    },
                    positionals: ["/tmp/ready"],
                    envPrefix: {},
                },
                body: {
                    type: "command",
                    source: "sleep 1",
                    commandName: "sleep",
                    options: {},
                    positionals: ["1"],
                    envPrefix: {},
                },
            },
        });
    });
});

describe("parseIfStatement", () => {

    test("parse if statement: condition, then branch, and else branch (if-statement)", () => {
        const source = "if test -f f; then echo yes; else echo no; fi";
        const tokenizer = new Tokenizer(source);
        expect(parseIfStatement(tokenizer, source, new Map())).toEqual({
            type: "if_statement",
            source: "if test -f f; then echo yes; else echo no; fi",
            children: {
                condition: {
                    type: "command",
                    source: "test -f f",
                    commandName: "test",
                    options: {
                        f: true,
                    },
                    positionals: ["f"],
                    envPrefix: {},
                },
                thenBranch: {
                    type: "command",
                    source: "echo yes",
                    commandName: "echo",
                    options: {},
                    positionals: ["yes"],
                    envPrefix: {},
                },
                elseBranch: {
                    type: "command",
                    source: "echo no",
                    commandName: "echo",
                    options: {},
                    positionals: ["no"],
                    envPrefix: {},
                },
            },
        });
    });
});

describe("parseBashExpression if-statement", () => {

    test("parse if statement expression: builds if_statement root (if-statement)", () => {
        expect(parseBashExpression("if test -f f; then echo yes; else echo no; fi", new Map())).toEqual({
            type: "if_statement",
            source: "if test -f f; then echo yes; else echo no; fi",
            children: {
                condition: {
                    type: "command",
                    source: "test -f f",
                    commandName: "test",
                    options: {
                        f: true,
                    },
                    positionals: ["f"],
                    envPrefix: {},
                },
                thenBranch: {
                    type: "command",
                    source: "echo yes",
                    commandName: "echo",
                    options: {},
                    positionals: ["yes"],
                    envPrefix: {},
                },
                elseBranch: {
                    type: "command",
                    source: "echo no",
                    commandName: "echo",
                    options: {},
                    positionals: ["no"],
                    envPrefix: {},
                },
            },
        });
    });
});

describe("isCaseClauseTerminator", () => {

    test("detect case clause end: double semicolon is a terminator (case)", () => {
        const tokenizer = new Tokenizer("run;; stop");
        tokenizer.next();
        expect(isCaseClauseTerminator(tokenizer)).toBe(true);
    });

    test("detect case clause end: esac is a terminator (case)", () => {
        const tokenizer = new Tokenizer("esac");
        expect(isCaseClauseTerminator(tokenizer)).toBe(true);
    });

    test("detect case clause end: single semicolon is not a terminator (case)", () => {
        const tokenizer = new Tokenizer("echo a; echo b");
        tokenizer.next();
        tokenizer.next();
        expect(isCaseClauseTerminator(tokenizer)).toBe(false);
    });
});

describe("parseSequenceUntilCaseClauseEnd", () => {

    test("parse case clause body: stops before double semicolon (case)", () => {
        const source = "run;; stop";
        const tokenizer = new Tokenizer(source);
        expect(parseSequenceUntilCaseClauseEnd(tokenizer, source, new Map())).toEqual({
            type: "command",
            source: "run",
            commandName: "run",
            options: {},
            positionals: [],
            envPrefix: {},
        });
        expect(tokenizer.peek()?.value).toBe(";");
    });
});

describe("parseCaseStatement", () => {

    test("parse case statement: word, alternation patterns, and clause bodies (case)", () => {
        const source = "case $1 in start) run;; stop|halt) halt;; *) usage;; esac";
        const tokenizer = new Tokenizer(source);
        expect(parseCaseStatement(tokenizer, source, new Map())).toEqual({
            type: "case_statement",
            source: "case $1 in start) run;; stop|halt) halt;; *) usage;; esac",
            word: "$1",
            clauses: [
                { patterns: ["start"] },
                { patterns: ["stop", "halt"] },
                { patterns: ["*"] },
            ],
            children: {
                _: [
                    {
                        type: "command",
                        source: "run",
                        commandName: "run",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                    {
                        type: "command",
                        source: "halt",
                        commandName: "halt",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                    {
                        type: "command",
                        source: "usage",
                        commandName: "usage",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                ],
            },
        });
    });
});

describe("parseBashExpression case-statement", () => {

    test("parse case statement expression: builds case_statement root (case)", () => {
        expect(parseBashExpression("case $1 in start) run;; stop|halt) halt;; *) usage;; esac", new Map())).toEqual({
            type: "case_statement",
            source: "case $1 in start) run;; stop|halt) halt;; *) usage;; esac",
            word: "$1",
            clauses: [
                { patterns: ["start"] },
                { patterns: ["stop", "halt"] },
                { patterns: ["*"] },
            ],
            children: {
                _: [
                    {
                        type: "command",
                        source: "run",
                        commandName: "run",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                    {
                        type: "command",
                        source: "halt",
                        commandName: "halt",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                    {
                        type: "command",
                        source: "usage",
                        commandName: "usage",
                        options: {},
                        positionals: [],
                        envPrefix: {},
                    },
                ],
            },
        });
    });
});

describe("makeBinopNode", () => {

    test("build binop node: sets op and children (make-binop)", () => {
        const leftCommand = new CommandAstNode("a", {}, [], {}, "a");
        const rightCommand = new CommandAstNode("b", {}, [], {}, "b");
        expect(makeBinopNode(BashTokenKind.And, leftCommand, rightCommand)).toEqual({
            type: "binop",
            op: "&&",
            source: "a && b",
            children: { left: leftCommand, right: rightCommand },
        });
    });
});

describe("parsePipeExpr", () => {

    test("parse pipe-separated commands: builds binop tree (pipe)", () => {
        const source = "git status | grep modified";
        const tokenizer = new Tokenizer(source);
        expect(parsePipeExpr(tokenizer, source, new Map())).toMatchObject({ type: "binop", op: "|" });
    });
});

describe("parseOrExpr", () => {

    test("parse or-separated commands: builds binop tree (or-operator)", () => {
        const source = "make || echo failed";
        const tokenizer = new Tokenizer(source);
        expect(parseOrExpr(tokenizer, source, new Map())).toMatchObject({ type: "binop", op: "||" });
    });
});

describe("parseAndExpr", () => {

    test("parse and-separated commands: builds binop tree (and-operator)", () => {
        const source = "cd /tmp && rm -rf *";
        const tokenizer = new Tokenizer(source);
        expect(parseAndExpr(tokenizer, source, new Map())).toMatchObject({ type: "binop", op: "&&" });
    });
});

describe("parseSequence", () => {

    test("parse empty input: returns empty command node (empty)", () => {
        const source = "";
        const tokenizer = new Tokenizer(source);
        expect(parseSequence(tokenizer, source, new Map())).toEqual({
            type: "command",
            commandName: "",
            options: {},
            positionals: [],
            envPrefix: {},
            source: "",
        });
    });
});

describe("parseXargsNode", () => {

    test("parse xargs rm: builds xargs node with rm child (xargs)", () => {
        const source = "xargs rm";
        expect(parseXargsNode(["xargs", "rm"], source, 0, source.length, true, new Map())).toEqual({
            type: "xargs",
            source: "xargs rm",
            options: {},
            children: {
                child: {
                    type: "command",
                    commandName: "rm",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "rm",
                },
            },
        });
    });

    test("parse bare xargs: builds xargs node with empty child command (xargs-bare)", () => {
        const source = "xargs";
        expect(parseXargsNode(["xargs"], source, 0, source.length, true, new Map())).toEqual({
            type: "xargs",
            source: "xargs",
            options: {},
            children: {
                child: {
                    type: "command",
                    commandName: "",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "",
                },
            },
        });
    });

    test("parse xargs boolean flag: consumes xargs options before subcommand (xargs-boolean-flag)", () => {
        const source = "xargs -0 rm";
        expect(parseXargsNode(["xargs", "-0", "rm"], source, 0, source.length, true, new Map())).toEqual({
            type: "xargs",
            source: "xargs -0 rm",
            options: { "0": true },
            children: {
                child: {
                    type: "command",
                    commandName: "rm",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "rm",
                },
            },
        });
    });

    test("parse xargs end-of-options marker: starts subcommand after -- (xargs-end-marker)", () => {
        const source = "xargs -- grep";
        expect(parseXargsNode(["xargs", "--", "grep"], source, 0, source.length, true, new Map())).toEqual({
            type: "xargs",
            source: "xargs -- grep",
            options: {},
            children: {
                child: {
                    type: "command",
                    commandName: "grep",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "grep",
                },
            },
        });
    });
});

describe("parseStatement xargs", () => {

    test("parse xargs statement: returns xargs node instead of command (xargs)", () => {
        const source = "xargs rm";
        const tokenizer = new Tokenizer(source);
        expect(parseStatement(tokenizer, source, new Map())).toEqual({
            type: "xargs",
            source: "xargs rm",
            options: {},
            children: {
                child: {
                    type: "command",
                    commandName: "rm",
                    options: {},
                    positionals: [],
                    envPrefix: {},
                    source: "rm",
                },
            },
        });
    });
});
