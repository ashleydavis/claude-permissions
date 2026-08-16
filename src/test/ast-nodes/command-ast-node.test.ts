import { CommandAstNode } from "../../ast-nodes/command-ast-node";
import { NullAuditLogger } from "../../audit-log";
import { AstNode } from "../../ast-nodes/ast-node";
import { IAstNode } from "../../ast";
import { IContext } from "../../context";
import { IRule, IRuleEvaluation } from "../../rules/rule";

const baseContext: IContext = { cwd: "/project", env: {} };

// Test rule that allows any node it sees.
class AllowRule implements IRule {

    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {
        return { decision: { action: "allow" }, context };
    }
}

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

// Test rule that allows only the node with a given source, leaving every other node undecided.
class AllowSourceRule implements IRule {

    // Source text of the node this rule allows.
    source: string;

    constructor(source: string) {
        this.source = source;
    }

    async evaluate(ast: IAstNode, context: IContext): Promise<IRuleEvaluation> {
        if (ast.source !== this.source) {
            return { context };
        }
        return { decision: { action: "allow" }, context };
    }
}

// makeWrapper returns a command node that runs one inner command, as `mise exec -- ...` does.
function makeWrapper(inner: IAstNode): CommandAstNode {
    const node = new CommandAstNode("mise", {}, ["exec"], {}, "mise exec -- command");
    node.children = { inner };
    return node;
}

describe("CommandAstNode", () => {

    test("stores type, command name, options, positionals, and env prefix", () => {
        const node = new CommandAstNode("ls", { l: true }, ["src"], { FOO: "bar" }, "FOO=bar ls -l src");
        expect(node.type).toBe("command");
        expect(node.commandName).toBe("ls");
        expect(node.options).toEqual({ l: true });
        expect(node.positionals).toEqual(["src"]);
        expect(node.envPrefix).toEqual({ FOO: "bar" });
    });

    test("is an AstNode and inherits evaluate", async () => {
        const node = new CommandAstNode("ls", {}, [], {}, "ls");
        expect(node).toBeInstanceOf(AstNode);
        const result = await node.evaluate([new AllowRule()], baseContext, new NullAuditLogger());
        expect(result.decision).toEqual({ action: "allow" });
    });

    test("evaluates the command it runs before itself", async () => {
        const node = makeWrapper(new AstNode("command", "rm"));
        const seen: string[] = [];
        await node.evaluate([new RecordRule(seen)], baseContext, new NullAuditLogger());
        expect(seen).toEqual(["command", "command"]);
    });

    test("combineDecisions takes the inner ask over the wrapper's own allow", () => {
        const node = makeWrapper(new AstNode("command", "rm"));
        expect(node.combineDecisions([{ action: "allow" }], { action: "ask" })).toEqual({ action: "ask" });
    });

    test("combineDecisions takes the inner deny over the wrapper's own allow", () => {
        const node = makeWrapper(new AstNode("command", "rm"));
        expect(node.combineDecisions([{ action: "allow" }], { action: "deny" })).toEqual({ action: "deny" });
    });

    test("combineDecisions returns allow when the wrapper and the command it runs both allow", () => {
        const node = makeWrapper(new AstNode("command", "rm"));
        expect(node.combineDecisions([{ action: "allow" }], { action: "allow" })).toEqual({ action: "allow" });
    });

    test("combineDecisions lets a command with no inner command override a substitution child", () => {
        const node = new CommandAstNode("echo", {}, [], {}, "echo $(mytool)");
        node.children = { substitution: new AstNode("substitution", "$(mytool)") };
        expect(node.combineDecisions([{ action: "allow" }], { action: "ask" })).toEqual({ action: "allow" });
    });

    test("evaluating an allowed wrapper around an undecided command asks", async () => {
        const node = makeWrapper(new AstNode("command", "mytool"));
        const evaluation = await node.evaluate([new AllowSourceRule("mise exec -- command")], baseContext, new NullAuditLogger());
        expect(evaluation.decision).toEqual({ action: "ask" });
    });
});
