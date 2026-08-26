import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseToolCallInput, analyzePermission } from "../analyze";

// makeTmpProjectDir creates a temp directory with a .claude/ subdirectory and optional
// permissions.yaml content, returning the project dir path.
function makeTmpProjectDir(yamlContent?: string): string {
    const projectDir = mkdtempSync(join(tmpdir(), "analyze-test-"));
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    if (yamlContent !== undefined) {
        writeFileSync(join(projectDir, ".claude", "permissions.yaml"), yamlContent, "utf-8");
    }
    return projectDir;
}

// ---------------------------------------------------------------------------
// parseToolCallInput
// ---------------------------------------------------------------------------

test("parseToolCallInput bare command produces Bash tool call", () => {
    const result = parseToolCallInput("git status", "/project");
    expect(result.tool_name).toBe("Bash");
    expect(result.tool_input["command"]).toBe("git status");
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput read prefix produces Read tool call", () => {
    const result = parseToolCallInput("read /etc/hosts", "/project");
    expect(result.tool_name).toBe("Read");
    expect(result.tool_input["file_path"]).toBe("/etc/hosts");
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput write prefix produces Write tool call", () => {
    const result = parseToolCallInput("write /tmp/out.txt", "/project");
    expect(result.tool_name).toBe("Write");
    expect(result.tool_input["file_path"]).toBe("/tmp/out.txt");
    expect(result.tool_input["content"]).toBe("");
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput edit prefix produces Edit tool call", () => {
    const result = parseToolCallInput("edit /src/main.ts", "/project");
    expect(result.tool_name).toBe("Edit");
    expect(result.tool_input["file_path"]).toBe("/src/main.ts");
    expect(result.tool_input["old_string"]).toBe("");
    expect(result.tool_input["new_string"]).toBe("");
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput webfetch prefix produces WebFetch tool call", () => {
    const result = parseToolCallInput("webfetch https://example.com", "/project");
    expect(result.tool_name).toBe("WebFetch");
    expect(result.tool_input["url"]).toBe("https://example.com");
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput tool prefix produces generic tool call", () => {
    const result = parseToolCallInput("tool MyCustomTool", "/project");
    expect(result.tool_name).toBe("MyCustomTool");
    expect(result.tool_input).toEqual({});
    expect(result.cwd).toBe("/project");
});

test("parseToolCallInput prefixes are case-insensitive", () => {
    const readResult = parseToolCallInput("READ /etc/hosts", "/project");
    expect(readResult.tool_name).toBe("Read");

    const writeResult = parseToolCallInput("WRITE /tmp/file.txt", "/project");
    expect(writeResult.tool_name).toBe("Write");

    const webfetchResult = parseToolCallInput("WEBFETCH https://example.com", "/project");
    expect(webfetchResult.tool_name).toBe("WebFetch");
});

// ---------------------------------------------------------------------------
// analyzePermission
// ---------------------------------------------------------------------------

test("analyzePermission with allow rule for git returns decision=allow", async () => {
    const projectDir = makeTmpProjectDir(`
bash:
  git:
    - decide: allow
`);
    try {
        const result = await analyzePermission("git status", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("allow");
        expect(result.trace.some((entry) => entry.type === "rule_match")).toBe(true);
        expect(result.trace.some((entry) => entry.type === "aggregation")).toBe(true);
    }
    finally {
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission includes config_load entries in the trace", async () => {
    const projectDir = makeTmpProjectDir(`
bash:
  ls:
    - decide: allow
`);
    const emptyHomeDir = mkdtempSync(join(tmpdir(), "analyze-test-home-"));
    try {
        const result = await analyzePermission("ls", "/project", projectDir, emptyHomeDir);
        const configEntries = result.trace.filter((entry) => entry.type === "config_load");
        expect(configEntries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: "config_load", filePath: "~/.claude/permissions.yaml", ruleCount: 0 }),
                expect.objectContaining({ type: "config_load", filePath: ".claude/permissions.yaml", ruleCount: 1 }),
            ])
        );
    }
    finally {
        rmSync(emptyHomeDir, { recursive: true, force: true });
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission with no matching rules returns decision=ask", async () => {
    const projectDir = makeTmpProjectDir();
    const emptyHomeDir = mkdtempSync(join(tmpdir(), "analyze-test-home-"));
    const savedHome = process.env["HOME"];
    process.env["HOME"] = emptyHomeDir;
    try {
        const result = await analyzePermission("ls /tmp", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("ask");
        expect(result.trace.some((entry) => entry.type === "no_rule_match")).toBe(true);
    }
    finally {
        if (savedHome !== undefined) {
            process.env["HOME"] = savedHome;
        }
        else {
            delete process.env["HOME"];
        }
        rmSync(emptyHomeDir, { recursive: true, force: true });
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission with deny rule returns decision=deny and forwards reason", async () => {
    const projectDir = makeTmpProjectDir(`
bash:
  rm:
    - decide: deny
      reason: rm is dangerous
`);
    try {
        const result = await analyzePermission("rm -rf /", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("deny");
        expect(result.reason).toBe("rm is dangerous");
    }
    finally {
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission honours a project permissions.d/aws.yaml deny rule", async () => {
    const projectDir = makeTmpProjectDir(`
bash:
  ls:
    decide: allow
`);
    const permissionsDir = join(projectDir, ".claude", "permissions.d");
    mkdirSync(permissionsDir, { recursive: true });
    writeFileSync(
        join(permissionsDir, "aws.yaml"),
        "bash:\n  aws:\n    decide: deny\n    reason: aws blocked by permissions.d\n",
        "utf-8"
    );
    const emptyHomeDir = mkdtempSync(join(tmpdir(), "analyze-test-home-"));
    const savedHome = process.env["HOME"];
    process.env["HOME"] = emptyHomeDir;
    try {
        const result = await analyzePermission("aws s3 ls", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("deny");
        expect(result.reason).toBe("aws blocked by permissions.d");
        expect(result.trace.some((entry) => entry.type === "rule_match")).toBe(true);
    }
    finally {
        if (savedHome !== undefined) {
            process.env["HOME"] = savedHome;
        }
        else {
            delete process.env["HOME"];
        }
        rmSync(emptyHomeDir, { recursive: true, force: true });
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission returns ask for ls", async () => {
    const projectDir = makeTmpProjectDir("{}");
    try {
        const result = await analyzePermission("ls", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("ask");
        expect(result.trace.some((entry) => entry.type === "no_rule_match")).toBe(true);
    }
    finally {
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission returns ask for ls -l", async () => {
    const projectDir = makeTmpProjectDir("{}");
    try {
        const result = await analyzePermission("ls -l", "/project", projectDir, tmpdir());
        expect(result.decision).toBe("ask");
        expect(result.trace.some((entry) => entry.type === "no_rule_match")).toBe(true);
    }
    finally {
        rmSync(projectDir, { recursive: true, force: true });
    }
});

test("analyzePermission expands ${{PROJECT_DIR}} using the project dir it was given, not the ambient env var", async () => {
    const projectDir = makeTmpProjectDir([
        "bash:",
        "  git:",
        "    merge:",
        "      cwd: ${{PROJECT_DIR}}/**",
        "      decide: allow",
        "      reason: merge in this project",
        "",
    ].join("\n"));

    // The ambient variable names a different directory from the one being analysed, so a rule
    // expanded from the environment would anchor somewhere the command is not and never match.
    const savedProjectDir = process.env["CLAUDE_PROJECT_DIR"];
    process.env["CLAUDE_PROJECT_DIR"] = tmpdir();
    try {
        const result = await analyzePermission("git merge feature --ff-only", projectDir, projectDir, tmpdir());
        expect(result.decision).toBe("allow");
        expect(result.reason).toBe("merge in this project");
    }
    finally {
        if (savedProjectDir !== undefined) {
            process.env["CLAUDE_PROJECT_DIR"] = savedProjectDir;
        }
        else {
            delete process.env["CLAUDE_PROJECT_DIR"];
        }
        rmSync(projectDir, { recursive: true, force: true });
    }
});
