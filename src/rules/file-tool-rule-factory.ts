import { IFileToolEntry } from "../config";
import { IRule, IRuleFactory } from "./rule";
import { FileToolRule } from "./file-tool-rule";

// FILE_TOOL_DECIDE_FIELDS lists YAML keys allowed on a file tool entry with decide.
const FILE_TOOL_DECIDE_FIELDS = new Set([
    "decide",
    "reason",
    "path",
    "path-in",
    "cwd",
    "sourceLocation",
    // Documentation only: example tool calls the rule is expected to match or miss.
    "examples",
]);

// FILE_TOOL_KNOWN_FIELDS lists YAML keys on a file tool entry that are rule fields.
const FILE_TOOL_KNOWN_FIELDS = new Set([
    ...FILE_TOOL_DECIDE_FIELDS,
    "rules",
]);

// FileToolRuleFactory parses a file tool section into a FileToolRule.
export class FileToolRuleFactory implements IRuleFactory {

    // File tool category for rules produced by this factory.
    toolType: string;

    constructor(toolType: string) {
        this.toolType = toolType;
    }

    // Parse a file tool section into rules.
    load(fileToolConfig: IFileToolEntry | IFileToolEntry[]): IRule[] {

        if (!fileToolConfig || typeof fileToolConfig !== "object") {
            throw new Error(`permissions.yaml: ${this.toolType} must be an object or array`);
        }

        const entries = Array.isArray(fileToolConfig) ? fileToolConfig : [fileToolConfig];
        const children: FileToolRule[] = [];
        let catchAll: FileToolRule | undefined;
        let hasConstrainedEntry = false;

        for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            const entry = entries[entryIndex];

            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                throw new Error(`permissions.yaml: ${this.toolType} must contain only rule objects`);
            }

            const loadedRules = this.loadFileToolEntry(entry, undefined) as FileToolRule[];
            const isLast = entryIndex === entries.length - 1;

            // Same shape as bash top-level catch-all: last decide entry after constrained peers.
            if (isLast && typeof entry.decide === "string" && hasConstrainedEntry) {
                catchAll = loadedRules[loadedRules.length - 1];
            }
            else {
                children.push(...loadedRules);

                if (
                    typeof entry.decide !== "string"
                    || entry.path !== undefined
                    || entry["path-in"] !== undefined
                ) {
                    hasConstrainedEntry = true;
                }
            }
        }

        if (!catchAll) {
            return children;
        }

        const listRule = new FileToolRule(this.toolType, [], "", undefined, undefined);
        listRule.children = children;
        listRule.catchAll = catchAll;
        return [listRule];
    }

    // Load one YAML entry, recursing into nested rules when present.
    loadFileToolEntry(fileToolEntry: IFileToolEntry, parentCwd: string | undefined): IRule[] {

        if (typeof fileToolEntry.decide === "string") {
            return [this.loadDecideRule(fileToolEntry, parentCwd)];
        }

        if (fileToolEntry.rules) {
            return this.loadSubrules(fileToolEntry, parentCwd);
        }

        throw new Error(`permissions.yaml: ${this.toolType} entry must have decide or rules`);
    }

    // Recurse into a nested rules list, folding parent cwd onto child rules.
    loadSubrules(fileToolEntry: IFileToolEntry, parentCwd: string | undefined): IRule[] {

        const rulesList = fileToolEntry.rules;

        if (!Array.isArray(rulesList)) {
            throw new Error(`permissions.yaml: ${this.toolType} rules must be an array`);
        }

        for (const entryKey of Object.keys(fileToolEntry)) {
            if (!FILE_TOOL_KNOWN_FIELDS.has(entryKey)) {
                throw new Error(`permissions.yaml: ${this.toolType} unknown field '${entryKey}'`);
            }
        }

        const entryCwd = this.loadCwd(fileToolEntry.cwd);
        const effectiveCwd = entryCwd ? entryCwd : parentCwd;
        const children: FileToolRule[] = [];
        let catchAll: FileToolRule | undefined;

        for (let entryIndex = 0; entryIndex < rulesList.length; entryIndex++) {
            const ruleEntry = rulesList[entryIndex];

            if (!ruleEntry || typeof ruleEntry !== "object" || Array.isArray(ruleEntry)) {
                throw new Error(`permissions.yaml: ${this.toolType} rules must contain only rule objects`);
            }

            const loadedRules = this.loadFileToolEntry(ruleEntry, effectiveCwd) as FileToolRule[];
            const isLast = entryIndex === rulesList.length - 1;

            // Same shape as bash nested rules catch-all: last decide entry after children.
            if (isLast && typeof ruleEntry.decide === "string" && children.length > 0) {
                catchAll = loadedRules[loadedRules.length - 1];
            }
            else {
                children.push(...loadedRules);
            }
        }

        if (!catchAll && children.length <= 1) {
            return children;
        }

        const listRule = new FileToolRule(this.toolType, [], "", undefined, undefined);
        if (effectiveCwd) {
            listRule.requiredCwd = effectiveCwd;
        }
        listRule.children = children;
        if (catchAll) {
            listRule.catchAll = catchAll;
        }
        return [listRule];
    }

    // Load one rule with an explicit decide field.
    loadDecideRule(fileToolEntry: IFileToolEntry, parentCwd: string | undefined): FileToolRule {

        for (const entryKey of Object.keys(fileToolEntry)) {
            if (!FILE_TOOL_DECIDE_FIELDS.has(entryKey)) {
                throw new Error(`permissions.yaml: ${this.toolType} unknown field '${entryKey}'`);
            }
        }

        const decide = fileToolEntry.decide;

        if (typeof decide !== "string") {
            throw new Error(`permissions.yaml: ${this.toolType} must have a decide field`);
        }

        const reason = fileToolEntry.reason;

        if (reason !== undefined && typeof reason !== "string") {
            throw new Error(`permissions.yaml: ${this.toolType} reason must be a string`);
        }

        const path = fileToolEntry.path;
        const pathInValue = fileToolEntry["path-in"];
        let pathIn: string[] = [];

        if (path !== undefined && typeof path !== "string") {
            throw new Error(`permissions.yaml: ${this.toolType} path must be a string`);
        }

        if (pathInValue !== undefined) {
            if (!Array.isArray(pathInValue)) {
                throw new Error(`permissions.yaml: ${this.toolType} path-in must be an array`);
            }

            for (const pathEntry of pathInValue) {
                if (typeof pathEntry !== "string") {
                    throw new Error(`permissions.yaml: ${this.toolType} path-in entries must be strings`);
                }

                pathIn.push(this.expandProjectDirToken(pathEntry));
            }
        }
        else if (typeof path === "string") {
            pathIn = [this.expandProjectDirToken(path)];
        }

        const sourceLocation = fileToolEntry.sourceLocation;
        const rule = new FileToolRule(
            this.toolType,
            pathIn,
            decide,
            reason,
            sourceLocation
        );
        const entryCwd = this.loadCwd(fileToolEntry.cwd);
        const effectiveCwd = entryCwd ? entryCwd : parentCwd;

        if (effectiveCwd) {
            rule.requiredCwd = effectiveCwd;
        }

        return rule;
    }

    // Parse a cwd field from a file tool entry.
    loadCwd(cwdField: string | undefined): string | undefined {

        if (!cwdField) {
            return undefined;
        }

        if (typeof cwdField !== "string") {
            throw new Error(`permissions.yaml: ${this.toolType} cwd must be a string`);
        }

        return this.expandProjectDirToken(cwdField);
    }

    // Replace ${{PROJECT_DIR}} and ${{HOME}} tokens in a matcher pattern string.
    expandProjectDirToken(pattern: string): string {

        let expanded = pattern;

        const projectDirToken = "${{PROJECT_DIR}}";

        if (expanded.includes(projectDirToken)) {
            const projectDir = process.env["CLAUDE_PROJECT_DIR"];

            if (projectDir) {
                expanded = expanded.split(projectDirToken).join(projectDir);
            }
        }

        const homeToken = "${{HOME}}";

        if (expanded.includes(homeToken)) {
            const homeDir = process.env["HOME"];

            if (homeDir) {
                expanded = expanded.split(homeToken).join(homeDir);
            }
        }

        return expanded;
    }
}
