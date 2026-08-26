import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { stringify as stringifyYaml } from "yaml";
import { NullAuditLogger } from "../audit-log";
import {
    decide,
    decideNode,
} from "../decision";
import { IPermissionsConfig } from "../config";
import { IRules, load } from "../load";
import { testConfigPaths } from "./test-config-paths";
import { builtinRules } from "../rules/builtin";
import { BashRule } from "../rules/bash-rule";
import { BashRuleFactory } from "../rules/bash-rule-factory";
import { FileToolRule } from "../rules/file-tool-rule";
import { WebFetchRule } from "../rules/webfetch-rule";
import { GrepRule } from "../rules/grep-rule";
import { GenericToolRule } from "../rules/generic-tool-rule";
import { CommandAstNode } from "../ast-nodes/command-ast-node";
import { WebFetchAstNode } from "../ast-nodes/webfetch-ast-node";
import { BashAstNode } from "../ast-nodes/bash-ast-node";
import { BinopAstNode } from "../ast-nodes/binop-ast-node";
import { BashTokenKind } from "../tokenizer";
import { parse } from "../parse";
import { IToolCall } from "../tool-call";
import { ICommandDescriptor, IPositionalDescriptor } from "../types";

const noRules: IRules = { rules: [] };

async function writePermissionsYaml(projectDir: string, config: IPermissionsConfig): Promise<void> {

    const claudeDir = join(projectDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, "permissions.yaml"), stringifyYaml(config));
}

async function loadWithHome(projectDir: string): Promise<IRules> {

    const homeDir = join(projectDir, "..", "home");
    await mkdir(homeDir, { recursive: true });
    return load(projectDir, homeDir, new NullAuditLogger());
}

function makeCall(command: string): IToolCall {
    return {
        tool_name: "Bash",
        tool_input: { command: command },
        cwd: "/project",
    };
}

// makeWrapperDef returns a wrapper descriptor with ownPositionals slots of its own before the command it runs.
function makeWrapperDef(ownPositionals: number): ICommandDescriptor {

    const positionals: IPositionalDescriptor[] = [];
    for (let slot = 0; slot < ownPositionals; slot++) {
        positionals.push({ kind: "string", description: "", variadic: false });
    }
    positionals.push({ kind: "string", description: "", variadic: true });
    return {
        description: "",
        positionals: positionals,
        flags: {},
        wrapper: true,
    };
}

// makeWrapperDescriptors returns a registry declaring xargs, timeout and mise exec as wrappers.
function makeWrapperDescriptors(): Map<string, ICommandDescriptor> {

    return new Map([
        ["xargs", makeWrapperDef(0)],
        ["timeout", makeWrapperDef(1)],
        [
            "mise",
            {
                description: "mise",
                positionals: [],
                flags: {},
                cmds: { exec: makeWrapperDef(0), x: makeWrapperDef(0) },
            },
        ],
    ]);
}

function makeReadCall(filePath: string): IToolCall {
    return {
        tool_name: "Read",
        tool_input: { file_path: filePath },
        cwd: "/home/user/project",
    };
}

function makeWriteCall(filePath: string): IToolCall {
    return {
        tool_name: "Write",
        tool_input: { file_path: filePath, content: "hello" },
        cwd: "/home/user/project",
    };
}

function makeEditCall(filePath: string): IToolCall {
    return {
        tool_name: "Edit",
        tool_input: { file_path: filePath, old_string: "foo", new_string: "bar" },
        cwd: "/home/user/project",
    };
}

function makeMultiEditCall(filePath: string): IToolCall {
    return {
        tool_name: "MultiEdit",
        tool_input: { file_path: filePath },
        cwd: "/home/user/project",
    };
}

function makeWebFetchCall(url: string): IToolCall {
    return {
        tool_name: "WebFetch",
        tool_input: { url: url },
        cwd: "/home/user/project",
    };
}

function makeToolCall(toolName: string): IToolCall {
    return {
        tool_name: toolName,
        tool_input: {},
        cwd: "/home/user/project",
    };
}

function makeGrepCall(pattern: string): IToolCall {
    return {
        tool_name: "Grep",
        tool_input: { pattern: pattern },
        cwd: "/home/user/project",
    };
}

describe("decideNode", () => {

    test("walks bash root to command node", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const bashNode = new BashAstNode({ command: commandNode }, "ls");
        const bashRules = [new BashRule("ls", "allow", undefined, undefined, undefined, undefined)];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(bashNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns ask for unhandled node type", async () => {
        const webfetchNode = new WebFetchAstNode("https://example.com", "WebFetch https://example.com");
        const result = await decideNode(webfetchNode, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when allow and ask rules both match on a node (strictest-wins)", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("ls", "ask", "needs approval", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(commandNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask", reason: "needs approval" });
    });

    test("returns deny when allow and deny rules both match on a node (strictest-wins)", async () => {
        const commandNode = new CommandAstNode("rm", {}, [], {}, "rm");
        const bashRules = [
            new BashRule("rm", "allow", undefined, undefined, undefined, undefined),
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(commandNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

    test("returns deny when ask and deny rules both match on a node (strictest-wins)", async () => {
        const commandNode = new CommandAstNode("rm", {}, [], {}, "rm");
        const bashRules = [
            new BashRule("rm", "ask", "please confirm rm", undefined, undefined, undefined),
            new BashRule("rm", "deny", "rm is blocked", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(commandNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is blocked" });
    });

    test("returns deny when one child is allow and another is deny (strictest-wins)", async () => {
        const leftCommand = new CommandAstNode("ls", {}, [], {}, "ls");
        const rightCommand = new CommandAstNode("rm", {}, [], {}, "rm");
        const binopNode = new BinopAstNode(BashTokenKind.And, { left: leftCommand, right: rightCommand }, "ls && rm");
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(binopNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

    test("returns ask when one child is allow and another is ask (strictest-wins)", async () => {
        const leftCommand = new CommandAstNode("ls", {}, [], {}, "ls");
        const rightCommand = new CommandAstNode("curl", {}, [], {}, "curl");
        const binopNode = new BinopAstNode(BashTokenKind.Semicolon, { left: leftCommand, right: rightCommand }, "ls ; curl");
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("curl", "ask", "network access requires approval", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(binopNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask", reason: "network access requires approval" });
    });

    test("returns deny when one child is ask and another is deny (strictest-wins)", async () => {
        const leftCommand = new CommandAstNode("curl", {}, [], {}, "curl");
        const rightCommand = new CommandAstNode("rm", {}, [], {}, "rm");
        const binopNode = new BinopAstNode(BashTokenKind.And, { left: leftCommand, right: rightCommand }, "curl && rm");
        const bashRules = [
            new BashRule("curl", "ask", "network access requires approval", undefined, undefined, undefined),
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(binopNode, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

    test("returns deny when children contribute allow, ask, and deny (strictest-wins)", async () => {
        const lsCommand = new CommandAstNode("ls", {}, [], {}, "ls");
        const curlCommand = new CommandAstNode("curl", {}, [], {}, "curl");
        const rmCommand = new CommandAstNode("rm", {}, [], {}, "rm");
        const rightBinop = new BinopAstNode(BashTokenKind.Semicolon, { left: curlCommand, right: rmCommand }, "curl ; rm");
        const rootBinop = new BinopAstNode(BashTokenKind.And, { left: lsCommand, right: rightBinop }, "ls && curl ; rm");
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("curl", "ask", "network access requires approval", undefined, undefined, undefined),
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decideNode(rootBinop, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

});

describe("decide", () => {

    test("returns ask when no rules match command node (bash-no-rule-default-ask)", async () => {
        const ast = parse(makeCall("grep foo file.txt"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when no rules match read node (read-no-rule)", async () => {
        const ast = parse(makeReadCall("/home/user/project/README.md"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when no rules match webfetch node (webfetch-no-rule)", async () => {
        const ast = parse(makeWebFetchCall("https://example.com/data"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when no rules match tool node (tool-name-no-rule)", async () => {
        const ast = parse(makeToolCall("mcp__unknown__action"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow when Grep section rule matches (tool-name-literal-key)", async () => {
        const ast = parse(makeGrepCall("TODO"), new Map());
        const grepRules = [
            new GrepRule("allow", undefined, undefined),
        ];
        const rules: IRules = { rules: grepRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when GenericToolRule matches glob (tool-name-glob-allow)", async () => {
        const ast = parse(makeToolCall("mcp__my_server__search"), new Map());
        const genericRules = [
            new GenericToolRule("mcp__my_server__*", "allow", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: genericRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when GenericToolRule matches tool-in list (tool-name-tool-in-allow)", async () => {
        const ast = parse(makeToolCall("mcp__my_server__search"), new Map());
        const genericRules = [
            new GenericToolRule(
                undefined,
                "allow",
                undefined,
                ["mcp__my_server__search", "mcp__my_server__fetch"]
            , undefined),
        ];
        const rules: IRules = { rules: genericRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns ask for comment-only bash command (bash-comment-only-ask)", async () => {
        const ast = parse(makeCall("# Parse the Changes to Outputs block"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when bash rules list is empty (bash-rules-zero-subrules)", async () => {
        const ast = parse(makeCall("AWS_PROFILE=prod aws ec2 describe-instances"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns deny for scoped bash rule with cmd matcher (bash-rules-one-subrule)", async () => {
        const ast = parse(makeCall("AWS_PROFILE=prod aws ec2 delete-instance --instance-id i-123"), new Map());
        const bashRules = new BashRuleFactory(testConfigPaths).load({
            aws: [{
                env: { AWS_PROFILE: "/^(?!sandbox$)/" },
                rules: [{
                    cmd: "* delete-*",
                    decide: "deny",
                    reason: "Destructive deletes blocked on non-sandbox profile",
                }],
            }],
        });
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({
            action: "deny",
            reason: "Destructive deletes blocked on non-sandbox profile",
        });
    });

    test("returns ask for unknown flag on undescribed command (bash-value-flags-no-config-ask)", async () => {
        const ast = parse(makeCall("mytool --output result.txt"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when subcommand has no matching rule (bash-subcommand-descriptor-unknown-subcmd-ask)", async () => {
        const ast = parse(makeCall("git status -m value"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask for bare xargs with no subcommand (bash-xargs-no-subcmd-ask)", async () => {
        const ast = parse(makeCall("xargs"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("decide returns ask when no rules match", async () => {
        const ast = parse(makeCall("ls -l"), new Map());
        const result = await decide(ast, noRules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow when bash command-name rule matches (bash-allow-by-binary)", async () => {
        const ast = parse(makeCall("ls -la"), new Map());
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow with reason when bash command-name rule matches (bash-allow-with-reason)", async () => {
        const ast = parse(makeCall("ls -la"), new Map());
        const bashRules = [
            new BashRule("ls", "allow", "ls is safe", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow", reason: "ls is safe" });
    });

    test("returns deny with reason when bash command-name rule matches (bash-deny-by-binary)", async () => {
        const ast = parse(makeCall("rm file.txt"), new Map());
        const bashRules = [
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

    test("returns ask with reason when bash command-name rule matches (bash-ask-by-binary)", async () => {
        const ast = parse(makeCall("curl https://example.com"), new Map());
        const bashRules = [
            new BashRule("curl", "ask", "network access requires approval", undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask", reason: "network access requires approval" });
    });

    test("returns allow when read path glob rule matches (read-allow)", async () => {
        const ast = parse(makeReadCall("/home/user/project/src/index.ts"), new Map());
        const filePathRules = [
            new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when write path glob rule matches (write-allow)", async () => {
        const ast = parse(makeWriteCall("/home/user/project/output.txt"), new Map());
        const filePathRules = [
            new FileToolRule("write", ["/home/**"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when edit path glob rule matches (edit-allow)", async () => {
        const ast = parse(makeEditCall("/home/user/project/src/index.ts"), new Map());
        const filePathRules = [
            new FileToolRule("edit", ["**/*.ts"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when multiedit path glob rule matches (multiedit-allow)", async () => {
        const ast = parse(makeMultiEditCall("/home/user/project/src/index.ts"), new Map());
        const filePathRules = [
            new FileToolRule("multiedit", ["/home/**"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns deny with reason when write path glob rule matches (write-deny)", async () => {
        const ast = parse(makeWriteCall("/etc/hosts"), new Map());
        const filePathRules = [
            new FileToolRule("write", ["/etc/**"], "deny", "system files denied", undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "system files denied" });
    });

    test("returns deny with reason when edit path glob rule matches (edit-deny)", async () => {
        const ast = parse(makeEditCall("/etc/nginx/nginx.conf"), new Map());
        const filePathRules = [
            new FileToolRule("edit", ["/etc/**"], "deny", "system config denied", undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "system config denied" });
    });

    test("returns deny with reason when multiedit path glob rule matches (multiedit-deny)", async () => {
        const ast = parse(makeMultiEditCall("/etc/nginx/nginx.conf"), new Map());
        const filePathRules = [
            new FileToolRule("multiedit", ["/etc/**"], "deny", "system config denied", undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "system config denied" });
    });

    test("returns ask when read path glob rule does not match (read-allow)", async () => {
        const ast = parse(makeReadCall("/home/user/project/README.md"), new Map());
        const filePathRules = [
            new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow with reason when read path glob rule matches (read-allow)", async () => {
        const ast = parse(makeReadCall("/home/user/project/src/index.ts"), new Map());
        const filePathRules = [
            new FileToolRule("read", ["**/*.ts"], "allow", "typescript sources are safe", undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow", reason: "typescript sources are safe" });
    });

    test("returns deny with reason when read path glob rule matches (read-deny-sensitive)", async () => {
        const ast = parse(makeReadCall("/home/user/project/.env.production"), new Map());
        const filePathRules = [
            new FileToolRule("read", ["**/.env*"], "deny", "env files are sensitive", undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "env files are sensitive" });
    });

    test("returns ask when file tool rule tool type does not match read node", async () => {
        const ast = parse(makeReadCall("/home/user/project/src/index.ts"), new Map());
        const filePathRules = [
            new FileToolRule("grep", ["**/*.ts"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: filePathRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when bash rules exist but command name does not match", async () => {
        const ast = parse(makeCall("grep foo file.txt"), new Map());
        const bashRules = [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ];
        const rules: IRules = { rules: bashRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow when webfetch host rule matches (webfetch-host-allow)", async () => {
        const ast = parse(makeWebFetchCall("https://api.example.com/data"), new Map());
        const webfetchRules = [
            new WebFetchRule(["api.example.com"], "allow", undefined, undefined),
        ];
        const rules: IRules = { rules: webfetchRules };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow for export with no user rule (export-no-rule-allow)", async () => {
        const ast = parse(makeCall("export FOO=bar"), new Map());
        const rules: IRules = { rules: [...builtinRules] };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow", reason: "set environment variable" });
    });

    test("returns allow for bare FOO=bar with no user rule (env-set-no-rule-allow)", async () => {
        const ast = parse(makeCall("FOO=bar"), new Map());
        const rules: IRules = { rules: [...builtinRules] };
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns allow when export expands var for later cmd-in match (bash-env-var-export-expanded)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                sed: {
                    "cmd-in": ["/tmp/**"],
                    decide: "allow",
                    reason: "sed within /tmp",
                },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(
            makeCall("export G=/tmp/out.log; sed -i 's/a/b/' \"$G\""),
            new Map()
        );
        const result = await decide(ast, rules, { cwd: "/home/user/outside-the-project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow", reason: "set environment variable; sed within /tmp" });
    });

    test("returns allow when export sets env visible to later command (export-sequence)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                export: { decide: "allow" },
                ls: { env: { FOO: "bar" }, decide: "allow" },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("export FOO=bar; ls"), new Map());
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result?.action).toBe("allow");
    });

    test("returns allow when export sets env matched by nested subcommand rule (bash-env-var)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                export: { decide: "allow" },
                npm: {
                    test: {
                        env: { NODE_ENV: "test" },
                        decide: "allow",
                    },
                },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("export NODE_ENV=test; npm test"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result?.action).toBe("allow");
    });

    test("returns allow when bare assignment sets env visible to later command (env-set-sequence)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                "": { decide: "allow" },
                ls: { env: { FOO: "bar" }, decide: "allow" },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("FOO=bar; ls"), new Map());
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result?.action).toBe("allow");
    });

    test("returns ask when loaded YAML has allow and ask rules (bash-multiple-rules-ask-over-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                rm: [
                    { decide: "allow" },
                    { decide: "ask", reason: "please confirm rm" },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("rm file.txt"), new Map());
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask", reason: "please confirm rm" });
    });

    test("returns deny when loaded YAML has allow and deny rules (bash-multiple-rules-deny-wins)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                rm: [
                    { decide: "allow" },
                    { decide: "deny", reason: "rm is blocked" },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("rm file.txt"), new Map());
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is blocked" });
    });

    test("returns deny when compound command has allow and deny children (bash-and-right-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: { decide: "allow" },
                rm: { decide: "deny", reason: "rm is not allowed" },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("ls && rm file.txt"), new Map());
        const result = await decide(ast, rules, { cwd: "/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "rm is not allowed" });
    });

    test("returns ask when inline env prefix does not leak to later sequence command (bash-env-var-scoped-prefix-does-not-leak-ask)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                echo: {
                    decide: "allow",
                    reason: "echo is allowed",
                },
                sed: {
                    "cmd-in": ["/tmp/**"],
                    decide: "allow",
                    reason: "sed within /tmp",
                },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(
            makeCall("F=/tmp/out.log echo hi; sed -i 's/a/b/' \"$F\""),
            new Map()
        );
        const result = await decide(ast, rules, { cwd: "/home/user/outside-the-project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns ask when unknown variable stays literal and cmd-in does not match (bash-env-var-unknown-not-expanded-ask)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                sed: {
                    "cmd-in": ["/tmp/**"],
                    decide: "allow",
                    reason: "sed within /tmp",
                },
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("sed -i 's/a/b/' \"$Z\""), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/outside-the-project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow when redirect target matches redirect.out path-in (bash-redirect-out-tmp-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            redirect: {
                out: [
                    {
                        "path-in": ["/tmp/**"],
                        decide: "allow",
                    },
                    {
                        decide: "ask",
                    },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("echo hi > /tmp/out.txt"), new Map());
        const result = await decide(ast, rules, { cwd: projectDir, env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

});

// Write permissions config across home yaml, home permissions.d, project yaml, and project permissions.d layers, then load them.
async function setupLayeredEnv(
    projectRules: IPermissionsConfig,
    homeRules: IPermissionsConfig,
    homePermissionsDirFiles: Record<string, IPermissionsConfig>,
    projectPermissionsDirFiles: Record<string, IPermissionsConfig>
): Promise<IRules> {

    const tempRoot = await mkdtemp(join(tmpdir(), "decision-layered-test-"));
    const homeDir = join(tempRoot, "home");
    const projectDir = join(tempRoot, "project");

    await mkdir(join(projectDir, ".claude"), { recursive: true });
    await writeFile(join(projectDir, ".claude", "permissions.yaml"), stringifyYaml(projectRules));

    await mkdir(join(homeDir, ".claude"), { recursive: true });
    await writeFile(join(homeDir, ".claude", "permissions.yaml"), stringifyYaml(homeRules));

    for (const [fileName, fileContent] of Object.entries(homePermissionsDirFiles)) {
        const filePath = join(homeDir, ".claude", "permissions.d", fileName);
        await mkdir(join(filePath, ".."), { recursive: true });
        await writeFile(filePath, stringifyYaml(fileContent));
    }

    for (const [fileName, fileContent] of Object.entries(projectPermissionsDirFiles)) {
        const filePath = join(projectDir, ".claude", "permissions.d", fileName);
        await mkdir(join(filePath, ".."), { recursive: true });
        await writeFile(filePath, stringifyYaml(fileContent));
    }

    return load(projectDir, homeDir, new NullAuditLogger());
}

describe("decide layered config", () => {

    test("returns deny when a permissions.d file denies regardless of discovery order (bash-layered-permissions-d-ordering)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { ls: { decide: "allow" } } },
            {},
            {},
            {
                "a-allow.yaml": { bash: { git: { decide: "allow" } } },
                "b-deny.yaml": { bash: { git: { decide: "deny", reason: "blocked by b-deny" } } },
            }
        );
        const ast = parse(makeCall("git status"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "blocked by b-deny" });
    });

    test("returns deny when home permissions.d denies over home yaml allow (home-permissions-d-overrides-home-yaml)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { echo: { decide: "allow" } } },
            { bash: { ls: { decide: "allow", reason: "allowed by home yaml" } } },
            { "override.yaml": { bash: { ls: { decide: "deny", reason: "denied by home permissions.d" } } } },
            {}
        );
        const ast = parse(makeCall("ls"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by home permissions.d" });
    });

    test("returns deny when project permissions.d denies over project yaml allow (project-permissions-d-overrides-project-yaml)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { cat: { decide: "allow", reason: "allowed by project yaml" } } },
            {},
            {},
            { "override.yaml": { bash: { cat: { decide: "deny", reason: "denied by project permissions.d" } } } }
        );
        const ast = parse(makeCall("cat"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by project permissions.d" });
    });

    test("returns deny when project yaml denies over home yaml allow (project-yaml-overrides-home-yaml)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { whoami: { decide: "deny", reason: "denied by project yaml" } } },
            { bash: { whoami: { decide: "allow", reason: "allowed by home yaml" } } },
            {},
            {}
        );
        const ast = parse(makeCall("whoami"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by project yaml" });
    });

    test("returns deny when project yaml denies over home permissions.d allow (project-yaml-overrides-home-permissions-d)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { date: { decide: "deny", reason: "denied by project yaml" } } },
            {},
            { "override.yaml": { bash: { date: { decide: "allow", reason: "allowed by home permissions.d" } } } },
            {}
        );
        const ast = parse(makeCall("date"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by project yaml" });
    });

    test("returns deny when project permissions.d denies over home yaml allow (project-permissions-d-overrides-home-yaml)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { echo: { decide: "allow" } } },
            { bash: { hostname: { decide: "allow", reason: "allowed by home yaml" } } },
            {},
            { "override.yaml": { bash: { hostname: { decide: "deny", reason: "denied by project permissions.d" } } } }
        );
        const ast = parse(makeCall("hostname"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by project permissions.d" });
    });

    test("returns deny when project permissions.d denies over home permissions.d allow (project-permissions-d-overrides-home-permissions-d)", async () => {
        const rules = await setupLayeredEnv(
            { bash: { echo: { decide: "allow" } } },
            {},
            { "override.yaml": { bash: { uname: { decide: "allow", reason: "allowed by home permissions.d" } } } },
            { "override.yaml": { bash: { uname: { decide: "deny", reason: "denied by project permissions.d" } } } }
        );
        const ast = parse(makeCall("uname"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "denied by project permissions.d" });
    });

});

describe("decide pipelines and production rules", () => {

    test("returns allow when xargs unwraps to a grep rule (bash-xargs-grep-allow)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { grep: { decide: "allow" } } } },
            {}
        );
        const ast = parse(makeCall("xargs grep -l \"pattern\" 2>/dev/null"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns deny when xargs unwraps to an rm rule (bash-xargs-rm-deny)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { rm: { decide: "deny" } } } },
            {}
        );
        const ast = parse(makeCall("xargs rm -f"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny" });
    });

    test("returns allow when mise exec is allowed and the command it runs is allowed (bash-mise-exec-inner-allow)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { mise: { decide: "allow" }, bun: { decide: "allow" } } } },
            {}
        );
        const ast = parse(makeCall("mise exec -- bun run compile"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns deny when mise exec is allowed but the command it runs is denied (bash-mise-exec-inner-deny)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { mise: { decide: "allow" }, rm: { decide: "deny" } } } },
            {}
        );
        const ast = parse(makeCall("mise exec -- rm -rf /"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny" });
    });

    test("returns ask when mise exec is allowed but no rule matches the command it runs (bash-mise-exec-inner-unknown-ask)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { mise: { decide: "allow" } } } },
            {}
        );
        const ast = parse(makeCall("mise exec -- mytool --send secrets"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask" });
    });

    test("returns allow when mise runs a subcommand of its own (bash-mise-install-allow)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { mise: { decide: "allow" } } } },
            {}
        );
        const ast = parse(makeCall("mise install"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow" });
    });

    test("returns deny when timeout is allowed but the command it runs is denied (bash-timeout-inner-deny)", async () => {
        const rules = await setupLayeredEnv(
            {},
            {},
            { "bash-rules.yaml": { bash: { timeout: { decide: "allow" }, rm: { decide: "deny" } } } },
            {}
        );
        const ast = parse(makeCall("timeout 30 rm -rf /"), makeWrapperDescriptors());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny" });
    });

    test("returns allow when cd into project subdir then find piped to sort all allow (bash-cd-find-sort-project-subdir-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-cd-find-test-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(projectDir, ".claude"), { recursive: true });
        await writeFile(join(projectDir, ".claude", "permissions.yaml"), stringifyYaml({}));
        await mkdir(join(homeDir, ".claude", "permissions.d"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.d", "bash-readonly.yaml"),
            stringifyYaml({
                bash: {
                    cd: { cmd: "./**", decide: "allow", reason: "cd targets under the project" },
                    find: { cmd: "./**", decide: "allow", reason: "Readonly search within current directory" },
                    sort: { decide: "allow", reason: "Sorting output" },
                },
            })
        );
        const rules = await load(projectDir, homeDir, new NullAuditLogger());
        const ast = parse(makeCall(`cd ${projectDir}/foo/bar && find . -name '*.yaml' -type f | sort`), new Map());
        const result = await decide(ast, rules, { cwd: projectDir, cwdResolved: true, env: {} }, new NullAuditLogger());
        expect(result?.action).toBe("allow");
    });

    test("returns deny for a destructive delete on a non-sandbox aws profile (bash-protecting-production-aws-rules-delete-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                aws: [
                    { env: { AWS_PROFILE: "sandbox" }, decide: "allow" },
                    {
                        env: { AWS_PROFILE: "/^(?!sandbox$)/" },
                        rules: [
                            { cmd: "* delete-*", decide: "deny", reason: "Destructive deletes on non-sandbox profiles risk permanent data loss." },
                            { cmd: "* terminate-*", decide: "deny", reason: "Terminating instances on non-sandbox profiles causes irreversible downtime." },
                            { decide: "ask", reason: "Confirm AWS operation on non-sandbox profile" },
                        ],
                    },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("AWS_PROFILE=prod aws ec2 delete-vpc --vpc-id vpc-abc123"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "Destructive deletes on non-sandbox profiles risk permanent data loss." });
    });

    test("returns ask for a read-only describe on a non-sandbox aws profile (bash-protecting-production-aws-rules-catch-all-ask)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                aws: [
                    { env: { AWS_PROFILE: "sandbox" }, decide: "allow" },
                    {
                        env: { AWS_PROFILE: "/^(?!sandbox$)/" },
                        rules: [
                            { cmd: "* delete-*", decide: "deny", reason: "Destructive deletes on non-sandbox profiles risk permanent data loss." },
                            { cmd: "* terminate-*", decide: "deny", reason: "Terminating instances on non-sandbox profiles causes irreversible downtime." },
                            { decide: "ask", reason: "Confirm AWS operation on non-sandbox profile" },
                        ],
                    },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const ast = parse(makeCall("AWS_PROFILE=prod aws ec2 describe-instances"), new Map());
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "ask", reason: "Confirm AWS operation on non-sandbox profile" });
    });

    test("returns allow for kubectl get on a non-sandbox context (bash-protecting-production-kubectl-rules-get-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                kubectl: [
                    { options: { context: "sandbox-*" }, decide: "allow" },
                    {
                        options: { context: "/^(?!sandbox)/" },
                        rules: [
                            { cmd: "get", decide: "allow", reason: "Read-only resource listing." },
                            { cmd: "describe", decide: "allow", reason: "Read-only resource inspection." },
                            { cmd: "delete", decide: "deny", reason: "Deleted resources outside sandbox may not be recoverable." },
                        ],
                    },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const kubectlDescriptor: ICommandDescriptor = {
            description: "Kubernetes CLI",
            positionals: [],
            flags: { context: { arity: 1, kind: "string", description: "Kubeconfig context name" } },
        };
        const ast = parse(makeCall("kubectl get pods --context prod-cluster"), new Map([["kubectl", kubectlDescriptor]]));
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "allow", reason: "Read-only resource listing." });
    });

    test("returns deny for kubectl delete on a non-sandbox context (bash-protecting-production-kubectl-rules-delete-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "decision-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                kubectl: [
                    { options: { context: "sandbox-*" }, decide: "allow" },
                    {
                        options: { context: "/^(?!sandbox)/" },
                        rules: [
                            { cmd: "get", decide: "allow", reason: "Read-only resource listing." },
                            { cmd: "describe", decide: "allow", reason: "Read-only resource inspection." },
                            { cmd: "delete", decide: "deny", reason: "Deleted resources outside sandbox may not be recoverable." },
                            { decide: "ask", reason: "Confirm kubectl operation outside sandbox" },
                        ],
                    },
                ],
            },
        });
        const rules = await loadWithHome(projectDir);
        const kubectlDescriptor: ICommandDescriptor = {
            description: "Kubernetes CLI",
            positionals: [],
            flags: { context: { arity: 1, kind: "string", description: "Kubeconfig context name" } },
        };
        const ast = parse(makeCall("kubectl delete pod mypod --context prod-cluster"), new Map([["kubectl", kubectlDescriptor]]));
        const result = await decide(ast, rules, { cwd: "/home/user/project", env: {} }, new NullAuditLogger());
        expect(result).toEqual({ action: "deny", reason: "Deleted resources outside sandbox may not be recoverable." });
    });

});
