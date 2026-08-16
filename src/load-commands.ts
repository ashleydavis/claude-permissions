import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { parse } from "yaml";
import { ICommandDescriptor, IFlagDescriptor, IPositionalDescriptor } from "./types";

// Raw YAML shape for a flag entry (may omit optional fields)
interface IRawFlagDescriptor {
    // 0 = boolean; 1 = consumes next token
    arity: 0 | 1;
    // "path" or "string" (defaults to "string" when absent)
    kind?: "path" | "string";
    // Human-readable summary
    description?: string;
}

// Raw YAML shape for a positional entry
interface IRawPositionalDescriptor {
    // "path" or "string" (defaults to "string" when absent)
    kind?: "path" | "string";
    // Human-readable summary
    description?: string;
    // Whether this slot is variadic (defaults to false)
    variadic?: boolean;
}

// Raw YAML shape for one command entry
interface IRawCommandDescriptor {
    // Human-readable summary
    description?: string;
    // Ordered list of positional slots
    positionals?: IRawPositionalDescriptor[];
    // Flag alias-group → descriptor map
    flags?: Record<string, IRawFlagDescriptor>;
    // Optional sub-command entries keyed by sub-command name
    cmds?: Record<string, IRawCommandDescriptor>;
    // Whether this command runs another command given in its arguments
    wrapper?: boolean;
}

// Raw YAML file: command name → raw descriptor
type IRawDescriptorFile = Record<string, IRawCommandDescriptor>;

// Normalises a raw flag descriptor from YAML into the typed IFlagDescriptor.
function normaliseFlagDescriptor(raw: IRawFlagDescriptor): IFlagDescriptor {
    return {
        arity: raw.arity ?? 0,
        kind: raw.kind ?? "string",
        description: raw.description ?? "",
    };
}

// Normalises a raw positional descriptor from YAML into the typed IPositionalDescriptor.
function normalisePositionalDescriptor(raw: IRawPositionalDescriptor): IPositionalDescriptor {
    return {
        kind: raw.kind ?? "string",
        description: raw.description ?? "",
        variadic: raw.variadic ?? false,
    };
}

// Normalises a raw command descriptor from YAML into the typed ICommandDescriptor.
function normaliseCommandDescriptor(raw: IRawCommandDescriptor): ICommandDescriptor {
    const flags: { [aliasGroup: string]: IFlagDescriptor } = {};
    if (raw.flags !== undefined) {
        for (const [aliasGroup, rawFlag] of Object.entries(raw.flags)) {
            flags[aliasGroup] = normaliseFlagDescriptor(rawFlag);
        }
    }
    const positionals: IPositionalDescriptor[] = (raw.positionals ?? []).map(normalisePositionalDescriptor);
    const result: ICommandDescriptor = {
        description: raw.description ?? "",
        positionals,
        flags,
    };
    if (raw.cmds !== undefined) {
        const cmds: { [subCommand: string]: ICommandDescriptor } = {};
        for (const [subCommandName, rawSubCommand] of Object.entries(raw.cmds)) {
            cmds[subCommandName] = normaliseCommandDescriptor(rawSubCommand);
        }
        result.cmds = cmds;
    }
    if (raw.wrapper) {
        result.wrapper = true;
    }
    return result;
}

// Returns true when entryName is a non-dot YAML file (yml/yaml extension) and is a regular file.
async function isYamlFile(dirPath: string, entryName: string): Promise<boolean> {
    if (entryName.startsWith(".")) {
        return false;
    }
    if (!entryName.endsWith(".yaml") && !entryName.endsWith(".yml")) {
        return false;
    }
    const fileStat = await stat(join(dirPath, entryName));
    return fileStat.isFile();
}

// Loads all *.yaml files in dirPath, parses each as a descriptor file, and merges the
// resulting command descriptors into target. Silently skips the directory if it does not exist.
// Later entries overwrite earlier ones (project layer beats built-in layer).
async function mergeDescriptorsFromDir(dirPath: string, target: Map<string, ICommandDescriptor>): Promise<void> {
    let entries: string[];
    try {
        entries = await readdir(dirPath);
    }
    catch {
        return;
    }

    const yamlNames: string[] = [];
    for (const entryName of entries) {
        if (await isYamlFile(dirPath, entryName)) {
            yamlNames.push(entryName);
        }
    }
    yamlNames.sort();

    for (const yamlName of yamlNames) {
        const filePath = join(dirPath, yamlName);
        const content = await readFile(filePath, "utf-8");
        const parsed = parse(content) as IRawDescriptorFile | null;
        if (parsed === null || typeof parsed !== "object") {
            continue;
        }
        for (const [commandName, rawDescriptor] of Object.entries(parsed)) {
            if (rawDescriptor === null || typeof rawDescriptor !== "object") {
                continue;
            }
            target.set(commandName, normaliseCommandDescriptor(rawDescriptor));
        }
    }
}

// loadCommandDescriptors loads and merges command descriptor YAML files from two user-controlled layers:
// 1. Global user descriptors from {homeDir}/.claude/permissions.d/commands/
// 2. Project descriptors from {projectDir}/.claude/permissions.d/commands/ (wins on conflict)
// Returns an empty map when neither directory exists. No built-in descriptors are shipped.
export async function loadCommandDescriptors(homeDir: string, projectDir: string): Promise<Map<string, ICommandDescriptor>> {
    const descriptors: Map<string, ICommandDescriptor> = new Map();

    // Global user layer
    const homeCommandsDir = join(homeDir, ".claude", "permissions.d", "commands");
    await mergeDescriptorsFromDir(homeCommandsDir, descriptors);

    // Project layer (wins on conflict)
    const projectCommandsDir = join(projectDir, ".claude", "permissions.d", "commands");
    await mergeDescriptorsFromDir(projectCommandsDir, descriptors);

    return descriptors;
}

// resolvePositionalKind returns the kind of the positional at the given index for a command
// descriptor. If the index is beyond the descriptor's positional list, the last variadic
// positional's kind is returned; otherwise "string" is returned (safe default).
export function resolvePositionalKind(
    descriptor: ICommandDescriptor,
    positionalIndex: number
): "path" | "string" {
    if (descriptor.positionals.length === 0) {
        return "string";
    }
    if (positionalIndex < descriptor.positionals.length) {
        return descriptor.positionals[positionalIndex].kind;
    }
    const last = descriptor.positionals[descriptor.positionals.length - 1];
    if (last.variadic) {
        return last.kind;
    }
    return "string";
}

// resolveFlagArity searches the descriptor's alias groups for the given flag name and returns
// the declared arity. Returns 0 (boolean) when the flag is not found in any alias group.
export function resolveFlagArity(descriptor: ICommandDescriptor, flagName: string): 0 | 1 {
    for (const [aliasGroup, flagDescriptor] of Object.entries(descriptor.flags)) {
        const aliases = aliasGroup.split("|");
        if (aliases.includes(flagName)) {
            return flagDescriptor.arity;
        }
    }
    return 0;
}
