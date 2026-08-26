import picomatch from "picomatch";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { IAstNode } from "../ast";
import { pickStrictest } from "../ast-nodes/ast-node";
import { ICommandNode } from "../ast-nodes/command-ast-node";
import { IEnvVarMap, IFileFieldMap, IFileMatch, INotFields, IOptionPatternMap } from "../config";
import { IContext } from "../context";
import { IDecision, IRule, IRuleEvaluation, ISourceLocation } from "./rule";

// BashRule matches a shell command by argv[0].
export class BashRule implements IRule {

    // Shell command name to match.
    commandName: string;

    // Permission decision when the rule matches.
    decision: string;

    // Human-readable reason forwarded when the rule matches.
    reason?: string;

    // Environment variables that must all match before the rule fires.
    requiredEnv?: IEnvVarMap;

    // Working directory that must match before the rule fires.
    requiredCwd?: string;

    // Working directory glob patterns where any one match triggers the rule (OR).
    requiredCwdInPatterns?: string[];

    // Positional subcommand path that must match before the rule fires.
    subcommandPath?: string[];

    // Positional argument patterns matched after the subcommand path offset.
    requiredCmdPatterns?: string[];

    // Positional argument patterns where any positional may match any pattern (OR).
    requiredCmdInPatterns?: string[];

    // Flag names that must all be present on the command (AND semantics).
    requiredOptions?: string[];

    // Flag names where any one present triggers the rule (OR semantics).
    requiredOptionsIn?: string[];

    // Flag value glob patterns keyed by flag name (AND semantics).
    requiredOptionPatterns?: IOptionPatternMap;

    // File content conditions that must all match before the rule fires.
    requiredFile?: IFileFieldMap;

    // Conditions that suppress the rule when all match.
    not?: INotFields;

    // Child rules evaluated only once this rule's own conditions match; their strictest decision becomes this rule's decision.
    children?: BashRule[];

    // Decide-only fallback used when no child produces a decision.
    catchAll?: BashRule;

    // File and line this rule was loaded from, when known.
    sourceLocation?: ISourceLocation;

    constructor(
        commandName: string,
        decision: string,
        reason: string | undefined,
        requiredEnv: IEnvVarMap | undefined,
        requiredCwd: string | undefined,
        sourceLocation: ISourceLocation | undefined
    ) {
        this.commandName = commandName;
        this.decision = decision;
        this.reason = reason;
        this.requiredEnv = requiredEnv;
        this.requiredCwd = requiredCwd;
        this.sourceLocation = sourceLocation;
    }

    // Return the invocation node when the AST is a shell command, or a wrapper running one, for this rule.
    evaluateCommand(ast: IAstNode): ICommandNode | undefined {

        if (ast.type !== "command") {
            return undefined;
        }

        const commandNode = ast as ICommandNode;
        if (this.commandName !== commandNode.commandName) {
            return undefined;
        }

        return commandNode;
    }

    // Return true when the command's leading arguments match this rule's subcommand path.
    evaluateSubcommandPath(commandNode: ICommandNode): boolean {

        if (!this.subcommandPath) {
            return true;
        }

        if (commandNode.positionals.length < this.subcommandPath.length) {
            return false;
        }

        for (let pathIndex = 0; pathIndex < this.subcommandPath.length; pathIndex++) {
            if (commandNode.positionals[pathIndex] !== this.subcommandPath[pathIndex]) {
                return false;
            }
        }

        return true;
    }

    // Return true when every required env var is set and matches its pattern.
    evaluateRequiredEnv(commandNode: ICommandNode, context: IContext): boolean {

        if (!this.requiredEnv) {
            return true;
        }

        for (const [varName, expectedValue] of Object.entries(this.requiredEnv)) {
            let actualValue = context.env[varName];

            if (commandNode.envPrefix[varName] !== undefined) {
                actualValue = commandNode.envPrefix[varName];
            }

            if (!actualValue) {
                return false;
            }

            let envMatched = false;

            // A value written as /.../ is matched as a regular expression.
            if (expectedValue.length >= 2 && expectedValue.startsWith("/") && expectedValue.endsWith("/")) {
                envMatched = new RegExp(expectedValue.slice(1, -1)).test(actualValue);
            }
            else {

                // Any other value is matched as a glob pattern.
                envMatched = picomatch(expectedValue, { dot: true })(actualValue);
            }

            if (!envMatched) {
                return false;
            }
        }

        return true;
    }

    // Return true when every env var in the map is set and matches its pattern.
    evaluateEnvVarMap(envVarMap: IEnvVarMap | undefined, commandNode: ICommandNode, context: IContext): boolean {

        if (!envVarMap) {
            return true;
        }

        for (const [varName, expectedValue] of Object.entries(envVarMap)) {
            let actualValue = context.env[varName];

            if (commandNode.envPrefix[varName] !== undefined) {
                actualValue = commandNode.envPrefix[varName];
            }

            if (!actualValue) {
                return false;
            }

            let envMatched = false;

            if (expectedValue.length >= 2 && expectedValue.startsWith("/") && expectedValue.endsWith("/")) {
                envMatched = new RegExp(expectedValue.slice(1, -1)).test(actualValue);
            }
            else {
                envMatched = picomatch(expectedValue, { dot: true })(actualValue);
            }

            if (!envMatched) {
                return false;
            }
        }

        return true;
    }

    // Return whether file contents match a contains pattern (exact, glob, or /regex/).
    evaluateFileContains(content: string, containsPattern: string): boolean {

        if (containsPattern.startsWith("/") && containsPattern.endsWith("/")) {
            return new RegExp(containsPattern.slice(1, -1)).test(content);
        }

        if (containsPattern.includes("*") || containsPattern.includes("?") || containsPattern.includes("{")) {
            return picomatch(containsPattern, { dot: true })(content);
        }

        return content.includes(containsPattern);
    }

    // Return whether the file exists and optionally matches contains, using missingFileResult when the file is absent.
    async evaluateFile(path: string, fileMatch: true | IFileMatch, context: IContext, missingFileResult: boolean): Promise<boolean> {

        let filePath = path;
        if (filePath.startsWith("~/")) {
            const homeDir = context.homeDir;
            if (homeDir) {
                filePath = `${homeDir}/${filePath.slice(2)}`;
            }
        }

        if (!filePath.startsWith("/")) {
            const projectDir = context.projectDir ?? context.cwd;
            filePath = resolve(projectDir, filePath);
        }

        let content: string;
        try {
            content = await readFile(filePath, "utf8");
        }
        catch {
            return missingFileResult;
        }

        if (fileMatch === true) {
            return true;
        }

        const containsPattern = fileMatch.contains;

        if (containsPattern === undefined) {
            return true;
        }

        return this.evaluateFileContains(content, containsPattern);
    }

    // Return true when every file matches, using missingFileResult for files that are absent.
    async evaluateFiles(requiredFile: IFileFieldMap | undefined, context: IContext, missingFileResult: boolean): Promise<boolean> {

        if (!requiredFile) {
            return true;
        }

        for (const [path, fileMatch] of Object.entries(requiredFile)) {
            if (!(await this.evaluateFile(path, fileMatch, context, missingFileResult))) {
                return false;
            }
        }

        return true;
    }

    // Return true when all not: conditions match and the rule should be suppressed.
    async evaluateNot(commandNode: ICommandNode, context: IContext): Promise<boolean> {

        if (!this.not) {
            return false;
        }

        if (!(await this.evaluateFiles(this.not.file, context, true))) {
            return false;
        }

        if (!this.evaluateEnvVarMap(this.not.env, commandNode, context)) {
            return false;
        }

        const notCmdInPatterns = this.not["cmd-in"];
        if (notCmdInPatterns && !this.evaluateCmdInPatterns(notCmdInPatterns, commandNode, context)) {
            return false;
        }

        const notOptions = this.not.options;
        if (notOptions) {
            for (const optionName of notOptions) {
                if (!this.evaluateFlagAliasPresent(optionName, commandNode)) {
                    return false;
                }
            }
        }

        const notOptionsIn = this.not["options-in"];
        if (notOptionsIn) {
            let anyOptionPresent = false;
            for (const optionName of notOptionsIn) {
                if (this.evaluateFlagAliasPresent(optionName, commandNode)) {
                    anyOptionPresent = true;
                    break;
                }
            }
            if (!anyOptionPresent) {
                return false;
            }
        }

        return true;
    }

    // Return true when any positional matches any of the given cmd-in patterns.
    evaluateCmdInPatterns(cmdInPatterns: string[], commandNode: ICommandNode, context: IContext): boolean {

        for (const cmdInPattern of cmdInPatterns) {
            for (const positional of commandNode.positionals) {
                if (this.matchCmdInPattern(cmdInPattern, positional, context)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Return true when one cmd-in pattern matches one positional (glob, or /regex/).
    matchCmdInPattern(cmdInPattern: string, positional: string, context: IContext): boolean {

        // A pattern written as /.../ is matched as a regular expression.
        if (cmdInPattern.length >= 2 && cmdInPattern.startsWith("/") && cmdInPattern.endsWith("/")) {
            return new RegExp(cmdInPattern.slice(1, -1)).test(positional);
        }

        let positionalArg = positional;
        let cmdGlob = cmdInPattern;

        // Path-style patterns resolve the positional against cwd so .. segments normalize before glob matching.
        if (cmdInPattern.startsWith("./") || cmdInPattern.startsWith("/")) {
            positionalArg = resolve(context.cwd, positional);
        }

        // A ./ pattern anchors to the project directory so a path resolved outside the project does not match.
        if (cmdInPattern.startsWith("./")) {
            cmdGlob = resolve(context.projectDir ?? context.cwd, cmdInPattern);
        }

        return picomatch(cmdGlob, { dot: true })(positionalArg);
    }

    // Return true when the working directory matches this rule's cwd glob pattern.
    evaluateRequiredCwd(context: IContext): boolean {

        if (!this.requiredCwd) {
            return true;
        }

        if (context.cwdResolved === false) {
            return false;
        }

        return picomatch(this.requiredCwd, { dot: true })(resolve(context.cwd));
    }

    // Return true when the working directory matches any cwd-in glob pattern.
    evaluateRequiredCwdInPatterns(context: IContext): boolean {

        if (!this.requiredCwdInPatterns) {
            return true;
        }

        if (context.cwdResolved === false) {
            return false;
        }

        for (const cwdInPattern of this.requiredCwdInPatterns) {
            let cwdGlob = cwdInPattern;

            // A ./ pattern anchors to the project directory so cwd outside the project does not match.
            if (cwdInPattern.startsWith("./")) {
                cwdGlob = resolve(context.projectDir ?? context.cwd, cwdInPattern);
            }

            if (picomatch(cwdGlob, { dot: true })(resolve(context.cwd))) {
                return true;
            }
        }

        return false;
    }

    // Return true when each cmd pattern matches the next positional argument in order.
    evaluateRequiredCmdPatterns(commandNode: ICommandNode, context: IContext): boolean {

        // No cmd constraint on this rule; matcher passes vacuously.
        if (!this.requiredCmdPatterns) {
            return true;
        }

        // Skip arguments already matched by nested subcommand keys.
        const cmdOffset = this.subcommandPath ? this.subcommandPath.length : 0;

        for (let patternIndex = 0; patternIndex < this.requiredCmdPatterns.length; patternIndex++) {
            const positional = commandNode.positionals[cmdOffset + patternIndex];

            // Each pattern needs a positional at the same index; fewer args means no match.
            if (!positional) {
                return false;
            }

            const cmdPattern = this.requiredCmdPatterns[patternIndex];
            let positionalArg = positional;
            let cmdGlob = cmdPattern;

            // Path-style patterns resolve the positional against cwd so .. segments normalize before glob matching.
            if (!(cmdPattern.length >= 2 && cmdPattern.startsWith("/") && cmdPattern.endsWith("/"))
                && (cmdPattern.startsWith("./") || cmdPattern.startsWith("/"))) {
                positionalArg = resolve(context.cwd, positional);
            }

            // A ./ pattern anchors to the project directory so a path resolved outside the project does not match.
            if (cmdPattern.startsWith("./")) {
                cmdGlob = resolve(context.projectDir ?? context.cwd, cmdPattern);
            }

            let cmdMatched = false;

            // A pattern written as /.../ is matched as a regular expression.
            if (cmdPattern.length >= 2 && cmdPattern.startsWith("/") && cmdPattern.endsWith("/")) {
                cmdMatched = new RegExp(cmdPattern.slice(1, -1)).test(positionalArg);
            }
            else {

                // Any other pattern is matched as a glob.
                cmdMatched = picomatch(cmdGlob, { dot: true })(positionalArg);
            }

            // All patterns must match in order; one miss fails the whole cmd constraint.
            if (!cmdMatched) {
                return false;
            }
        }

        return true;
    }

    // Expand $VAR and ${VAR} in one command positional argument using inline env prefix and threaded context.
    expandEnvVarsInArg(
        arg: string,
        envPrefix: Record<string, string>,
        contextEnv: Record<string, string>
    ): string {

        return arg.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (fullMatch: string, bracedName: string, bareName: string): string => {
            const variableName = bracedName !== undefined ? bracedName : bareName;
            let replacement = contextEnv[variableName];

            if (envPrefix[variableName] !== undefined) {
                replacement = envPrefix[variableName];
            }

            return replacement !== undefined ? replacement : fullMatch;
        });
    }

    // Expand $VAR and ${VAR} in command positional arguments using inline env prefix and threaded context.
    expandEnvVarsInArgs(
        args: string[],
        envPrefix: Record<string, string>,
        contextEnv: Record<string, string>
    ): string[] {

        return args.map((arg) => {
            return this.expandEnvVarsInArg(arg, envPrefix, contextEnv);
        });
    }

    // Return true when any positional from the subcommand offset matches any cmd-in pattern.
    evaluateRequiredCmdInPatterns(commandNode: ICommandNode, context: IContext): boolean {

        // No cmd-in constraint on this rule; matcher passes vacuously.
        if (!this.requiredCmdInPatterns) {
            return true;
        }

        // Nested subcommand keys (e.g. git → push) consume leading positionals; cmd-in applies to the rest.
        const cmdOffset = this.subcommandPath ? this.subcommandPath.length : 0;

        const positionals = this.expandEnvVarsInArgs(
            commandNode.positionals.slice(cmdOffset),
            commandNode.envPrefix,
            context.env
        );

        // cmd-in is OR over patterns and OR over positionals: one hit is enough.
        for (const cmdInPattern of this.requiredCmdInPatterns) {
            for (const positional of positionals) {
                if (this.matchCmdInPattern(cmdInPattern, positional, context)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Return true when any alias from a pipe-separated flag expression is present on the command.
    evaluateFlagAliasPresent(aliasExpr: string, commandNode: ICommandNode): boolean {

        for (const alias of aliasExpr.split("|")) {
            if (alias in commandNode.options) {
                return true;
            }
        }

        return false;
    }

    // Return true when every required flag is present on the command.
    evaluateRequiredOptions(commandNode: ICommandNode): boolean {

        if (!this.requiredOptions) {
            return true;
        }

        for (const requiredOption of this.requiredOptions) {
            if (!this.evaluateFlagAliasPresent(requiredOption, commandNode)) {
                return false;
            }
        }

        return true;
    }

    // Return true when any required flag from the options-in list is present on the command.
    evaluateRequiredOptionsIn(commandNode: ICommandNode): boolean {

        if (!this.requiredOptionsIn) {
            return true;
        }

        for (const requiredOption of this.requiredOptionsIn) {
            if (this.evaluateFlagAliasPresent(requiredOption, commandNode)) {
                return true;
            }
        }

        return false;
    }

    // Return true when every required option value pattern matches the command flags.
    evaluateRequiredOptionPatterns(commandNode: ICommandNode): boolean {

        if (!this.requiredOptionPatterns) {
            return true;
        }

        for (const [flagName, pattern] of Object.entries(this.requiredOptionPatterns)) {
            const flagValue = commandNode.options[flagName];
            if (typeof flagValue !== "string") {
                return false;
            }

            let optionMatched = false;

            // A pattern written as /.../ is matched as a regular expression.
            if (pattern.length >= 2 && pattern.startsWith("/") && pattern.endsWith("/")) {
                optionMatched = new RegExp(pattern.slice(1, -1)).test(flagValue);
            }
            else {

                // Any other pattern is matched as a glob.
                optionMatched = picomatch(pattern, { dot: true })(flagValue);
            }

            if (!optionMatched) {
                return false;
            }
        }

        return true;
    }

    // Match this rule's conditions against a command node, returning its own decision or its children's strictest decision.
    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {

        const commandNode = this.evaluateCommand(ast);
        if (!commandNode) {
            return { context };
        }

        if (!this.evaluateSubcommandPath(commandNode)) {
            return { context };
        }

        if (!this.evaluateRequiredEnv(commandNode, context)) {
            return { context };
        }

        if (!this.evaluateRequiredCwd(context)) {
            return { context };
        }

        if (!this.evaluateRequiredCwdInPatterns(context)) {
            return { context };
        }

        if (!this.evaluateRequiredCmdPatterns(commandNode, context)) {
            return { context };
        }

        if (!this.evaluateRequiredCmdInPatterns(commandNode, context)) {
            return { context };
        }

        if (!this.evaluateRequiredOptions(commandNode)) {
            return { context };
        }

        if (!this.evaluateRequiredOptionsIn(commandNode)) {
            return { context };
        }

        if (!this.evaluateRequiredOptionPatterns(commandNode)) {
            return { context };
        }

        if (!(await this.evaluateFiles(this.requiredFile, context, false))) {
            return { context };
        }

        if (await this.evaluateNot(commandNode, context)) {
            return { context };
        }

        // A rule with children is a guarded group: now that its own conditions hold, its children decide.
        if (this.children || this.catchAll) {
            const childDecisions: IDecision[] = [];
            let workingContext = context;

            if (this.children) {
                for (const child of this.children) {
                    const childEvaluation = await child.evaluate(ast, workingContext);
                    workingContext = childEvaluation.context;

                    if (childEvaluation.decision) {
                        childDecisions.push(childEvaluation.decision);
                    }
                }
            }

            const childDecision = pickStrictest(childDecisions);
            if (childDecision) {
                return {
                    decision: childDecision,
                    context: workingContext,
                };
            }

            if (this.catchAll) {
                return this.catchAll.evaluate(ast, workingContext);
            }

            return {
                context: workingContext,
            };
        }

        return {
            decision: {
                action: this.decision,
                reason: this.reason,
            },
            context,
        };
    }
}
