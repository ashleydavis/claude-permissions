import { FileToolRule } from "../../rules/file-tool-rule";
import { FileToolRuleFactory } from "../../rules/file-tool-rule-factory";
import { testConfigPaths } from "../test-config-paths";
import { FilePathToolAstNode } from "../../ast-nodes/file-path-tool-ast-node";
import { WebFetchAstNode } from "../../ast-nodes/webfetch-ast-node";

describe("FileToolRule", () => {

    test("returns undefined for non-file-tool nodes", async () => {
        const webfetchNode = new WebFetchAstNode("https://example.com", "WebFetch https://example.com");
        const rule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        expect(await rule.evaluate(webfetchNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when tool type does not match", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/src/index.ts", "read /home/user/project/src/index.ts");
        const rule = new FileToolRule("grep", ["**/*.ts"], "allow", undefined, undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when path glob does not match", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/README.md", "read /home/user/project/README.md");
        const rule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns allow when tool type and path glob match", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/src/index.ts", "read /home/user/project/src/index.ts");
        const rule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when write tool type and path glob match (write-allow)", async () => {
        const writeNode = new FilePathToolAstNode("write", "/home/user/project/output.txt", "write /home/user/project/output.txt");
        const rule = new FileToolRule("write", ["/home/**"], "allow", undefined, undefined);
        expect(await rule.evaluate(writeNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when edit tool type and path glob match (edit-allow)", async () => {
        const editNode = new FilePathToolAstNode("edit", "/home/user/project/src/index.ts", "edit /home/user/project/src/index.ts");
        const rule = new FileToolRule("edit", ["**/*.ts"], "allow", undefined, undefined);
        expect(await rule.evaluate(editNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny with reason when tool type and path glob match", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/.env.production", "read /home/user/project/.env.production");
        const rule = new FileToolRule("read", ["**/.env*"], "deny", "env files are sensitive", undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "env files are sensitive" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny with reason when write tool type and path glob match (write-deny)", async () => {
        const writeNode = new FilePathToolAstNode("write", "/etc/hosts", "write /etc/hosts");
        const rule = new FileToolRule("write", ["/etc/**"], "deny", "system files denied", undefined);
        expect(await rule.evaluate(writeNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "system files denied" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny with reason when edit tool type and path glob match (edit-deny)", async () => {
        const editNode = new FilePathToolAstNode("edit", "/etc/nginx/nginx.conf", "edit /etc/nginx/nginx.conf");
        const rule = new FileToolRule("edit", ["/etc/**"], "deny", "system config denied", undefined);
        expect(await rule.evaluate(editNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "system config denied" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny with reason when multiedit tool type and path glob match (multiedit-deny)", async () => {
        const multieditNode = new FilePathToolAstNode("multiedit", "/etc/nginx/nginx.conf", "multiedit /etc/nginx/nginx.conf");
        const rule = new FileToolRule("multiedit", ["/etc/**"], "deny", "system config denied", undefined);
        expect(await rule.evaluate(multieditNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "system config denied" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny with reason when file_path matches any path-in pattern (read-path-in)", async () => {
        const readNode = new FilePathToolAstNode("read", "/etc/passwd", "read /etc/passwd");
        const rule = new FileToolRule("read", ["/etc/**", "/sys/**"], "deny", "system files denied", undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "system files denied" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns undefined when file_path matches no path-in pattern (read-path-in)", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/README.md", "read /home/user/project/README.md");
        const rule = new FileToolRule("read", ["/etc/**", "/sys/**"], "deny", "system files denied", undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns allow when path glob matches through hidden directory segment (read-glob-hidden-segment-allow)", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/plugin/.claude-plugin/plugin.json", "read /home/user/project/plugin/.claude-plugin/plugin.json");
        const rule = new FileToolRule("read", ["/home/user/project/**"], "allow", undefined, undefined);
        expect(await rule.evaluate(readNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny with reason when cwd and path match (write-rules-path-deny)", async () => {
        const writeNode = new FilePathToolAstNode("write", "/projects/production/app/.env", "write /projects/production/app/.env");
        const rule = new FileToolRule("write", ["**/.env"], "deny", "Env files in production are protected.", undefined);
        rule.requiredCwd = "/projects/production/**";
        expect(await rule.evaluate(writeNode, { cwd: "/projects/production/app", env: {} })).toEqual({
            decision: { action: "deny", reason: "Env files in production are protected." },
            context: { cwd: "/projects/production/app", env: {} },
        });
    });

    test("returns undefined when cwd does not match (write-rules-path-deny)", async () => {
        const writeNode = new FilePathToolAstNode("write", "/projects/production/app/.env", "write /projects/production/app/.env");
        const rule = new FileToolRule("write", ["**/.env"], "deny", "Env files in production are protected.", undefined);
        rule.requiredCwd = "/projects/production/**";
        expect(await rule.evaluate(writeNode, { cwd: "/projects/staging/app", env: {} })).toEqual({
            context: { cwd: "/projects/staging/app", env: {} },
        });
    });

    test("returns ask when catch-all rule matches any path in scoped cwd (write-rules-catch-all-ask)", async () => {
        const writeNode = new FilePathToolAstNode("write", "/projects/production/app/index.ts", "write /projects/production/app/index.ts");
        const rule = new FileToolRule("write", [], "ask", "Confirm write to production directory.", undefined);
        rule.requiredCwd = "/projects/production/**";
        expect(await rule.evaluate(writeNode, { cwd: "/projects/production/app", env: {} })).toEqual({
            decision: { action: "ask", reason: "Confirm write to production directory." },
            context: { cwd: "/projects/production/app", env: {} },
        });
    });

    test("returns deny from the matching child over a catch-all ask (write-rules-path-deny)", async () => {
        const denyRule = new FileToolRule("write", ["**/.env"], "deny", "Env files in production are protected.", undefined);
        const askRule = new FileToolRule("write", [], "ask", "Confirm write to production directory.", undefined);
        const listRule = new FileToolRule("write", [], "", undefined, undefined);
        listRule.requiredCwd = "/projects/production/**";
        listRule.children = [denyRule];
        listRule.catchAll = askRule;
        const writeNode = new FilePathToolAstNode("write", "/projects/production/app/.env", "write /projects/production/app/.env");
        expect(await listRule.evaluate(writeNode, { cwd: "/projects/production/app", env: {} })).toEqual({
            decision: { action: "deny", reason: "Env files in production are protected." },
            context: { cwd: "/projects/production/app", env: {} },
        });
    });

    test("returns catch-all ask when no path child matches", async () => {
        const denyRule = new FileToolRule("write", ["**/.env"], "deny", "Env files in production are protected.", undefined);
        const askRule = new FileToolRule("write", [], "ask", "Confirm write to production directory.", undefined);
        const listRule = new FileToolRule("write", [], "", undefined, undefined);
        listRule.requiredCwd = "/projects/production/**";
        listRule.children = [denyRule];
        listRule.catchAll = askRule;
        const writeNode = new FilePathToolAstNode("write", "/projects/production/app/index.ts", "write /projects/production/app/index.ts");
        expect(await listRule.evaluate(writeNode, { cwd: "/projects/production/app", env: {} })).toEqual({
            decision: { action: "ask", reason: "Confirm write to production directory." },
            context: { cwd: "/projects/production/app", env: {} },
        });
    });

});

describe("FileToolRule.evaluateRequiredCwd", () => {

    test("returns true when required cwd is absent", async () => {
        const rule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", env: {} })).toBe(true);
    });

    test("returns true when cwd matches glob pattern", async () => {
        const rule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        rule.requiredCwd = "/home/**";
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", env: {} })).toBe(true);
    });

    test("returns false when cwd matches but cwdResolved is false (read-cwd-when-unresolved-ask)", async () => {
        const rule = new FileToolRule("read", ["**/secrets.txt"], "deny", "secrets in known dir", undefined);
        rule.requiredCwd = "/home/**";
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", cwdResolved: false, env: {} })).toBe(false);
    });

    test("returns false when cwd matches but cwdResolved is false (write-cwd-when-unresolved-ask)", async () => {
        const rule = new FileToolRule("write", ["**/.env"], "deny", "env in known dir", undefined);
        rule.requiredCwd = "/home/**";
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", cwdResolved: false, env: {} })).toBe(false);
    });

});

describe("FileToolRuleFactory.load", () => {

    test("puts last decide entry on catchAll when prior entries are path-constrained", async () => {
        const denyRule = new FileToolRule("write", ["**/.env"], "deny", undefined, undefined);
        const askRule = new FileToolRule("write", [], "ask", undefined, undefined);
        const listRule = new FileToolRule("write", [], "", undefined, undefined);
        listRule.children = [denyRule];
        listRule.catchAll = askRule;
        expect(new FileToolRuleFactory("write", testConfigPaths).load([
            { path: "**/.env", decide: "deny" },
            { decide: "ask" },
        ])).toEqual([listRule]);
    });

    test("leaves unconstrained decide lists flat for strictest at the AST", async () => {
        expect(new FileToolRuleFactory("write", testConfigPaths).load([
            { decide: "allow", reason: "ok" },
            { decide: "ask", reason: "Confirm" },
        ])).toEqual([
            new FileToolRule("write", [], "allow", "ok", undefined),
            new FileToolRule("write", [], "ask", "Confirm", undefined),
        ]);
    });

    test("accepts and ignores examples", async () => {
        expect(new FileToolRuleFactory("read", testConfigPaths).load({
            path: "/project/**",
            decide: "allow",
            examples: {
                allow: ["read /project/readme.md"],
                ask: ["read /etc/hosts"],
            },
        })).toEqual([
            new FileToolRule("read", ["/project/**"], "allow", undefined, undefined),
        ]);
    });

});

describe("FileToolRuleFactory.loadSubrules", () => {

    test("puts last decide entry on catchAll beside constrained nested rules", async () => {
        const denyRule = new FileToolRule("write", ["**/.env"], "deny", "Env files protected.", undefined);
        denyRule.requiredCwd = "/projects/production/**";
        const askRule = new FileToolRule("write", [], "ask", "Confirm write.", undefined);
        askRule.requiredCwd = "/projects/production/**";
        const listRule = new FileToolRule("write", [], "", undefined, undefined);
        listRule.requiredCwd = "/projects/production/**";
        listRule.children = [denyRule];
        listRule.catchAll = askRule;
        expect(new FileToolRuleFactory("write", testConfigPaths).loadSubrules({
            cwd: "/projects/production/**",
            rules: [
                { path: "**/.env", decide: "deny", reason: "Env files protected." },
                { decide: "ask", reason: "Confirm write." },
            ],
        }, undefined)).toEqual([listRule]);
    });

});
