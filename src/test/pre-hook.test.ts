import { mkdirSync, mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { readStdin, resolveHomeDir, runHook, expressivePermissionsDisabled } from "../pre-hook";
import * as decisionModule from "../decision";
import { resolvePendingDir } from "../pending-prompt-log";
import { resolveLogBaseDir } from "../audit-log";

// An async iterable that yields a single Buffer chunk, used to mock process.stdin.
interface IMockStdin {
    // Returns an async iterator that emits the mock content.
    [Symbol.asyncIterator](): AsyncGenerator<Buffer>;
}

// createMockStdin builds a mock stdin that yields the given string as a single UTF-8 Buffer.
function createMockStdin(content: string): IMockStdin {
    const buffer = Buffer.from(content, "utf-8");
    return {
        async *[Symbol.asyncIterator]() {
            if (buffer.length > 0) {
                yield buffer;
            }
        },
    };
}

// setStdin replaces process.stdin with the given mock async iterable.
function setStdin(mock: IMockStdin): void {
    Object.defineProperty(process, "stdin", {
        value: mock,
        writable: true,
        configurable: true,
    });
}

// makeIsolatedProject creates a temp project dir with optional permissions.yaml and an empty home.
interface IIsolatedDirs {
    // Temporary project directory path.
    projectDir: string;
    // Temporary empty home directory path.
    homeDir: string;
}

function makeIsolatedDirs(permissionsYaml: string): IIsolatedDirs {
    const projectDir = mkdtempSync(join(tmpdir(), "pre-hook-"));
    mkdirSync(join(projectDir, ".claude", "permissions.d"), { recursive: true });
    writeFileSync(join(projectDir, ".claude", "permissions.yaml"), permissionsYaml, "utf-8");
    const homeDir = mkdtempSync(join(tmpdir(), "pre-hook-home-"));
    return { projectDir, homeDir };
}

describe("resolveHomeDir", () => {
    test("uses HOME when set", () => {
        const savedHome = process.env["HOME"];
        process.env["HOME"] = "/tmp/custom-home";
        try {
            expect(resolveHomeDir()).toBe("/tmp/custom-home");
        }
        finally {
            if (savedHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = savedHome;
            }
        }
    });

    test("falls back to os.homedir when HOME is unset", () => {
        const savedHome = process.env["HOME"];
        delete process.env["HOME"];
        try {
            expect(resolveHomeDir()).toBe(homedir());
        }
        finally {
            if (savedHome === undefined) {
                delete process.env["HOME"];
            }
            else {
                process.env["HOME"] = savedHome;
            }
        }
    });
});

describe("readStdin", () => {
    test("returns content as a UTF-8 string", async () => {
        setStdin(createMockStdin("hello world"));
        const result = await readStdin();
        expect(result).toBe("hello world");
    });

    test("returns empty string when stdin has no content", async () => {
        setStdin(createMockStdin(""));
        const result = await readStdin();
        expect(result).toBe("");
    });

    test("concatenates multiple chunks into a single UTF-8 string", async () => {
        const mock: IMockStdin = {
            async *[Symbol.asyncIterator]() {
                yield Buffer.from("hello ", "utf-8");
                yield Buffer.from("world", "utf-8");
            },
        };
        setStdin(mock);
        const result = await readStdin();
        expect(result).toBe("hello world");
    });
});

describe("expressivePermissionsDisabled", () => {
    const original = process.env["EXPRESSIVE_PERMISSIONS"];

    afterEach(() => {
        if (original === undefined) {
            delete process.env["EXPRESSIVE_PERMISSIONS"];
        }
        else {
            process.env["EXPRESSIVE_PERMISSIONS"] = original;
        }
    });

    test("is false when the env var is unset", () => {
        delete process.env["EXPRESSIVE_PERMISSIONS"];
        expect(expressivePermissionsDisabled()).toBe(false);
    });

    test("is true for off, 0, and false", () => {
        process.env["EXPRESSIVE_PERMISSIONS"] = "off";
        expect(expressivePermissionsDisabled()).toBe(true);
        process.env["EXPRESSIVE_PERMISSIONS"] = "0";
        expect(expressivePermissionsDisabled()).toBe(true);
        process.env["EXPRESSIVE_PERMISSIONS"] = "false";
        expect(expressivePermissionsDisabled()).toBe(true);
    });
});

describe("runHook", () => {
    let exitSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;
    let stdoutSpy: jest.SpyInstance;
    let originalProjectDir: string | undefined;
    let originalHome: string | undefined;
    let originalExpressivePermissions: string | undefined;

    beforeEach(() => {
        exitSpy = jest.spyOn(process, "exit").mockImplementation(jest.fn() as any);
        stderrSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
        stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
        originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
        originalHome = process.env["HOME"];
        originalExpressivePermissions = process.env["EXPRESSIVE_PERMISSIONS"];
        process.env["CLAUDE_PROJECT_DIR"] = tmpdir();
        delete process.env["EXPRESSIVE_PERMISSIONS"];
    });

    afterEach(() => {
        exitSpy.mockRestore();
        stderrSpy.mockRestore();
        stdoutSpy.mockRestore();
        if (originalProjectDir === undefined) {
            delete process.env["CLAUDE_PROJECT_DIR"];
        }
        else {
            process.env["CLAUDE_PROJECT_DIR"] = originalProjectDir;
        }
        if (originalHome === undefined) {
            delete process.env["HOME"];
        }
        else {
            process.env["HOME"] = originalHome;
        }
        if (originalExpressivePermissions === undefined) {
            delete process.env["EXPRESSIVE_PERMISSIONS"];
        }
        else {
            process.env["EXPRESSIVE_PERMISSIONS"] = originalExpressivePermissions;
        }
    });

    test("malformed JSON writes to stderr and exits with code 1", async () => {
        setStdin(createMockStdin("not valid json"));
        await runHook();
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("missing CLAUDE_PROJECT_DIR writes to stderr and exits with code 1", async () => {
        delete process.env["CLAUDE_PROJECT_DIR"];
        setStdin(createMockStdin(JSON.stringify({
            tool_name: "Bash",
            tool_input: { command: "ls" },
            cwd: "/tmp",
        })));
        await runHook();
        expect(stderrSpy.mock.calls[0][0]).toContain("CLAUDE_PROJECT_DIR is not set");
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("empty input writes to stderr and exits with code 1", async () => {
        setStdin(createMockStdin(""));
        await runHook();
        expect(stderrSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("valid ToolCall writes hookSpecificOutput to stdout and exits with code 0", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("{}\n");
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Read",
                tool_input: { file_path: "/test.txt" },
                cwd: "/home/user",
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            expect(stdoutSpy).toHaveBeenCalled();
            const written = stdoutSpy.mock.calls[0][0] as string;
            const parsed = JSON.parse(written) as { hookSpecificOutput: { hookEventName: string; permissionDecision: string } };
            expect(parsed.hookSpecificOutput.hookEventName).toBe("PreToolUse");
            expect(["allow", "deny", "ask"]).toContain(parsed.hookSpecificOutput.permissionDecision);
            expect(exitSpy).toHaveBeenCalledWith(0);
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("EXPRESSIVE_PERMISSIONS=off allows without loading rules", async () => {
        delete process.env["CLAUDE_PROJECT_DIR"];
        process.env["EXPRESSIVE_PERMISSIONS"] = "off";
        setStdin(createMockStdin(JSON.stringify({
            tool_name: "Bash",
            tool_input: { command: "python app.py" },
            cwd: "/tmp",
        })));
        await runHook();
        const written = stdoutSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(written) as { hookSpecificOutput: { permissionDecision: string; permissionDecisionReason?: string } };
        expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
        expect(parsed.hookSpecificOutput.permissionDecisionReason).toBe("EXPRESSIVE_PERMISSIONS is off");
        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    test("project permissions.d/aws.yaml deny rule is honoured end-to-end via runHook", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("bash:\n  ls:\n    decide: allow\n");
        writeFileSync(
            join(projectDir, ".claude", "permissions.d", "aws.yaml"),
            "bash:\n  aws:\n    decide: deny\n    reason: blocked by permissions.d\n",
            "utf-8"
        );
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "aws s3 ls" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const written = stdoutSpy.mock.calls[0][0] as string;
            const parsed = JSON.parse(written) as { hookSpecificOutput: { permissionDecision: string; permissionDecisionReason?: string } };
            expect(parsed.hookSpecificOutput.permissionDecision).toBe("deny");
            expect(parsed.hookSpecificOutput.permissionDecisionReason).toBe("blocked by permissions.d");
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("ask decision writes a pending prompt detail file", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs(
            "bash:\n  curl:\n    decide: ask\n    reason: network access requires approval\n"
        );
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "curl https://example.com" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const pendingFiles = readdirSync(resolvePendingDir(projectDir)).filter(fileName => fileName.endsWith(".md"));
            expect(pendingFiles.length).toBe(1);
            expect(pendingFiles[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-.+\.md$/);
            const pendingContent = readFileSync(join(resolvePendingDir(projectDir), pendingFiles[0]), "utf-8");
            expect(pendingContent).toContain("source: matched rule");
            expect(pendingContent).toContain("network access requires approval");
            expect(pendingContent).toContain("curl https://example.com");
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("ask with no matching rule writes NOMATCH node detail in the pending prompt", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("{}\n");
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const pendingFiles = readdirSync(resolvePendingDir(projectDir)).filter(fileName => fileName.endsWith(".md"));
            expect(pendingFiles.length).toBe(1);
            const pendingContent = readFileSync(join(resolvePendingDir(projectDir), pendingFiles[0]), "utf-8");
            expect(pendingContent).toContain("decision: NOMATCH");
            expect(pendingContent).toContain("source: no rule matched");
            expect(pendingContent).toContain("ls");
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("ask for a compound command writes node detail for each side", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs(
            "bash:\n  ls:\n    decide: allow\n  curl:\n    decide: ask\n    reason: network access requires approval\n"
        );
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls && curl https://example.com" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const pendingFiles = readdirSync(resolvePendingDir(projectDir)).filter(fileName => fileName.endsWith(".md"));
            expect(pendingFiles.length).toBe(1);
            const pendingContent = readFileSync(join(resolvePendingDir(projectDir), pendingFiles[0]), "utf-8");
            expect(pendingContent).toContain("ls");
            expect(pendingContent).toContain("curl https://example.com");
            expect(pendingContent).toContain("network access requires approval");
            expect(pendingContent).toContain("source: matched rule");
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("allow decision writes tool_request and final_decision audit entries (e2e/integration/audit-log)", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("bash:\n  ls:\n    decide: allow\n");
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls" },
                cwd: "/home/user/project",
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const logBaseDir = resolveLogBaseDir(projectDir);
            const monthDirs = readdirSync(logBaseDir).filter(entryName => /^\d{4}-\d{2}$/.test(entryName));
            expect(monthDirs.length).toBeGreaterThan(0);
            const dayDirs = readdirSync(join(logBaseDir, monthDirs[0])).filter(entryName => /^\d{2}$/.test(entryName));
            expect(dayDirs.length).toBeGreaterThan(0);
            const dayFiles = readdirSync(join(logBaseDir, monthDirs[0], dayDirs[0])).filter(fileName => fileName.endsWith(".json"));
            expect(dayFiles.length).toBe(1);
            const logLines = readFileSync(join(logBaseDir, monthDirs[0], dayDirs[0], dayFiles[0]), "utf-8")
                .split("\n")
                .filter(Boolean)
                .map(line => JSON.parse(line) as { type: string; tool: string; decision?: string; filePath?: string; ruleCount?: number });
            expect(logLines).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ type: "tool_request", tool: "Bash" }),
                    expect.objectContaining({ type: "final_decision", tool: "Bash", decision: "allow" }),
                ])
            );
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("writes config_load audit entries for home and project permissions files", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("bash:\n  ls:\n    decide: allow\n");
        writeFileSync(
            join(projectDir, ".claude", "permissions.d", "aws.yaml"),
            "bash:\n  aws:\n    decide: deny\n",
            "utf-8"
        );
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const logBaseDir = resolveLogBaseDir(projectDir);
            const monthDirs = readdirSync(logBaseDir).filter(entryName => /^\d{4}-\d{2}$/.test(entryName));
            const dayDirs = readdirSync(join(logBaseDir, monthDirs[0])).filter(entryName => /^\d{2}$/.test(entryName));
            const dayFiles = readdirSync(join(logBaseDir, monthDirs[0], dayDirs[0])).filter(fileName => fileName.endsWith(".json"));
            const logLines = readFileSync(join(logBaseDir, monthDirs[0], dayDirs[0], dayFiles[0]), "utf-8")
                .split("\n")
                .filter(Boolean)
                .map(line => JSON.parse(line) as { type: string; filePath?: string; ruleCount?: number });
            expect(logLines).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 0 }),
                    expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 1 }),
                    expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.d/aws.yaml", ruleCount: 1 }),
                ])
            );
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("Bash tool call with no rules returns ask", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("{}\n");
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls" },
                cwd: "/home/user",
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const written = stdoutSpy.mock.calls[0][0] as string;
            const parsed = JSON.parse(written) as { hookSpecificOutput: { permissionDecision: string } };
            expect(parsed.hookSpecificOutput.permissionDecision).toBe("ask");
        }
        finally {
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test("undefined decide result defaults to ask with no reason", async () => {
        const { projectDir, homeDir } = makeIsolatedDirs("{}\n");
        process.env["HOME"] = homeDir;
        process.env["CLAUDE_PROJECT_DIR"] = projectDir;
        const decideSpy = jest.spyOn(decisionModule, "decide").mockResolvedValue(undefined);
        try {
            const toolCall = JSON.stringify({
                tool_name: "Bash",
                tool_input: { command: "ls" },
                cwd: projectDir,
            });
            setStdin(createMockStdin(toolCall));
            await runHook();
            const written = stdoutSpy.mock.calls[0][0] as string;
            const parsed = JSON.parse(written) as {
                hookSpecificOutput: {
                    permissionDecision: string;
                    permissionDecisionReason: string | undefined;
                };
            };
            expect(parsed.hookSpecificOutput.permissionDecision).toBe("ask");
            expect(parsed.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
        }
        finally {
            decideSpy.mockRestore();
            rmSync(homeDir, { recursive: true, force: true });
            rmSync(projectDir, { recursive: true, force: true });
        }
    });
});
