import { IAstNode } from "../ast";
import { IDecision } from "../rules/rule";
import { AstNode, pickStrictest } from "./ast-node";

// AST node for a single bash command.
export interface ICommandNode extends IAstNode {

    // Discriminator for the command node.
    type: "command";

    // Shell command name (argv[0]).
    commandName: string;

    // Named flags and flag values.
    options: Record<string, string | boolean>;

    // Positional arguments.
    positionals: string[];

    // Environment variable assignments before the command.
    envPrefix: Record<string, string>;
}

// AST node for a single bash command.
export class CommandAstNode extends AstNode implements ICommandNode {

    // Discriminator for the command node.
    type: "command" = "command";

    // Shell command name (argv[0]).
    commandName: string;

    // Named flags and flag values.
    options: Record<string, string | boolean>;

    // Positional arguments.
    positionals: string[];

    // Environment variable assignments before the command.
    envPrefix: Record<string, string>;

    constructor(commandName: string, options: Record<string, string | boolean>, positionals: string[], envPrefix: Record<string, string>, source: string) {
        super("command", source);
        this.commandName = commandName;
        this.options = options;
        this.positionals = positionals;
        this.envPrefix = envPrefix;
    }

    // Allowing a wrapper says nothing about the command it runs, so the stricter of the two decisions wins.
    combineDecisions(ownDecisions: IDecision[], childDecision: IDecision | undefined): IDecision | undefined {

        if (this.children?.inner === undefined) {
            return super.combineDecisions(ownDecisions, childDecision);
        }

        const decisions = [...ownDecisions];

        if (childDecision) {
            decisions.push(childDecision);
        }

        return pickStrictest(decisions);
    }
}
