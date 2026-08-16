import { IAuditLogger } from "../audit-log";
import { IAstNode } from "../ast";
import { IContext } from "../context";
import { IRule, IRuleEvaluation } from "../rules/rule";
import { AstNode } from "./ast-node";

// AST node for the right operand of a file redirection.
export interface ITargetNode extends IAstNode {

    // Discriminator for a target node.
    type: "target";

    // File path written or read, or the fd number as a string for merges like "2>&1".
    path: string;
}

// AST node for the right operand of a file redirection.
export class TargetAstNode extends AstNode implements ITargetNode {

    // Discriminator for a target node.
    type: "target" = "target";

    // File path written or read, or the fd number as a string for merges like "2>&1".
    path: string;

    constructor(path: string, source: string) {
        super("target", source);
        this.path = path;
    }

    // A target names where the redirect points; the redirect node above it decides, so this node decides nothing.
    async evaluate(rules: IRule[], context: IContext, logger: IAuditLogger): Promise<IRuleEvaluation> {

        return { context };
    }
}
