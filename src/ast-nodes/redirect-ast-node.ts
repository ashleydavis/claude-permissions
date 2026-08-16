import { IAstChildren, IAstNode } from "../ast";
import { AstNode } from "./ast-node";

// Children of a redirect node, which applies its operator to a left and a right operand.
export interface IRedirectChildren extends IAstChildren {

    // Command or inner redirect the operator reads from or writes to.
    left: IAstNode;

    // Where the operator points: a target node for file redirects, a heredoc node for `<<`.
    right: IAstNode;
}

// AST node for a shell I/O redirection wrapping a command.
export interface IRedirectNode extends IAstNode {

    // Discriminator for a redirect node.
    type: "redirect";

    // Redirection operator (e.g. ">", ">>", "<", "<<", "2>", "&>", "2>&").
    op: string;

    // Named child nodes for the operator's left and right operands.
    children: IRedirectChildren;
}

// AST node for a shell I/O redirection wrapping a command.
export class RedirectAstNode extends AstNode implements IRedirectNode {

    // Discriminator for a redirect node.
    type: "redirect" = "redirect";

    // Redirection operator (e.g. ">", ">>", "<", "<<", "2>", "&>", "2>&").
    op: string;

    // Named child nodes for the operator's left and right operands.
    children: IRedirectChildren;

    constructor(op: string, children: IRedirectChildren, source: string) {
        super("redirect", source);
        this.op = op;
        this.children = children;
    }
}
