// The raw stdin JSON payload sent by Claude Code's PreToolUse hook.
export interface IToolCall {

    // The tool name as reported by Claude Code (e.g. "Bash", "Read", "Write").
    tool_name: string;

    // The input arguments supplied to the tool.
    tool_input: Record<string, any>;

    // The current working directory at the time of the hook invocation.
    cwd: string;
}

// Arity 1 means the flag consumes the next token as its value; 0 means boolean.
// kind indicates whether the consumed value is a path (subject to cmd rules) or an opaque string.
// description is a human-readable summary of the flag's purpose.
export interface IFlagDescriptor {

    // 0 = boolean flag; 1 = flag consumes the next token as its value.
    arity: 0 | 1;

    // Whether the consumed value is a file-system path or an opaque string.
    kind: "path" | "string";

    // Human-readable summary of the flag.
    description: string;
}

// Describes one positional slot for a command.
// kind: path means the token is subject to cmd rules; string means it is opaque.
// variadic: true means this slot captures all remaining positional tokens (only valid on the last entry).
export interface IPositionalDescriptor {

    // Whether the positional is a file-system path or an opaque string.
    kind: "path" | "string";

    // Human-readable summary of the positional slot.
    description: string;

    // When true, this slot captures all remaining positional tokens.
    variadic: boolean;
}

// description is a human-readable summary of the command.
// source is a URL pointing to the official documentation for the command.
// positionals describes each positional slot in order; the last may be variadic.
// flags keys are pipe-separated alias groups, e.g. "r|recursive".
// cmds maps sub-command names to their own descriptors (flags are merged with top-level on match).
export interface ICommandDescriptor {

    // Human-readable summary of the command.
    description: string;

    // URL to the official documentation for this command (informational only; not used by the engine).
    source?: string;

    // Ordered list of positional slots; the last entry may be variadic.
    positionals: IPositionalDescriptor[];

    // Flag alias groups mapped to their descriptor; keys are pipe-separated, e.g. "f|file".
    flags: { [aliasGroup: string]: IFlagDescriptor };

    // Optional sub-command descriptors; when a positional matches a key here, its flags are merged.
    cmds?: { [subCommand: string]: ICommandDescriptor };

    // When true, this command runs the command formed by the arguments after its own positional slots.
    wrapper?: boolean;
}

// The raw stdin JSON payload sent by Claude Code's PostToolUse hook.
export interface IPostToolUseCall {

    // The tool name as reported by Claude Code (e.g. "Bash", "Read", "Write").
    tool_name: string;

    // The input arguments supplied to the tool.
    tool_input: Record<string, any>;

    // The raw tool response payload (shape varies by tool).
    tool_response: Record<string, any>;

    // The current working directory at the time of the hook invocation.
    cwd: string;
}
