import { IAuditLogger, toLocalISOString } from "../audit-log";
import { IAstNode, IAstChildren } from "../ast";
import { IContext } from "../context";
import { IDecision, IRule, IRuleEvaluation } from "../rules/rule";

// Numeric rank for strictest-wins: abstain(0) < allow(1) < ask(2) < deny(3).
function decisionRank(action: string): number {

    if (action === "deny") {
        return 3;
    }

    if (action === "ask") {
        return 2;
    }

    if (action === "allow") {
        return 1;
    }

    return 0;
}

// Return the strictest decision from a set, joining every reason that shares that action, or undefined when none matched.
export function pickStrictest(decisions: IDecision[]): IDecision | undefined {

    if (decisions.length === 0) {
        return undefined;
    }

    // Strictest action wins (deny > ask > allow > abstain).
    let strictestRank = -1;
    for (const decision of decisions) {
        const rank = decisionRank(decision.action);
        if (rank > strictestRank) {
            strictestRank = rank;
        }
    }

    // Collect the distinct reasons contributed by every rule that produced the strictest action.
    let strictestAction = "";
    const reasons: string[] = [];
    for (const decision of decisions) {
        if (decisionRank(decision.action) !== strictestRank) {
            continue;
        }

        strictestAction = decision.action;

        if (decision.reason && !reasons.includes(decision.reason)) {
            reasons.push(decision.reason);
        }
    }

    if (reasons.length === 0) {
        return { action: strictestAction };
    }

    return { action: strictestAction, reason: reasons.join("; ") };
}

// A node in the parsed tool-call AST.
export class AstNode implements IAstNode {

    // The kind of node this is (e.g. "command", "bash", "binop").
    type: string;

    // Source text for this node, including comments when present.
    source: string;

    // Child nodes keyed by their role in this node; omitted when this node has no children.
    children?: IAstChildren;

    constructor(type: string, source: string, children?: IAstChildren) {
        this.type = type;
        this.source = source;
        this.children = children;
    }

    // A child deny always stands; otherwise this node's own rule overrides its children.
    combineDecisions(ownDecisions: IDecision[], childDecision: IDecision | undefined): IDecision | undefined {

        if (childDecision && childDecision.action === "deny") {
            return childDecision;
        }

        return pickStrictest(ownDecisions) || childDecision;
    }

    // Run this node's rules and children, threading context, and return the combined decision.
    async evaluate(rules: IRule[], context: IContext, logger: IAuditLogger): Promise<IRuleEvaluation> {

        const childDecisions: IDecision[] = [];
        const ownDecisions: IDecision[] = [];
        let workingContext = context;

        if (this.children) {

            // When `_` is present it holds the positional children; otherwise every value is a single named child.
            let childNodes: IAstNode[];
            if ("_" in this.children) {
                const positionalChildren = this.children._;
                if (!Array.isArray(positionalChildren)) {
                    throw new Error("AST children `_` must be an array of positional children");
                }
                if (Object.keys(this.children).length > 1) {
                    throw new Error("AST children cannot combine `_` positional children with named children");
                }
                childNodes = positionalChildren;
            }
            else {
                childNodes = Object.values(this.children) as IAstNode[];
            }

            for (const childNode of childNodes) {
                const childResult = await childNode.evaluate(rules, workingContext, logger);
                workingContext = childResult.context;

                if (childResult.decision) {
                    childDecisions.push(childResult.decision);
                }
            }
        }

        for (const rule of rules) {
            const evaluation = await rule.evaluate(this, workingContext);
            workingContext = evaluation.context;

            if (evaluation.decision) {
                ownDecisions.push(evaluation.decision);
                logger.log({
                    type: "rule_match",
                    timestamp: toLocalISOString(new Date()),
                    ruleFile: rule.sourceLocation?.file,
                    ruleLine: rule.sourceLocation?.line,
                    decision: evaluation.decision.action,
                    reason: evaluation.decision.reason,
                    cmd: this.source,
                    cwd: workingContext.cwd,
                    env: { ...workingContext.env },
                });
                if (evaluation.decision.action === "deny") {
                    break;
                }
            }
        }

        // A node with no children that nobody decided defaults to ask so it is never silently allowed.
        if (!this.children) {
            const ownDecision = pickStrictest(ownDecisions);
            if (!ownDecision) {
                logger.log({
                    type: "no_rule_match",
                    timestamp: toLocalISOString(new Date()),
                    nodeType: this.type,
                    cmd: this.source,
                    cwd: workingContext.cwd,
                    env: { ...workingContext.env },
                });
                return {
                    decision: { action: "ask" },
                    context: workingContext,
                };
            }
            return {
                decision: ownDecision,
                context: workingContext,
            };
        }

        const childDecision = pickStrictest(childDecisions);
        const combinedDecision = this.combineDecisions(ownDecisions, childDecision);
        if (combinedDecision) {
            logger.log({
                type: "aggregation",
                timestamp: toLocalISOString(new Date()),
                cmd: this.source,
                decision: combinedDecision.action,
                reason: combinedDecision.reason,
            });
        }

        return {
            decision: combinedDecision,
            context: workingContext,
        };
    }
}
