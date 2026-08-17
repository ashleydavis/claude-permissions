import type { ISourceLocation } from "./rules/rule";

// IEnvVarMap maps env var names to values they must have for a rule to match.
export interface IEnvVarMap {

    [varName: string]: string;
}

// IOptionPatternMap maps flag names to glob patterns matched against flag values.
export interface IOptionPatternMap {

    [flagName: string]: string;
}

// IFileMatch describes a file content check in a file: or not.file: field.
export interface IFileMatch {

    // Substring, glob, or /regex/ that must appear in the file contents.
    contains?: string;
}

// IFileFieldMap maps file paths to content checks or existence-only true.
export interface IFileFieldMap {

    [filePath: string]: true | IFileMatch;
}

// IExampleCall is one example tool call written against a rule, with the working directory it runs in.
export interface IExampleCall {

    // The command or prefixed tool call, written as it would be typed into the REPL.
    cmd: string;

    // Working directory the example runs in; the project directory when absent.
    cwd?: string;
}

// IExampleMap maps a decision ("allow", "deny", "ask") to the example calls expected to produce it.
// The engine never reads this field: it documents a rule and lets external tooling test the rule
// against real commands.
export interface IExampleMap {

    [decision: string]: (string | IExampleCall)[];
}

// INotFields lists conditions that suppress a rule when they all match.
export interface INotFields {

    // Environment variables that suppress the rule when all match.
    env?: IEnvVarMap;

    // File paths that suppress the rule when all match, or when a file is absent.
    file?: IFileFieldMap;

    // Positional glob patterns that suppress the rule when any positional matches (OR semantics).
    "cmd-in"?: string[];

    // Flag names that suppress the rule when all are present (AND semantics).
    options?: string[];

    // Flag names that suppress the rule when any one is present (OR semantics).
    "options-in"?: string[];
}

// IBashEntry is one object under a bash command name in permissions YAML.
export interface IBashEntry {

    // Permission decision when this entry defines a rule.
    decide?: string;

    // Conditions that suppress the rule when they all match.
    not?: INotFields;

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Environment variables that must all match before the rule fires.
    env?: IEnvVarMap;

    // File paths that must all match before the rule fires.
    file?: IFileFieldMap;

    // Working directory that must match before the rule fires.
    cwd?: string;

    // Working directory glob patterns matched with OR semantics.
    "cwd-in"?: string[];

    // Working directory or path glob (synonym for cwd on bash entries).
    path?: string;

    // Positional argument patterns: a string is split on whitespace, an array matches by index (AND).
    cmd?: string | string[];

    // Glob patterns matched against any positional argument (OR semantics).
    "cmd-in"?: string[];

    // Flag names that must all be present on the command (AND semantics).
    options?: string[] | IOptionPatternMap;

    // Flag names where any one present triggers the rule (OR semantics).
    "options-in"?: string[];

    // Nested entries evaluated at the same subcommand path.
    rules?: IBashEntry[];

    // Example commands this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;

    // Subcommand names nested under this entry.
    [subcommandKey: string]: string | string[] | IEnvVarMap | IFileFieldMap | INotFields | IBashEntry | IBashEntry[] | IOptionPatternMap | IExampleMap | ISourceLocation | undefined;
}

// IBashTerminalEntry is a bash entry with a required decide field.
export interface IBashTerminalEntry extends IBashEntry {

    // Permission decision for this rule.
    decide: string;
}

// IBashConfig is the bash block in permissions YAML.
export interface IBashConfig {

    // One command name mapped to one entry or a list of entries.
    [commandName: string]: IBashEntry | IBashEntry[];
}

// IFileToolEntry is one object in a read, write, edit, or multi_edit block in permissions YAML.
export interface IFileToolEntry {

    // Permission decision when the rule matches.
    decide?: string;

    // Path glob matched against file_path.
    path?: string;

    // Path glob patterns matched against file_path (OR semantics).
    "path-in"?: string[];

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Working directory that must match before the rule fires.
    cwd?: string;

    // Nested entries evaluated when parent conditions match.
    rules?: IFileToolEntry[];

    // Example tool calls this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;
}

// IWebFetchConfig is the webfetch block in permissions YAML.
export interface IWebFetchConfig {

    // Permission decision when the rule matches.
    decide: string;

    // Hostname matched against the request URL.
    host?: string;

    // Hostnames matched against the request URL (OR semantics).
    "host-in"?: string[];

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Example tool calls this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;
}

// IGrepConfig is the Grep block in permissions YAML.
export interface IGrepConfig {

    // Permission decision when the rule matches.
    decide: string;

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Example tool calls this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;
}

// IRedirectEntry is one object in a redirect.out block in permissions YAML.
export interface IRedirectEntry {

    // Permission decision when the rule matches.
    decide?: string;

    // Path glob matched against the redirect target.
    path?: string;

    // Path glob patterns matched against the redirect target (OR semantics).
    "path-in"?: string[];

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Example redirects this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;
}

// IRedirectConfig is the redirect block in permissions YAML.
export interface IRedirectConfig {

    // Rules matching stdout/stderr write redirects (>, >>, 2>, &>).
    out?: IRedirectEntry | IRedirectEntry[];

    // Rules matching stdin read redirects (<).
    in?: IRedirectEntry | IRedirectEntry[];
}

// IGenericToolConfig is one unrecognised top-level block in permissions YAML.
export interface IGenericToolConfig {

    // Permission decision when the rule matches.
    decide: string;

    // Glob pattern matched against tool_name.
    tool?: string;

    // Glob patterns matched against tool_name (OR semantics).
    "tool-in"?: string[];

    // Human-readable reason shown when the rule fires.
    reason?: string;

    // Example tool calls this rule is expected to match or miss; ignored by the engine.
    examples?: IExampleMap;

    // Source file and line stamped onto the entry during YAML loading.
    sourceLocation?: ISourceLocation;
}

// SectonConfig is any valid top-level permissions.yaml section block.
export type SectionConfig = IBashConfig | IFileToolEntry | IFileToolEntry[] | IWebFetchConfig | IGrepConfig | IRedirectConfig | IGenericToolConfig;

// IPermissionsConfig is the root object in permissions.yaml.
export interface IPermissionsConfig {

    // Bash tool rules keyed by command name.
    bash?: IBashConfig;

    // Read tool rules.
    read?: IFileToolEntry | IFileToolEntry[];

    // Write tool rules.
    write?: IFileToolEntry | IFileToolEntry[];

    // Edit tool rules.
    edit?: IFileToolEntry | IFileToolEntry[];

    // MultiEdit tool rules.
    multi_edit?: IFileToolEntry | IFileToolEntry[];

    // WebFetch tool rules.
    webfetch?: IWebFetchConfig;

    // Grep tool rules.
    Grep?: IGrepConfig;

    // Shell redirect path rules.
    redirect?: IRedirectConfig;

    // Any other top-level key is a generic tool block.
    [sectionKey: string]: SectionConfig | undefined;
}
