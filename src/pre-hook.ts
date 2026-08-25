import { parseToolCallToAst } from "./analyze";
import { decide } from "./decision";
import { load } from "./load";
import {
    CapturingAuditLogger,
    createLogger,
    ensureLogDirIgnored,
    resolveLogBaseDir,
    toLocalISOString,
} from "./audit-log";
import { IToolCall } from "./types";
import {
    cleanupStalePendingPrompts,
    commandOutcomesFromAuditEntries,
    STALE_PENDING_PROMPT_MAX_AGE_DAYS,
    writePendingPrompt,
} from "./pending-prompt-log";
// Debug log file production disabled. Restore to re-enable the debug log.
// import { resolveDebugLogPath, appendDebugBlock, logDebugError, IDebugField } from "./debug-log";
import { homedir } from "os";

// hookEventName identifies the Claude Code hook event this runner handles.
const hookEventName = "PreToolUse";

// Resolve the home directory for config loading. Prefer HOME so tests and overrides work.
export function resolveHomeDir(): string {
    if (process.env["HOME"]) {
        return process.env["HOME"];
    }
    return homedir();
}

// A project can skip this plugin without disabling every Claude hook: set
// EXPRESSIVE_PERMISSIONS=off (or 0 / false) in that repo's .claude/settings.json
// or .claude/settings.local.json env block. bypassPermissions does not skip hooks.
export function expressivePermissionsDisabled(): boolean {
    const value = process.env["EXPRESSIVE_PERMISSIONS"];
    if (value === undefined) {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === "off" || normalized === "0" || normalized === "false";
}

// readStdin reads all of stdin and returns it as a UTF-8 string.
export async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf-8");
}

// runHook parses the ToolCall from stdin, runs the permission decision, and writes
// the hookSpecificOutput to stdout, then exits 0. On any error it writes to stderr and exits 1.
export async function runHook(): Promise<void> {
    // Debug log file production disabled. Restore to re-enable the debug log.
    // let logPath: string | undefined;
    try {
        const rawStdin = await readStdin();
        const call = JSON.parse(rawStdin) as IToolCall;
        if (expressivePermissionsDisabled()) {
            process.stdout.write(
                JSON.stringify({
                    hookSpecificOutput: {
                        hookEventName,
                        permissionDecision: "allow",
                        permissionDecisionReason: "EXPRESSIVE_PERMISSIONS is off",
                    },
                }) + "\n"
            );
            process.exit(0);
            return;
        }
        const projectDir = process.env["CLAUDE_PROJECT_DIR"];
        if (!projectDir) {
            throw new Error("CLAUDE_PROJECT_DIR is not set");
        }
        const homeDir = resolveHomeDir();
        // Debug log file production disabled. Restore to re-enable the debug log.
        // logPath = resolveDebugLogPath(projectDir);
        // await appendDebugBlock(logPath, "[PRE-HOOK ENTRY]", [
        //     { key: "tool_call", value: call },
        //     { key: "CLAUDE_PROJECT_DIR", value: projectDir },
        //     { key: "process.env", value: process.env },
        // ]);
        const logger = createLogger(projectDir, new Date());
        await ensureLogDirIgnored(resolveLogBaseDir(projectDir));
        await cleanupStalePendingPrompts(projectDir, new Date(), STALE_PENDING_PROMPT_MAX_AGE_DAYS);
        logger.log({
            type: "tool_request",
            timestamp: toLocalISOString(new Date()),
            tool: call.tool_name,
            input: call.tool_input as Record<string, unknown>,
            cwd: call.cwd,
        });
        const ast = await parseToolCallToAst(call, homeDir, projectDir);
        const rules = await load(projectDir, homeDir, logger);
        const startingContext = { cwd: call.cwd, cwdResolved: true, env: {} };
        const capturingLogger = new CapturingAuditLogger();
        const decision = await decide(ast, rules, startingContext, capturingLogger);
        for (const entry of capturingLogger.getEntries()) {
            logger.log(entry);
        }
        const commandOutcomes = commandOutcomesFromAuditEntries(capturingLogger.getEntries());
        const permissionDecision = decision !== undefined ? decision.action : "ask";
        const permissionDecisionReason = decision !== undefined ? decision.reason : undefined;
        logger.log({
            type: "final_decision",
            timestamp: toLocalISOString(new Date()),
            tool: call.tool_name,
            cmd: ast.source,
            decision: permissionDecision,
            reason: permissionDecisionReason,
        });
        if (permissionDecision === "ask") {
            await writePendingPrompt(
                projectDir,
                call,
                ast,
                commandOutcomes,
                permissionDecision,
                permissionDecisionReason,
                new Date()
            );
        }
        process.stdout.write(
            JSON.stringify({
                hookSpecificOutput: {
                    hookEventName,
                    permissionDecision: permissionDecision,
                    permissionDecisionReason: permissionDecisionReason,
                },
            }) + "\n"
        );
        process.exit(0);
    }
    catch (hookError) {
        // Debug log file production disabled. Restore to re-enable the debug log.
        // await logDebugError(logPath, hookError);
        process.stderr.write(String(hookError) + "\n");
        process.exit(1);
    }
}

// Guard lets the module be imported by unit tests without auto-invoking in Jest.
if (process.env["NODE_ENV"] !== "test") {
    runHook();
}
