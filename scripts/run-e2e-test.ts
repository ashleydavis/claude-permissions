import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync, cpSync, lstatSync, existsSync, utimesSync } from "fs";
import { join, dirname, resolve } from "path";
import { spawnSync } from "child_process";
import { parse, stringify } from "yaml";
import { resolvePendingDir } from "../src/pending-prompt-log";

// PENDING_PROMPT_FILENAME_PATTERN matches yyyy-mm-dd-hh-ss-description.md pending detail files.
const PENDING_PROMPT_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-.+\.md$/;

// ITestCaseInput describes the tool call input fields in a test case YAML file.
interface ITestCaseInput {
    // The Claude Code tool name (e.g. "Bash", "Read")
    tool_name: string;
    // The tool-specific input arguments
    tool_input: Record<string, unknown>;
    // The working directory for the tool call. Optional; defaults to the auto-generated
    // tmp/project directory. The token ${PROJECT_DIR} is substituted with the absolute
    // path of that directory.
    cwd?: string;
}

// IPostToolUseInput describes the PostToolUse hook input fields in a test case YAML file.
interface IPostToolUseInput {
    // The Claude Code tool name (e.g. "Bash", "Read")
    tool_name: string;
    // The tool-specific input arguments
    tool_input: Record<string, unknown>;
    // The raw tool response payload
    tool_response: Record<string, unknown>;
    // The working directory for the tool call
    cwd: string;
}

// IPostToolUseExpected describes the expected outcomes for the PostToolUse hook.
interface IPostToolUseExpected {
    // When present, the newest log file must contain matching entries for each item.
    audit_log?: IAuditLogExpectedEntry[];
    // When present, the pending detail file count must match after post-hook.
    pending_prompt_count?: number;
}

// IAuditLogExpectedEntry describes one expected audit log entry to assert against.
// Only the listed fields are checked; extra fields in the actual entry are ignored.
interface IAuditLogExpectedEntry {
    // The type discriminator for this entry (e.g. "tool_request", "final_decision").
    type: string;
    // Additional fields to match against the parsed log entry.
    [key: string]: string;
}

// IPendingPromptExpected describes assertions against pending detail files after pre-hook.
interface IPendingPromptExpected {
    // Exact number of pending detail files required.
    count?: number;
    // Every pending file name must match this regular expression.
    filename_pattern?: string;
    // Every pending file name must contain this substring.
    filename_contains?: string;
    // Every listed string must appear in every pending detail file body.
    content_contains?: string | string[];
}

// IStalePendingFileSetup seeds a pending detail file with an artificially old mtime.
interface IStalePendingFileSetup {
    // File name under pending/, including the .md extension.
    file_name: string;
    // How many days before now the file mtime should be set.
    age_days: number;
}

// ITestCaseSetup describes filesystem state to create before hooks run.
interface ITestCaseSetup {
    // Pending detail files to create with backdated mtimes before the pre-hook.
    stale_pending_files?: IStalePendingFileSetup[];
}

// ITestCaseExpected describes the expected outcome fields in a test case YAML file.
interface ITestCaseExpected {
    // The expected permissionDecision value (allow, deny, or ask)
    decision: string;
    // When present, the permissionDecisionReason must match exactly
    reason?: string;
    // When present, the newest log file must contain matching entries for each item.
    audit_log?: IAuditLogExpectedEntry[];
    // When true or an object, pending detail files must match the described expectations.
    pending_prompt?: boolean | IPendingPromptExpected;
    // When true, stale pending files from setup must be gone after pre-hook cleanup.
    stale_pending_removed?: boolean;
}

// listPendingPromptFileNames returns pending detail file names sorted newest first.
function listPendingPromptFileNames(projectDir: string): string[] {
    const pendingDir = resolvePendingDir(projectDir);
    if (!existsSync(pendingDir)) {
        return [];
    }
    return readdirSync(pendingDir)
        .filter(fileName => fileName.endsWith(".md"))
        .sort((leftName, rightName) => {
            const leftPath = join(pendingDir, leftName);
            const rightPath = join(pendingDir, rightName);
            return statSync(rightPath).mtimeMs - statSync(leftPath).mtimeMs;
        });
}

// substituteProjectDir replaces ${PROJECT_DIR} tokens in a JSON-serializable value.
function substituteProjectDir<T>(value: T, projectDir: string): T {
    const substitutedJson = JSON.stringify(value).split("${PROJECT_DIR}").join(projectDir);
    return JSON.parse(substitutedJson) as T;
}

// setupStalePendingFiles writes backdated pending detail files before a test run.
function setupStalePendingFiles(projectDir: string, staleFiles: IStalePendingFileSetup[]): void {
    const pendingDir = resolvePendingDir(projectDir);
    mkdirSync(pendingDir, { recursive: true });
    for (const staleFile of staleFiles) {
        const filePath = join(pendingDir, staleFile.file_name);
        writeFileSync(filePath, "# stale pending file for smoke test\n", "utf-8");
        const oldTime = new Date(Date.now() - staleFile.age_days * 24 * 60 * 60 * 1000);
        utimesSync(filePath, oldTime, oldTime);
    }
}

// checkPendingPromptExpected validates pending detail files against expected constraints.
function checkPendingPromptExpected(
    testDescription: string,
    projectDir: string,
    pendingPromptExpected: boolean | IPendingPromptExpected
): boolean {
    const fileNames = listPendingPromptFileNames(projectDir);
    const pendingDir = resolvePendingDir(projectDir);

    if (pendingPromptExpected === true) {
        if (fileNames.length === 0) {
            process.stdout.write(`FAIL: ${testDescription}\n`);
            process.stdout.write(`  pending_prompt: expected at least one file under ${pendingDir}\n`);
            return false;
        }
        return true;
    }

    const expectedCount = pendingPromptExpected.count ?? 1;
    if (fileNames.length !== expectedCount) {
        process.stdout.write(`FAIL: ${testDescription}\n`);
        process.stdout.write(`  pending_prompt: expected ${expectedCount} file(s), got ${fileNames.length}\n`);
        return false;
    }

    const filenamePattern = pendingPromptExpected.filename_pattern !== undefined
        ? new RegExp(pendingPromptExpected.filename_pattern)
        : PENDING_PROMPT_FILENAME_PATTERN;

    for (const fileName of fileNames) {
        if (!filenamePattern.test(fileName)) {
            process.stdout.write(`FAIL: ${testDescription}\n`);
            process.stdout.write(`  pending_prompt: filename "${fileName}" does not match ${filenamePattern}\n`);
            return false;
        }
        if (pendingPromptExpected.filename_contains !== undefined) {
            if (!fileName.includes(pendingPromptExpected.filename_contains)) {
                process.stdout.write(`FAIL: ${testDescription}\n`);
                process.stdout.write(`  pending_prompt: filename "${fileName}" does not contain "${pendingPromptExpected.filename_contains}"\n`);
                return false;
            }
        }
    }

    if (pendingPromptExpected.content_contains !== undefined) {
        const requiredSnippets = Array.isArray(pendingPromptExpected.content_contains)
            ? pendingPromptExpected.content_contains
            : [pendingPromptExpected.content_contains];
        for (const fileName of fileNames) {
            const fileContent = readFileSync(join(pendingDir, fileName), "utf-8");
            for (const requiredSnippet of requiredSnippets) {
                if (!fileContent.includes(requiredSnippet)) {
                    process.stdout.write(`FAIL: ${testDescription}\n`);
                    process.stdout.write(`  pending_prompt: ${fileName} missing content snippet ${JSON.stringify(requiredSnippet)}\n`);
                    return false;
                }
            }
        }
    }

    return true;
}

// IPreHookRunResult holds the outcome of one pre-hook invocation.
interface IPreHookRunResult {
    // Whether pre-hook exited successfully.
    ok: boolean;
    // Parsed stdout JSON when pre-hook succeeded.
    output?: IHookOutput;
}

// runPreHook invokes pre-hook.ts with one tool call input.
function runPreHook(
    testDescription: string,
    hookInput: Record<string, unknown>,
    testEnv: Record<string, string>
): IPreHookRunResult {
    const hookPath = join(__dirname, "..", "src", "pre-hook.ts");
    const result = spawnSync("bun", [hookPath], {
        input: JSON.stringify(hookInput),
        env: testEnv,
        encoding: "utf-8",
    });

    if (result.status !== 0) {
        process.stdout.write(`FAIL: ${testDescription}\n`);
        process.stdout.write(`  pre-hook.ts exited with status ${result.status}\n`);
        if (result.stderr) {
            process.stdout.write(`  stderr: ${result.stderr}\n`);
        }
        return { ok: false };
    }

    const output = JSON.parse(result.stdout) as IHookOutput;
    return { ok: true, output };
}

// ITestCase describes the full structure of a test case YAML file.
interface ITestCase {
    // Human-readable description of what the test verifies
    description: string;
    // The tool call input fed to hook.ts via stdin
    input: ITestCaseInput;
    // Optional extra pre-hook inputs run after the primary input.
    additional_inputs?: ITestCaseInput[];
    // Optional filesystem setup applied before hooks run.
    setup?: ITestCaseSetup;
    // Written verbatim as project/.claude/permissions.yaml for the test run
    rules: Record<string, unknown>;
    // Optional: written verbatim as home/.claude/permissions.yaml for the test run
    home_rules?: Record<string, unknown>;
    // Optional: per-file layers written under home/.claude/permissions.d/
    home_dir_files?: Record<string, Record<string, unknown>>;
    // Optional: per-file layers written under project/.claude/permissions.d/
    project_dir_files?: Record<string, Record<string, unknown>>;
    // The expected outputs from hook.ts
    expected: ITestCaseExpected;
    // Optional PostToolUse hook input to feed to post-hook.ts after the PreToolUse assertions
    post_input?: IPostToolUseInput;
    // Optional expected outcomes for the PostToolUse hook invocation
    post_expected?: IPostToolUseExpected;
}

// IHookSpecificOutput describes the hookSpecificOutput field in hook.ts stdout JSON.
interface IHookSpecificOutput {
    // The hook event name
    hookEventName: string;
    // The permission decision returned by the engine
    permissionDecision: string;
    // Optional human-readable reason attached to the decision
    permissionDecisionReason?: string;
}

// IHookOutput describes the full JSON object written to stdout by hook.ts.
interface IHookOutput {
    // The tool-specific output payload
    hookSpecificOutput: IHookSpecificOutput;
}

// findNewestLogFile recursively walks baseDir and returns the path of the most recently
// modified .log file, or null if none exist.
function findNewestLogFile(baseDir: string): string | null {
    let newestPath: string | null = null;
    let newestMtime = 0;

    function walk(dirPath: string): void {
        let entries: string[];
        try {
            entries = readdirSync(dirPath);
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.endsWith(".json") && stat.mtimeMs > newestMtime) {
                newestMtime = stat.mtimeMs;
                newestPath = fullPath;
            }
        }
    }

    walk(baseDir);
    return newestPath;
}

// The root of the repository, used to locate the e2e/fixtures directory.
const REPO_ROOT = join(__dirname, "..");

// runTest parses one test case YAML file, spawns hook.ts with the test input, and
// compares the output to the expected values. Returns true on pass, false on fail.
function runTest(testFilePath: string): boolean {
    const content = readFileSync(testFilePath, "utf-8");
    const testCase = parse(content) as ITestCase;
    const testDir = dirname(testFilePath);
    const tmpDir = join(testDir, "tmp");

    rmSync(tmpDir, { recursive: true, force: true });

    const homeDir = join(tmpDir, "home");
    const projectDir = join(tmpDir, "project");
    const claudeDir = join(projectDir, ".claude");

    mkdirSync(homeDir, { recursive: true });
    mkdirSync(claudeDir, { recursive: true });
    cpSync(join(REPO_ROOT, "e2e", "fixtures"), join(projectDir, "fixtures"), { recursive: true });

    writeFileSync(join(claudeDir, "permissions.yaml"), stringify(testCase.rules));

    if (testCase.home_rules !== undefined) {
        mkdirSync(join(homeDir, ".claude"), { recursive: true });
        writeFileSync(join(homeDir, ".claude", "permissions.yaml"), stringify(testCase.home_rules));
    }

    if (testCase.home_dir_files !== undefined) {
        const homePermissionsDir = join(homeDir, ".claude", "permissions.d");
        mkdirSync(homePermissionsDir, { recursive: true });
        for (const [fileName, fileBody] of Object.entries(testCase.home_dir_files)) {
            const destPath = join(homePermissionsDir, fileName);
            mkdirSync(dirname(destPath), { recursive: true });
            writeFileSync(destPath, stringify(fileBody));
        }
    }

    if (testCase.project_dir_files !== undefined) {
        const projectPermissionsDir = join(claudeDir, "permissions.d");
        mkdirSync(projectPermissionsDir, { recursive: true });
        for (const [fileName, fileBody] of Object.entries(testCase.project_dir_files)) {
            const destPath = join(projectPermissionsDir, fileName);
            mkdirSync(dirname(destPath), { recursive: true });
            writeFileSync(destPath, stringify(fileBody));
        }
    }

        if (testCase.setup?.stale_pending_files !== undefined) {
            setupStalePendingFiles(projectDir, testCase.setup.stale_pending_files);
        }

        const testEnv: Record<string, string> = {};
        for (const [key, value] of Object.entries(process.env)) {
            if (key !== "NODE_ENV" && value !== undefined) {
                testEnv[key] = value;
            }
        }
        testEnv["HOME"] = homeDir;
        testEnv["CLAUDE_PROJECT_DIR"] = projectDir;

        const allInputs: ITestCaseInput[] = [testCase.input];
        if (testCase.additional_inputs !== undefined) {
            for (const additionalInput of testCase.additional_inputs) {
                allInputs.push(additionalInput);
            }
        }

        let output: IHookOutput | undefined;
        for (const toolInput of allInputs) {
            const substituted = substituteProjectDir(toolInput, projectDir);
            const hookInput: Record<string, unknown> = {
                tool_name: substituted.tool_name,
                tool_input: substituted.tool_input,
                cwd: substituted.cwd ?? projectDir,
            };
            const preHookResult = runPreHook(testCase.description, hookInput, testEnv);
            if (!preHookResult.ok || preHookResult.output === undefined) {
                return false;
            }
            output = preHookResult.output;
        }

        if (output === undefined) {
            process.stdout.write(`FAIL: ${testCase.description}\n`);
            process.stdout.write(`  pre-hook: no tool input was executed\n`);
            return false;
        }

        const actualDecision = output.hookSpecificOutput.permissionDecision;
        const actualReason = output.hookSpecificOutput.permissionDecisionReason;

        if (actualDecision !== testCase.expected.decision) {
            process.stdout.write(`FAIL: ${testCase.description}\n`);
            process.stdout.write(`  decision: expected "${testCase.expected.decision}", got "${actualDecision}"\n`);
            return false;
        }

        if (testCase.expected.reason !== undefined && actualReason !== testCase.expected.reason) {
            process.stdout.write(`FAIL: ${testCase.description}\n`);
            process.stdout.write(`  reason: expected "${testCase.expected.reason}", got "${String(actualReason)}"\n`);
            return false;
        }

        if (testCase.expected.audit_log !== undefined) {
            const logBaseDir = join(projectDir, ".claude", "permissions-log");
            const logFile = findNewestLogFile(logBaseDir);
            if (!logFile) {
                process.stdout.write(`FAIL: ${testCase.description}\n`);
                process.stdout.write(`  audit_log: no log file found under ${logBaseDir}\n`);
                return false;
            }
            const logLines = readFileSync(logFile, "utf-8").split("\n").filter(Boolean);
            const logEntries: Record<string, string>[] = logLines.map(
                (line: string) => JSON.parse(line) as Record<string, string>
            );
            for (const expectedEntry of testCase.expected.audit_log) {
                const matchingEntry = logEntries.find((actualEntry: Record<string, string>) =>
                    Object.entries(expectedEntry).every(
                        ([entryKey, entryValue]) => actualEntry[entryKey] === entryValue
                    )
                );
                if (!matchingEntry) {
                    process.stdout.write(`FAIL: ${testCase.description}\n`);
                    process.stdout.write(`  audit_log: no entry matching ${JSON.stringify(expectedEntry)}\n`);
                    return false;
                }
            }
        }

        if (testCase.expected.pending_prompt !== undefined) {
            if (!checkPendingPromptExpected(testCase.description, projectDir, testCase.expected.pending_prompt)) {
                return false;
            }
        }

        if (testCase.expected.stale_pending_removed === true) {
            for (const staleFile of testCase.setup?.stale_pending_files ?? []) {
                const stalePath = join(resolvePendingDir(projectDir), staleFile.file_name);
                if (existsSync(stalePath)) {
                    process.stdout.write(`FAIL: ${testCase.description}\n`);
                    process.stdout.write(`  stale_pending_removed: file still exists at ${stalePath}\n`);
                    return false;
                }
            }
        }

        if (testCase.post_input !== undefined) {
            const postInputJson = JSON.stringify(testCase.post_input);
            const postHookPath = join(__dirname, "..", "src", "post-hook.ts");
            const postResult = spawnSync("bun", [postHookPath], {
                input: postInputJson,
                env: testEnv,
                encoding: "utf-8",
            });

            if (postResult.status !== 0) {
                process.stdout.write(`FAIL: ${testCase.description}\n`);
                process.stdout.write(`  post-hook.ts exited with status ${postResult.status}\n`);
                if (postResult.stderr) {
                    process.stdout.write(`  stderr: ${postResult.stderr}\n`);
                }
                return false;
            }

            if (testCase.post_expected?.audit_log !== undefined) {
                const logBaseDir = join(projectDir, ".claude", "permissions-log");
                const logFile = findNewestLogFile(logBaseDir);
                if (!logFile) {
                    process.stdout.write(`FAIL: ${testCase.description}\n`);
                    process.stdout.write(`  post audit_log: no log file found under ${logBaseDir}\n`);
                    return false;
                }
                const logLines = readFileSync(logFile, "utf-8").split("\n").filter(Boolean);
                const logEntries: Record<string, string>[] = logLines.map(
                    (line: string) => JSON.parse(line) as Record<string, string>
                );
                for (const expectedEntry of testCase.post_expected.audit_log) {
                    const matchingEntry = logEntries.find((actualEntry: Record<string, string>) =>
                        Object.entries(expectedEntry).every(
                            ([entryKey, entryValue]) => String(actualEntry[entryKey]) === entryValue
                        )
                    );
                    if (!matchingEntry) {
                        process.stdout.write(`FAIL: ${testCase.description}\n`);
                        process.stdout.write(`  post audit_log: no entry matching ${JSON.stringify(expectedEntry)}\n`);
                        return false;
                    }
                }
            }

            if (testCase.post_expected?.pending_prompt_count !== undefined) {
                const pendingCount = listPendingPromptFileNames(projectDir).length;
                if (pendingCount !== testCase.post_expected.pending_prompt_count) {
                    process.stdout.write(`FAIL: ${testCase.description}\n`);
                    process.stdout.write(`  pending_prompt_count: expected ${testCase.post_expected.pending_prompt_count}, got ${pendingCount}\n`);
                    return false;
                }
            }
        }

        process.stdout.write(`PASS: ${testCase.description}\n`);
        return true;
}

// main reads the test file path from argv[2] and exits 0 on pass or 1 on fail.
function main(): void {
    const testFileArg = process.argv[2];
    if (!testFileArg) {
        process.stderr.write("Usage: bun run src/run-e2e-test.ts <test-dir-or-file>\n");
        process.exit(1);
    }

    // The test's temp project directory is derived from this path and handed to the hook as
    // CLAUDE_PROJECT_DIR, which is what ${{PROJECT_DIR}} patterns expand to. A relative argument
    // leaves that value relative, so no path pattern matches and the test fails for a reason that
    // has nothing to do with the rule under test. Anchor it before anything else reads it.
    let testFilePath = resolve(testFileArg);

    if (lstatSync(testFilePath).isDirectory()) {
        testFilePath = join(testFilePath, "test.yaml");
    }

    const passed = runTest(testFilePath);
    process.exit(passed ? 0 : 1);
}

main();
