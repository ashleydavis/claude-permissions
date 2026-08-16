import { RedirectInOrderedRule, RedirectOutOrderedRule } from "../../rules/redirect-rule";
import { CommandAstNode } from "../../ast-nodes/command-ast-node";
import { RedirectAstNode } from "../../ast-nodes/redirect-ast-node";
import { TargetAstNode } from "../../ast-nodes/target-ast-node";

describe("RedirectOutOrderedRule", () => {

    const context = { cwd: "/home/user/project", env: {} };

    const echoCommand = new CommandAstNode("echo", {}, ["hi"], {}, "echo hi");

    const redirectNode = new RedirectAstNode(">", { left: echoCommand, right: new TargetAstNode("/tmp/out.txt", "/tmp/out.txt") }, "echo hi > /tmp/out.txt");

    test("returns allow when redirect target matches path-in (bash-redirect-out-tmp-allow)", async () => {
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/tmp/**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(redirectNode, context);
        expect(result.decision).toEqual({ action: "allow" });
    });

    test("returns allow when relative redirect target resolves under project dir (bash-redirect-out-project-allow)", async () => {
        const projectRedirectNode = new RedirectAstNode(">", { left: echoCommand, right: new TargetAstNode("./logs/out.txt", "./logs/out.txt") }, "echo hi > ./logs/out.txt");
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["./**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(projectRedirectNode, context);
        expect(result.decision).toEqual({ action: "allow" });
    });

    test("returns deny when redirect target matches path before later allow (bash-redirect-out-deny-wins)", async () => {
        const denyRedirectNode = new RedirectAstNode(">", { left: echoCommand, right: new TargetAstNode("/etc/shadow", "/etc/shadow") }, "echo hi > /etc/shadow");
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/etc/**"],
                decision: "deny",
            },
            {
                pathIn: ["/tmp/**", "./**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(denyRedirectNode, context);
        expect(result.decision).toEqual({ action: "deny" });
    });

    test("returns ask when redirect target does not match path-in and catch-all fires (bash-redirect-out-outside-ask)", async () => {
        const outsideRedirectNode = new RedirectAstNode(">", { left: echoCommand, right: new TargetAstNode("/etc/passwd", "/etc/passwd") }, "echo hi > /etc/passwd");
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/tmp/**", "./**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
                reason: "Shell write outside allowed dirs",
            },
        ], undefined);
        const result = await rule.evaluate(outsideRedirectNode, context);
        expect(result.decision).toEqual({
            action: "ask",
            reason: "Shell write outside allowed dirs",
        });
    });

    test("abstains when redirect op is fd merge (bash-redirect-fd-merge-ignored)", async () => {
        const fdMergeRedirectNode = new RedirectAstNode("2>&", { left: echoCommand, right: new TargetAstNode("1", "1") }, "echo hi 2>&1");
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/tmp/**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(fdMergeRedirectNode, context);
        expect(result.decision).toBeUndefined();
    });

    test("returns allow for file redirect target when fd merge is separate node (bash-redirect-fd-merge-ignored)", async () => {
        const cmdCommand = new CommandAstNode("cmd", {}, [], {}, "cmd");
        const fileRedirectNode = new RedirectAstNode(">", { left: cmdCommand, right: new TargetAstNode("/tmp/out", "/tmp/out") }, "cmd > /tmp/out");
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/tmp/**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(fileRedirectNode, context);
        expect(result.decision).toEqual({ action: "allow" });
    });

    test("abstains when node is not a redirect", async () => {
        const rule = new RedirectOutOrderedRule([
            {
                pathIn: ["/tmp/**"],
                decision: "allow",
            },
        ], undefined);
        const result = await rule.evaluate(echoCommand, context);
        expect(result.decision).toBeUndefined();
    });
});

describe("RedirectInOrderedRule", () => {

    const context = { cwd: "/home/user/project", env: {} };

    const catCommand = new CommandAstNode("cat", {}, [], {}, "cat");

    test("returns allow when redirect target matches path-in under project dir (bash-redirect-in-project-allow)", async () => {
        const redirectNode = new RedirectAstNode("<", { left: catCommand, right: new TargetAstNode("./file.txt", "./file.txt") }, "cat < ./file.txt");
        const rule = new RedirectInOrderedRule([
            {
                pathIn: ["./**"],
                decision: "allow",
            },
            {
                pathIn: [],
                decision: "ask",
            },
        ], undefined);
        const result = await rule.evaluate(redirectNode, context);
        expect(result.decision).toEqual({ action: "allow" });
    });

    test("abstains when redirect op is not an input redirect", async () => {
        const redirectNode = new RedirectAstNode(">", { left: catCommand, right: new TargetAstNode("./file.txt", "./file.txt") }, "cat > ./file.txt");
        const rule = new RedirectInOrderedRule([
            {
                pathIn: ["./**"],
                decision: "allow",
            },
        ], undefined);
        const result = await rule.evaluate(redirectNode, context);
        expect(result.decision).toBeUndefined();
    });
});
