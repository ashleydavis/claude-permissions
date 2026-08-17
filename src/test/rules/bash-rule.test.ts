import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { IFileFieldMap, INotFields } from "../../config";
import { BashRule } from "../../rules/bash-rule";
import { BashRuleFactory } from "../../rules/bash-rule-factory";
import { ICommandNode } from "../../ast-nodes/command-ast-node";
import { CommandAstNode } from "../../ast-nodes/command-ast-node";
import { FilePathToolAstNode } from "../../ast-nodes/file-path-tool-ast-node";

const emptyCommand = new CommandAstNode("ls", {}, [], {}, "ls") as ICommandNode;

describe("BashRule.expandEnvVarsInArg", () => {

    const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);

    test("returns arg unchanged when no variables are present", async () => {
        expect(rule.expandEnvVarsInArg("/tmp/out.log", {}, {})).toBe("/tmp/out.log");
    });

    test("expands bare variable from inline env prefix (bash-env-var-inline-prefix-expanded)", async () => {
        expect(rule.expandEnvVarsInArg("$F", { F: "/tmp/out.log" }, {})).toBe("/tmp/out.log");
    });

    test("expands braced variable from inline env prefix", async () => {
        expect(rule.expandEnvVarsInArg("${G}", { G: "/tmp/other" }, {})).toBe("/tmp/other");
    });

    test("expands variable from threaded context env (bash-env-var-and-operator-propagated)", async () => {
        expect(rule.expandEnvVarsInArg("$B", {}, { B: "/tmp/out.log" })).toBe("/tmp/out.log");
    });

    test("prefers inline env prefix over threaded context when both define the variable", async () => {
        expect(rule.expandEnvVarsInArg("$X", { X: "/tmp/prefix" }, { X: "/tmp/context" })).toBe("/tmp/prefix");
    });

    test("leaves unknown variables as literal tokens", async () => {
        expect(rule.expandEnvVarsInArg("$UNKNOWN", {}, {})).toBe("$UNKNOWN");
    });

});

describe("BashRule.expandEnvVarsInArgs", () => {

    const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);

    test("returns args unchanged when no variables are present", async () => {
        const result = rule.expandEnvVarsInArgs(["s/a/b/", "/tmp/out.log"], {}, {});
        expect(result).toEqual(["s/a/b/", "/tmp/out.log"]);
    });

    test("expands bare and braced variables from inline env prefix (bash-env-var-inline-prefix-expanded)", async () => {
        const result = rule.expandEnvVarsInArgs(["$F", "${G}"], { F: "/tmp/out.log", G: "/tmp/other" }, {});
        expect(result).toEqual(["/tmp/out.log", "/tmp/other"]);
    });

    test("expands variables from threaded context env (bash-env-var-and-operator-propagated)", async () => {
        const result = rule.expandEnvVarsInArgs(["$B"], {}, { B: "/tmp/out.log" });
        expect(result).toEqual(["/tmp/out.log"]);
    });

    test("prefers inline env prefix over threaded context when both define the variable", async () => {
        const result = rule.expandEnvVarsInArgs(["$X"], { X: "/tmp/prefix" }, { X: "/tmp/context" });
        expect(result).toEqual(["/tmp/prefix"]);
    });

    test("leaves unknown variables as literal tokens", async () => {
        const result = rule.expandEnvVarsInArgs(["$UNKNOWN"], {}, {});
        expect(result).toEqual(["$UNKNOWN"]);
    });

});

describe("BashRule.evaluateCommand", () => {

    test("returns undefined for non-command nodes", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/src/index.ts", "read /home/user/project/src/index.ts");
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateCommand(readNode)).toBeUndefined();
    });

    test("returns undefined when command name does not match", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = { ...emptyCommand, commandName: "grep" };
        expect(rule.evaluateCommand(commandNode)).toBeUndefined();
    });

    test("returns command node when command name matches", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateCommand(emptyCommand)).toBe(emptyCommand);
    });

});

describe("BashRule.evaluateSubcommandPath", () => {

    test("returns true when subcommand path is absent", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateSubcommandPath(emptyCommand)).toBe(true);
    });

    test("returns false when positionals are shorter than subcommand path", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["test", "unit"];
        const commandNode: ICommandNode = { ...emptyCommand, commandName: "npm", positionals: ["test"] };
        expect(rule.evaluateSubcommandPath(commandNode)).toBe(false);
    });

    test("returns false when subcommand path does not match", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["test"];
        const commandNode: ICommandNode = { ...emptyCommand, commandName: "npm", positionals: ["run"] };
        expect(rule.evaluateSubcommandPath(commandNode)).toBe(false);
    });

    test("returns true when subcommand path matches", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["test"];
        const commandNode: ICommandNode = { ...emptyCommand, commandName: "npm", positionals: ["test"] };
        expect(rule.evaluateSubcommandPath(commandNode)).toBe(true);
    });

    test("returns true when three-level subcommand path matches (bash-deep-subcommand)", async () => {
        const rule = new BashRule("docker", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["compose", "up"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "docker",
            positionals: ["compose", "up"],
        };
        expect(rule.evaluateSubcommandPath(commandNode)).toBe(true);
    });

});

describe("BashRule.evaluateRequiredEnv", () => {

    test("returns true when required env is absent", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredEnv(emptyCommand, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when required env var is missing", async () => {
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(rule.evaluateRequiredEnv(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns false when required env var has wrong value", async () => {
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(rule.evaluateRequiredEnv(emptyCommand, { cwd: "/project", env: { FOO: "other" } })).toBe(false);
    });

    test("returns true when required env var matches context env", async () => {
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(rule.evaluateRequiredEnv(emptyCommand, { cwd: "/project", env: { FOO: "bar" } })).toBe(true);
    });

    test("returns true when env prefix overrides context env (env-prefix)", async () => {
        const rule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "npm",
            positionals: ["test"],
            envPrefix: { NODE_ENV: "test" },
        };
        expect(rule.evaluateRequiredEnv(commandNode, { cwd: "/project", env: { NODE_ENV: "production" } })).toBe(true);
    });

    test("returns true when env regex matches (bash-rules-one-subrule)", async () => {
        const rule = new BashRule("aws", "deny", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "aws",
            envPrefix: { AWS_PROFILE: "prod" },
        };
        expect(rule.evaluateRequiredEnv(commandNode, { cwd: "/project", env: {} })).toBe(true);
    });

});

describe("BashRule.evaluateNot", () => {

    test("returns false when not block is absent", async () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns true when not env var matches env prefix (bash-not-env-matches-abstain)", async () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        rule.not = { env: { AWS_PROFILE: "sandbox" } };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "aws",
            envPrefix: { AWS_PROFILE: "sandbox" },
        };
        expect(await rule.evaluateNot(commandNode, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when not env var does not match", async () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        rule.not = { env: { AWS_PROFILE: "sandbox" } };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: { AWS_PROFILE: "prod" } })).toBe(false);
    });

    test("returns false when not file block is absent", async () => {
        const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns true when not file path is absent (bash-not-file-absent-abstain)", async () => {
        const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        rule.not = { file: { "/nonexistent/path/to/file.yaml": { contains: "sandbox" } } };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when not file exists but contains does not match", async () => {
        const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        rule.not = { file: { "/etc/passwd": { contains: "sandbox" } } };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns false when relative not file exists but contains does not match (bash-not-file-no-match-fires)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-not-file-no-match-test-"));
        const filePath = join(tempRoot, "no-sandbox.txt");
        await writeFile(filePath, "production\n");
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = tempRoot;
        try {
            const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
            rule.not = { file: { "no-sandbox.txt": { contains: "sandbox" } } };
            expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
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

    test("returns true when not file contains matches (bash-not-file-matches-abstain)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-not-file-test-"));
        const filePath = join(tempRoot, "sandbox.txt");
        await writeFile(filePath, "sandbox\n");
        const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        rule.not = { file: { [filePath]: { contains: "sandbox" } } };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when not cmd-in has no matching positional (bash-not-cmd-in-no-match-fires)", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        rule.not = { "cmd-in": ["**"] };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns true when not cmd-in matches a positional", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        rule.not = { "cmd-in": ["**"] };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            positionals: ["file.txt"],
        };
        expect(await rule.evaluateNot(commandNode, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns true when not options-in flag is present (bash-not-options-in-matches-abstain)", async () => {
        const rule = new BashRule("gh", "allow", undefined, undefined, undefined, undefined);
        rule.not = { "options-in": ["X|method"] };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "gh",
            options: { X: "POST" },
        };
        expect(await rule.evaluateNot(commandNode, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when not options-in flag is absent (bash-not-options-in-no-match-fires)", async () => {
        const rule = new BashRule("gh", "allow", undefined, undefined, undefined, undefined);
        rule.not = { "options-in": ["X|method"] };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

    test("returns true when not options flag is present (bash-not-options-matches-abstain)", async () => {
        const rule = new BashRule("yq", "allow", undefined, undefined, undefined, undefined);
        rule.not = { options: ["i|inplace"] };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "yq",
            options: { i: true },
        };
        expect(await rule.evaluateNot(commandNode, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns false when not options flag is absent", async () => {
        const rule = new BashRule("yq", "allow", undefined, undefined, undefined, undefined);
        rule.not = { options: ["i|inplace"] };
        expect(await rule.evaluateNot(emptyCommand, { cwd: "/project", env: {} })).toBe(false);
    });

});

describe("BashRule.evaluateFile", () => {

    test("returns true when the file exists and contains the string", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-evaluate-file-test-"));
        const filePath = join(tempRoot, "sandbox.txt");
        await writeFile(filePath, "sandbox\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFile(filePath, { contains: "sandbox" }, { cwd: "/project", env: {} }, false)).toBe(true);
    });

    test("returns false when the file exists but does not contain the string", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-evaluate-file-test-"));
        const filePath = join(tempRoot, "no-sandbox.txt");
        await writeFile(filePath, "production\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFile(filePath, { contains: "sandbox" }, { cwd: "/project", env: {} }, false)).toBe(false);
    });

    test("returns the missing-file result when the file is absent", async () => {
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFile("/nonexistent/path/to/file.yaml", { contains: "sandbox" }, { cwd: "/project", env: {} }, true)).toBe(true);
        expect(await rule.evaluateFile("/nonexistent/path/to/file.yaml", { contains: "sandbox" }, { cwd: "/project", env: {} }, false)).toBe(false);
    });

    test("resolves a relative path against the project dir", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-evaluate-file-rel-test-"));
        await writeFile(join(tempRoot, "sandbox.txt"), "sandbox\n");
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = tempRoot;
        try {
            const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
            expect(await rule.evaluateFile("sandbox.txt", { contains: "sandbox" }, { cwd: "/project", env: {} }, false)).toBe(true);
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

    test("returns true when the file exists and contains matches a regex pattern", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-evaluate-file-regex-test-"));
        const filePath = join(tempRoot, "kubeconfig.yaml");
        await writeFile(filePath, "current-context: sandbox\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFile(filePath, { contains: "/current-context: (?!prod)/" }, { cwd: "/project", env: {} }, false)).toBe(true);
    });

    test("returns true when the file exists and no contains pattern is set", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-evaluate-file-exists-test-"));
        const filePath = join(tempRoot, "kubeconfig.yaml");
        await writeFile(filePath, "anything\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFile(filePath, {}, { cwd: "/project", env: {} }, false)).toBe(true);
        expect(await rule.evaluateFile(filePath, true, { cwd: "/project", env: {} }, false)).toBe(true);
    });

});

describe("BashRule.evaluateFiles", () => {

    test("returns true when no file map is set", async () => {
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFiles(undefined, { cwd: "/project", env: {} }, false)).toBe(true);
    });

    test("returns true when file exists and contains the string (bash-file-contains-match-allow)", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-file-test-"));
        const filePath = join(tempRoot, "sandbox.txt");
        await writeFile(filePath, "sandbox\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFiles({ [filePath]: { contains: "sandbox" } }, { cwd: "/project", env: {} }, false)).toBe(true);
    });

    test("returns false when file exists but does not contain the string", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "bash-rule-file-test-"));
        const filePath = join(tempRoot, "no-sandbox.txt");
        await writeFile(filePath, "production\n");
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFiles({ [filePath]: { contains: "sandbox" } }, { cwd: "/project", env: {} }, false)).toBe(false);
    });

    test("uses the missing-file result when a file is absent", async () => {
        const rule = new BashRule("kubectl", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluateFiles({ "/nonexistent/path/to/file.yaml": { contains: "sandbox" } }, { cwd: "/project", env: {} }, true)).toBe(true);
        expect(await rule.evaluateFiles({ "/nonexistent/path/to/file.yaml": { contains: "sandbox" } }, { cwd: "/project", env: {} }, false)).toBe(false);
    });
});

describe("BashRule.evaluateEnvVarMap", () => {

    test("returns true when the env map is undefined", () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateEnvVarMap(undefined, emptyCommand, { cwd: "/project", env: {} })).toBe(true);
    });

    test("returns true when every env var matches", () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateEnvVarMap({ AWS_PROFILE: "sandbox" }, emptyCommand, { cwd: "/project", env: { AWS_PROFILE: "sandbox" } })).toBe(true);
    });

    test("returns false when an env var does not match", () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateEnvVarMap({ AWS_PROFILE: "sandbox" }, emptyCommand, { cwd: "/project", env: { AWS_PROFILE: "prod" } })).toBe(false);
    });
});

describe("BashRule.evaluateRequiredCwd", () => {

    test("returns true when required cwd is absent", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/project", env: {} })).toBe(true);
    });

    test("returns true when cwd matches (cd-cwd-update)", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, "/tmp", undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/tmp", env: {} })).toBe(true);
    });

    test("returns false when cwd does not match", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, "/tmp", undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", env: {} })).toBe(false);
    });

    test("returns true when cwd matches glob pattern (bash-cwd-glob)", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, "/home/**", undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", env: {} })).toBe(true);
    });

    test("returns false when cwd matches but cwdResolved is false (bash-cwd-when-unresolved-ask)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, "/home/**", undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/home/user/project", cwdResolved: false, env: {} })).toBe(false);
    });

    test("normalizes cwd with parent segments before matching (bash-explicit-home-path-allow)", () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, "/tmp/home/**", undefined);
        expect(rule.evaluateRequiredCwd({ cwd: "/tmp/project/../home/app", env: {} })).toBe(true);
    });

});

describe("BashRule.evaluateRequiredCwdInPatterns", () => {

    test("returns true when cwd-in patterns are absent", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/home/user/project", env: {} })).toBe(true);
    });

    test("returns true when cwd matches any cwd-in pattern (bash-cwd-in)", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCwdInPatterns = ["/home/**", "/tmp/**"];
        expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/home/user/project", env: {} })).toBe(true);
    });

    test("returns true when cwd matches second cwd-in pattern", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCwdInPatterns = ["/home/**", "/tmp/**"];
        expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/tmp/work", env: {} })).toBe(true);
    });

    test("returns false when cwd matches no cwd-in pattern", async () => {
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCwdInPatterns = ["/home/**", "/tmp/**"];
        expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/var/project", env: {} })).toBe(false);
    });

    test("returns false when cwd matches cwd-in but cwdResolved is false (bash-cwd-when-unresolved-ask)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCwdInPatterns = ["/home/**"];
        expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/home/user/project", cwdResolved: false, env: {} })).toBe(false);
    });

    test("matches ./ against cwd at the project root (bash-cwd-in-dot-slash-allow)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/my/project";
        try {
            const rule = new BashRule("bun", "allow", undefined, undefined, undefined, undefined);
            rule.requiredCwdInPatterns = ["./"];
            expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/my/project", env: {} })).toBe(true);
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

    test("does not match ./ or ./** when cwd is outside the project (bash-cwd-in-dot-star-outside-ask)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/my/project";
        try {
            const rule = new BashRule("bun", "allow", undefined, undefined, undefined, undefined);
            rule.requiredCwdInPatterns = ["./", "./**"];
            expect(rule.evaluateRequiredCwdInPatterns({ cwd: "/tmp/elsewhere", env: {} })).toBe(false);
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

});

describe("BashRule.evaluateRequiredCmdPatterns", () => {

    const emptyContext = { cwd: "/project", env: {} };

    test("returns true when cmd patterns are absent", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredCmdPatterns(emptyCommand, emptyContext)).toBe(true);
    });

    test("returns true when cmd patterns match (bash-rules-one-subrule)", async () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "aws",
            positionals: ["ec2", "delete-instance", "i-123"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns true when single cmd glob matches first positional (bash-cmd-single)", async () => {
        const rule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*.ts"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "cp",
            positionals: ["file.ts", "dest/"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns true when each cmd array pattern matches its positional (bash-cmd-array)", async () => {
        const rule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*.ts", "*.ts"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "cp",
            positionals: ["file.ts", "dest.ts"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns false when one cmd array pattern does not match (bash-cmd-array)", async () => {
        const rule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*.ts", "*.ts"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "cp",
            positionals: ["file.ts", "dest.txt"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(false);
    });

    test("returns false when cmd pattern does not match", async () => {
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "aws",
            positionals: ["ec2", "describe-instances"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(false);
    });

    test("returns true when cmd regex pattern matches (bash-regex-pattern)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["/.*backup.*/"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            positionals: ["important_data_backup.tar.gz"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns false when cmd regex pattern does not match (bash-regex-pattern)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["/.*backup.*/"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            positionals: ["important_data.tar.gz"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(false);
    });

    test("skips positionals already matched by subcommand path", async () => {
        const rule = new BashRule("git", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["push"];
        rule.requiredCmdPatterns = ["origin"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "git",
            positionals: ["push", "origin"],
        };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("resolves path positionals against cwd before matching (bash-explicit-home-cwd-allow)", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["/tmp/home/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "ls",
            positionals: ["/tmp/project/../home/docs"],
        };
        const context = { cwd: "/tmp/project", env: {} };
        expect(rule.evaluateRequiredCmdPatterns(commandNode, context)).toBe(true);
    });

    test("matches a ./ pattern against a positional inside the project (bash-cd-find-sort-project-subdir-allow)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/tmp/project";
        try {
            const rule = new BashRule("find", "allow", undefined, undefined, undefined, undefined);
            rule.requiredCmdPatterns = ["./**"];
            const commandNode: ICommandNode = {
                ...emptyCommand,
                commandName: "find",
                positionals: ["."],
            };
            const context = { cwd: "/tmp/project/foo/bar", env: {} };
            expect(rule.evaluateRequiredCmdPatterns(commandNode, context)).toBe(true);
        }
        finally {
            process.env["CLAUDE_PROJECT_DIR"] = originalProjectDir;
        }
    });

    test("does not match a ./ pattern when the positional resolves outside the project (bash-cd-find-outside-project-ask)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/tmp/project";
        try {
            const rule = new BashRule("find", "allow", undefined, undefined, undefined, undefined);
            rule.requiredCmdPatterns = ["./**"];
            const commandNode: ICommandNode = {
                ...emptyCommand,
                commandName: "find",
                positionals: ["."],
            };
            const context = { cwd: "/etc", env: {} };
            expect(rule.evaluateRequiredCmdPatterns(commandNode, context)).toBe(false);
        }
        finally {
            process.env["CLAUDE_PROJECT_DIR"] = originalProjectDir;
        }
    });

});

describe("BashRule.evaluateRequiredCmdInPatterns", () => {

    const emptyContext = { cwd: "/project", env: {} };

    test("returns true when cmd-in patterns are absent", async () => {
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredCmdInPatterns(emptyCommand, emptyContext)).toBe(true);
    });

    test("returns true when any positional matches any pattern (bash-cmd-in)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["*.json", "*.yaml"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            positionals: ["config.json"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns true when a later positional matches a pattern", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["*.json", "*.yaml"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            positionals: ["other.txt", "config.yaml"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns false when no positional matches any pattern", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["*.json", "*.yaml"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            positionals: ["readme.txt"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(false);
    });

    test("skips positionals already matched by subcommand path", async () => {
        const rule = new BashRule("git", "deny", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["push"];
        rule.requiredCmdInPatterns = ["origin"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "git",
            positionals: ["push", "origin"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns true when inline env prefix expands positional before cmd-in match (bash-env-var-inline-prefix-expanded)", async () => {
        const rule = new BashRule("sed", "allow", "sed within /tmp", undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/tmp/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            options: { i: true },
            positionals: ["s/a/b/", "$F"],
            envPrefix: { F: "/tmp/out.log" },
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns true when threaded context env expands positional before cmd-in match (bash-env-var-and-operator-propagated)", async () => {
        const rule = new BashRule("sed", "allow", "sed within /tmp", undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/tmp/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            options: { i: true },
            positionals: ["s/a/b/", "$B"],
            envPrefix: {},
        };
        const context = { cwd: "/home/user/outside-the-project", env: { B: "/tmp/out.log" } };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, context)).toBe(true);
    });

    test("returns false when unknown variable stays literal and does not match cmd-in (bash-env-var-unknown-not-expanded-ask)", async () => {
        const rule = new BashRule("sed", "allow", "sed within /tmp", undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/tmp/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            options: { i: true },
            positionals: ["s/a/b/", "$Z"],
            envPrefix: {},
        };
        const context = { cwd: "/home/user/outside-the-project", env: {} };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, context)).toBe(false);
    });

    test("returns true when cmd-in regex pattern matches (bash-cmd-in-regex-pattern)", async () => {
        const rule = new BashRule("awk", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/system *\\(/"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "awk",
            positionals: ['BEGIN{system("id")}'],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns false when cmd-in regex pattern does not match", async () => {
        const rule = new BashRule("awk", "deny", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/system *\\(/"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "awk",
            positionals: ["BEGIN{print 1}"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(false);
    });

    test("returns true when cmd-in project-dir glob matches a relative path (bash-cmd-in-projectdir-relative-allow)", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/project/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            positionals: ["s/a/b/", "foo.txt"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(true);
    });

    test("returns false when cmd-in project-dir glob does not match a path outside the project", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["/project/**"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            positionals: ["/etc/passwd"],
        };
        expect(rule.evaluateRequiredCmdInPatterns(commandNode, emptyContext)).toBe(false);
    });

});

describe("BashRule.matchCmdInPattern", () => {

    const emptyContext = { cwd: "/project", env: {} };

    test("matches a /regex/ pattern against a positional", async () => {
        const rule = new BashRule("awk", "deny", undefined, undefined, undefined, undefined);
        expect(rule.matchCmdInPattern("/system *\\(/", 'BEGIN{system("id")}', emptyContext)).toBe(true);
    });

    test("does not match a /regex/ pattern against a non-matching positional", async () => {
        const rule = new BashRule("awk", "deny", undefined, undefined, undefined, undefined);
        expect(rule.matchCmdInPattern("/system *\\(/", "BEGIN{print 1}", emptyContext)).toBe(false);
    });

    test("matches a glob pattern against a positional", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        expect(rule.matchCmdInPattern("*.json", "config.json", emptyContext)).toBe(true);
    });

    test("resolves a relative positional against cwd for path-style globs", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        expect(rule.matchCmdInPattern("/project/**", "foo.txt", emptyContext)).toBe(true);
    });

});

describe("BashRule.evaluateCmdInPatterns", () => {

    const emptyContext = { cwd: "/project", env: {} };

    test("returns true when a positional matches a pattern", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            positionals: ["file.txt"],
        };
        expect(rule.evaluateCmdInPatterns(["**"], commandNode, emptyContext)).toBe(true);
    });

    test("returns false when no positional matches (bash-not-cmd-in-no-match-fires)", async () => {
        const rule = new BashRule("sed", "allow", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "sed",
            positionals: [],
        };
        expect(rule.evaluateCmdInPatterns(["**"], commandNode, emptyContext)).toBe(false);
    });

    test("returns true when a positional matches a /regex/ pattern", async () => {
        const rule = new BashRule("awk", "deny", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "awk",
            positionals: ['BEGIN{system("id")}'],
        };
        expect(rule.evaluateCmdInPatterns(["/system *\\(/"], commandNode, emptyContext)).toBe(true);
    });

});

describe("BashRule.evaluateFlagAliasPresent", () => {

    test("returns true when a short flag alias is present", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: { r: true },
            positionals: ["dir"],
        };
        expect(rule.evaluateFlagAliasPresent("r|recursive", commandNode)).toBe(true);
    });

    test("returns true when a long flag alias is present (bash-args-alias)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: { recursive: true },
            positionals: ["dir"],
        };
        expect(rule.evaluateFlagAliasPresent("r|recursive", commandNode)).toBe(true);
    });

    test("returns false when no alias from the expression is present", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: {},
            positionals: ["dir"],
        };
        expect(rule.evaluateFlagAliasPresent("r|recursive", commandNode)).toBe(false);
    });

});

describe("BashRule.evaluateRequiredOptions", () => {

    test("returns true when required options are absent", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredOptions(emptyCommand)).toBe(true);
    });

    test("returns true when every required flag is present (bash-args-flag-presence)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptions = ["r"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: { r: true },
            positionals: ["dir"],
        };
        expect(rule.evaluateRequiredOptions(commandNode)).toBe(true);
    });

    test("returns false when a required flag is absent (bash-args-no-match)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptions = ["r"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: {},
            positionals: ["dir"],
        };
        expect(rule.evaluateRequiredOptions(commandNode)).toBe(false);
    });

    test("returns true when a long-form alias matches (bash-args-alias)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptions = ["r|recursive"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: { recursive: true },
            positionals: ["dir"],
        };
        expect(rule.evaluateRequiredOptions(commandNode)).toBe(true);
    });

});

describe("BashRule.evaluateRequiredOptionPatterns", () => {

    test("returns true when required option patterns are absent", async () => {
        const rule = new BashRule("git", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredOptionPatterns(emptyCommand)).toBe(true);
    });

    test("returns true when flag value matches glob pattern (bash-args-value-pattern)", async () => {
        const rule = new BashRule("git", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptionPatterns = { message: "wip*" };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "git",
            options: { message: "wip-some-change" },
            positionals: ["commit"],
        };
        expect(rule.evaluateRequiredOptionPatterns(commandNode)).toBe(true);
    });

    test("returns false when flag value does not match glob pattern", async () => {
        const rule = new BashRule("git", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptionPatterns = { message: "wip*" };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "git",
            options: { message: "feat: add stuff" },
            positionals: ["commit"],
        };
        expect(rule.evaluateRequiredOptionPatterns(commandNode)).toBe(false);
    });

    test("returns true when flag value matches a /regex/ pattern (bash-protecting-production-kubectl-rules-get-allow)", async () => {
        const rule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        rule.requiredOptionPatterns = { context: "/^(?!sandbox)/" };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "kubectl",
            options: { context: "prod-cluster" },
            positionals: ["get", "pods"],
        };
        expect(rule.evaluateRequiredOptionPatterns(commandNode)).toBe(true);
    });

    test("returns false when flag value fails a /regex/ pattern", async () => {
        const rule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        rule.requiredOptionPatterns = { context: "/^(?!sandbox)/" };
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "kubectl",
            options: { context: "sandbox-1" },
            positionals: ["get", "pods"],
        };
        expect(rule.evaluateRequiredOptionPatterns(commandNode)).toBe(false);
    });

});

describe("BashRule.evaluateRequiredOptionsIn", () => {

    test("returns true when required options-in are absent", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        expect(rule.evaluateRequiredOptionsIn(emptyCommand)).toBe(true);
    });

    test("returns true when any listed flag is present (bash-args-in)", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptionsIn = ["r", "f"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: { r: true },
            positionals: ["dir"],
        };
        expect(rule.evaluateRequiredOptionsIn(commandNode)).toBe(true);
    });

    test("returns false when no listed flag is present", async () => {
        const rule = new BashRule("rm", "deny", undefined, undefined, undefined, undefined);
        rule.requiredOptionsIn = ["r", "f"];
        const commandNode: ICommandNode = {
            ...emptyCommand,
            commandName: "rm",
            options: {},
            positionals: ["dir"],
        };
        expect(rule.evaluateRequiredOptionsIn(commandNode)).toBe(false);
    });

});

describe("BashRule.evaluate", () => {

    test("returns undefined for non-command nodes", async () => {
        const readNode = new FilePathToolAstNode("read", "/home/user/project/src/index.ts", "read /home/user/project/src/index.ts");
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluate(readNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when command name does not match", async () => {
        const commandNode = new CommandAstNode("grep", {}, [], {}, "grep");
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns allow when command name matches", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns undefined when not env matches and suppresses the rule (bash-not-env-matches-abstain)", async () => {
        const commandNode = new CommandAstNode("aws", { "vpc-id": true }, ["ec2", "delete-vpc", "vpc-12345"], { AWS_PROFILE: "sandbox" }, "AWS_PROFILE=sandbox aws ec2 delete-vpc vpc-12345 --vpc-id");
        const rule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        rule.not = { env: { AWS_PROFILE: "sandbox" } };
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns undefined when not file path was absent and suppresses the rule (bash-not-file-absent-abstain)", async () => {
        const commandNode = new CommandAstNode("kubectl", {}, ["delete", "pod", "mypod"], {}, "kubectl delete pod mypod");
        const rule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        rule.not = { file: { "/nonexistent/path/to/file.yaml": { contains: "sandbox" } } };
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns decision with reason when command name matches", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", "ls is safe", undefined, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow", reason: "ls is safe" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns the strictest matching child decision when the group guard matches (bash-protecting-production-kubectl-kubeconfig-sandbox-allow)", async () => {
        const allowChild = new BashRule("kubectl", "allow", "Read-only.", undefined, undefined, undefined);
        allowChild.requiredCmdPatterns = ["get"];
        const denyChild = new BashRule("kubectl", "deny", "No deletes.", undefined, undefined, undefined);
        denyChild.requiredCmdPatterns = ["delete"];
        const branchRule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        branchRule.children = [allowChild, denyChild];
        const commandNode = new CommandAstNode("kubectl", {}, ["delete", "pod"], {}, "kubectl delete pod");
        expect(await branchRule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "No deletes." },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns allow from a matching child over a catch-all ask", async () => {
        const allowChild = new BashRule("kubectl", "allow", "Read-only.", undefined, undefined, undefined);
        allowChild.requiredCmdPatterns = ["get"];
        const askChild = new BashRule("kubectl", "ask", "Confirm kubectl operation", undefined, undefined, undefined);
        const branchRule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        branchRule.children = [allowChild];
        branchRule.catchAll = askChild;
        const commandNode = new CommandAstNode("kubectl", {}, ["get", "pods"], {}, "kubectl get pods");
        expect(await branchRule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "allow", reason: "Read-only." },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns catch-all ask when no constrained child matches", async () => {
        const allowChild = new BashRule("kubectl", "allow", "Read-only.", undefined, undefined, undefined);
        allowChild.requiredCmdPatterns = ["get"];
        const askChild = new BashRule("kubectl", "ask", "Confirm kubectl operation", undefined, undefined, undefined);
        const branchRule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        branchRule.children = [allowChild];
        branchRule.catchAll = askChild;
        const commandNode = new CommandAstNode("kubectl", {}, ["apply", "-f", "x"], {}, "kubectl apply -f x");
        expect(await branchRule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "ask", reason: "Confirm kubectl operation" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("abstains without evaluating children when the group guard's not suppresses it (bash-protecting-production-kubectl-kubeconfig-sandbox-allow)", async () => {
        const denyChild = new BashRule("kubectl", "deny", "No deletes.", undefined, undefined, undefined);
        denyChild.requiredCmdPatterns = ["delete"];
        const branchRule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        branchRule.not = { env: { KUBE_ENV: "sandbox" } };
        branchRule.children = [denyChild];
        const commandNode = new CommandAstNode("kubectl", {}, ["delete", "pod"], { KUBE_ENV: "sandbox" }, "KUBE_ENV=sandbox kubectl delete pod");
        expect(await branchRule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns undefined when required env var is missing", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when required env var has wrong value", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: { FOO: "other" } })).toEqual({ context: { cwd: "/project", env: { FOO: "other" } } });
    });

    test("returns deny when cmd patterns and env regex match (bash-rules-one-subrule)", async () => {
        const commandNode = new CommandAstNode("aws", { "instance-id": true }, ["ec2", "delete-instance", "i-123"], { AWS_PROFILE: "prod" }, "AWS_PROFILE=prod aws ec2 delete-instance i-123 --instance-id");
        const rule = new BashRule(
            "aws",
            "deny",
            "Destructive deletes blocked on non-sandbox profile",
            { AWS_PROFILE: "/^(?!sandbox$)/" },
            undefined
        , undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: {
                action: "deny",
                reason: "Destructive deletes blocked on non-sandbox profile",
            },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny when multilevel env and cmd patterns match (bash-rules-multilevel)", async () => {
        const commandNode = new CommandAstNode("aws", { "vpc-id": true }, ["ec2", "delete-vpc", "vpc-123"], { AWS_REGION: "us-east-1", AWS_PROFILE: "prod" }, "AWS_REGION=us-east-1 AWS_PROFILE=prod aws ec2 delete-vpc vpc-123 --vpc-id");
        const rule = new BashRule(
            "aws",
            "deny",
            "Destructive delete blocked in us-east-1",
            { AWS_REGION: "us-east-1", AWS_PROFILE: "/^(?!sandbox$)/" },
            undefined
        , undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: {
                action: "deny",
                reason: "Destructive delete blocked in us-east-1",
            },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny when five-level env and cmd patterns match (bash-rules-deep-nesting)", async () => {
        const commandNode = new CommandAstNode("aws", { "vpc-id": true }, ["ec2", "delete-vpc", "vpc-123"], {
            AWS_PROFILE: "prod",
            AWS_REGION: "us-east-1",
            DEPLOY_ENV: "production",
            SERVICE: "vpc",
        }, "aws ec2 delete-vpc vpc-123 --vpc-id");
        const rule = new BashRule(
            "aws",
            "deny",
            "Destructive delete blocked for vpc in production us-east-1",
            {
                AWS_PROFILE: "/^(?!sandbox$)/",
                AWS_REGION: "us-east-1",
                DEPLOY_ENV: "production",
                SERVICE: "vpc",
            },
            undefined
        , undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: {
                action: "deny",
                reason: "Destructive delete blocked for vpc in production us-east-1",
            },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns undefined when multilevel env region does not match (bash-rules-multilevel)", async () => {
        const commandNode = new CommandAstNode("aws", { "vpc-id": true }, ["ec2", "delete-vpc", "vpc-123"], { AWS_REGION: "us-west-2", AWS_PROFILE: "prod" }, "AWS_REGION=us-west-2 AWS_PROFILE=prod aws ec2 delete-vpc vpc-123 --vpc-id");
        const rule = new BashRule(
            "aws",
            "deny",
            "Destructive delete blocked in us-east-1",
            { AWS_REGION: "us-east-1", AWS_PROFILE: "/^(?!sandbox$)/" },
            undefined
        , undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when cmd pattern does not match", async () => {
        const commandNode = new CommandAstNode("aws", {}, ["ec2", "describe-instances"], { AWS_PROFILE: "prod" }, "AWS_PROFILE=prod aws ec2 describe-instances");
        const rule = new BashRule("aws", "deny", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        rule.requiredCmdPatterns = ["*", "delete-*"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns allow when command name and env vars match (export-sequence)", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, { FOO: "bar" }, undefined, undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: { FOO: "bar" } })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: { FOO: "bar" } },
        });
    });

    test("returns undefined when subcommand path is longer than positionals", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["test"], {}, "npm test");
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["test", "unit"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns undefined when subcommand path does not match", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["run"], {}, "npm run");
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["test"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({ context: { cwd: "/project", env: {} } });
    });

    test("returns allow when command name, subcommand path, and env prefix match (env-prefix)", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["test"], { NODE_ENV: "test" }, "NODE_ENV=test npm test");
        const rule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        rule.subcommandPath = ["test"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when subcommand path and context env match (bash-env-var)", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["test"], {}, "npm test");
        const rule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        rule.subcommandPath = ["test"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: { NODE_ENV: "test" } })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: { NODE_ENV: "test" } },
        });
    });

    test("returns allow when subcommand path matches (bash-subcommand-allow)", async () => {
        const commandNode = new CommandAstNode("git", {}, ["status"], {}, "git status");
        const rule = new BashRule("git", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["status"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns deny when subcommand path matches with reason (bash-subcommand-deny)", async () => {
        const commandNode = new CommandAstNode("git", {}, ["push"], {}, "git push");
        const rule = new BashRule("git", "deny", "no remote pushes", undefined, undefined, undefined);
        rule.subcommandPath = ["push"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "no remote pushes" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when three-level subcommand path matches (bash-deep-subcommand)", async () => {
        const commandNode = new CommandAstNode("docker", {}, ["compose", "up"], {}, "docker compose up");
        const rule = new BashRule("docker", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["compose", "up"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when cmd glob matches first positional (bash-cmd-single)", async () => {
        const commandNode = new CommandAstNode("cp", {}, ["file.ts", "dest/"], {}, "cp file.ts dest/");
        const rule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*.ts"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when cmd matches path after arity-0 flag (bash-cat-flag-before-path-allow)", async () => {
        const commandNode = new CommandAstNode("cat", { n: true }, ["fixtures/data.txt"], {}, "cat -n fixtures/data.txt");
        const rule = new BashRule("cat", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["fixtures/data.txt"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: {} },
        });
    });

    test("returns allow when cmd array patterns match both positionals (bash-cmd-array)", async () => {
        const commandNode = new CommandAstNode("cp", {}, ["file.ts", "dest.ts"], {}, "cp file.ts dest.ts");
        const rule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["*.ts", "*.ts"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when cmd regex pattern matches (bash-regex-pattern)", async () => {
        const commandNode = new CommandAstNode("rm", {}, ["important_data_backup.tar.gz"], {}, "rm important_data_backup.tar.gz");
        const rule = new BashRule("rm", "deny", "backup files protected", undefined, undefined, undefined);
        rule.requiredCmdPatterns = ["/.*backup.*/"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "backup files protected" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when cmd-in matches any positional (bash-cmd-in)", async () => {
        const commandNode = new CommandAstNode("rm", {}, ["config.json"], {}, "rm config.json");
        const rule = new BashRule("rm", "deny", "config files protected", undefined, undefined, undefined);
        rule.requiredCmdInPatterns = ["*.json", "*.yaml"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "config files protected" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when required flag is present (bash-args-flag-presence)", async () => {
        const commandNode = new CommandAstNode("rm", { r: true }, ["dir"], {}, "rm -r dir");
        const rule = new BashRule("rm", "deny", "recursive rm denied", undefined, undefined, undefined);
        rule.requiredOptions = ["r"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "recursive rm denied" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when long-form flag alias is present (bash-args-alias)", async () => {
        const commandNode = new CommandAstNode("rm", { recursive: true }, ["dir"], {}, "rm --recursive dir");
        const rule = new BashRule("rm", "deny", "recursive rm denied", undefined, undefined, undefined);
        rule.requiredOptions = ["r|recursive"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "recursive rm denied" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when flag value matches glob pattern (bash-args-value-pattern)", async () => {
        const commandNode = new CommandAstNode("git", { message: "wip-some-change" }, ["commit"], {}, "git commit --message wip-some-change");
        const rule = new BashRule("git", "deny", "no wip commits", undefined, undefined, undefined);
        rule.subcommandPath = ["commit"];
        rule.requiredOptionPatterns = { message: "wip*" };
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "no wip commits" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns deny when any options-in flag is present (bash-args-in)", async () => {
        const commandNode = new CommandAstNode("rm", { r: true }, ["dir"], {}, "rm -r dir");
        const rule = new BashRule("rm", "deny", "rm -r or -f denied", undefined, undefined, undefined);
        rule.requiredOptionsIn = ["r", "f"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "deny", reason: "rm -r or -f denied" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("env prefix overrides context env when both are present", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["test"], { NODE_ENV: "test" }, "NODE_ENV=test npm test");
        const rule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        rule.subcommandPath = ["test"];
        expect(await rule.evaluate(commandNode, { cwd: "/project", env: { NODE_ENV: "production" } })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/project", env: { NODE_ENV: "production" } },
        });
    });

    test("returns allow when cwd matches (cd-cwd-update)", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, undefined, "/tmp", undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/tmp", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/tmp", env: {} },
        });
    });

    test("returns undefined when cwd does not match", async () => {
        const commandNode = new CommandAstNode("ls", {}, [], {}, "ls");
        const rule = new BashRule("ls", "allow", undefined, undefined, "/tmp", undefined);
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            context: { cwd: "/home/user/project", env: {} },
        });
    });

    test("returns allow when cwd-in matches any pattern (bash-cwd-in)", async () => {
        const commandNode = new CommandAstNode("npm", {}, ["install"], {}, "npm install");
        const rule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        rule.subcommandPath = ["install"];
        rule.requiredCwdInPatterns = ["/home/**", "/tmp/**"];
        expect(await rule.evaluate(commandNode, { cwd: "/home/user/project", env: {} })).toEqual({
            decision: { action: "allow" },
            context: { cwd: "/home/user/project", env: {} },
        });
    });

});

describe("BashRuleFactory.load", () => {

    test("throws when section is not an object", async () => {
        expect(() => new BashRuleFactory().load(parseYaml("invalid"))).toThrow("permissions.yaml: bash must be an object");
        expect(() => new BashRuleFactory().load(parseYaml("null"))).toThrow("permissions.yaml: bash must be an object");
        expect(() => new BashRuleFactory().load(parseYaml("[]"))).toThrow("permissions.yaml: bash must be an object");
    });

    test("throws when top-level entry is invalid", async () => {
        expect(() => new BashRuleFactory().load(parseYaml("ls: null"))).toThrow("permissions.yaml: bash.ls must contain only rule objects");
    });

    test("loads rules through load", async () => {
        const rules = new BashRuleFactory().load({
            ls: { decide: "allow" },
        });
        expect(rules).toEqual([
            new BashRule("ls", "allow", undefined, undefined, undefined, undefined),
        ]);
    });

    test("puts last decide entry on catchAll when prior entries are subcommands", async () => {
        const getRule = new BashRule("kubectl", "allow", "Read-only.", undefined, undefined, undefined);
        getRule.subcommandPath = ["get"];
        const askRule = new BashRule("kubectl", "ask", "Confirm kubectl operation", undefined, undefined, undefined);
        const listRule = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        listRule.children = [getRule];
        listRule.catchAll = askRule;
        expect(new BashRuleFactory().load({
            kubectl: [
                { get: { decide: "allow", reason: "Read-only." } },
                { decide: "ask", reason: "Confirm kubectl operation" },
            ],
        })).toEqual([listRule]);
    });

    test("leaves unconstrained decide lists flat for strictest at the AST", async () => {
        expect(new BashRuleFactory().load({
            ls: [
                { decide: "allow", reason: "ls is safe" },
                { decide: "ask", reason: "Confirm ls" },
            ],
        })).toEqual([
            new BashRule("ls", "allow", "ls is safe", undefined, undefined, undefined),
            new BashRule("ls", "ask", "Confirm ls", undefined, undefined, undefined),
        ]);
    });

});

describe("BashRuleFactory.expandProjectDirToken", () => {

    const factory = new BashRuleFactory();

    test("returns pattern unchanged when token is absent", async () => {
        expect(factory.expandProjectDirToken("/tmp/**")).toBe("/tmp/**");
    });

    test("expands ${{PROJECT_DIR}} when CLAUDE_PROJECT_DIR is set (bash-explicit-projectdir-cwd-allow)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/my/project";

        try {
            expect(factory.expandProjectDirToken("${{PROJECT_DIR}}/**")).toBe("/my/project/**");
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

    test("leaves token literal when CLAUDE_PROJECT_DIR is unset", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        delete process.env["CLAUDE_PROJECT_DIR"];

        try {
            expect(factory.expandProjectDirToken("${{PROJECT_DIR}}/**")).toBe("${{PROJECT_DIR}}/**");
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

    test("expands ${{HOME}} when HOME is set (bash-explicit-home-cwd-allow)", async () => {
        const originalHome = process.env["HOME"];
        process.env["HOME"] = "/my/home";

        try {
            expect(factory.expandProjectDirToken("${{HOME}}/**")).toBe("/my/home/**");
        }
        finally {
            if (originalHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = originalHome;
            }
        }
    });

    test("leaves HOME token literal when HOME is unset", async () => {
        const originalHome = process.env["HOME"];
        delete process.env["HOME"];

        try {
            expect(factory.expandProjectDirToken("${{HOME}}/**")).toBe("${{HOME}}/**");
        }
        finally {
            if (originalHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = originalHome;
            }
        }
    });

});

describe("BashRuleFactory.loadBashEntry", () => {

    test("throws when entry is null", async () => {
        expect(() => new BashRuleFactory().loadBashEntry(parseYaml("null"), "ls", [])).toThrow("permissions.yaml: bash.ls must contain only rule objects");
    });

    test("throws when entry is an array", async () => {
        expect(() => new BashRuleFactory().loadBashEntry(parseYaml("[]"), "ls", [])).toThrow("permissions.yaml: bash.ls must contain only rule objects");
    });

});

describe("BashRuleFactory.loadCommandRule", () => {

    test("returns rule with subcommand path", async () => {
        const rule = new BashRuleFactory().loadCommandRule({ decide: "allow" }, "npm", ["test"], "allow");
        const expectedRule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["test"];
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with reason and env", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "allow",
            reason: "ls is safe",
            env: { FOO: "bar" },
        }, "ls", [], "allow");
        expect(rule).toEqual(new BashRule("ls", "allow", "ls is safe", { FOO: "bar" }, undefined, undefined));
    });

    test("returns rule with not env (bash-not-env-matches-abstain)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            not: {
                env: {
                    AWS_PROFILE: "sandbox",
                },
            },
        }, "aws", [], "deny");
        const expectedRule = new BashRule("aws", "deny", undefined, undefined, undefined, undefined);
        expectedRule.not = { env: { AWS_PROFILE: "sandbox" } };
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with not file (bash-not-file-absent-abstain)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            not: {
                file: {
                    "/nonexistent/path/to/file.yaml": {
                        contains: "sandbox",
                    },
                },
            },
        }, "kubectl", [], "deny");
        const expectedRule = new BashRule("kubectl", "deny", undefined, undefined, undefined, undefined);
        expectedRule.not = { file: { "/nonexistent/path/to/file.yaml": { contains: "sandbox" } } };
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with cwd (cd-cwd-update)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "allow",
            cwd: "/tmp",
        }, "ls", [], "allow");
        expect(rule).toEqual(new BashRule("ls", "allow", undefined, undefined, "/tmp", undefined));
    });

    test("returns rule with cwd-in patterns (bash-cwd-in)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "allow",
            "cwd-in": ["/home/**", "/tmp/**"],
        }, "npm", ["install"], "allow");
        const expectedRule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["install"];
        expectedRule.requiredCwdInPatterns = ["/home/**", "/tmp/**"];
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with cmd patterns (bash-rules-one-subrule)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            cmd: "* delete-*",
            reason: "Destructive deletes blocked on non-sandbox profile",
        }, "aws", [], "deny");
        const expectedRule = new BashRule(
            "aws",
            "deny",
            "Destructive deletes blocked on non-sandbox profile",
            undefined,
            undefined
        , undefined);
        expectedRule.requiredCmdPatterns = ["*", "delete-*"];
        expect(rule).toEqual(expectedRule);
    });

    test("expands ${{HOME}} in cmd patterns when HOME is set (bash-explicit-home-cwd-allow)", async () => {
        const originalHome = process.env["HOME"];
        process.env["HOME"] = "/my/home";

        try {
            const rule = new BashRuleFactory().loadCommandRule({
                decide: "allow",
                cmd: "${{HOME}}/**",
            }, "ls", [], "allow");
            const expectedRule = new BashRule("ls", "allow", undefined, undefined, undefined, undefined);
            expectedRule.requiredCmdPatterns = ["/my/home/**"];
            expect(rule).toEqual(expectedRule);
        }
        finally {
            if (originalHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = originalHome;
            }
        }
    });

    test("returns rule with cmd-in patterns (bash-cmd-in)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            "cmd-in": ["*.json", "*.yaml"],
            reason: "config files protected",
        }, "rm", [], "deny");
        const expectedRule = new BashRule(
            "rm",
            "deny",
            "config files protected",
            undefined,
            undefined
        , undefined);
        expectedRule.requiredCmdInPatterns = ["*.json", "*.yaml"];
        expect(rule).toEqual(expectedRule);
    });

    test("expands ${{PROJECT_DIR}} in cmd-in patterns (bash-cmd-in-projectdir-allow)", async () => {
        const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        process.env["CLAUDE_PROJECT_DIR"] = "/my/project";
        try {
            const rule = new BashRuleFactory().loadCommandRule({
                decide: "allow",
                "cmd-in": ["${{PROJECT_DIR}}/**"],
                reason: "Allow sed on files within the project directory",
            }, "sed", [], "allow");
            expect(rule.requiredCmdInPatterns).toEqual(["/my/project/**"]);
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

    test("returns rule with cmd array patterns (bash-cmd-array)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "allow",
            cmd: ["*.ts", "*.ts"],
        }, "cp", [], "allow");
        const expectedRule = new BashRule("cp", "allow", undefined, undefined, undefined, undefined);
        expectedRule.requiredCmdPatterns = ["*.ts", "*.ts"];
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with options (bash-args-flag-presence)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            options: ["r"],
            reason: "recursive rm denied",
        }, "rm", [], "deny");
        const expectedRule = new BashRule("rm", "deny", "recursive rm denied", undefined, undefined, undefined);
        expectedRule.requiredOptions = ["r"];
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with option value patterns (bash-args-value-pattern)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            options: { message: "wip*" },
            reason: "no wip commits",
        }, "git", ["commit"], "deny");
        const expectedRule = new BashRule("git", "deny", "no wip commits", undefined, undefined, undefined);
        expectedRule.subcommandPath = ["commit"];
        expectedRule.requiredOptionPatterns = { message: "wip*" };
        expect(rule).toEqual(expectedRule);
    });

    test("returns rule with options-in (bash-args-in)", async () => {
        const rule = new BashRuleFactory().loadCommandRule({
            decide: "deny",
            "options-in": ["r", "f"],
            reason: "rm -r or -f denied",
        }, "rm", [], "deny");
        const expectedRule = new BashRule("rm", "deny", "rm -r or -f denied", undefined, undefined, undefined);
        expectedRule.requiredOptionsIn = ["r", "f"];
        expect(rule).toEqual(expectedRule);
    });

    test("throws on unknown field", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\nunknown: true"), "ls", [], "allow")).toThrow("permissions.yaml: bash.ls unknown field 'unknown'");
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\ncwd_resolved: true"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm unknown field 'cwd_resolved'");
    });

    test("accepts and ignores examples", async () => {
        const rule = new BashRuleFactory().loadCommandRule(
            parseYaml("decide: allow\nexamples:\n  allow:\n    - git log --oneline\n  ask:\n    - cmd: git log\n      cwd: /tmp"),
            "git",
            ["log"],
            "allow"
        );
        const expectedRule = new BashRule("git", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["log"];
        expect(rule).toEqual(expectedRule);
    });

    test("throws when examples sits beside subcommand names", async () => {
        expect(() => new BashRuleFactory().loadBashEntry(
            parseYaml("examples:\n  allow:\n    - npm ls\nls:\n  decide: allow"),
            "npm",
            []
        )).toThrow("permissions.yaml: bash.npm unknown field 'examples'");
    });

    test("throws when options is not an array or object", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\noptions: true"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm options must be an array or object");
    });

    test("throws when options object value is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\noptions:\n  message: 42"), "git", [], "deny")).toThrow("permissions.yaml: bash.git options.message must be a string or true");
    });

    test("throws when options array element is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\noptions:\n  - 42"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm options must contain only strings");
    });

    test("throws when options-in is not an array", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\noptions-in: -r"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm options-in must be an array");
    });

    test("throws when options-in array element is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\noptions-in:\n  - 42"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm options-in must contain only strings");
    });

    test("throws on invalid reason type", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\nreason: 42"), "ls", [], "allow")).toThrow("permissions.yaml: bash.ls reason must be a string");
    });

    test("throws when env is not an object", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\nenv: invalid"), "ls", [], "allow")).toThrow("permissions.yaml: bash.ls env must be an object");
    });

    test("throws when env value is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\nenv:\n  FOO: 42"), "ls", [], "allow")).toThrow("permissions.yaml: bash.ls env.FOO must be a string");
    });

    test("throws when not is not an object", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\nnot: invalid"), "aws", [], "deny")).toThrow("permissions.yaml: bash.aws not must be an object");
    });

    test("throws when not contains unknown field", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\nnot:\n  cmd: ls"), "aws", [], "deny")).toThrow("permissions.yaml: bash.aws not unknown field 'cmd'");
    });

    test("throws when cwd is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\ncwd: 42"), "ls", [], "allow")).toThrow("permissions.yaml: bash.ls cwd must be a string");
    });

    test("throws when cmd is not a string or array", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\ncmd: 42"), "aws", [], "deny")).toThrow("permissions.yaml: bash.aws cmd must be a string or array");
    });

    test("throws when cmd array element is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\ncmd:\n  - 42"), "cp", [], "allow")).toThrow("permissions.yaml: bash.cp cmd must contain only strings");
    });

    test("throws when cmd-in is not an array", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\ncmd-in: '*.json'"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm cmd-in must be an array");
    });

    test("throws when cmd-in element is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: deny\ncmd-in:\n  - 42"), "rm", [], "deny")).toThrow("permissions.yaml: bash.rm cmd-in must contain only strings");
    });

    test("throws when cwd-in is not an array", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\ncwd-in: '/home/**'"), "npm", [], "allow")).toThrow("permissions.yaml: bash.npm cwd-in must be an array");
    });

    test("throws when cwd-in element is not a string", async () => {
        expect(() => new BashRuleFactory().loadCommandRule(parseYaml("decide: allow\ncwd-in:\n  - 42"), "npm", [], "allow")).toThrow("permissions.yaml: bash.npm cwd-in must contain only strings");
    });

});

describe("BashRuleFactory.entryHasSubcommandKey", () => {

    test("returns false when entry has only known fields", async () => {
        expect(new BashRuleFactory().entryHasSubcommandKey({
            env: { AWS_PROFILE: "sandbox" },
            rules: [],
        })).toBe(false);
    });

    test("returns true when entry nests under a subcommand name", async () => {
        expect(new BashRuleFactory().entryHasSubcommandKey({
            status: { decide: "allow" },
        })).toBe(true);
    });

    test("returns true when env is a nested subcommand rule (bash-subcommand-named-env-allow)", async () => {
        expect(new BashRuleFactory().entryHasSubcommandKey({
            completion: { decide: "allow" },
            env: { decide: "allow" },
        })).toBe(true);
    });

    test("returns true when options is a nested subcommand rule (bash-subcommand-named-options-allow)", async () => {
        expect(new BashRuleFactory().entryHasSubcommandKey({
            get: { decide: "allow" },
            options: { decide: "allow" },
        })).toBe(true);
    });

});

describe("BashRuleFactory.isEnvMatcherMap", () => {

    test("returns true for varname-to-pattern maps", async () => {
        expect(new BashRuleFactory().isEnvMatcherMap({ AWS_PROFILE: "sandbox" })).toBe(true);
    });

    test("returns false when decide is present (subcommand named env)", async () => {
        expect(new BashRuleFactory().isEnvMatcherMap({ decide: "allow" })).toBe(false);
    });

});

describe("BashRuleFactory.isOptionsMatcher", () => {

    test("returns true for flag presence arrays", async () => {
        expect(new BashRuleFactory().isOptionsMatcher(["v", "n"])).toBe(true);
    });

    test("returns true for flag-to-pattern maps", async () => {
        expect(new BashRuleFactory().isOptionsMatcher({ kubeconfig: "*/sandbox*" })).toBe(true);
    });

    test("returns false when decide is present (subcommand named options)", async () => {
        expect(new BashRuleFactory().isOptionsMatcher({ decide: "allow" })).toBe(false);
    });

});

describe("BashRuleFactory.isKnownRuleField", () => {

    test("treats env matcher maps as known env field", async () => {
        expect(new BashRuleFactory().isKnownRuleField("env", { FOO: "bar" })).toBe(true);
    });

    test("treats env with decide as a subcommand key", async () => {
        expect(new BashRuleFactory().isKnownRuleField("env", { decide: "allow" })).toBe(false);
    });

    test("treats options arrays as known options field", async () => {
        expect(new BashRuleFactory().isKnownRuleField("options", ["v"])).toBe(true);
    });

    test("treats options with decide as a subcommand key", async () => {
        expect(new BashRuleFactory().isKnownRuleField("options", { decide: "allow" })).toBe(false);
    });

});

describe("BashRuleFactory.loadIntermediateRulesEntry", () => {

    test("returns a childless branch rule for an empty rules array (bash-rules-zero-subrules)", async () => {
        const branchRule = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        branchRule.children = [];
        const rules = new BashRuleFactory().loadIntermediateRulesEntry({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [],
        }, "aws", []);
        expect(rules).toEqual([branchRule]);
    });

    test("gates nested rules behind the group env guard (bash-rules-one-subrule)", async () => {
        const childRule = new BashRule(
            "aws",
            "deny",
            "Destructive deletes blocked on non-sandbox profile",
            undefined,
            undefined,
            undefined
        );
        childRule.requiredCmdPatterns = ["*", "delete-*"];
        const branchRule = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        branchRule.children = [childRule];
        const rules = new BashRuleFactory().loadIntermediateRulesEntry({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [
                {
                    cmd: "* delete-*",
                    decide: "deny",
                    reason: "Destructive deletes blocked on non-sandbox profile",
                },
            ],
        }, "aws", []);
        expect(rules).toEqual([branchRule]);
    });

    test("puts decide-only nested entries on catchAll", async () => {
        const getRule = new BashRule("kubectl", "allow", "Read-only.", undefined, undefined, undefined);
        getRule.requiredCmdPatterns = ["get"];
        const askRule = new BashRule("kubectl", "ask", "Confirm", undefined, undefined, undefined);
        const expected = new BashRule("kubectl", "", undefined, undefined, undefined, undefined);
        expected.children = [getRule];
        expected.catchAll = askRule;
        expect(new BashRuleFactory().loadIntermediateRulesEntry({
            rules: [
                { cmd: "get", decide: "allow", reason: "Read-only." },
                { decide: "ask", reason: "Confirm" },
            ],
        }, "kubectl", [])).toEqual([expected]);
    });

});

describe("BashRuleFactory.loadNestedSubcommandEntry", () => {

    test("loads subcommand allow rule (bash-subcommand-allow)", async () => {
        const rules = new BashRuleFactory().loadNestedSubcommandEntry(
            "git",
            [],
            "status",
            { decide: "allow" }
        );
        const expectedRule = new BashRule("git", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["status"];
        expect(rules).toEqual([expectedRule]);
    });

    test("loads subcommand entries from a list", async () => {
        const rules = new BashRuleFactory().loadNestedSubcommandEntry(
            "npm",
            [],
            "run",
            [
                { decide: "allow" },
                { decide: "ask" },
            ]
        );
        const allowRule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        allowRule.subcommandPath = ["run"];
        const askRule = new BashRule("npm", "ask", undefined, undefined, undefined, undefined);
        askRule.subcommandPath = ["run"];
        expect(rules).toEqual([allowRule, askRule]);
    });

    test("throws on scalar subcommand entry", async () => {
        expect(() => new BashRuleFactory().loadNestedSubcommandEntry("npm", [], "test", "invalid")).toThrow(
            "permissions.yaml: bash.npm unknown field 'test'"
        );
    });

});

describe("BashRuleFactory.loadSubcommandsOrRules", () => {

    test("recurses into nested subcommand entry (env-prefix)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            test: {
                env: { NODE_ENV: "test" },
                decide: "allow",
            },
        }, "npm", []);
        const expectedRule = new BashRule("npm", "allow", undefined, { NODE_ENV: "test" }, undefined, undefined);
        expectedRule.subcommandPath = ["test"];
        expect(rules).toEqual([expectedRule]);
    });

    test("loads subcommand allow rule (bash-subcommand-allow)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            status: { decide: "allow" },
        }, "git", []);
        const expectedRule = new BashRule("git", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["status"];
        expect(rules).toEqual([expectedRule]);
    });

    test("loads subcommand deny rule with reason (bash-subcommand-deny)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            push: { decide: "deny", reason: "no remote pushes" },
        }, "git", []);
        const expectedRule = new BashRule("git", "deny", "no remote pushes", undefined, undefined, undefined);
        expectedRule.subcommandPath = ["push"];
        expect(rules).toEqual([expectedRule]);
    });

    test("loads three-level nested subcommand rule (bash-deep-subcommand)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            compose: {
                up: { decide: "allow" },
            },
        }, "docker", []);
        const expectedRule = new BashRule("docker", "allow", undefined, undefined, undefined, undefined);
        expectedRule.subcommandPath = ["compose", "up"];
        expect(rules).toEqual([expectedRule]);
    });

    test("loads subcommand entries from a list", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            run: [
                { decide: "allow" },
                { decide: "ask" },
            ],
        }, "npm", []);
        const allowRule = new BashRule("npm", "allow", undefined, undefined, undefined, undefined);
        allowRule.subcommandPath = ["run"];
        const askRule = new BashRule("npm", "ask", undefined, undefined, undefined, undefined);
        askRule.subcommandPath = ["run"];
        expect(rules).toEqual([allowRule, askRule]);
    });

    test("returns empty list for intermediate entry with empty subcommand list", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({ run: [] }, "npm", []);
        expect(rules).toEqual([]);
    });

    test("returns a childless branch rule for a scoped entry with env and empty rules list (bash-rules-zero-subrules)", async () => {
        const branchRule = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        branchRule.children = [];
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [],
        }, "aws", []);
        expect(rules).toEqual([branchRule]);
    });

    test("gates nested rules behind the group env guard (bash-rules-one-subrule)", async () => {
        const childRule = new BashRule(
            "aws",
            "deny",
            "Destructive deletes blocked on non-sandbox profile",
            undefined,
            undefined,
            undefined
        );
        childRule.requiredCmdPatterns = ["*", "delete-*"];
        const branchRule = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        branchRule.children = [childRule];
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [
                {
                    cmd: "* delete-*",
                    decide: "deny",
                    reason: "Destructive deletes blocked on non-sandbox profile",
                },
            ],
        }, "aws", []);
        expect(rules).toEqual([branchRule]);
    });

    test("nests a branch rule per env level (bash-rules-multilevel)", async () => {
        const denyRule = new BashRule(
            "aws",
            "deny",
            "Destructive delete blocked in us-east-1",
            undefined,
            undefined,
            undefined
        );
        denyRule.requiredCmdPatterns = ["*", "delete-*"];
        const regionBranch = new BashRule("aws", "", undefined, { AWS_REGION: "us-east-1" }, undefined, undefined);
        regionBranch.children = [denyRule];
        const askRule = new BashRule("aws", "ask", undefined, undefined, undefined, undefined);
        const profileBranch = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        profileBranch.children = [regionBranch];
        profileBranch.catchAll = askRule;
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [
                {
                    env: { AWS_REGION: "us-east-1" },
                    rules: [
                        {
                            cmd: "* delete-*",
                            decide: "deny",
                            reason: "Destructive delete blocked in us-east-1",
                        },
                    ],
                },
                { decide: "ask" },
            ],
        }, "aws", []);
        expect(rules).toEqual([profileBranch]);
    });

    test("nests a branch rule per env level across five levels (bash-rules-deep-nesting)", async () => {
        const denyRule = new BashRule(
            "aws",
            "deny",
            "Destructive delete blocked for vpc in production us-east-1",
            undefined,
            undefined,
            undefined
        );
        denyRule.requiredCmdPatterns = ["*", "delete-*"];
        const serviceBranch = new BashRule("aws", "", undefined, { SERVICE: "vpc" }, undefined, undefined);
        serviceBranch.children = [denyRule];
        const deployBranch = new BashRule("aws", "", undefined, { DEPLOY_ENV: "production" }, undefined, undefined);
        deployBranch.children = [serviceBranch];
        const regionBranch = new BashRule("aws", "", undefined, { AWS_REGION: "us-east-1" }, undefined, undefined);
        regionBranch.children = [deployBranch];
        const askRule = new BashRule("aws", "ask", undefined, undefined, undefined, undefined);
        const profileBranch = new BashRule("aws", "", undefined, { AWS_PROFILE: "/^(?!sandbox$)/" }, undefined, undefined);
        profileBranch.children = [regionBranch];
        profileBranch.catchAll = askRule;
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            env: { AWS_PROFILE: "/^(?!sandbox$)/" },
            rules: [
                {
                    env: { AWS_REGION: "us-east-1" },
                    rules: [
                        {
                            env: { DEPLOY_ENV: "production" },
                            rules: [
                                {
                                    env: { SERVICE: "vpc" },
                                    rules: [
                                        {
                                            cmd: "* delete-*",
                                            decide: "deny",
                                            reason: "Destructive delete blocked for vpc in production us-east-1",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                { decide: "ask" },
            ],
        }, "aws", []);
        expect(rules).toEqual([profileBranch]);
    });

    test("throws when rule fields appear without decide at intermediate entry", async () => {
        expect(() => new BashRuleFactory().loadSubcommandsOrRules({
            env: { FOO: "bar" },
            test: { decide: "allow" },
        }, "npm", [])).toThrow("permissions.yaml: bash.npm unknown field 'env'");
    });

    test("loads env as a subcommand name beside other subcommands (bash-subcommand-named-env-allow)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            completion: { decide: "allow", reason: "Readonly helm access" },
            env: { decide: "allow", reason: "Readonly helm access" },
        }, "helm", []);
        expect(rules).toHaveLength(2);
        expect(rules[0].subcommandPath).toEqual(["completion"]);
        expect(rules[1].subcommandPath).toEqual(["env"]);
        expect(rules[1].decision).toBe("allow");
    });

    test("loads options as a subcommand name beside other subcommands (bash-subcommand-named-options-allow)", async () => {
        const rules = new BashRuleFactory().loadSubcommandsOrRules({
            get: { decide: "allow", reason: "Readonly kubectl access" },
            options: { decide: "allow", reason: "Readonly kubectl access" },
        }, "kubectl", []);
        expect(rules).toHaveLength(2);
        expect(rules[0].subcommandPath).toEqual(["get"]);
        expect(rules[1].subcommandPath).toEqual(["options"]);
        expect(rules[1].decision).toBe("allow");
    });

    test("throws when reason appears without decide at intermediate entry", async () => {
        expect(() => new BashRuleFactory().loadSubcommandsOrRules({
            reason: "ignored",
            test: { decide: "allow" },
        }, "npm", [])).toThrow("permissions.yaml: bash.npm unknown field 'reason'");
    });

    test("throws on scalar unknown field at intermediate entry", async () => {
        expect(() => new BashRuleFactory().loadSubcommandsOrRules({
            decidee: "allow",
        }, "npm", [])).toThrow("permissions.yaml: bash.npm unknown field 'decidee'");
    });

    test("throws when recursive subcommand entry is invalid", async () => {
        expect(() => new BashRuleFactory().loadSubcommandsOrRules(parseYaml("test:\n  - null"), "npm", [])).toThrow("permissions.yaml: bash.npm must contain only rule objects");
    });

});

describe("BashRuleFactory.loadNotFields", () => {

    test("returns parsed env (bash-not-env-matches-abstain)", async () => {
        expect(new BashRuleFactory().loadNotFields("aws", { env: { AWS_PROFILE: "sandbox" } })).toEqual({
            env: { AWS_PROFILE: "sandbox" },
        });
    });

    test("returns parsed file (bash-not-file-absent-abstain)", async () => {
        expect(new BashRuleFactory().loadNotFields("kubectl", {
            file: { "/nonexistent/path/to/file.yaml": { contains: "sandbox" } },
        })).toEqual({
            file: { "/nonexistent/path/to/file.yaml": { contains: "sandbox" } },
        });
    });

    test("returns parsed cmd-in (bash-not-cmd-in-no-match-fires)", async () => {
        expect(new BashRuleFactory().loadNotFields("sed", { "cmd-in": ["**"] })).toEqual({
            "cmd-in": ["**"],
        });
    });

    test("returns parsed options-in (bash-not-options-in-matches-abstain)", async () => {
        expect(new BashRuleFactory().loadNotFields("gh", { "options-in": ["X|method", "input"] })).toEqual({
            "options-in": ["X|method", "input"],
        });
    });

    test("returns parsed options (bash-not-options-matches-abstain)", async () => {
        expect(new BashRuleFactory().loadNotFields("yq", { options: ["i|inplace"] })).toEqual({
            options: ["i|inplace"],
        });
    });

    test("throws when not options is not an array", async () => {
        expect(() => new BashRuleFactory().loadNotFields("yq", parseYaml("options: i") as INotFields)).toThrow(
            "permissions.yaml: bash.yq not options must be an array"
        );
    });

    test("throws when not cmd-in is not an array", async () => {
        expect(() => new BashRuleFactory().loadNotFields("sed", parseYaml("cmd-in: '**'") as INotFields)).toThrow(
            "permissions.yaml: bash.sed not cmd-in must be an array"
        );
    });

    test("throws when not cmd-in contains a non-string", async () => {
        expect(() => new BashRuleFactory().loadNotFields("sed", parseYaml("cmd-in:\n  - 5") as INotFields)).toThrow(
            "permissions.yaml: bash.sed not cmd-in must contain only strings"
        );
    });

    test("throws when not contains unknown field", async () => {
        expect(() => new BashRuleFactory().loadNotFields("aws", parseYaml("cmd: ls") as INotFields)).toThrow(
            "permissions.yaml: bash.aws not unknown field 'cmd'"
        );
    });

});

describe("BashRuleFactory.loadFileField", () => {

    test("returns undefined when file field is absent", async () => {
        expect(new BashRuleFactory().loadFileField("kubectl", undefined)).toBeUndefined();
    });

    test("returns parsed file map when valid (bash-not-file-absent-abstain)", async () => {
        expect(new BashRuleFactory().loadFileField("kubectl", {
            "/nonexistent/path/to/file.yaml": { contains: "sandbox" },
        })).toEqual({
            "/nonexistent/path/to/file.yaml": { contains: "sandbox" },
        });
    });

    test("returns parsed file map for existence-only true", async () => {
        const originalHome = process.env["HOME"];
        process.env["HOME"] = "/home/testuser";
        try {
            expect(new BashRuleFactory().loadFileField("kubectl", {
                "~/.kube/config": true,
            })).toEqual({
                "/home/testuser/.kube/config": {},
            });
        }
        finally {
            if (originalHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = originalHome;
            }
        }
    });

    test("expands tilde in file paths at load time", async () => {
        const originalHome = process.env["HOME"];
        process.env["HOME"] = "/home/testuser";
        try {
            expect(new BashRuleFactory().loadFileField("kubectl", {
                "~/.kube/config": { contains: "sandbox" },
            })).toEqual({
                "/home/testuser/.kube/config": { contains: "sandbox" },
            });
        }
        finally {
            if (originalHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = originalHome;
            }
        }
    });

    test("throws when file is not an object", async () => {
        expect(() => new BashRuleFactory().loadFileField("kubectl", parseYaml("invalid") as IFileFieldMap)).toThrow(
            "permissions.yaml: bash.kubectl file must be an object"
        );
    });

    test("throws when file contains value is not a string", async () => {
        expect(() => new BashRuleFactory().loadFileField("kubectl", parseYaml(
            "/etc/kubeconfig:\n  contains: 42"
        ) as IFileFieldMap)).toThrow(
            "permissions.yaml: bash.kubectl file./etc/kubeconfig.contains must be a string"
        );
    });

});

describe("BashRuleFactory.loadRequiredEnv", () => {

    test("returns undefined when env field is absent", async () => {
        expect(new BashRuleFactory().loadRequiredEnv("ls", undefined)).toBeUndefined();
    });

    test("returns parsed env when valid", async () => {
        expect(new BashRuleFactory().loadRequiredEnv("ls", { FOO: "bar" })).toEqual({ FOO: "bar" });
    });

    test("throws when env is not an object", async () => {
        expect(() => new BashRuleFactory().loadRequiredEnv("ls", parseYaml("invalid"))).toThrow(
            "permissions.yaml: bash.ls env must be an object"
        );
    });

    test("throws when env value is not a string", async () => {
        expect(() => new BashRuleFactory().loadRequiredEnv("ls", parseYaml("FOO: 42"))).toThrow(
            "permissions.yaml: bash.ls env.FOO must be a string"
        );
    });

});
