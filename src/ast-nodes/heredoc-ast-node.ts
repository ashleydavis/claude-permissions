import { IAuditLogger } from "../audit-log";
import { IContext } from "../context";
import { IRule, IRuleEvaluation } from "../rules/rule";
import { AstNode } from "./ast-node";

// AST node for the body of a heredoc redirection (`<<EOF ... EOF`).
export class HeredocAstNode extends AstNode {

    // Word that ends the body (e.g. "EOF").
    terminator: string;

    // True when the terminator was quoted, which stops the shell expanding the body.
    quoted: boolean;

    // Body text, without the terminator line.
    body: string;

    constructor(terminator: string, quoted: boolean, body: string, source: string) {
        super("heredoc", source);
        this.terminator = terminator;
        this.quoted = quoted;
        this.body = body;
    }

    // A quoted body is literal input data that the shell never expands or runs, so it decides nothing.
    // An unquoted body still gets expanded, so it keeps the default handling and asks.
    async evaluate(rules: IRule[], context: IContext, logger: IAuditLogger): Promise<IRuleEvaluation> {

        if (this.quoted) {
            return { context };
        }

        return super.evaluate(rules, context, logger);
    }
}
