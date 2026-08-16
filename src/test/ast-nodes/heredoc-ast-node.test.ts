import { HeredocAstNode } from "../../ast-nodes/heredoc-ast-node";
import { NullAuditLogger } from "../../audit-log";
import { IAstNode } from "../../ast";
import { IContext } from "../../context";
import { IRule, IRuleEvaluation } from "../../rules/rule";

const baseContext: IContext = { cwd: "/project", env: {} };

// Test rule that records the node types it sees, in evaluation order.
class RecordRule implements IRule {

    // Node types seen, appended on each evaluation.
    seen: string[];

    constructor(seen: string[]) {
        this.seen = seen;
    }

    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {
        this.seen.push(ast.type);
        return { context };
    }
}

describe("HeredocAstNode", () => {

    test("stores type, terminator, quoting, and body", () => {
        const node = new HeredocAstNode("EOF", true, "message", "<<'EOF'\nmessage\nEOF");
        expect(node.type).toBe("heredoc");
        expect(node.terminator).toBe("EOF");
        expect(node.quoted).toBe(true);
        expect(node.body).toBe("message");
        expect(node.children).toBeUndefined();
    });

    test("quoted body decides nothing and runs no rules", async () => {
        const node = new HeredocAstNode("EOF", true, "message", "<<'EOF'\nmessage\nEOF");
        const seen: string[] = [];
        const result = await node.evaluate([new RecordRule(seen)], baseContext, new NullAuditLogger());
        expect(result.decision).toBeUndefined();
        expect(seen).toEqual([]);
    });

    test("unquoted body asks when no rule decides", async () => {
        const node = new HeredocAstNode("EOF", false, "message", "<<EOF\nmessage\nEOF");
        const seen: string[] = [];
        const result = await node.evaluate([new RecordRule(seen)], baseContext, new NullAuditLogger());
        expect(result.decision).toEqual({ action: "ask" });
        expect(seen).toEqual(["heredoc"]);
    });
});
