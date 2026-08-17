//
// Checks a permissions configuration against the examples written into its rules.
//
// Any rule carrying a `decide` can also carry an `examples` block listing real tool calls under the
// decision each one should produce (see docs/CONFIGURATION.md#rule-examples). This script collects
// every one of those calls, decides it with the engine, and fails when the decision differs from the
// one the call was listed under. It also fails when a rule carries no example at all, so a new rule
// cannot land untested.
//
// Usage:
//   bun run check-config <config-dir>
//
// <config-dir> is the .claude directory holding permissions.yaml and permissions.d, and the rules
// load from there. The project holding it is accepted in its place.
//
// The calls themselves are decided against a stand-in project, /project. That is what
// ${{PROJECT_DIR}} expands to, what a relative cwd resolves against, and the working directory an
// example runs in unless it names its own. It does not have to exist, so an example names files the
// way a person would rather than naming one machine's directories.
//
// Options:
//   --filter <text>   Only check examples whose command or file contains this text.
//   --list            Print the collected examples and exit without checking them.
//
// Example, checking a config repo checked out beside this one:
//   bun run check-config ../agent-config/home/.claude
//

import { readdir, stat } from "fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "path";
import { analyzePermission } from "../src/analyze";

// IExample is one example tool call collected from an `examples` block.
interface IExample {

    // Permission decision this call is expected to produce: allow, deny or ask.
    expected: string;

    // The command or prefixed tool call, with ${{PROJECT_DIR}} and ${{HOME}} already expanded.
    command: string;

    // Working directory the call is made from.
    cwd: string;

    // Permissions file the example was written in, relative to where the script was started.
    file: string;

    // Line in that file where the command appears, or 0 when it could not be located.
    line: number;

    // Dotted path of the rule the example belongs to, for example "bash.git.log".
    rulePath: string;
}

// IResult is the outcome of deciding one example.
interface IResult {

    // The example that was decided.
    example: IExample;

    // Decision the engine returned; empty when it could not decide at all.
    actual: string;

    // Reason the deciding rule gave, when it gave one.
    reason: string;

    // Why the engine could not decide, when it could not.
    error: string;
}

// IProblem is a rule that cannot be checked: no examples, or an examples block that is malformed.
interface IProblem {

    // Permissions file holding the rule.
    file: string;

    // Dotted path of the rule, for example "bash.git.log".
    rulePath: string;

    // What is wrong with it.
    message: string;
}

// The project examples are decided in. It does not have to exist, so examples can name absolute
// paths under it and read the same on every machine.
const EXAMPLE_PROJECT_DIR = "/project";

// Decisions an example may be listed under.
const DECISIONS = new Set(["allow", "deny", "ask"]);

// Options that consume the argument after them, so it is not mistaken for the config directory.
const VALUE_OPTIONS = new Set(["filter"]);

// Reads the one positional argument: the config directory.
function readPositional(argv: string[]): string | undefined {

    for (let argumentIndex = 0; argumentIndex < argv.length; argumentIndex++) {
        const argument = argv[argumentIndex];

        if (!argument.startsWith("--")) {
            return argument;
        }

        if (VALUE_OPTIONS.has(argument.slice(2))) {
            argumentIndex += 1;
        }
    }

    return undefined;
}

// Reads one command line option that takes a value.
function readOption(argv: string[], name: string): string | undefined {

    const optionIndex = argv.indexOf(`--${name}`);

    if (optionIndex === -1) {
        return undefined;
    }

    const optionValue = argv[optionIndex + 1];

    if (optionValue === undefined || optionValue.startsWith("--")) {
        throw new Error(`--${name} needs a value`);
    }

    return optionValue;
}

// Expands the ${{PROJECT_DIR}} and ${{HOME}} tokens, the same tokens the rules themselves use.
function expandTokens(text: string, projectDir: string, homeDir: string): string {

    return text
        .split("${{PROJECT_DIR}}").join(projectDir)
        .split("${{HOME}}").join(homeDir);
}

// Finds the line a raw example command was written on, so failures point back at the rule.
// The forms an example is written in are searched for first, so a command that also appears in a
// comment or a matcher elsewhere in the file still reports the line the example itself is on.
function findLine(fileText: string, rawCommand: string): number {

    for (const form of [`- ${rawCommand}`, `cmd: ${rawCommand}`, rawCommand]) {
        const formIndex = fileText.indexOf(form);

        if (formIndex !== -1) {
            return fileText.slice(0, formIndex).split("\n").length;
        }
    }

    return 0;
}

// Collects the examples from one `examples` block, recording anything malformed as a problem.
function collectBlock(
    examplesBlock: any,
    rulePath: string,
    file: string,
    fileText: string,
    projectDir: string,
    homeDir: string,
    examples: IExample[],
    problems: IProblem[]
): void {

    if (!examplesBlock || typeof examplesBlock !== "object" || Array.isArray(examplesBlock)) {
        problems.push({ file, rulePath, message: "examples must be a map of decision to a list of calls" });
        return;
    }

    for (const [decision, calls] of Object.entries(examplesBlock)) {

        if (!DECISIONS.has(decision)) {
            problems.push({ file, rulePath, message: `examples.${decision} is not a decision (expected allow, deny or ask)` });
            continue;
        }

        if (!Array.isArray(calls)) {
            problems.push({ file, rulePath, message: `examples.${decision} must be a list of calls` });
            continue;
        }

        for (const call of calls) {

            const rawCommand = typeof call === "string" ? call : call?.cmd;

            if (typeof rawCommand !== "string" || rawCommand.trim() === "") {
                problems.push({ file, rulePath, message: `examples.${decision} entries must be a command string or an object with cmd` });
                continue;
            }

            const rawCwd = typeof call === "string" ? undefined : call.cwd;

            if (rawCwd !== undefined && typeof rawCwd !== "string") {
                problems.push({ file, rulePath, message: `examples.${decision} cwd must be a string` });
                continue;
            }

            // A relative cwd is relative to the project, so an example never has to name a machine path.
            const expandedCwd = rawCwd !== undefined ? expandTokens(rawCwd, projectDir, homeDir) : projectDir;

            examples.push({
                expected: decision,
                command: expandTokens(rawCommand, projectDir, homeDir),
                cwd: isAbsolute(expandedCwd) ? expandedCwd : resolve(projectDir, expandedCwd),
                file,
                line: findLine(fileText, rawCommand),
                rulePath,
            });
        }
    }
}

// Walks one parsed permissions file, collecting examples and the rules that are missing them.
//
// A rule is any object carrying a `decide` string. Everything else in the tree is a container:
// a section name, a command name, a subcommand name or a list of entries.
//
function walkNode(
    node: any,
    rulePath: string,
    file: string,
    fileText: string,
    projectDir: string,
    homeDir: string,
    examples: IExample[],
    problems: IProblem[]
): void {

    if (!node || typeof node !== "object") {
        return;
    }

    if (Array.isArray(node)) {
        for (let entryIndex = 0; entryIndex < node.length; entryIndex++) {
            walkNode(node[entryIndex], `${rulePath}[${entryIndex}]`, file, fileText, projectDir, homeDir, examples, problems);
        }
        return;
    }

    const decide = node.decide;
    const examplesBlock = node.examples;

    if (typeof decide === "string") {

        if (examplesBlock === undefined) {
            problems.push({ file, rulePath, message: `rule decides "${decide}" but has no examples` });
        }
        else {
            const startIndex = examples.length;
            collectBlock(examplesBlock, rulePath, file, fileText, projectDir, homeDir, examples, problems);

            const covered = examples.slice(startIndex).some(example => example.expected === decide);

            if (!covered) {
                problems.push({ file, rulePath, message: `rule decides "${decide}" but has no example listed under "${decide}"` });
            }
        }
    }
    else if (examplesBlock !== undefined) {
        problems.push({ file, rulePath, message: "examples on an entry that has no decide" });
    }

    for (const [key, value] of Object.entries(node)) {

        if (key === "examples") {
            continue;
        }

        walkNode(value, rulePath === "" ? key : `${rulePath}.${key}`, file, fileText, projectDir, homeDir, examples, problems);
    }
}

// Lists the permissions files under one .claude directory, in the order the engine loads them.
async function listConfigFiles(claudeDir: string): Promise<string[]> {

    const configFiles: string[] = [];

    const mainFile = join(claudeDir, "permissions.yaml");

    if (await stat(mainFile).then(() => true, () => false)) {
        configFiles.push(mainFile);
    }

    // Only the top level of permissions.d holds rules. Its commands/ subdirectory holds command
    // descriptors, which the engine loads separately and which carry no decisions.
    const rulesDir = join(claudeDir, "permissions.d");
    const entryNames = await readdir(rulesDir).catch(() => [] as string[]);
    entryNames.sort();

    for (const entryName of entryNames) {

        if (!entryName.endsWith(".yaml") && !entryName.endsWith(".yml")) {
            continue;
        }

        const entryPath = join(rulesDir, entryName);
        const entryStat = await stat(entryPath);

        if (entryStat.isFile()) {
            configFiles.push(entryPath);
        }
    }

    return configFiles;
}

// Decides one example with the engine, the same call the hooks make. An example's working directory
// does not have to exist: it names the directory the call would be made from in a real project.
async function checkExample(example: IExample, projectDir: string, homeDir: string): Promise<IResult> {

    try {
        const result = await analyzePermission(example.command, example.cwd, projectDir, homeDir);
        return { example, actual: result.decision, reason: result.reason ?? "", error: "" };
    }
    catch (error) {
        return { example, actual: "", reason: "", error: error instanceof Error ? error.message : String(error) };
    }
}

// Entry point.
async function main(): Promise<void> {

    const argv = process.argv.slice(2);
    const configOption = readPositional(argv);

    if (configOption === undefined) {
        throw new Error("give the config directory: the .claude directory holding permissions.yaml and permissions.d");
    }

    // Either the .claude directory or the project holding it, so both readings of the path work.
    const resolvedPath = resolve(configOption);
    const claudeDir = basename(resolvedPath) === ".claude" ? resolvedPath : join(resolvedPath, ".claude");

    // The rules load from the config directory on disk, so the engine reads them where they live.
    const homeDir = dirname(claudeDir);

    // The examples are decided against a made-up project, which keeps them free of any path that
    // exists on one machine and nowhere else.
    const projectDir = EXAMPLE_PROJECT_DIR;
    const filter = readOption(argv, "filter");

    // Rule patterns expand ${{PROJECT_DIR}} from the environment, so the project has to land there
    // as well, or a path-anchored rule would not resolve against it.
    process.env["CLAUDE_PROJECT_DIR"] = projectDir;

    const configFiles = await listConfigFiles(claudeDir);

    if (configFiles.length === 0) {
        throw new Error(`no permissions.yaml or permissions.d in ${claudeDir}`);
    }

    const examples: IExample[] = [];
    const problems: IProblem[] = [];

    for (const configFile of configFiles) {
        const fileText = await Bun.file(configFile).text();
        const displayPath = relative(process.cwd(), configFile);
        walkNode(Bun.YAML.parse(fileText), "", displayPath, fileText, projectDir, homeDir, examples, problems);
    }

    const selected = filter === undefined
        ? examples
        : examples.filter(example => example.command.includes(filter) || example.file.includes(filter));

    if (argv.includes("--list")) {

        for (const example of selected) {
            console.log(`${example.file}:${example.line}  ${example.expected.padEnd(5)}  ${example.command}`);
        }

        console.log(`\n${selected.length} examples, ${problems.length} rules without a usable example`);
        return;
    }

    console.log(`Checking ${selected.length} examples from ${configFiles.length} permissions files`);
    console.log(`  config:  ${claudeDir}`);
    console.log(`  project: ${projectDir}\n`);

    const failures: IResult[] = [];

    for (const example of selected) {
        const result = await checkExample(example, projectDir, homeDir);

        if (result.actual === result.example.expected) {
            console.log(`PASS  ${example.file}:${example.line}  ${example.expected.padEnd(5)}  ${example.command}`);
            continue;
        }

        failures.push(result);
        const actual = result.actual === "" ? "no decision" : result.actual;
        console.log(`FAIL  ${example.file}:${example.line}  expected ${example.expected}, got ${actual}  ${example.command}`);
    }

    if (failures.length > 0) {
        console.log("\nFailures:");

        for (const failure of failures) {
            const actual = failure.actual === "" ? "no decision" : failure.actual;
            console.log(`\n  ${failure.example.file}:${failure.example.line}  rule ${failure.example.rulePath}`);
            console.log(`    command:  ${failure.example.command}`);
            console.log(`    cwd:      ${failure.example.cwd}`);
            console.log(`    expected: ${failure.example.expected}`);
            console.log(`    got:      ${actual}${failure.reason !== "" ? ` (${failure.reason})` : ""}`);

            if (failure.error !== "") {
                console.log(`    error:    ${failure.error}`);
            }
        }
    }

    if (problems.length > 0) {
        console.log("\nRules without a usable example:");

        for (const problem of problems) {
            console.log(`  ${problem.file}  ${problem.rulePath}: ${problem.message}`);
        }
    }

    console.log(`\n${selected.length - failures.length}/${selected.length} examples passed, ${problems.length} rules without a usable example`);

    if (failures.length > 0 || problems.length > 0) {
        process.exit(1);
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
