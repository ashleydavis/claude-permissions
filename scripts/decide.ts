//
// Decides one tool call and prints what the engine decided and which rule decided it.
//
// Usage:
//   bun run decide <project-dir> "<tool call>"
//
// <project-dir> is the project the call is made from: its .claude rules are loaded, ${{PROJECT_DIR}}
// expands to it, and the call is judged as if it had been typed there. That project's .claude
// directory is accepted in its place. The global rules come from the home directory, exactly as
// they do in a live session, so the answer is the one a session in that project would get.
//
// The tool call is written the same way as in the REPL: a bare command is Bash, and a prefix names
// another tool ("read <path>", "write <path>", "edit <path>", "webfetch <url>", "tool <name>").
//
// Examples:
//   bun run decide ~/work/api "git status"
//   bun run decide ~/work/api "read ~/work/api/readme.md"
//

import { stat } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, resolve } from "path";
import { analyzePermission } from "../src/analyze";
import { formatTextEntry } from "../src/audit-log";

// Entries that appear on every run and say nothing about which rule decided.
const NOISE_ENTRY_TYPES = new Set(["config_load", "tool_request"]);

// Resolves the one path argument to the project directory, accepting either the project itself or
// the .claude directory holding its rules.
function resolveProjectDir(pathArgument: string): string {

    const resolvedPath = resolve(pathArgument);

    if (basename(resolvedPath) === ".claude") {
        return dirname(resolvedPath);
    }

    return resolvedPath;
}

// Entry point.
async function main(): Promise<void> {

    const pathArgument = process.argv[2];
    const toolCall = process.argv[3];

    if (pathArgument === undefined || toolCall === undefined || toolCall.trim() === "") {
        process.stderr.write('Usage: bun run decide <project-dir> "<tool call>"\n');
        process.exit(1);
    }

    const projectDir = resolveProjectDir(pathArgument);

    if (!await stat(projectDir).then(entry => entry.isDirectory(), () => false)) {
        process.stderr.write(`Not a directory: ${projectDir}\n`);
        process.exit(1);
    }

    // Rule patterns expand ${{PROJECT_DIR}} from the environment, so the named project has to land
    // there as well, or a path-anchored rule would not resolve against it.
    process.env["CLAUDE_PROJECT_DIR"] = projectDir;

    const result = await analyzePermission(toolCall, projectDir, projectDir, homedir());

    for (const entry of result.trace) {

        if (NOISE_ENTRY_TYPES.has(entry.type)) {
            continue;
        }

        process.stdout.write(`  ${formatTextEntry(entry)}\n`);
    }

    const reason = result.reason !== undefined && result.reason !== "" ? ` (${result.reason})` : "";
    process.stdout.write(`${result.decision.toUpperCase()}${reason}\n`);
}

main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
});
