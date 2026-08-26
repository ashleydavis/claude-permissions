import { CapturingAuditLogger, IAuditLogEntry } from "./audit-log";
import { decide } from "./decision";
import { load } from "./load";
import { parse } from "./parse";
import { IAstNode } from "./ast";
import { IToolCall } from "./types";
import { loadCommandDescriptors } from "./load-commands";

// IAnalysisResult holds the outcome of a single permission analysis pass.
export interface IAnalysisResult {
    // The final decision string: "allow", "deny", or "ask".
    decision: string;
    // The human-readable reason attached to the decision, if any.
    reason?: string;
    // All audit entries captured during evaluation.
    trace: IAuditLogEntry[];
}

// parseToolCallInput converts a user-supplied string into a ToolCall. The input
// may be prefixed (case-insensitive) to produce a non-Bash tool call:
//   "read <path>"     -> Read tool
//   "write <path>"    -> Write tool
//   "edit <path>"     -> Edit tool
//   "webfetch <url>"  -> WebFetch tool
//   "tool <name>"     -> generic other-tool call
//   anything else     -> Bash tool with command = full input
export function parseToolCallInput(input: string, cwd: string): IToolCall {
    const lower = input.toLowerCase();

    if (lower.startsWith("read ")) {
        const filePath = input.slice("read ".length);
        return { tool_name: "Read", tool_input: { file_path: filePath }, cwd };
    }

    if (lower.startsWith("write ")) {
        const filePath = input.slice("write ".length);
        return { tool_name: "Write", tool_input: { file_path: filePath, content: "" }, cwd };
    }

    if (lower.startsWith("edit ")) {
        const filePath = input.slice("edit ".length);
        return { tool_name: "Edit", tool_input: { file_path: filePath, old_string: "", new_string: "" }, cwd };
    }

    if (lower.startsWith("webfetch ")) {
        const url = input.slice("webfetch ".length);
        return { tool_name: "WebFetch", tool_input: { url }, cwd };
    }

    if (lower.startsWith("tool ")) {
        const toolName = input.slice("tool ".length);
        return { tool_name: toolName, tool_input: {}, cwd };
    }

    return { tool_name: "Bash", tool_input: { command: input }, cwd };
}

// parseToolCallToAst converts a hook tool call into a parsed AST node.
export async function parseToolCallToAst(call: IToolCall, homeDir: string, projectDir: string): Promise<IAstNode> {

    const newToolInput: Record<string, string> = {};
    for (const [key, value] of Object.entries(call.tool_input)) {
        if (typeof value === "string") {
            newToolInput[key] = value;
        }
    }
    const descriptors = await loadCommandDescriptors(homeDir, projectDir);
    return parse({
        tool_name: call.tool_name,
        tool_input: newToolInput,
        cwd: call.cwd,
    }, descriptors);
}

// analyzePermission parses the input string into a ToolCall, loads rules, runs decide(),
// and returns the decision, reason, and captured evaluation trace.
export async function analyzePermission(input: string, cwd: string, projectDir: string, homeDir: string): Promise<IAnalysisResult> {
    const toolCall = parseToolCallInput(input, cwd);
    const ast = await parseToolCallToAst(toolCall, homeDir, projectDir);
    const capturingLogger = new CapturingAuditLogger();
    const rules = await load(projectDir, homeDir, capturingLogger);
    const startingContext = { cwd: toolCall.cwd, cwdResolved: true, projectDir, homeDir, env: {} };
    const decision = await decide(ast, rules, startingContext, capturingLogger);
    return {
        decision: decision !== undefined ? decision.action : "ask",
        reason: decision !== undefined ? decision.reason : undefined,
        trace: capturingLogger.getEntries(),
    };
}
