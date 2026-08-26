import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { loadCommandDescriptors } from "../src/load-commands";
import { NullAuditLogger } from "../src/audit-log";
import { parse } from "../src/parse";
import { decide } from "../src/decision";
import { load } from "../src/load";
import { IToolCall } from "../src/tool-call";

const exampleName = process.argv[2];
if (!exampleName) {
    process.stderr.write("Usage: bun scripts/check-decision.ts <example-name>\n");
    process.exit(2);
}

const examplesDir = process.env["DECISION_EXAMPLES_DIR"] !== undefined
    ? process.env["DECISION_EXAMPLES_DIR"]
    : join(import.meta.dir, "..", "examples", "decision");

// IDecisionFixtureInput describes the tool call input in a decision example fixture.
interface IDecisionFixtureInput {
    tool_name: string;
    tool_input: Record<string, string>;
    cwd?: string;
    cwd_resolved?: boolean;
}

// IDecisionFixtureExpected describes the expected decision outcome in a fixture.
interface IDecisionFixtureExpected {
    decision: string;
    reason?: string;
}

// IDecisionFixture describes a decision example YAML file under examples/decision/.
interface IDecisionFixture {
    description: string;
    source_e2e?: string;
    input: IDecisionFixtureInput;
    rules: Record<string, unknown>;
    home_rules?: Record<string, unknown>;
    home_dir_files?: Record<string, Record<string, unknown>>;
    project_dir_files?: Record<string, Record<string, unknown>>;

    // Raw files written under the temp home directory (relative paths → contents).
    home_files?: Record<string, string>;

    expected: IDecisionFixtureExpected;
}

// substituteProjectDir replaces ${PROJECT_DIR} tokens in a JSON-serializable value.
function substituteProjectDir<T>(value: T, projectDir: string): T {
    const substitutedJson = JSON.stringify(value).split("${PROJECT_DIR}").join(projectDir);
    return JSON.parse(substitutedJson) as T;
}

// writePermissionsDirFiles writes per-file permissions.d layers under a base permissions.d directory.
async function writePermissionsDirFiles(
    baseDir: string,
    permissionsDirFiles: Record<string, Record<string, unknown>> | undefined
): Promise<void> {

    if (permissionsDirFiles === undefined) {
        return;
    }

    for (const [relativePath, fileContent] of Object.entries(permissionsDirFiles)) {
        const filePath = join(baseDir, relativePath);
        await mkdir(join(filePath, ".."), { recursive: true });
        await writeFile(filePath, stringifyYaml(fileContent));
    }
}

// setupFixtureEnvironment creates temp home and project dirs with permissions config from the fixture.
async function setupFixtureEnvironment(fixture: IDecisionFixture): Promise<{ homeDir: string; projectDir: string }> {

    const tempRoot = await mkdtemp(join(tmpdir(), "check-decision-"));
    const homeDir = join(tempRoot, "home");
    const projectDir = join(tempRoot, "project");
    const claudeDir = join(projectDir, ".claude");

    await mkdir(homeDir, { recursive: true });
    await mkdir(claudeDir, { recursive: true });

    await cp(join(import.meta.dir, "..", "e2e", "fixtures"), join(projectDir, "fixtures"), { recursive: true });

    await writeFile(join(claudeDir, "permissions.yaml"), stringifyYaml(fixture.rules));

    if (fixture.home_rules !== undefined) {
        await mkdir(join(homeDir, ".claude"), { recursive: true });
        await writeFile(join(homeDir, ".claude", "permissions.yaml"), stringifyYaml(fixture.home_rules));
    }

    await writePermissionsDirFiles(join(homeDir, ".claude", "permissions.d"), fixture.home_dir_files);
    await writePermissionsDirFiles(join(claudeDir, "permissions.d"), fixture.project_dir_files);

    if (fixture.home_files !== undefined) {
        for (const [relativePath, fileContent] of Object.entries(fixture.home_files)) {
            const filePath = join(homeDir, relativePath);
            await mkdir(join(filePath, ".."), { recursive: true });
            await writeFile(filePath, fileContent);
        }
    }

    return { homeDir, projectDir };
}

const fixturePath = join(examplesDir, exampleName, "index.yaml");
const fixtureContent = await readFile(fixturePath, "utf-8");
const fixture = parseYaml(fixtureContent) as IDecisionFixture;
const { homeDir, projectDir } = await setupFixtureEnvironment(fixture);

const originalProjectDir = process.env["CLAUDE_PROJECT_DIR"];
const originalHome = process.env["HOME"];
process.env["CLAUDE_PROJECT_DIR"] = projectDir;
process.env["HOME"] = homeDir;

try {
    const substitutedInput = substituteProjectDir(fixture.input, projectDir);
    const cwd = substitutedInput.cwd !== undefined ? substitutedInput.cwd : projectDir;
    const call: IToolCall = {
        tool_name: substitutedInput.tool_name,
        tool_input: substitutedInput.tool_input,
        cwd: cwd,
    };

    const descriptors = await loadCommandDescriptors(homeDir, projectDir);
    const ast = parse(call, descriptors);
    const rules = await load(projectDir, homeDir, new NullAuditLogger());
    const actualResult = await decide(ast, rules, {
        cwd: call.cwd,
        cwdResolved: substitutedInput.cwd_resolved === false ? false : true,
        projectDir,
        homeDir,
        env: {},
    }, new NullAuditLogger());
    const actualAction = actualResult !== undefined ? actualResult.action : "ask";

    let passed = true;

    if (actualAction !== fixture.expected.decision) {
        process.stderr.write(`FAIL  ${exampleName}\n`);
        process.stderr.write(`  expected decision: ${fixture.expected.decision}\n`);
        process.stderr.write(`  actual decision:   ${actualAction}\n`);
        passed = false;
    }

    if (fixture.expected.reason !== undefined) {
        const actualReason = actualResult !== undefined ? actualResult.reason : undefined;

        if (actualReason !== fixture.expected.reason) {
            if (passed) {
                process.stderr.write(`FAIL  ${exampleName}\n`);
            }
            process.stderr.write(`  expected reason: ${JSON.stringify(fixture.expected.reason)}\n`);
            process.stderr.write(`  actual reason:   ${JSON.stringify(actualReason)}\n`);
            passed = false;
        }
    }

    if (!passed) {
        process.exit(1);
    }

    process.stdout.write(`PASS  ${exampleName}\n`);
}
finally {
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

    await rm(join(homeDir, ".."), { recursive: true, force: true });
}
