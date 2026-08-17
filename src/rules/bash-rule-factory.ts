import { IBashConfig, IBashEntry, IEnvVarMap, IFileFieldMap, INotFields, IOptionPatternMap } from "../config";
import { IRule, IRuleFactory, ISourceLocation } from "./rule";
import { BashRule } from "./bash-rule";

// COMMAND_RULE_FIELDS lists YAML keys allowed on a bash entry with decide.
const COMMAND_RULE_FIELDS = new Set([
    "decide",
    "reason",
    "cwd",
    "cwd-in",
    "path",
    "env",
    "cmd",
    "cmd-in",
    "options",
    "options-in",
    "file",
    "sourceLocation",
    "not",
    // Documentation only: example commands the rule is expected to match or miss.
    // Carried through loading untouched so external tooling can test rules against real commands.
    "examples",
]);

// KNOWN_FIELDS lists YAML keys on a bash entry that are rule fields, not subcommand names.
const KNOWN_FIELDS = new Set([
    ...COMMAND_RULE_FIELDS,
    "rules",
]);

// NOT_KNOWN_FIELDS lists not: sub-keys implemented in BashRule loading and evaluateNot.
const NOT_KNOWN_FIELDS = new Set([
    "env",
    "file",
    "cmd-in",
    "options",
    "options-in",
]);

// BashRuleFactory parses a bash section into BashRule instances.
export class BashRuleFactory implements IRuleFactory {

    // Parse a bash section into command-name rules.
    //
    // Example section:
    //   ls: { decide: "allow" }
    //   npm:
    //     test: { decide: "allow" }
    //
    // Example output:
    //   [
    //     BashRule(commandName="ls", decision="allow"),
    //     BashRule(commandName="npm", decision="allow", subcommandPath=["test"]),
    //   ]
    //
    load(bashConfig: IBashConfig): IRule[] {

        if (!bashConfig || typeof bashConfig !== "object" || Array.isArray(bashConfig)) {
            throw new Error("permissions.yaml: bash must be an object");
        }

        const rules: BashRule[] = [];

        for (const [commandName, value] of Object.entries(bashConfig)) {
            const entries = Array.isArray(value) ? value : [value];
            const children: BashRule[] = [];
            let catchAll: BashRule | undefined;
            let hasSubcommandEntry = false;

            for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
                const entry = entries[entryIndex];

                if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
                    throw new Error(`permissions.yaml: bash.${commandName} must contain only rule objects`);
                }

                const loadedRules = this.loadBashEntry(entry, commandName, []);
                const isLast = entryIndex === entries.length - 1;

                if (isLast && typeof entry.decide === "string" && hasSubcommandEntry) {
                    catchAll = loadedRules[loadedRules.length - 1];
                }
                else {
                    children.push(...loadedRules);

                    if (typeof entry.decide !== "string") {
                        hasSubcommandEntry = true;
                    }
                }
            }

            if (!catchAll) {
                rules.push(...children);
            }
            else {
                const listRule = new BashRule(commandName, "", undefined, undefined, undefined, undefined);
                listRule.children = children;
                listRule.catchAll = catchAll;
                rules.push(listRule);
            }
        }

        return rules;
    }

    //
    // Load one YAML entry under a bash command name, recursing as needed.
    //
    // Example for commandName="ls", subcommandPath=[]:
    //   in:  { decide: "allow" }
    //   out: [ BashRule(commandName="ls", decision="allow") ]
    //
    // Example for commandName="npm", subcommandPath=[]:
    //   in:  { test: { decide: "allow" } }
    //   out: [ BashRule(commandName="npm", decision="allow", subcommandPath=["test"]) ]
    //
    loadBashEntry(bashEntry: IBashEntry, commandName: string, subcommandPath: string[]): BashRule[] {

        if (!bashEntry || typeof bashEntry !== "object" || Array.isArray(bashEntry)) {
            throw new Error(`permissions.yaml: bash.${commandName} must contain only rule objects`);
        }

        if (typeof bashEntry.decide === "string") {
            return [this.loadCommandRule(bashEntry, commandName, subcommandPath, bashEntry.decide)];
        }

        return this.loadSubcommandsOrRules(bashEntry, commandName, subcommandPath);
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

    // Expand a leading ~/ on a file path using HOME.
    expandTildePath(filePath: string): string {

        if (!filePath.startsWith("~/")) {
            return filePath;
        }

        const homeDir = process.env["HOME"];

        if (!homeDir) {
            return filePath;
        }

        return `${homeDir}/${filePath.slice(2)}`;
    }

    //
    // Load one command-matching rule at the current subcommand path.
    //
    // Example for commandName="ls", subcommandPath=[]:
    //   in:  { decide: "allow" }
    //   out: BashRule(commandName="ls", decision="allow")
    //
    // Example for commandName="ls", subcommandPath=[]:
    //   in:  { decide: "allow", reason: "safe", env: { FOO: "bar" }, cwd: "/tmp" }
    //   out: BashRule(commandName="ls", decision="allow", reason="safe",
    //                requiredEnv={ FOO: "bar" }, requiredCwd="/tmp")
    //
    // Example for commandName="npm", subcommandPath=["test"]:
    //   in:  { env: { NODE_ENV: "test" }, decide: "allow" }
    //   out: BashRule(commandName="npm", decision="allow",
    //                requiredEnv={ NODE_ENV: "test" }, subcommandPath=["test"])
    //
    loadCommandRule(bashEntry: IBashEntry, commandName: string, subcommandPath: string[], decide: string): BashRule {

        // Throw if this entry contains a key we do not support.
        for (const entryKey of Object.keys(bashEntry)) {
            if (!COMMAND_RULE_FIELDS.has(entryKey)) {
                throw new Error(`permissions.yaml: bash.${commandName} unknown field '${entryKey}'`);
            }
        }

        // Message to show with the decision, if the author provided one.
        const reason = bashEntry.reason;
        if (reason && typeof reason !== "string") {
            throw new Error(`permissions.yaml: bash.${commandName} reason must be a string`);
        }

        // Environment variables the command must have set.
        const requiredEnv = this.loadRequiredEnv(commandName, bashEntry.env);

        // Directory the command must run in, if the author set one.
        const cwdField = bashEntry.cwd !== undefined ? bashEntry.cwd : bashEntry.path;
        let requiredCwd: string | undefined;

        if (cwdField) {
            if (typeof cwdField !== "string") {
                throw new Error(`permissions.yaml: bash.${commandName} cwd must be a string`);
            }

            requiredCwd = this.expandProjectDirToken(cwdField);
        }

        const cwdInField = bashEntry["cwd-in"];
        let requiredCwdInPatterns: string[] | undefined;

        if (cwdInField) {
            if (!Array.isArray(cwdInField)) {
                throw new Error(`permissions.yaml: bash.${commandName} cwd-in must be an array`);
            }

            requiredCwdInPatterns = [];

            for (const cwdInPattern of cwdInField) {
                if (typeof cwdInPattern !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} cwd-in must contain only strings`);
                }

                requiredCwdInPatterns.push(cwdInPattern);
            }
        }

        // Normalise cmd to patterns: a string is split on whitespace, an array is used as-is.
        const cmdField = bashEntry.cmd;
        let requiredCmdPatterns: string[] | undefined;

        if (cmdField) {
            if (typeof cmdField === "string") {
                requiredCmdPatterns = cmdField.trim().split(/\s+/).map(
                    cmdPattern => this.expandProjectDirToken(cmdPattern)
                );
            }
            else if (Array.isArray(cmdField)) {
                requiredCmdPatterns = [];

                for (const cmdPattern of cmdField) {
                    if (typeof cmdPattern !== "string") {
                        throw new Error(`permissions.yaml: bash.${commandName} cmd must contain only strings`);
                    }

                    requiredCmdPatterns.push(cmdPattern);
                }
            }
            else {
                throw new Error(`permissions.yaml: bash.${commandName} cmd must be a string or array`);
            }
        }

        // cmd-in is a list of patterns. One match between any argument and any pattern is enough.
        const cmdInField = bashEntry["cmd-in"];
        let requiredCmdInPatterns: string[] | undefined;

        if (cmdInField) {
            if (!Array.isArray(cmdInField)) {
                throw new Error(`permissions.yaml: bash.${commandName} cmd-in must be an array`);
            }

            requiredCmdInPatterns = [];

            for (const cmdInPattern of cmdInField) {
                if (typeof cmdInPattern !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} cmd-in must contain only strings`);
                }

                requiredCmdInPatterns.push(this.expandProjectDirToken(cmdInPattern));
            }
        }

        const optionsField = bashEntry.options;
        let requiredOptions: string[] | undefined;
        let requiredOptionPatterns: IOptionPatternMap | undefined;

        if (optionsField) {
            if (Array.isArray(optionsField)) {
                requiredOptions = [];

                for (const optionName of optionsField) {
                    if (typeof optionName !== "string") {
                        throw new Error(`permissions.yaml: bash.${commandName} options must contain only strings`);
                    }

                    requiredOptions.push(optionName);
                }
            }
            else if (!optionsField || typeof optionsField !== "object") {
                throw new Error(`permissions.yaml: bash.${commandName} options must be an array or object`);
            }
            else {
                requiredOptionPatterns = {};

                for (const [flagName, pattern] of Object.entries(optionsField)) {
                    if (typeof pattern === "boolean") {
                        if (pattern) {
                            if (!requiredOptions) {
                                requiredOptions = [];
                            }

                            requiredOptions.push(flagName);
                        }
                        else {
                            throw new Error(`permissions.yaml: bash.${commandName} options.${flagName} must be true when boolean`);
                        }
                    }
                    else if (typeof pattern === "string") {
                        if (!requiredOptionPatterns) {
                            requiredOptionPatterns = {};
                        }

                        requiredOptionPatterns[flagName] = pattern;
                    }
                    else {
                        throw new Error(`permissions.yaml: bash.${commandName} options.${flagName} must be a string or true`);
                    }
                }
            }
        }

        // Assemble the rule, then add subcommand path and argument patterns when we parsed them.
        const sourceLocation = bashEntry.sourceLocation;
        const rule = new BashRule(
            commandName,
            decide,
            reason,
            requiredEnv,
            requiredCwd,
            sourceLocation
        );

        if (subcommandPath.length > 0) {
            rule.subcommandPath = subcommandPath;
        }

        if (requiredCwdInPatterns) {
            rule.requiredCwdInPatterns = requiredCwdInPatterns;
        }

        if (requiredCmdPatterns) {
            rule.requiredCmdPatterns = requiredCmdPatterns;
        }

        if (requiredCmdInPatterns) {
            rule.requiredCmdInPatterns = requiredCmdInPatterns;
        }

        if (requiredOptions) {
            rule.requiredOptions = requiredOptions;
        }

        if (requiredOptionPatterns) {
            rule.requiredOptionPatterns = requiredOptionPatterns;
        }

        const optionsInField = bashEntry["options-in"];
        let requiredOptionsIn: string[] | undefined;

        if (optionsInField) {
            if (!Array.isArray(optionsInField)) {
                throw new Error(`permissions.yaml: bash.${commandName} options-in must be an array`);
            }

            requiredOptionsIn = [];

            for (const optionName of optionsInField) {
                if (typeof optionName !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} options-in must contain only strings`);
                }

                requiredOptionsIn.push(optionName);
            }
        }

        if (requiredOptionsIn) {
            rule.requiredOptionsIn = requiredOptionsIn;
        }

        const requiredFile = this.loadFileField(commandName, bashEntry.file);
        if (requiredFile) {
            rule.requiredFile = requiredFile;
        }

        const notField = bashEntry.not;

        if (notField) {
            rule.not = this.loadNotFields(commandName, notField);
        }

        return rule;
    }

    //
    // Recurse into subcommand keys or a rules list without creating a rule at this level.
    //
    // Example for commandName="npm", subcommandPath=[]:
    //   in:  { test: { decide: "allow" } }
    //   out: [ BashRule(commandName="npm", decision="allow", subcommandPath=["test"]) ]
    //
    // Example for commandName="npm", subcommandPath=[]:
    //   in:  { run: [{ decide: "allow" }, { decide: "ask" }] }
    //   out: [ BashRule(commandName="npm", decision="allow", subcommandPath=["run"]),
    //          BashRule(commandName="npm", decision="ask", subcommandPath=["run"]) ]
    //
    // Example for commandName="aws", subcommandPath=[]:
    //   in:  { env: { AWS_PROFILE: "..." }, rules: [{ decide: "deny" }] }
    //   out: [ BashRule(commandName="aws", decision="deny") ]
    //
    // Example for commandName="aws", subcommandPath=[]:
    //   in:  { rules: [] }
    //   out: []
    //
    loadSubcommandsOrRules(bashEntry: IBashEntry, commandName: string, subcommandPath: string[]): BashRule[] {

        const loadedRules: BashRule[] = [];
        const hasSubcommandKey = this.entryHasSubcommandKey(bashEntry);

        for (const [entryKey, entryValue] of Object.entries(bashEntry)) {

            // Known YAML fields (decide, env, options, rules, …) cannot appear alongside subcommand names.
            // Exception: `env` / `options` may also be positional subcommands (e.g. helm env, kubectl options)
            // when their value is a nested rule entry rather than a matcher map/list.
            if (this.isKnownRuleField(entryKey, entryValue)) {
                if (hasSubcommandKey) {
                    throw new Error(`permissions.yaml: bash.${commandName} unknown field '${entryKey}'`);
                }

                if (entryKey === "rules") {
                    loadedRules.push(...this.loadIntermediateRulesEntry(bashEntry, commandName, subcommandPath));
                }

                continue;
            }

            loadedRules.push(...this.loadNestedSubcommandEntry(
                commandName,
                subcommandPath,
                entryKey,
                entryValue
            ));
        }

        return loadedRules;
    }

    // Return true when the entry nests rules under positional subcommand names.
    entryHasSubcommandKey(bashEntry: IBashEntry): boolean {

        for (const [entryKey, entryValue] of Object.entries(bashEntry)) {
            if (this.isKnownRuleField(entryKey, entryValue)) {
                continue;
            }

            if (entryValue && typeof entryValue === "object") {
                return true;
            }
        }

        return false;
    }

    // Return true when entryKey is a rule matcher/meta field for this value, not a subcommand name.
    isKnownRuleField(entryKey: string, entryValue: any): boolean {

        if (!KNOWN_FIELDS.has(entryKey)) {
            return false;
        }

        if (entryKey === "env") {
            return this.isEnvMatcherMap(entryValue);
        }

        if (entryKey === "options") {
            return this.isOptionsMatcher(entryValue);
        }

        return true;
    }

    // Return true when value is an env-var matcher map (string values, no decide/rules/not).
    isEnvMatcherMap(value: any): boolean {

        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        if ("decide" in value || "rules" in value || "not" in value) {
            return false;
        }

        for (const envValue of Object.values(value)) {
            if (typeof envValue !== "string") {
                return false;
            }
        }

        return true;
    }

    // Return true when value is an options presence list or flag-to-pattern map (not a nested rule).
    isOptionsMatcher(value: any): boolean {

        if (Array.isArray(value)) {
            return true;
        }

        if (!value || typeof value !== "object") {
            return false;
        }

        if ("decide" in value || "rules" in value || "not" in value) {
            return false;
        }

        for (const optionValue of Object.values(value)) {
            if (typeof optionValue !== "string") {
                return false;
            }
        }

        return true;
    }

    // Load a guarded group: a branch rule whose own conditions gate the nested child rules.
    loadIntermediateRulesEntry(bashEntry: IBashEntry, commandName: string, subcommandPath: string[]): BashRule[] {

        const rulesList = bashEntry.rules;

        if (!Array.isArray(rulesList)) {
            throw new Error(`permissions.yaml: bash.${commandName} rules must be an array`);
        }

        // The branch rule carries every condition on the entry except the nested rules themselves.
        const guardEntry: IBashEntry = {};
        for (const [entryKey, entryValue] of Object.entries(bashEntry)) {
            if (entryKey === "rules") {
                continue;
            }

            guardEntry[entryKey] = entryValue;
        }

        const branchRule = this.loadCommandRule(guardEntry, commandName, subcommandPath, "");

        const children: BashRule[] = [];
        let catchAll: BashRule | undefined;

        for (let entryIndex = 0; entryIndex < rulesList.length; entryIndex++) {
            const ruleEntry = rulesList[entryIndex];

            if (ruleEntry === null || typeof ruleEntry !== "object" || Array.isArray(ruleEntry)) {
                throw new Error(`permissions.yaml: bash.${commandName} rules must contain only rule objects`);
            }

            const loadedRules = this.loadBashEntry(ruleEntry, commandName, subcommandPath);
            const isLast = entryIndex === rulesList.length - 1;

            if (isLast && typeof ruleEntry.decide === "string" && children.length > 0) {
                catchAll = loadedRules[loadedRules.length - 1];
            }
            else {
                children.push(...loadedRules);
            }
        }

        branchRule.children = children;
        if (catchAll) {
            branchRule.catchAll = catchAll;
        }

        return [branchRule];
    }

    // Load rules nested under one positional subcommand key.
    loadNestedSubcommandEntry(
        commandName: string,
        subcommandPath: string[],
        subcommandKey: string,
        entryValue: string | string[] | IEnvVarMap | INotFields | IBashEntry | IBashEntry[] | IOptionPatternMap | ISourceLocation | undefined
    ): BashRule[] {

        if (!entryValue || typeof entryValue !== "object") {
            throw new Error(`permissions.yaml: bash.${commandName} unknown field '${subcommandKey}'`);
        }

        const subEntries = Array.isArray(entryValue) ? entryValue : [entryValue];
        const loadedRules: BashRule[] = [];

        for (const subEntry of subEntries) {
            if (typeof subEntry === "string") {
                throw new Error(`permissions.yaml: bash.${commandName} unknown field '${subcommandKey}'`);
            }

            loadedRules.push(...this.loadBashEntry(subEntry as IBashEntry, commandName, subcommandPath.concat(subcommandKey)));
        }

        return loadedRules;
    }

    //
    // Load a not: block from permissions YAML.
    //
    // Example:
    //   in:  { env: { AWS_PROFILE: "sandbox" } }
    //   out: { env: { AWS_PROFILE: "sandbox" } }
    //
    // Example:
    //   in:  { file: { "/etc/kubeconfig": { contains: "sandbox" } } }
    //   out: { file: { "/etc/kubeconfig": { contains: "sandbox" } } }
    //
    loadNotFields(commandName: string, notField: INotFields): INotFields {

        if (!notField || typeof notField !== "object" || Array.isArray(notField)) {
            throw new Error(`permissions.yaml: bash.${commandName} not must be an object`);
        }

        for (const notKey of Object.keys(notField)) {
            if (!NOT_KNOWN_FIELDS.has(notKey)) {
                throw new Error(`permissions.yaml: bash.${commandName} not unknown field '${notKey}'`);
            }
        }

        const parsedNot: INotFields = {};

        const env = this.loadRequiredEnv(commandName, notField.env);
        if (env) {
            parsedNot.env = env;
        }

        const file = this.loadFileField(commandName, notField.file);
        if (file) {
            parsedNot.file = file;
        }

        const cmdInField = notField["cmd-in"];
        if (cmdInField) {
            if (!Array.isArray(cmdInField)) {
                throw new Error(`permissions.yaml: bash.${commandName} not cmd-in must be an array`);
            }

            const cmdInPatterns: string[] = [];
            for (const cmdInPattern of cmdInField) {
                if (typeof cmdInPattern !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} not cmd-in must contain only strings`);
                }

                cmdInPatterns.push(this.expandProjectDirToken(cmdInPattern));
            }

            parsedNot["cmd-in"] = cmdInPatterns;
        }

        const optionsField = notField.options;
        if (optionsField) {
            if (!Array.isArray(optionsField)) {
                throw new Error(`permissions.yaml: bash.${commandName} not options must be an array`);
            }

            const optionNames: string[] = [];
            for (const optionName of optionsField) {
                if (typeof optionName !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} not options must contain only strings`);
                }

                optionNames.push(optionName);
            }

            parsedNot.options = optionNames;
        }

        const optionsInField = notField["options-in"];
        if (optionsInField) {
            if (!Array.isArray(optionsInField)) {
                throw new Error(`permissions.yaml: bash.${commandName} not options-in must be an array`);
            }

            const optionsInPatterns: string[] = [];
            for (const optionName of optionsInField) {
                if (typeof optionName !== "string") {
                    throw new Error(`permissions.yaml: bash.${commandName} not options-in must contain only strings`);
                }

                optionsInPatterns.push(optionName);
            }

            parsedNot["options-in"] = optionsInPatterns;
        }

        return parsedNot;
    }

    //
    // Load required env matcher values from a YAML env object.
    //
    // Example:
    //   in:  { FOO: "bar", NODE_ENV: "test" }
    //   out: { FOO: "bar", NODE_ENV: "test" }
    //
    // Example:
    //   in:  (absent)
    //   out: undefined
    //
    loadRequiredEnv(commandName: string, envVarMap: IEnvVarMap | undefined): IEnvVarMap | undefined {

        if (!envVarMap) {
            return undefined;
        }

        if (!envVarMap || typeof envVarMap !== "object" || Array.isArray(envVarMap)) {
            throw new Error(`permissions.yaml: bash.${commandName} env must be an object`);
        }

        const parsedEnv: IEnvVarMap = {};

        for (const [varName, envValue] of Object.entries(envVarMap)) {
            if (typeof envValue !== "string") {
                throw new Error(`permissions.yaml: bash.${commandName} env.${varName} must be a string`);
            }

            parsedEnv[varName] = envValue;
        }

        return parsedEnv;
    }

    //
    // Load a file: map from permissions YAML.
    //
    // Example:
    //   in:  { "/etc/kubeconfig": { contains: "sandbox" } }
    //   out: { "/etc/kubeconfig": { contains: "sandbox" } }
    //
    // Example:
    //   in:  (absent)
    //   out: undefined
    //
    loadFileField(commandName: string, fileField: IFileFieldMap | undefined): IFileFieldMap | undefined {

        if (!fileField) {
            return undefined;
        }

        if (!fileField || typeof fileField !== "object" || Array.isArray(fileField)) {
            throw new Error(`permissions.yaml: bash.${commandName} file must be an object`);
        }

        const parsedFile: IFileFieldMap = {};

        for (const [filePath, fileMatch] of Object.entries(fileField)) {
            if (typeof filePath !== "string") {
                throw new Error(`permissions.yaml: bash.${commandName} file keys must be strings`);
            }

            const expandedPath = this.expandTildePath(this.expandProjectDirToken(filePath));

            if (fileMatch === true) {
                parsedFile[expandedPath] = {};
                continue;
            }

            if (!fileMatch || typeof fileMatch !== "object" || Array.isArray(fileMatch)) {
                throw new Error(`permissions.yaml: bash.${commandName} file.${filePath} must be an object or true`);
            }

            const containsValue = fileMatch.contains;

            if (containsValue !== undefined && typeof containsValue !== "string") {
                throw new Error(`permissions.yaml: bash.${commandName} file.${filePath}.contains must be a string`);
            }

            parsedFile[expandedPath] = containsValue !== undefined ? { contains: containsValue } : {};
        }

        return parsedFile;
    }
}
