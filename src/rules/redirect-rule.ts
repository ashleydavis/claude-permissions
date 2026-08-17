import picomatch from "picomatch";
import { resolve } from "path";
import { IAstNode } from "../ast";
import { IRedirectNode } from "../ast-nodes/redirect-ast-node";
import { ITargetNode } from "../ast-nodes/target-ast-node";
import { IRedirectConfig, IRedirectEntry } from "../config";
import { IContext } from "../context";
import { IDecision, IRule, IRuleEvaluation, IRuleFactory, ISourceLocation } from "./rule";

// REDIRECT_OUT_OPS lists shell operators that write redirect output to a file path.
const REDIRECT_OUT_OPS = new Set([">", ">>", "2>", "&>"]);

// REDIRECT_IN_OPS lists shell operators that read redirect input from a file path.
const REDIRECT_IN_OPS = new Set(["<"]);

// REDIRECT_OUT_DECIDE_FIELDS lists YAML keys allowed on a redirect.out entry with decide.
const REDIRECT_OUT_DECIDE_FIELDS = new Set([
    "decide",
    "reason",
    "path",
    "path-in",
    "sourceLocation",
    // Documentation only: example redirects the rule is expected to match or miss.
    "examples",
]);

// IRedirectOutEntry holds one redirect.out entry loaded for ordered evaluation.
interface IRedirectOutEntry {

    // Path glob patterns matched against the redirect target (OR semantics); empty matches any target.
    pathIn: string[];

    // Permission decision when this entry matches.
    decision: string;

    // Human-readable reason forwarded when this entry matches.
    reason?: string;

    // File and line this entry was loaded from, when known.
    sourceLocation?: ISourceLocation;
}

// RedirectOutOrderedRule applies redirect.out entries in order and returns the first match.
export class RedirectOutOrderedRule implements IRule {

    // Redirect.out entries evaluated first-match-wins.
    entries: IRedirectOutEntry[];

    // File and line this rule was loaded from, when known.
    sourceLocation?: ISourceLocation;

    constructor(entries: IRedirectOutEntry[], sourceLocation: ISourceLocation | undefined) {
        this.entries = entries;
        this.sourceLocation = sourceLocation;
    }

    // Return true when one redirect.out entry matches the redirect node.
    matchesEntry(redirectNode: IRedirectNode, entry: IRedirectOutEntry, context: IContext): boolean {

        if (!REDIRECT_OUT_OPS.has(redirectNode.op)) {
            return false;
        }

        if (entry.pathIn.length > 0) {
            let target = (redirectNode.children.right as ITargetNode).path;

            if (!target.startsWith("/")) {
                target = resolve(context.cwd, target);
            }

            for (const pathPattern of entry.pathIn) {
                let pattern = pathPattern;

                if (pathPattern.startsWith("./")) {
                    pattern = context.cwd + "/" + pathPattern.slice(2);
                }

                if (picomatch(pattern, { dot: true })(target)) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    // Match a redirect node using first-match-wins redirect.out entries.
    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {

        if (ast.type !== "redirect") {
            return { context };
        }

        const redirectNode = ast as IRedirectNode;

        for (const entry of this.entries) {
            if (!this.matchesEntry(redirectNode, entry, context)) {
                continue;
            }

            const decision: IDecision = {
                action: entry.decision,
            };

            if (entry.reason !== undefined) {
                decision.reason = entry.reason;
            }

            return {
                decision,
                context,
            };
        }

        return { context };
    }
}

// REDIRECT_IN_DECIDE_FIELDS lists YAML keys allowed on a redirect.in entry with decide.
const REDIRECT_IN_DECIDE_FIELDS = new Set([
    "decide",
    "reason",
    "path",
    "path-in",
    "sourceLocation",
    // Documentation only: example redirects the rule is expected to match or miss.
    "examples",
]);

// IRedirectInEntry holds one redirect.in entry loaded for ordered evaluation.
interface IRedirectInEntry {

    // Path glob patterns matched against the redirect target (OR semantics); empty matches any target.
    pathIn: string[];

    // Permission decision when this entry matches.
    decision: string;

    // Human-readable reason forwarded when this entry matches.
    reason?: string;

    // File and line this entry was loaded from, when known.
    sourceLocation?: ISourceLocation;
}

// RedirectInOrderedRule applies redirect.in entries in order and returns the first match.
export class RedirectInOrderedRule implements IRule {

    // Redirect.in entries evaluated first-match-wins.
    entries: IRedirectInEntry[];

    // File and line this rule was loaded from, when known.
    sourceLocation?: ISourceLocation;

    constructor(entries: IRedirectInEntry[], sourceLocation: ISourceLocation | undefined) {
        this.entries = entries;
        this.sourceLocation = sourceLocation;
    }

    // Return true when one redirect.in entry matches the redirect node.
    matchesEntry(redirectNode: IRedirectNode, entry: IRedirectInEntry, context: IContext): boolean {

        if (!REDIRECT_IN_OPS.has(redirectNode.op)) {
            return false;
        }

        if (entry.pathIn.length > 0) {
            let target = (redirectNode.children.right as ITargetNode).path;

            if (!target.startsWith("/")) {
                target = resolve(context.cwd, target);
            }

            for (const pathPattern of entry.pathIn) {
                let pattern = pathPattern;

                if (pathPattern.startsWith("./")) {
                    pattern = context.cwd + "/" + pathPattern.slice(2);
                }

                if (picomatch(pattern, { dot: true })(target)) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    // Match a redirect node using first-match-wins redirect.in entries.
    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {

        if (ast.type !== "redirect") {
            return { context };
        }

        const redirectNode = ast as IRedirectNode;

        for (const entry of this.entries) {
            if (!this.matchesEntry(redirectNode, entry, context)) {
                continue;
            }

            const decision: IDecision = {
                action: entry.decision,
            };

            if (entry.reason !== undefined) {
                decision.reason = entry.reason;
            }

            return {
                decision,
                context,
            };
        }

        return { context };
    }
}

// RedirectRuleFactory parses a redirect section into redirect rules.
export class RedirectRuleFactory implements IRuleFactory {

    // Parse a redirect section into rules.
    load(redirectConfig: IRedirectConfig): IRule[] {

        if (!redirectConfig || typeof redirectConfig !== "object" || Array.isArray(redirectConfig)) {
            throw new Error("permissions.yaml: redirect must be an object");
        }

        const rules: IRule[] = [];

        if (redirectConfig.out !== undefined) {
            rules.push(this.loadRedirectOutOrderedRule(redirectConfig.out));
        }

        if (redirectConfig.in !== undefined) {
            rules.push(this.loadRedirectInOrderedRule(redirectConfig.in));
        }

        return rules;
    }

    // Load redirect.out entries into one first-match-wins ordered rule.
    loadRedirectOutOrderedRule(redirectOutConfig: IRedirectEntry | IRedirectEntry[]): RedirectOutOrderedRule {

        const entries = Array.isArray(redirectOutConfig) ? redirectOutConfig : [redirectOutConfig];
        const loadedEntries: IRedirectOutEntry[] = [];

        for (const entry of entries) {
            loadedEntries.push(this.loadRedirectOutEntry(entry));
        }

        const sourceLocation = entries.length > 0
            ? this.loadSourceLocation(entries[0])
            : undefined;

        return new RedirectOutOrderedRule(loadedEntries, sourceLocation);
    }

    // Load redirect.in entries into one first-match-wins ordered rule.
    loadRedirectInOrderedRule(redirectInConfig: IRedirectEntry | IRedirectEntry[]): RedirectInOrderedRule {

        const entries = Array.isArray(redirectInConfig) ? redirectInConfig : [redirectInConfig];
        const loadedEntries: IRedirectInEntry[] = [];

        for (const entry of entries) {
            loadedEntries.push(this.loadRedirectInEntry(entry));
        }

        const sourceLocation = entries.length > 0
            ? this.loadSourceLocation(entries[0])
            : undefined;

        return new RedirectInOrderedRule(loadedEntries, sourceLocation);
    }

    // Load one redirect.out entry from YAML.
    loadRedirectOutEntry(redirectEntry: IRedirectEntry): IRedirectOutEntry {

        if (!redirectEntry || typeof redirectEntry !== "object" || Array.isArray(redirectEntry)) {
            throw new Error("permissions.yaml: redirect.out must contain only rule objects");
        }

        for (const entryKey of Object.keys(redirectEntry)) {
            if (!REDIRECT_OUT_DECIDE_FIELDS.has(entryKey)) {
                throw new Error(`permissions.yaml: redirect.out unknown field '${entryKey}'`);
            }
        }

        const decide = redirectEntry.decide;

        if (typeof decide !== "string") {
            throw new Error("permissions.yaml: redirect.out must have a decide field");
        }

        const reason = redirectEntry.reason;

        if (reason !== undefined && typeof reason !== "string") {
            throw new Error("permissions.yaml: redirect.out reason must be a string");
        }

        const path = redirectEntry.path;
        const pathInValue = redirectEntry["path-in"];
        let pathIn: string[] = [];

        if (path !== undefined && typeof path !== "string") {
            throw new Error("permissions.yaml: redirect.out path must be a string");
        }

        if (pathInValue !== undefined) {
            if (!Array.isArray(pathInValue)) {
                throw new Error("permissions.yaml: redirect.out path-in must be an array");
            }

            for (const pathEntry of pathInValue) {
                if (typeof pathEntry !== "string") {
                    throw new Error("permissions.yaml: redirect.out path-in entries must be strings");
                }
            }

            pathIn = pathInValue;
        }
        else if (typeof path === "string") {
            pathIn = [path];
        }

        return {
            pathIn,
            decision: decide,
            reason,
            sourceLocation: this.loadSourceLocation(redirectEntry),
        };
    }

    // Load one redirect.in entry from YAML.
    loadRedirectInEntry(redirectEntry: IRedirectEntry): IRedirectInEntry {

        if (!redirectEntry || typeof redirectEntry !== "object" || Array.isArray(redirectEntry)) {
            throw new Error("permissions.yaml: redirect.in must contain only rule objects");
        }

        for (const entryKey of Object.keys(redirectEntry)) {
            if (!REDIRECT_IN_DECIDE_FIELDS.has(entryKey)) {
                throw new Error(`permissions.yaml: redirect.in unknown field '${entryKey}'`);
            }
        }

        const decide = redirectEntry.decide;

        if (typeof decide !== "string") {
            throw new Error("permissions.yaml: redirect.in must have a decide field");
        }

        const reason = redirectEntry.reason;

        if (reason !== undefined && typeof reason !== "string") {
            throw new Error("permissions.yaml: redirect.in reason must be a string");
        }

        const path = redirectEntry.path;
        const pathInValue = redirectEntry["path-in"];
        let pathIn: string[] = [];

        if (path !== undefined && typeof path !== "string") {
            throw new Error("permissions.yaml: redirect.in path must be a string");
        }

        if (pathInValue !== undefined) {
            if (!Array.isArray(pathInValue)) {
                throw new Error("permissions.yaml: redirect.in path-in must be an array");
            }

            for (const pathEntry of pathInValue) {
                if (typeof pathEntry !== "string") {
                    throw new Error("permissions.yaml: redirect.in path-in entries must be strings");
                }
            }

            pathIn = pathInValue;
        }
        else if (typeof path === "string") {
            pathIn = [path];
        }

        return {
            pathIn,
            decision: decide,
            reason,
            sourceLocation: this.loadSourceLocation(redirectEntry),
        };
    }

    // Parse source location metadata from a YAML entry when present.
    loadSourceLocation(entry: IRedirectEntry): ISourceLocation | undefined {

        return entry.sourceLocation;
    }
}
