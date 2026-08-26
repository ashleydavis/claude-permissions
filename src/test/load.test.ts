import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CapturingAuditLogger, IConfigLoadEntry, NullAuditLogger } from "../audit-log";
import { IBashConfig, IConfigPaths, IPermissionsConfig } from "../config";
import { load, loadConfigFile, loadSection } from "../load";
import { builtinRules } from "../rules/builtin";
import { BashRule } from "../rules/bash-rule";
import { BashRuleFactory } from "../rules/bash-rule-factory";
import { FileToolRule } from "../rules/file-tool-rule";
import { FileToolRuleFactory } from "../rules/file-tool-rule-factory";
import { RedirectInOrderedRule, RedirectOutOrderedRule, RedirectRuleFactory } from "../rules/redirect-rule";
import { WebFetchRule } from "../rules/webfetch-rule";
import { WebFetchRuleFactory } from "../rules/webfetch-rule-factory";
import { GrepRule } from "../rules/grep-rule";
import { GrepRuleFactory } from "../rules/grep-rule-factory";
import { GenericToolRule } from "../rules/generic-tool-rule";
import { GenericToolRuleFactory } from "../rules/generic-tool-rule-factory";
import { IRule } from "../rules/rule";
import { testConfigPaths } from "./test-config-paths";

// ILoadedRules is the return value of load().
interface ILoadedRules {

    // All rules from built-ins and config files.
    rules: IRule[];
}

// Assert config-loaded rules match expected values and carry sourceLocation.
function expectLoadedConfigRules(loaded: ILoadedRules, configRules: IRule[]): void {

    expect(loaded.rules).toHaveLength(builtinRules.length + configRules.length);

    for (let index = 0; index < builtinRules.length; index++) {
        expect(loaded.rules[index]).toEqual(builtinRules[index]);
    }

    for (let index = 0; index < configRules.length; index++) {
        const ruleIndex = builtinRules.length + index;
        const actualRule = loaded.rules[ruleIndex];
        const expectedRule = configRules[index];
        const actualCompared = Object.assign(Object.create(Object.getPrototypeOf(actualRule)), actualRule);
        const expectedCompared = Object.assign(Object.create(Object.getPrototypeOf(expectedRule)), expectedRule);
        delete (actualCompared as { sourceLocation?: unknown }).sourceLocation;
        delete (expectedCompared as { sourceLocation?: unknown }).sourceLocation;
        expect(actualCompared).toMatchObject(expectedCompared);
        expect(actualRule.sourceLocation?.file).toBeDefined();
        expect(actualRule.sourceLocation?.line).toBeDefined();
    }
}

async function writePermissionsYaml(projectDir: string, config: IPermissionsConfig): Promise<void> {

    const claudeDir = join(projectDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, "permissions.yaml"), stringifyYaml(config));
}

async function writePermissionsYamlRaw(projectDir: string, yamlContent: string): Promise<void> {

    const claudeDir = join(projectDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, "permissions.yaml"), yamlContent);
}

async function loadWithHome(projectDir: string): Promise<ReturnType<typeof load>> {

    const homeDir = join(projectDir, "..", "home");
    await mkdir(homeDir, { recursive: true });
    return load(projectDir, homeDir, new NullAuditLogger());
}

describe("BashRuleFactory.load", () => {

    test("adds nothing when section is absent", async () => {
        expect(loadSection({}, "bash", new BashRuleFactory(testConfigPaths))).toEqual([]);
    });

    test("throws when section is not an object", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("invalid"))).toThrow("permissions.yaml: bash must be an object");
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("null"))).toThrow("permissions.yaml: bash must be an object");
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("[]"))).toThrow("permissions.yaml: bash must be an object");
    });

    test("adds allow rule for one command", () => {
        expect(loadSection({
            bash: {
                ls: { decide: "allow" },
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ]);
    });

    test("adds rule with reason", () => {
        expect(loadSection({
            bash: {
                ls: { decide: "allow", reason: "ls is safe" },
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([
            new BashRule("ls", "allow", "ls is safe", undefined, undefined, undefined),
        ]);
    });

    test("adds multiple rules from a list for one command", () => {
        expect(loadSection({
            bash: {
                ls: [{ decide: "allow" }, { decide: "ask" }],
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("ls", "ask", undefined, undefined, undefined, undefined),
        ]);
    });

    test("loads a childless branch rule when a group has empty rules", () => {
        const branchRule = new BashRule("ls", "", undefined, undefined, undefined, undefined);
        branchRule.children = [];
        expect(loadSection({
            bash: {
                ls: { rules: [] },
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([branchRule]);
    });

    test("throws when list contains invalid entries", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("ls:\n  - decide: allow\n  - null\n  - invalid"))).toThrow("permissions.yaml: bash.ls must contain only rule objects");
    });

    test("throws when reason is not a string", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("ls:\n  decide: allow\n  reason: 42"))).toThrow("permissions.yaml: bash.ls reason must be a string");
    });

    test("adds rule with env matcher", () => {
        expect(loadSection({
            bash: {
                ls: { env: { FOO: "bar" }, decide: "allow" },
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([
            new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined),
        ]);
    });

    test("adds nested subcommand rule with env matcher (env-prefix)", () => {
        const expectedRule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        expectedRule.subcommandPath = ["test"];
        expect(loadSection({
            bash: {
                npm: {
                    test: {
                        env: { NODE_ENV: "test" },
                        decide: "allow",
                    },
                },
            },
        }, "bash", new BashRuleFactory(testConfigPaths))).toEqual([expectedRule]);
    });

    test("throws when env is not an object", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("ls:\n  env: invalid\n  decide: allow"))).toThrow("permissions.yaml: bash.ls env must be an object");
    });

    test("throws when env value is not a string", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("ls:\n  env:\n    FOO: 42\n  decide: allow"))).toThrow("permissions.yaml: bash.ls env.FOO must be a string");
    });

    test("throws on unknown bash entry field", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load(parseYaml("ls:\n  unknown: true\n  decide: allow"))).toThrow("permissions.yaml: bash.ls unknown field 'unknown'");
    });

    test("throws on typo rule field at decide entry", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load({
            ls: { envv: { FOO: "bar" }, decide: "allow" },
        })).toThrow("permissions.yaml: bash.ls unknown field 'envv'");
    });

    test("throws on scalar typo at intermediate entry", () => {
        expect(() => new BashRuleFactory(testConfigPaths).load({
            npm: { decidee: "allow" },
        })).toThrow("permissions.yaml: bash.npm unknown field 'decidee'");
    });

});

describe("BashRuleFactory.load matcher token expansion", () => {

    // Load one bash entry against directories that differ from this process's own environment, so
    // a rule expanded from the ambient CLAUDE_PROJECT_DIR or HOME would produce the wrong answer.
    function loadWithProjectDir(bashSection: IBashConfig, projectDir: string, homeDir: string): BashRule[] {

        const configPaths: IConfigPaths = {
            projectDir,
            homeDir,
        };
        return loadSection({ bash: bashSection }, "bash", new BashRuleFactory(configPaths)) as BashRule[];
    }

    test("expands the project dir token in cwd", () => {
        const rules = loadWithProjectDir({
            npm: {
                cwd: "${{PROJECT_DIR}}/**",
                decide: "allow",
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredCwd).toEqual("/my/project/**");
    });

    test("expands the project dir token in cwd-in", () => {
        const rules = loadWithProjectDir({
            npm: {
                "cwd-in": ["${{PROJECT_DIR}}/src/**", "${{HOME}}/scratch/**"],
                decide: "allow",
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredCwdInPatterns).toEqual(["/my/project/src/**", "/home/user/scratch/**"]);
    });

    test("expands the project dir token in an array-form cmd", () => {
        const rules = loadWithProjectDir({
            git: {
                worktree: {
                    cmd: ["remove", "${{PROJECT_DIR}}/.claude/worktrees/*"],
                    decide: "allow",
                },
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredCmdPatterns).toEqual(["remove", "/my/project/.claude/worktrees/*"]);
    });

    test("expands the project dir token in an option value pattern", () => {
        const rules = loadWithProjectDir({
            git: {
                merge: {
                    options: { C: "${{PROJECT_DIR}}" },
                    decide: "allow",
                },
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredOptionPatterns).toEqual({ C: "/my/project" });
    });

    test("expands the home token in an option value pattern", () => {
        const rules = loadWithProjectDir({
            git: {
                merge: {
                    options: { C: "${{HOME}}/**" },
                    decide: "allow",
                },
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredOptionPatterns).toEqual({ C: "/home/user/**" });
    });

    test("leaves an option value pattern without a token untouched", () => {
        const rules = loadWithProjectDir({
            git: {
                commit: {
                    options: { "m|message": "/wip/" },
                    decide: "deny",
                },
            },
        }, "/my/project", "/home/user");
        expect(rules[0].requiredOptionPatterns).toEqual({ "m|message": "/wip/" });
    });

});

describe("FileToolRuleFactory.load", () => {

    test("adds nothing when section is absent", () => {
        expect(loadSection({}, "read", new FileToolRuleFactory("read", testConfigPaths))).toEqual([]);
    });

    test("adds one read rule", () => {
        expect(loadSection({
            read: {
                path: "**/*.ts",
                decide: "allow",
            },
        }, "read", new FileToolRuleFactory("read", testConfigPaths))).toEqual([
            new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined),
        ]);
    });

    test("expands ${{PROJECT_DIR}} in read path from the factory project dir, not the ambient one (read-projectdir-path-allow)", () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/somewhere/else";
        try {
            expect(loadSection({
                read: {
                    path: "${{PROJECT_DIR}}/**",
                    decide: "allow",
                    reason: "OK to read any files in the current project",
                },
            }, "read", new FileToolRuleFactory("read", { projectDir: "/my/project", homeDir: "/my/home" }))).toEqual([
                new FileToolRule(
                    "read",
                    ["/my/project/**"],
                    "allow",
                    "OK to read any files in the current project",
                    undefined
                ),
            ]);
        }
        finally {
            if (originalProjectDir === undefined) {
                delete process.env["CLAUDE_PROJECT_DIR"];
            }
            else {
                process.env["CLAUDE_PROJECT_DIR"] = originalProjectDir;
            }
        }
    });

    test("adds one write rule", () => {
        expect(loadSection({
            write: {
                path: "/home/**",
                decide: "allow",
            },
        }, "write", new FileToolRuleFactory("write", testConfigPaths))).toEqual([
            new FileToolRule("write", ["/home/**"], "allow", undefined, undefined),
        ]);
    });

    test("adds one edit rule", () => {
        expect(loadSection({
            edit: {
                path: "**/*.ts",
                decide: "allow",
            },
        }, "edit", new FileToolRuleFactory("edit", testConfigPaths))).toEqual([
            new FileToolRule("edit", ["**/*.ts"], "allow", undefined, undefined),
        ]);
    });

    test("adds one multiedit rule", () => {
        expect(loadSection({
            multi_edit: {
                path: "/home/**",
                decide: "allow",
            },
        }, "multi_edit", new FileToolRuleFactory("multiedit", testConfigPaths))).toEqual([
            new FileToolRule("multiedit", ["/home/**"], "allow", undefined, undefined),
        ]);
    });

    test("adds rule with reason", () => {
        expect(loadSection({
            read: {
                path: "**/*.ts",
                decide: "allow",
                reason: "typescript sources are safe",
            },
        }, "read", new FileToolRuleFactory("read", testConfigPaths))).toEqual([
            new FileToolRule("read", ["**/*.ts"], "allow", "typescript sources are safe", undefined),
        ]);
    });

    test("throws when section is not an object or array", () => {
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("invalid"))).toThrow("permissions.yaml: read must be an object or array");
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("null"))).toThrow("permissions.yaml: read must be an object or array");
    });

    test("adds nothing for empty array section", () => {
        expect(loadSection({ read: [] }, "read", new FileToolRuleFactory("read", testConfigPaths))).toEqual([]);
    });

    test("adds catch-all rule when path is absent (write-rules-path-deny)", () => {
        expect(loadSection({
            write: {
                decide: "ask",
                reason: "Confirm write",
            },
        }, "write", new FileToolRuleFactory("write", testConfigPaths))).toEqual([
            new FileToolRule("write", [], "ask", "Confirm write", undefined),
        ]);
    });

    test("adds nested write rules with cwd and path deny (write-rules-path-deny)", () => {
        const denyRule = new FileToolRule("write", ["**/.env"], "deny", "Env files in production are protected.", undefined);
        denyRule.requiredCwd = "/projects/production/**";
        const askRule = new FileToolRule("write", [], "ask", "Confirm write to production directory.", undefined);
        askRule.requiredCwd = "/projects/production/**";
        const listRule = new FileToolRule("write", [], "", undefined, undefined);
        listRule.requiredCwd = "/projects/production/**";
        listRule.children = [denyRule];
        listRule.catchAll = askRule;
        expect(loadSection({
            write: [{
                cwd: "/projects/production/**",
                rules: [
                    {
                        path: "**/.env",
                        decide: "deny",
                        reason: "Env files in production are protected.",
                    },
                    {
                        decide: "ask",
                        reason: "Confirm write to production directory.",
                    },
                ],
            }],
        }, "write", new FileToolRuleFactory("write", testConfigPaths))).toEqual([listRule]);
    });

    test("adds one read path-in rule (read-path-in)", () => {
        expect(loadSection({
            read: {
                "path-in": ["/etc/**", "/sys/**"],
                decide: "deny",
                reason: "system files denied",
            },
        }, "read", new FileToolRuleFactory("read", testConfigPaths))).toEqual([
            new FileToolRule("read", ["/etc/**", "/sys/**"], "deny", "system files denied", undefined),
        ]);
    });

    test("throws when path-in is not an array", () => {
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("path-in: '/etc/**'\ndecide: deny"))).toThrow(
            "permissions.yaml: read path-in must be an array"
        );
    });

    test("throws when path-in entries are not strings", () => {
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("path-in: [42]\ndecide: deny"))).toThrow(
            "permissions.yaml: read path-in entries must be strings"
        );
    });

    test("throws when decide is missing", () => {
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("path: '**/*.ts'"))).toThrow(
            "permissions.yaml: read entry must have decide or rules"
        );
    });

    test("throws when reason is not a string", () => {
        expect(() => new FileToolRuleFactory("read", testConfigPaths).load(parseYaml("path: '**/*.ts'\ndecide: deny\nreason: 42"))).toThrow("permissions.yaml: read reason must be a string");
    });

});

describe("RedirectRuleFactory.load", () => {

    test("adds nothing when section is absent", () => {
        expect(loadSection({}, "redirect", new RedirectRuleFactory())).toEqual([]);
    });

    test("adds redirect.out ordered rule with path-in allow and catch-all ask (bash-redirect-out-tmp-allow)", () => {
        expect(loadSection({
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
        }, "redirect", new RedirectRuleFactory())).toEqual([
            new RedirectOutOrderedRule([
                {
                    pathIn: ["/tmp/**"],
                    decision: "allow",
                    reason: undefined,
                    sourceLocation: undefined,
                },
                {
                    pathIn: [],
                    decision: "ask",
                    reason: undefined,
                    sourceLocation: undefined,
                },
            ], undefined),
        ]);
    });

    test("adds redirect.out ordered rule with path deny before path-in allow (bash-redirect-out-deny-wins)", () => {
        expect(loadSection({
            redirect: {
                out: [
                    {
                        path: "/etc/**",
                        decide: "deny",
                    },
                    {
                        "path-in": ["/tmp/**", "./**"],
                        decide: "allow",
                    },
                    {
                        decide: "ask",
                    },
                ],
            },
        }, "redirect", new RedirectRuleFactory())).toEqual([
            new RedirectOutOrderedRule([
                {
                    pathIn: ["/etc/**"],
                    decision: "deny",
                    reason: undefined,
                    sourceLocation: undefined,
                },
                {
                    pathIn: ["/tmp/**", "./**"],
                    decision: "allow",
                    reason: undefined,
                    sourceLocation: undefined,
                },
                {
                    pathIn: [],
                    decision: "ask",
                    reason: undefined,
                    sourceLocation: undefined,
                },
            ], undefined),
        ]);
    });

    test("adds redirect.in ordered rule with path-in allow and catch-all ask (bash-redirect-in-project-allow)", () => {
        expect(loadSection({
            redirect: {
                in: [
                    {
                        "path-in": ["./**"],
                        decide: "allow",
                    },
                    {
                        decide: "ask",
                    },
                ],
            },
        }, "redirect", new RedirectRuleFactory())).toEqual([
            new RedirectInOrderedRule([
                {
                    pathIn: ["./**"],
                    decision: "allow",
                    reason: undefined,
                    sourceLocation: undefined,
                },
                {
                    pathIn: [],
                    decision: "ask",
                    reason: undefined,
                    sourceLocation: undefined,
                },
            ], undefined),
        ]);
    });

    test("throws when redirect section is not an object", () => {
        expect(() => new RedirectRuleFactory().load(parseYaml("invalid"))).toThrow("permissions.yaml: redirect must be an object");
        expect(() => new RedirectRuleFactory().load(parseYaml("null"))).toThrow("permissions.yaml: redirect must be an object");
        expect(() => new RedirectRuleFactory().load(parseYaml("[]"))).toThrow("permissions.yaml: redirect must be an object");
    });

    test("throws when redirect.out entry lacks decide", () => {
        expect(() => new RedirectRuleFactory().load(parseYaml("out:\n  - path-in:\n      - /tmp/**"))).toThrow(
            "permissions.yaml: redirect.out must have a decide field"
        );
    });

    test("throws when redirect.out path-in is not an array", () => {
        expect(() => new RedirectRuleFactory().load(parseYaml("out:\n  - path-in: /tmp/**\n    decide: allow"))).toThrow(
            "permissions.yaml: redirect.out path-in must be an array"
        );
    });

    test("throws when redirect.out reason is not a string", () => {
        expect(() => new RedirectRuleFactory().load(parseYaml("out:\n  - decide: deny\n    reason: 42"))).toThrow(
            "permissions.yaml: redirect.out reason must be a string"
        );
    });

});

describe("WebFetchRuleFactory.load", () => {

    test("adds nothing when section is absent", () => {
        expect(loadSection({}, "webfetch", new WebFetchRuleFactory())).toEqual([]);
    });

    test("adds one webfetch host allow rule (webfetch-host-allow)", () => {
        expect(loadSection({
            webfetch: {
                host: "api.example.com",
                decide: "allow",
            },
        }, "webfetch", new WebFetchRuleFactory())).toEqual([
            new WebFetchRule(["api.example.com"], "allow", undefined, undefined),
        ]);
    });

    test("adds one webfetch host-in allow rule (webfetch-host-in)", () => {
        expect(loadSection({
            webfetch: {
                "host-in": ["api.example.com", "cdn.example.com"],
                decide: "allow",
            },
        }, "webfetch", new WebFetchRuleFactory())).toEqual([
            new WebFetchRule(["api.example.com", "cdn.example.com"], "allow", undefined, undefined),
        ]);
    });

    test("throws when section is not an object", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("invalid"))).toThrow("permissions.yaml: webfetch must be an object");
        expect(() => new WebFetchRuleFactory().load(parseYaml("null"))).toThrow("permissions.yaml: webfetch must be an object");
        expect(() => new WebFetchRuleFactory().load(parseYaml("[]"))).toThrow("permissions.yaml: webfetch must be an object");
    });

    test("adds a catch-all webfetch rule when host and host-in are missing (webfetch-tool-name-literal-allow)", () => {
        expect(loadSection({
            WebFetch: {
                decide: "allow",
                reason: "Allow fetching any URL",
            },
        }, "WebFetch", new WebFetchRuleFactory())).toEqual([
            new WebFetchRule([], "allow", "Allow fetching any URL", undefined),
        ]);
    });

    test("throws when decide is missing", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("host: api.example.com"))).toThrow(
            "permissions.yaml: webfetch must have a decide field"
        );
    });

    test("throws when reason is not a string", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("host-in:\n  - api.example.com\ndecide: deny\nreason: 42"))).toThrow("permissions.yaml: webfetch reason must be a string");
    });

    test("throws when host is not a string", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("host: 42\ndecide: allow"))).toThrow("permissions.yaml: webfetch host must be a string");
    });

    test("throws when host-in is not an array", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("host-in: api.example.com\ndecide: allow"))).toThrow("permissions.yaml: webfetch host-in must be an array");
    });

    test("throws when host-in entry is not a string", () => {
        expect(() => new WebFetchRuleFactory().load(parseYaml("host-in:\n  - 42\ndecide: allow"))).toThrow("permissions.yaml: webfetch host-in entries must be strings");
    });

});

describe("loadConfigFile", () => {

    test("returns bash rules from one permissions.yaml file", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-file-test-"));
        const configPath = join(tempRoot, "permissions.yaml");
        await writeFile(configPath, stringifyYaml({
            bash: {
                ls: { decide: "allow" },
            },
        }));

        const rules = await loadConfigFile(configPath, testConfigPaths);
        expect(rules).toHaveLength(1);
        const expectedRule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        const comparedRule = Object.assign(Object.create(Object.getPrototypeOf(rules[0])), rules[0]);
        const expectedCompared = Object.assign(Object.create(Object.getPrototypeOf(expectedRule)), expectedRule);
        delete (comparedRule as { sourceLocation?: unknown }).sourceLocation;
        delete (expectedCompared as { sourceLocation?: unknown }).sourceLocation;
        expect(comparedRule).toMatchObject(expectedCompared);
        expect(rules[0].sourceLocation).toEqual({
            file: configPath,
            line: 3,
        });
    });

    test("returns no rules when the file does not exist", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-file-test-"));
        const configPath = join(tempRoot, "permissions.yaml");

        expect(await loadConfigFile(configPath, testConfigPaths)).toEqual([]);
    });

    test("throws when file root is not an object", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-file-test-"));
        const configPath = join(tempRoot, "permissions.yaml");
        await writeFile(configPath, "invalid\n");

        await expect(loadConfigFile(configPath, testConfigPaths)).rejects.toThrow("permissions.yaml: root must be an object");
    });

    test("sets sourceLocation on rules loaded from file", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-file-test-"));
        const configPath = join(tempRoot, "permissions.yaml");
        await writeFile(configPath, "bash:\n  ls:\n    decide: allow\n");

        const rules = await loadConfigFile(configPath, testConfigPaths);
        expect(rules).toHaveLength(1);
        expect(rules[0].sourceLocation).toEqual({
            file: configPath,
            line: 3,
        });
    });

});

describe("load", () => {

    test("returns bash command-name allow rule from permissions.yaml (bash-allow-by-binary)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: {
                    decide: "allow",
                },
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ]);
    });

    test("returns bash command-name allow rule with reason from permissions.yaml (bash-allow-with-reason)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: {
                    decide: "allow",
                    reason: "ls is safe",
                },
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("ls", "allow", "ls is safe", undefined, undefined, undefined),
        ]);
    });

    test("returns bash command-name deny rule with reason from permissions.yaml (bash-deny-by-binary)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                rm: {
                    decide: "deny",
                    reason: "rm is not allowed",
                },
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("rm", "deny", "rm is not allowed", undefined, undefined, undefined),
        ]);
    });

    test("returns bash command-name ask rule with reason from permissions.yaml (bash-ask-by-binary)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                curl: {
                    decide: "ask",
                    reason: "network access requires approval",
                },
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("curl", "ask", "network access requires approval", undefined, undefined, undefined),
        ]);
    });

    test("returns only built-in rules when project permissions.yaml is missing", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await mkdir(join(projectDir, ".claude"), { recursive: true });

        const rules = await loadWithHome(projectDir);
        expect(rules).toEqual({ rules: [...builtinRules] });
    });

    test("throws when permissions.yaml root is not an object", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        const claudeDir = join(projectDir, ".claude");
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, "permissions.yaml"), "[]\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: root must be an object");
    });

    test("throws when permissions.yaml root is null", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        const claudeDir = join(projectDir, ".claude");
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, "permissions.yaml"), "null\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: root must be an object");
    });

    test("returns empty rules when bash section is absent", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {});

        const rules = await loadWithHome(projectDir);
        expect(rules).toEqual({ rules: [...builtinRules] });
    });

    test("throws when bash section is not an object", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "bash: invalid\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: bash must be an object");
    });

    test("returns empty rules when bash section is null", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "bash: null\n");

        const rules = await loadWithHome(projectDir);
        expect(rules).toEqual({ rules: [...builtinRules] });
    });

    test("throws when bash section is an array", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "bash:\n  - decide: allow\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: bash must be an object");
    });

    test("loads a childless branch rule for a group without a decide field", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: {
                    rules: [],
                },
            },
        });

        const branchRule = new BashRule("ls", "", undefined, undefined, undefined, undefined);
        branchRule.children = [];
        const rules = await loadWithHome(projectDir);
        expect(rules).toEqual({ rules: [...builtinRules, branchRule] });
    });

    test("returns rules from a list of entries for one command name", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: [
                    { decide: "allow" },
                    { decide: "ask" },
                ],
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("ls", "ask", undefined, undefined, undefined, undefined),
        ]);
    });

    test("returns write path allow rule from permissions.yaml (write-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            write: {
                path: "/home/**",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("write", ["/home/**"], "allow", undefined, undefined),
        ]);
    });

    test("returns edit path allow rule from permissions.yaml (edit-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            edit: {
                path: "**/*.ts",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("edit", ["**/*.ts"], "allow", undefined, undefined),
        ]);
    });

    test("returns multiedit path allow rule from permissions.yaml (multiedit-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            multi_edit: {
                path: "/home/**",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("multiedit", ["/home/**"], "allow", undefined, undefined),
        ]);
    });

    test("returns write path deny rule with reason from permissions.yaml (write-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            write: {
                path: "/etc/**",
                decide: "deny",
                reason: "system files denied",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("write", ["/etc/**"], "deny", "system files denied", undefined),
        ]);
    });

    test("returns edit path deny rule with reason from permissions.yaml (edit-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            edit: {
                path: "/etc/**",
                decide: "deny",
                reason: "system config denied",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("edit", ["/etc/**"], "deny", "system config denied", undefined),
        ]);
    });

    test("returns multiedit path deny rule with reason from permissions.yaml (multiedit-deny)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            multi_edit: {
                path: "/etc/**",
                decide: "deny",
                reason: "system config denied",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("multiedit", ["/etc/**"], "deny", "system config denied", undefined),
        ]);
    });

    test("returns read path allow rule from permissions.yaml (read-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            read: {
                path: "**/*.ts",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined),
        ]);
    });

    test("returns read path rule with reason from permissions.yaml (read-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            read: {
                path: "**/*.ts",
                decide: "allow",
                reason: "typescript sources are safe",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("read", ["**/*.ts"], "allow", "typescript sources are safe", undefined),
        ]);
    });

    test("returns read path deny rule with reason from permissions.yaml (read-deny-sensitive)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            read: {
                path: "**/.env*",
                decide: "deny",
                reason: "env files are sensitive",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new FileToolRule("read", ["**/.env*"], "deny", "env files are sensitive", undefined),
        ]);
    });

    test("throws when read section is not an object", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "read: invalid\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: read must be an object");
    });

    test("returns empty rules when read section is null", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "read: null\n");

        const rules = await loadWithHome(projectDir);
        expect(rules).toEqual({ rules: [...builtinRules] });
    });

    test("loads read rules from array section", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "read:\n  - path: '**/*.ts'\n    decide: allow\n");

        const rules = await loadWithHome(projectDir);
        const readRule = rules.rules.find((rule): rule is FileToolRule => rule instanceof FileToolRule && rule.toolType === "read");
        const expectedReadRule = new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined);
        const comparedReadRule = Object.assign(Object.create(Object.getPrototypeOf(readRule)), readRule);
        const expectedCompared = Object.assign(Object.create(Object.getPrototypeOf(expectedReadRule)), expectedReadRule);
        delete (comparedReadRule as { sourceLocation?: unknown }).sourceLocation;
        delete (expectedCompared as { sourceLocation?: unknown }).sourceLocation;
        expect(comparedReadRule).toMatchObject(expectedCompared);
        expect((readRule as IRule).sourceLocation?.file).toBeDefined();
    });

    test("loads catch-all read rule when path is absent", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "read:\n  decide: allow\n");

        const rules = await loadWithHome(projectDir);
        const readRule = rules.rules.find((rule): rule is FileToolRule => rule instanceof FileToolRule && rule.toolType === "read");
        const expectedReadRule = new FileToolRule("read", [], "allow", undefined, undefined);
        const comparedReadRule = Object.assign(Object.create(Object.getPrototypeOf(readRule)), readRule);
        const expectedCompared = Object.assign(Object.create(Object.getPrototypeOf(expectedReadRule)), expectedReadRule);
        delete (comparedReadRule as { sourceLocation?: unknown }).sourceLocation;
        delete (expectedCompared as { sourceLocation?: unknown }).sourceLocation;
        expect(comparedReadRule).toMatchObject(expectedCompared);
        expect((readRule as IRule).sourceLocation?.file).toBeDefined();
    });

    test("throws when read section has no decide", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "read:\n  path: '**/*.ts'\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: read entry must have decide or rules");
    });

    test("loads bash and read rules from the same permissions.yaml", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: {
                    decide: "allow",
                },
            },
            read: {
                path: "**/*.ts",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new FileToolRule("read", ["**/*.ts"], "allow", undefined, undefined),
        ]);
    });

    test("throws when bash list contains invalid entries", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "bash:\n  ls:\n    - decide: allow\n    - null\n    - invalid\n");

        await expect(loadWithHome(projectDir)).rejects.toThrow("permissions.yaml: bash.ls must contain only rule objects");
    });

    test("returns webfetch host allow rule from permissions.yaml (webfetch-host-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            webfetch: {
                host: "api.example.com",
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new WebFetchRule(["api.example.com"], "allow", undefined, undefined),
        ]);
    });

    test("returns webfetch host allow rule when section key is WebFetch (webfetch-section-pascal-host-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "WebFetch:\n  host: api.example.com\n  decide: allow\n");

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new WebFetchRule(["api.example.com"], "allow", undefined, undefined),
        ]);
    });

    test("returns webfetch host allow rule when section key is WEBFETCH (webfetch-section-upper-host-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYamlRaw(projectDir, "WEBFETCH:\n  host: api.example.com\n  decide: allow\n");

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new WebFetchRule(["api.example.com"], "allow", undefined, undefined),
        ]);
    });

    test("returns Grep allow rule from permissions.yaml (tool-name-literal-key)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            Grep: {
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new GrepRule("allow", undefined, undefined),
        ]);
    });

    test("returns GenericToolRule from permissions.yaml (tool-name-glob-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            "mcp__my_server__*": {
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new GenericToolRule("mcp__my_server__*", "allow", undefined, undefined, undefined),
        ]);
    });

    test("returns GenericToolRule with tool-in from permissions.yaml (tool-name-tool-in-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const projectDir = join(tempRoot, "project");
        await writePermissionsYaml(projectDir, {
            "my-server-allow": {
                "tool-in": ["mcp__my_server__search", "mcp__my_server__fetch"],
                decide: "allow",
            },
        });

        const rules = await loadWithHome(projectDir);
        expectLoadedConfigRules(rules, [
            new GenericToolRule(
                undefined,
                "allow",
                undefined,
                ["mcp__my_server__search", "mcp__my_server__fetch"]
            , undefined),
        ]);
    });

    test("loads bash rule from home permissions.d file (bash-explicit-projectdir-cwd-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(homeDir, ".claude", "permissions.d"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.d", "bash-explicit-cwd.yaml"),
            stringifyYaml({
                bash: {
                    npm: {
                        cwd: "${{PROJECT_DIR}}/**",
                        decide: "allow",
                    },
                },
            })
        );
        await writePermissionsYaml(projectDir, {});
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;

        try {
            const rules = await load(projectDir, homeDir, new NullAuditLogger());
            expectLoadedConfigRules(rules, [
                new BashRule("npm", "allow", undefined, undefined, projectDir + "/**", undefined),
            ]);
        }
        finally {
            if (originalProjectDir === undefined) {
                delete process.env["CLAUDE_PROJECT_DIR"];
            }
            else {
                process.env["CLAUDE_PROJECT_DIR"] = originalProjectDir;
            }
        }
    });

    test("merges home permissions.d file with project main config (bash-layered-permissions-d-merge-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(homeDir, ".claude", "permissions.d"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.d", "ls.yaml"),
            stringifyYaml({
                bash: {
                    ls: {
                        decide: "allow",
                    },
                },
            })
        );
        await writePermissionsYaml(projectDir, {
            bash: {
                echo: {
                    decide: "deny",
                },
            },
        });

        const rules = await load(projectDir, homeDir, new NullAuditLogger());
        expectLoadedConfigRules(rules, [
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
            new BashRule("echo", "deny", undefined, undefined, undefined, undefined),
        ]);
    });

    test("loads bash rule from home main permissions.yaml (home-and-project-home-rule)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-test-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(homeDir, ".claude"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.yaml"),
            stringifyYaml({
                bash: {
                    cat: {
                        decide: "allow",
                    },
                },
            })
        );
        await writePermissionsYaml(projectDir, {
            bash: {
                ls: {
                    decide: "allow",
                },
            },
        });

        const rules = await load(projectDir, homeDir, new NullAuditLogger());
        expectLoadedConfigRules(rules, [
            new BashRule("cat", "allow", undefined, undefined, undefined, undefined),
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ]);
    });

});

describe("load config_load audit", () => {

    test("logs home and project main files even when they are missing", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(homeDir, { recursive: true });
        await mkdir(projectDir, { recursive: true });
        const logger = new CapturingAuditLogger();

        await load(projectDir, homeDir, logger);

        const configEntries = logger.getEntries().filter((entry) => entry.type === "config_load") as IConfigLoadEntry[];
        expect(configEntries).toEqual([
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 0 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 0 }),
        ]);
    });

    test("logs rule counts for home and project main files", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(homeDir, ".claude"), { recursive: true });
        await mkdir(join(projectDir, ".claude"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.yaml"),
            stringifyYaml({ bash: { cat: { decide: "allow" } } })
        );
        await writeFile(
            join(projectDir, ".claude", "permissions.yaml"),
            stringifyYaml({
                bash: {
                    ls: { decide: "allow" },
                    pwd: { decide: "ask" },
                },
            })
        );
        const logger = new CapturingAuditLogger();

        await load(projectDir, homeDir, logger);

        const configEntries = logger.getEntries().filter((entry) => entry.type === "config_load") as IConfigLoadEntry[];
        expect(configEntries).toEqual([
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 1 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 2 }),
        ]);
    });

    test("logs each home and project permissions.d file with its rule count", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(homeDir, ".claude", "permissions.d"), { recursive: true });
        await mkdir(join(projectDir, ".claude", "permissions.d"), { recursive: true });
        await writeFile(
            join(homeDir, ".claude", "permissions.d", "z-home.yaml"),
            stringifyYaml({ bash: { cat: { decide: "allow" } } })
        );
        await writeFile(
            join(homeDir, ".claude", "permissions.d", "a-home.yaml"),
            stringifyYaml({ bash: { echo: { decide: "allow" } } })
        );
        await writeFile(
            join(projectDir, ".claude", "permissions.d", "aws.yaml"),
            stringifyYaml({ bash: { aws: { decide: "deny" } } })
        );
        const logger = new CapturingAuditLogger();

        await load(projectDir, homeDir, logger);

        const configEntries = logger.getEntries().filter((entry) => entry.type === "config_load") as IConfigLoadEntry[];
        expect(configEntries).toEqual([
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 0 }),
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.d/a-home.yaml", ruleCount: 1 }),
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.d/z-home.yaml", ruleCount: 1 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 0 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.d/aws.yaml", ruleCount: 1 }),
        ]);
    });

    test("does not count built-in rules in config_load ruleCount", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(homeDir, { recursive: true });
        await mkdir(projectDir, { recursive: true });
        const logger = new CapturingAuditLogger();

        const loaded = await load(projectDir, homeDir, logger);

        expect(loaded.rules.length).toBeGreaterThanOrEqual(builtinRules.length);
        const configEntries = logger.getEntries().filter((entry) => entry.type === "config_load") as IConfigLoadEntry[];
        for (const entry of configEntries) {
            expect(entry.ruleCount).toBe(0);
        }
    });

    test("skips permissions.d dotfiles, non-yaml names, and directories", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(projectDir, ".claude", "permissions.d", "nested.yaml"), { recursive: true });
        await mkdir(homeDir, { recursive: true });
        await writeFile(
            join(projectDir, ".claude", "permissions.d", ".hidden.yaml"),
            stringifyYaml({ bash: { secret: { decide: "deny" } } })
        );
        await writeFile(join(projectDir, ".claude", "permissions.d", "notes.txt"), "not yaml");
        await writeFile(
            join(projectDir, ".claude", "permissions.d", "ok.yml"),
            stringifyYaml({ bash: { ls: { decide: "allow" } } })
        );
        const logger = new CapturingAuditLogger();

        await load(projectDir, homeDir, logger);

        const configEntries = logger.getEntries().filter((entry) => entry.type === "config_load") as IConfigLoadEntry[];
        expect(configEntries).toEqual([
            expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 0 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 0 }),
            expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.d/ok.yml", ruleCount: 1 }),
        ]);
    });

    test("rethrows when permissions.yaml exists but is unreadable", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(projectDir, ".claude", "permissions.yaml"), { recursive: true });
        await mkdir(homeDir, { recursive: true });

        await expect(load(projectDir, homeDir, new NullAuditLogger())).rejects.toMatchObject({
            code: "EISDIR",
        });
    });

    test("rethrows when permissions.d exists but is not a directory", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "load-config-audit-"));
        const homeDir = join(tempRoot, "home");
        const projectDir = join(tempRoot, "project");
        await mkdir(join(projectDir, ".claude"), { recursive: true });
        await writeFile(join(projectDir, ".claude", "permissions.d"), "not a directory");
        await mkdir(homeDir, { recursive: true });

        await expect(load(projectDir, homeDir, new NullAuditLogger())).rejects.toMatchObject({
            code: "ENOTDIR",
        });
    });
});
