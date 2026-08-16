import { ICommandDescriptor } from "./types";
import { resolveFlagArity } from "./load-commands";
import { IAstNode } from "./ast";
import { ICaseClause } from "./ast-nodes/case-statement-ast-node";
import { CommandAstNode } from "./ast-nodes/command-ast-node";
import { BashAstNode } from "./ast-nodes/bash-ast-node";
import { BinopAstNode } from "./ast-nodes/binop-ast-node";
import { RedirectAstNode } from "./ast-nodes/redirect-ast-node";
import { HeredocAstNode } from "./ast-nodes/heredoc-ast-node";
import { TargetAstNode } from "./ast-nodes/target-ast-node";
import { BraceGroupAstNode } from "./ast-nodes/brace-group-ast-node";
import { SubshellAstNode } from "./ast-nodes/subshell-ast-node";
import { ForLoopAstNode } from "./ast-nodes/for-loop-ast-node";
import { WhileLoopAstNode } from "./ast-nodes/while-loop-ast-node";
import { IfStatementAstNode } from "./ast-nodes/if-statement-ast-node";
import { CaseStatementAstNode } from "./ast-nodes/case-statement-ast-node";
import { FilePathToolAstNode } from "./ast-nodes/file-path-tool-ast-node";
import { GrepAstNode } from "./ast-nodes/grep-ast-node";
import { SubstitutionAstNode } from "./ast-nodes/substitution-ast-node";
import { WebFetchAstNode } from "./ast-nodes/webfetch-ast-node";
import { AgentAstNode } from "./ast-nodes/agent-ast-node";
import { ToolAstNode } from "./ast-nodes/tool-ast-node";
import { ITokenizer, Tokenizer, BashTokenKind } from "./tokenizer";
import { IToolCall } from "./tool-call";

// Parses a flag body that may include an equals-separated value.
export function parseEqualsFlag(flagBody: string, followingTokens: string[]): IParseArgumentResult {

    const equalsIndex = flagBody.indexOf("=");
    if (equalsIndex !== -1) {
        return {
            argument: {
                options: { [flagBody.slice(0, equalsIndex)]: flagBody.slice(equalsIndex + 1) },
                positionals: [],
            },
            remainingTokens: followingTokens,
        };
    }

    return {
        argument: {
            options: { [flagBody]: true },
            positionals: [],
        },
        remainingTokens: followingTokens,
    };
}

// Parses a long flag body, respecting descriptor arity for space-separated values.
export function parseLongFlag(flagBody: string, followingTokens: string[], commandDef: ICommandDescriptor | undefined): IParseArgumentResult {

    const equalsIndex = flagBody.indexOf("=");
    if (equalsIndex !== -1) {
        return parseEqualsFlag(flagBody, followingTokens);
    }

    const flagArity = commandDef !== undefined ? resolveFlagArity(commandDef, flagBody) : 0;
    if (flagArity === 1) {
        const nextToken = followingTokens[0];
        if (nextToken !== undefined) {
            return {
                argument: {
                    options: { [flagBody]: nextToken },
                    positionals: [],
                },
                remainingTokens: followingTokens.slice(1),
            };
        }
    }

    return {
        argument: {
            options: { [flagBody]: true },
            positionals: [],
        },
        remainingTokens: followingTokens,
    };
}

// Parses a single-character short flag, respecting descriptor arity.
export function parseSingleShortFlag(flagChar: string, followingTokens: string[], commandDef: ICommandDescriptor | undefined): IParseArgumentResult {

    const flagArity = commandDef !== undefined ? resolveFlagArity(commandDef, flagChar) : 0;
    if (flagArity === 1) {
        const nextToken = followingTokens[0];
        if (nextToken !== undefined) {
            return {
                argument: {
                    options: { [flagChar]: nextToken },
                    positionals: [],
                },
                remainingTokens: followingTokens.slice(1),
            };
        }
    }

    return {
        argument: {
            options: { [flagChar]: true },
            positionals: [],
        },
        remainingTokens: followingTokens,
    };
}

// Parses the body of a short flag token (everything after the leading dash).
export function parseShortFlag(rest: string, followingTokens: string[], commandDef: ICommandDescriptor | undefined): IParseArgumentResult {

    const equalsIndex = rest.indexOf("=");
    if (equalsIndex !== -1) {
        return parseEqualsFlag(rest, followingTokens);
    }

    if (rest.length === 1) {
        return parseSingleShortFlag(rest, followingTokens, commandDef);
    }

    const combinedOptions: Record<string, string | boolean> = {};
    for (const flagChar of rest) {
        combinedOptions[flagChar] = true;
    }

    return {
        argument: {
            options: combinedOptions,
            positionals: [],
        },
        remainingTokens: followingTokens,
    };
}

// Tokenizes a bash command string into word tokens, skipping comments at word boundaries.
export function tokenizeCommand(input: string): string[] {

    const words: string[] = [];
    let pos = 0;
    let atWordBoundary = true;

    while (pos < input.length) {
        if (/\s/.test(input[pos])) {
            atWordBoundary = true;
            pos++;
            continue;
        }

        if (input[pos] === "#" && atWordBoundary) {
            return words;
        }

        atWordBoundary = false;

        const wordStart = pos;
        let wordValue = "";

        while (pos < input.length) {
            if (/\s/.test(input[pos])) {
                break;
            }

            if (input[pos] === "'") {
                pos++;
                while (pos < input.length && input[pos] !== "'") {
                    wordValue += input[pos++];
                }
                if (pos < input.length) {
                    pos++;
                }
                continue;
            }

            if (input[pos] === '"') {
                pos++;
                while (pos < input.length && input[pos] !== '"') {
                    if (input[pos] === "\\" && pos + 1 < input.length) {
                        pos++;
                        wordValue += input[pos++];
                    }
                    else {
                        wordValue += input[pos++];
                    }
                }
                if (pos < input.length) {
                    pos++;
                }
                continue;
            }

            if (input[pos] === "\\" && pos + 1 < input.length) {
                pos++;
                wordValue += input[pos++];
                continue;
            }

            wordValue += input[pos++];
        }

        if (wordValue.length > 0) {
            words.push(wordValue);
        }
        else if (pos === wordStart) {
            pos++;
        }
    }

    return words;
}

// Parsed options and positionals produced from a single argument token.
interface IArgumentDetails {

    // Flag options set by this argument.
    options: Record<string, string | boolean>;

    // Positional values set by this argument.
    positionals: string[];
}

// Result of parsing one argument from a token list.
interface IParseArgumentResult {

    // The options and positionals produced by the parsed argument.
    argument: IArgumentDetails;

    // Tokens not yet consumed after parsing this argument.
    remainingTokens: string[];
}

// Parses one argument from the front of a token list.
export function parseArgument(tokens: string[], commandDef: ICommandDescriptor | undefined): IParseArgumentResult {

    const token = tokens[0];
    const remainingTokens = tokens.slice(1);
    if (token.startsWith("--")) {
        return parseLongFlag(token.slice(2), remainingTokens, commandDef);
    }

    if (token.startsWith("-")) {
        return parseShortFlag(token.slice(1), remainingTokens, commandDef);
    }

    return {
        argument: {
            options: {},
            positionals: [token],
        },
        remainingTokens,
    };
}

// Key and value parsed from a NAME=value token.
interface IEnvAssignment {

    // Environment variable name.
    key: string;

    // Environment variable value.
    value: string;
}

// Result of consuming one leading env-var assignment token.
interface IParseEnvPrefixTokenResult {

    // Parsed env assignment from the first token, when present.
    envAssignment: IEnvAssignment | undefined;

    // Tokens not yet consumed.
    remainingTokens: string[];
}

// Consumes one leading NAME=value token when present.
export function parseEnvPrefixToken(tokens: string[]): IParseEnvPrefixTokenResult {

    const token = tokens[0];
    if (token === undefined || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
        return {
            envAssignment: undefined,
            remainingTokens: tokens,
        };
    }

    const equalsIndex = token.indexOf("=");
    return {
        envAssignment: {
            key: token.slice(0, equalsIndex),
            value: token.slice(equalsIndex + 1),
        },
        remainingTokens: tokens.slice(1),
    };
}

// Result of parsing leading env-var assignments from a token list.
interface IParseEnvPrefixResult {

    // Environment variable assignments before the command.
    envPrefix: Record<string, string>;

    // Tokens not yet consumed after the env prefix.
    remainingTokens: string[];
}

// Parses leading NAME=value tokens from a token list.
export function parseEnvPrefix(tokens: string[]): IParseEnvPrefixResult {

    const envPrefix: Record<string, string> = {};
    let remainingTokens = tokens;
    while (true) {
        const parseResult = parseEnvPrefixToken(remainingTokens);
        if (parseResult.envAssignment === undefined) {
            return {
                envPrefix,
                remainingTokens,
            };
        }
        envPrefix[parseResult.envAssignment.key] = parseResult.envAssignment.value;
        remainingTokens = parseResult.remainingTokens;
    }
}

// Options and positionals parsed from a token list.
interface IParsedArguments {

    // Named flags and flag values.
    options: Record<string, string | boolean>;

    // Positional arguments.
    positionals: string[];
}

// Walks past leading flags (using their arity) and returns the first positional token, the sub-command name candidate
// (e.g. "commit" in git -C /tmp commit -m msg).
export function findSubCommandName(tokens: string[], commandDef: ICommandDescriptor | undefined): string | undefined {

    let scanTokens = tokens;
    while (scanTokens.length > 0) {
        const scanResult = parseArgument(scanTokens, commandDef);
        if (scanResult.argument.positionals.length > 0) {
            return scanResult.argument.positionals[0];
        }
        scanTokens = scanResult.remainingTokens;
    }

    return undefined;
}

// Parses flags and positionals from a token list.
export function parseArguments(tokens: string[], commandDef: ICommandDescriptor | undefined): IParsedArguments {

    let effectiveCommandDef = commandDef;

    // Sub-command flags live under cmds.<name>; merge them once the sub-command positional is found
    // so arity-1 flags (e.g. git -C path commit -m message) consume the next token correctly.
    if (commandDef?.cmds) {
        const subCommandName = findSubCommandName(tokens, commandDef);

        // When the candidate matches a known sub-command, merge its flags with the top-level descriptor
        // so later parsing resolves sub-command flags (e.g. commit -m) with the correct arity.
        if (subCommandName) {
            const subCommandDef = commandDef.cmds[subCommandName];
            if (subCommandDef) {
                effectiveCommandDef = {
                    ...commandDef,
                    flags: { ...commandDef.flags, ...subCommandDef.flags },
                };
            }
        }
    }

    const options: Record<string, string | boolean> = {};
    const positionals: string[] = [];
    let remainingTokens = tokens;
    while (remainingTokens.length > 0) {
        const parseResult = parseArgument(remainingTokens, effectiveCommandDef);
        Object.assign(options, parseResult.argument.options);
        positionals.push(...parseResult.argument.positionals);
        remainingTokens = parseResult.remainingTokens;
    }

    return {
        options,
        positionals,
    };
}

// Consumes a run of consecutive semicolon separator tokens.
export function skipSemicolonSeparators(tokenizer: ITokenizer): void {

    while (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
        tokenizer.next();
    }
}

// Returns true when kind is one of the given terminator token kinds.
function isTerminatorKind(kind: BashTokenKind, terminators: BashTokenKind[]): boolean {

    for (const terminator of terminators) {
        if (kind === terminator) {
            return true;
        }
    }
    return false;
}

// Parses a semicolon-separated sequence until one of the given terminator token kinds.
export function parseSequenceUntil(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>, terminators: BashTokenKind[]): IAstNode {

    skipSemicolonSeparators(tokenizer);
    if (tokenizer.peek() === undefined) {
        return parseBashCommand("", commandRegistry);
    }

    const firstToken = tokenizer.peek();
    if (firstToken !== undefined && terminators.length > 0 && isTerminatorKind(firstToken.kind, terminators)) {
        return parseBashCommand("", commandRegistry);
    }

    let left: IAstNode = parseAndExpr(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
        tokenizer.next();
        skipSemicolonSeparators(tokenizer);
        const nextToken = tokenizer.peek();
        if (nextToken === undefined || (terminators.length > 0 && isTerminatorKind(nextToken.kind, terminators))) {
            break;
        }
        const right = parseAndExpr(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.Semicolon, left, right);
    }
    return left;
}

// Parses `for VAR [in ITEMS] ; do BODY ; done` into a for-loop node.
export function parseForLoop(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const forToken = tokenizer.peek();
    const loopStart = forToken?.start ?? source.length;
    tokenizer.next();

    let variable = "";
    const variableToken = tokenizer.peek();
    if (variableToken !== undefined && isWordTokenKind(variableToken.kind)) {
        variable = readShellWord(tokenizer, commandRegistry).value;
    }

    if (tokenizer.peek()?.kind === BashTokenKind.In) {
        tokenizer.next();
    }

    const items: string[] = [];
    while (true) {
        const token = tokenizer.peek();
        if (token === undefined) {
            break;
        }
        if (token.kind === BashTokenKind.Do) {
            break;
        }
        if (isWordTokenKind(token.kind)) {
            items.push(readShellWord(tokenizer, commandRegistry).value);
        }
        else if (token.kind === BashTokenKind.Semicolon) {
            tokenizer.next();
            skipSemicolonSeparators(tokenizer);
        }
        else {
            break;
        }
    }

    skipSemicolonSeparators(tokenizer);

    if (tokenizer.peek()?.kind === BashTokenKind.Do) {
        tokenizer.next();
    }

    const body = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Done]);

    let loopEnd = source.length;
    const doneToken = tokenizer.peek();
    if (doneToken !== undefined && doneToken.kind === BashTokenKind.Done) {
        loopEnd = doneToken.end;
        tokenizer.next();
    }

    return new ForLoopAstNode("for_loop", { body }, variable, items, source.slice(loopStart, loopEnd));
}

// Parses `while COND ; do BODY ; done` or `until COND ; do BODY ; done` into a while-loop node.
export function parseWhileLoop(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const keywordToken = tokenizer.peek();
    const loopStart = keywordToken?.start ?? source.length;
    const isUntilLoop = keywordToken !== undefined && keywordToken.kind === BashTokenKind.Until;
    tokenizer.next();

    const condition = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Do]);

    skipSemicolonSeparators(tokenizer);

    if (tokenizer.peek()?.kind === BashTokenKind.Do) {
        tokenizer.next();
    }

    const body = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Done]);

    let loopEnd = source.length;
    const doneToken = tokenizer.peek();
    if (doneToken !== undefined && doneToken.kind === BashTokenKind.Done) {
        loopEnd = doneToken.end;
        tokenizer.next();
    }

    return new WhileLoopAstNode(isUntilLoop, { condition, body }, source.slice(loopStart, loopEnd));
}

// Parses `if COND ; then BODY [else BODY] ; fi` into an if-statement node.
export function parseIfStatement(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const ifToken = tokenizer.peek();
    const statementStart = ifToken?.start ?? source.length;
    tokenizer.next();

    const condition = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Then]);

    skipSemicolonSeparators(tokenizer);

    if (tokenizer.peek()?.kind === BashTokenKind.Then) {
        tokenizer.next();
    }

    const thenBranch = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Else, BashTokenKind.Fi]);

    let elseBranch: IAstNode | undefined = undefined;
    const nextToken = tokenizer.peek();
    if (nextToken !== undefined && nextToken.kind === BashTokenKind.Else) {
        tokenizer.next();
        elseBranch = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.Fi]);
    }

    let statementEnd = source.length;
    const fiToken = tokenizer.peek();
    if (fiToken !== undefined && fiToken.kind === BashTokenKind.Fi) {
        statementEnd = fiToken.end;
        tokenizer.next();
    }

    const ifStatementNode = new IfStatementAstNode({ condition, thenBranch }, source.slice(statementStart, statementEnd));
    if (elseBranch !== undefined) {
        ifStatementNode.children.elseBranch = elseBranch;
    }
    return ifStatementNode;
}

// Returns true when the tokenizer is at a case-clause terminator (`;;` or `esac`).
export function isCaseClauseTerminator(tokenizer: ITokenizer): boolean {

    const token = tokenizer.peek();
    if (token === undefined) {
        return true;
    }
    if (token.kind === BashTokenKind.Esac) {
        return true;
    }
    if (token.kind === BashTokenKind.Semicolon) {
        const nextToken = tokenizer.peekNext();
        if (nextToken !== undefined && nextToken.kind === BashTokenKind.Semicolon) {
            return true;
        }
    }
    return false;
}

// Parses a semicolon-separated sequence until `;;` or `esac`.
export function parseSequenceUntilCaseClauseEnd(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    skipSemicolonSeparators(tokenizer);
    if (tokenizer.peek() === undefined) {
        return parseBashCommand("", commandRegistry);
    }
    if (isCaseClauseTerminator(tokenizer)) {
        return parseBashCommand("", commandRegistry);
    }

    let left: IAstNode = parseAndExpr(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
        const nextToken = tokenizer.peekNext();
        if (nextToken !== undefined && nextToken.kind === BashTokenKind.Semicolon) {
            break;
        }
        if (nextToken !== undefined && nextToken.kind === BashTokenKind.Esac) {
            break;
        }
        tokenizer.next();
        skipSemicolonSeparators(tokenizer);
        if (isCaseClauseTerminator(tokenizer)) {
            break;
        }
        const right = parseAndExpr(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.Semicolon, left, right);
    }
    return left;
}

// Parses `case WORD in PATTERN) BODY ;; ... esac` into a case-statement node.
export function parseCaseStatement(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const caseToken = tokenizer.peek();
    const statementStart = caseToken?.start ?? source.length;
    tokenizer.next();

    let word = "";
    const wordToken = tokenizer.peek();
    if (wordToken !== undefined && isWordTokenKind(wordToken.kind)) {
        word = readShellWord(tokenizer, commandRegistry).value;
    }

    if (tokenizer.peek()?.kind === BashTokenKind.In) {
        tokenizer.next();
    }

    skipSemicolonSeparators(tokenizer);

    const clauses: ICaseClause[] = [];
    const bodies: IAstNode[] = [];
    while (true) {
        const clauseStartToken = tokenizer.peek();
        if (clauseStartToken === undefined) {
            break;
        }
        if (clauseStartToken.kind === BashTokenKind.Esac) {
            break;
        }

        const clauseStart = clauseStartToken.start;

        if (tokenizer.peek()?.kind === BashTokenKind.OpenParen) {
            tokenizer.next();
        }

        const patterns: string[] = [];
        const firstPatternToken = tokenizer.peek();
        if (firstPatternToken !== undefined && isWordTokenKind(firstPatternToken.kind)) {
            patterns.push(readShellWord(tokenizer, commandRegistry).value);
        }

        while (tokenizer.peek()?.kind === BashTokenKind.Pipe) {
            tokenizer.next();
            const patternToken = tokenizer.peek();
            if (patternToken !== undefined && isWordTokenKind(patternToken.kind)) {
                patterns.push(readShellWord(tokenizer, commandRegistry).value);
            }
        }

        if (tokenizer.peek()?.kind === BashTokenKind.CloseParen) {
            tokenizer.next();
        }

        const body = parseSequenceUntilCaseClauseEnd(tokenizer, source, commandRegistry);

        clauses.push({ patterns });
        bodies.push(body);

        if (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
            tokenizer.next();
            if (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
                tokenizer.next();
            }
        }
        skipSemicolonSeparators(tokenizer);

        const afterClauseToken = tokenizer.peek();
        if (afterClauseToken !== undefined && afterClauseToken.start === clauseStart) {
            break;
        }
    }

    let statementEnd = source.length;
    const esacToken = tokenizer.peek();
    if (esacToken !== undefined && esacToken.kind === BashTokenKind.Esac) {
        statementEnd = esacToken.end;
        tokenizer.next();
    }

    return new CaseStatementAstNode(word, clauses, { _: bodies }, source.slice(statementStart, statementEnd));
}

// Parses `( LIST )` into a subshell node.
export function parseSubshellGroup(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const openToken = tokenizer.peek();
    const groupStart = openToken?.start ?? source.length;
    tokenizer.next();

    const body = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.CloseParen]);

    let groupEnd = source.length;
    const closeToken = tokenizer.peek();
    if (closeToken !== undefined && closeToken.kind === BashTokenKind.CloseParen) {
        groupEnd = closeToken.end;
        tokenizer.next();
    }

    return new SubshellAstNode({ body }, source.slice(groupStart, groupEnd));
}

// Parses `{ LIST; }` into a brace group node.
export function parseBraceGroup(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const openToken = tokenizer.peek();
    const groupStart = openToken?.start ?? source.length;
    tokenizer.next();

    const body = parseSequenceUntil(tokenizer, source, commandRegistry, [BashTokenKind.CloseBrace]);

    let groupEnd = source.length;
    const closeToken = tokenizer.peek();
    if (closeToken !== undefined && closeToken.kind === BashTokenKind.CloseBrace) {
        groupEnd = closeToken.end;
        tokenizer.next();
    }

    return new BraceGroupAstNode({ body }, source.slice(groupStart, groupEnd));
}

// The tokens belonging to the wrapper itself, and the tokens of the command it runs.
interface IWrapperArgumentSplit {

    // Tokens parsed as the wrapper's own flags and positionals.
    ownTokens: string[];

    // Tokens parsed as the command the wrapper runs.
    innerTokens: string[];
}

// Counts the positional slots a command takes for itself: everything up to its variadic slot, which holds the command it runs.
export function countOwnPositionals(commandDef: ICommandDescriptor | undefined): number {

    if (commandDef === undefined) {
        return 0;
    }

    let count = 0;
    for (const positional of commandDef.positionals) {
        if (positional.variadic) {
            break;
        }
        count++;
    }

    return count;
}

// Return true when these tokens invoke a command whose descriptor says it runs another command.
export function isWrapperInvocation(tokens: string[], commandRegistry: Map<string, ICommandDescriptor>): boolean {

    const commandDef = commandRegistry.get(tokens[0]);
    if (commandDef === undefined) {
        return false;
    }

    if (commandDef.wrapper) {
        return true;
    }

    // Only some subcommands run another command (`mise exec` does, `mise install` does not).
    const subCommandName = findSubCommandName(tokens.slice(1), commandDef);
    if (subCommandName === undefined) {
        return false;
    }

    const subCommandDef = commandDef.cmds?.[subCommandName];
    if (subCommandDef?.wrapper) {
        return true;
    }

    return false;
}

// Splits a wrapper's arguments at the first positional that belongs to the command it runs.
export function splitWrapperArguments(argumentTokens: string[], wrapperDef: ICommandDescriptor | undefined): IWrapperArgumentSplit {

    // Everything before an end-of-options marker belongs to the wrapper, however many positionals that is.
    const markerIndex = argumentTokens.indexOf("--");
    if (markerIndex !== -1) {
        return {
            ownTokens: argumentTokens.slice(0, markerIndex),
            innerTokens: argumentTokens.slice(markerIndex + 1),
        };
    }

    const ownTokens: string[] = [];
    let effectiveDef = wrapperDef;
    let ownPositionals = countOwnPositionals(wrapperDef);
    let positionalCount = 0;
    let tokens = argumentTokens;

    while (tokens.length > 0) {
        const token = tokens[0];

        if (!token.startsWith("-")) {

            // The subcommand that makes this a wrapper belongs to the wrapper, and its slots take over from here.
            const subCommandDef = effectiveDef?.cmds?.[token];
            if (subCommandDef?.wrapper) {
                effectiveDef = subCommandDef;
                ownPositionals = countOwnPositionals(subCommandDef);
                positionalCount = 0;
                ownTokens.push(token);
                tokens = tokens.slice(1);
                continue;
            }

            if (positionalCount >= ownPositionals) {
                break;
            }
            positionalCount++;
            ownTokens.push(token);
            tokens = tokens.slice(1);
            continue;
        }

        // A flag may take a value, so let argument parsing decide how many tokens it consumes.
        const parsedArgument = parseArgument(tokens, effectiveDef);
        ownTokens.push(...tokens.slice(0, tokens.length - parsedArgument.remainingTokens.length));
        tokens = parsedArgument.remainingTokens;
    }

    return { ownTokens: ownTokens, innerTokens: tokens };
}

// Parses a wrapper command from tokens remaining after env-prefix parsing, with the command it runs as its inner child.
export function parseWrapperNode(
    remainingTokens: string[],
    source: string,
    statementStart: number,
    statementEnd: number,
    atStatementEnd: boolean,
    commandRegistry: Map<string, ICommandDescriptor>,
): IAstNode {

    const commandName = remainingTokens[0];
    const wrapperDef = commandRegistry.get(commandName);
    const argumentSplit = splitWrapperArguments(remainingTokens.slice(1), wrapperDef);
    const wrapperArguments = parseArguments(argumentSplit.ownTokens, wrapperDef);

    let inner: CommandAstNode;
    if (argumentSplit.innerTokens.length === 0) {
        inner = new CommandAstNode("", {}, [], {}, "");
    }
    else {
        const innerEnvPrefix = parseEnvPrefix(argumentSplit.innerTokens);
        const innerName = innerEnvPrefix.remainingTokens[0] ?? "";
        const innerDef = commandRegistry.get(innerName);
        const innerArguments = parseArguments(innerEnvPrefix.remainingTokens.slice(1), innerDef);
        inner = new CommandAstNode(innerName, innerArguments.options, innerArguments.positionals, innerEnvPrefix.envPrefix, argumentSplit.innerTokens.join(" "));
    }

    let wrapperSource = source.slice(statementStart, statementEnd);
    if (atStatementEnd) {
        wrapperSource = source.slice(statementStart);
    }

    const wrapperNode = new CommandAstNode(commandName, wrapperArguments.options, wrapperArguments.positionals, {}, wrapperSource);
    wrapperNode.children = { inner };
    return wrapperNode;
}

// Return true when a token kind can begin or continue a shell word: a plain word or a quote/substitution delimiter.
export function isWordTokenKind(kind: BashTokenKind | undefined): boolean {

    return kind === BashTokenKind.Word
        || kind === BashTokenKind.SingleQuote
        || kind === BashTokenKind.DoubleQuote
        || kind === BashTokenKind.Backtick
        || kind === BashTokenKind.SubstitutionOpen;
}

// A single shell word reassembled from its adjacent plain, quoted, and substitution tokens.
interface IShellWord {

    // Concatenated literal text of the word's plain runs and quoted segments.
    value: string;

    // Command substitution embedded in the word, when one is present.
    substitution: IAstNode | undefined;

    // End offset of the last token consumed for this word.
    endPos: number;
}

// Consumes a command substitution (`$(...)` or backticks) from the token stream and parses its inner command.
export function parseSubstitution(tokenizer: ITokenizer, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const openToken = tokenizer.peek();
    const openValue = openToken?.value ?? "";
    const openEnd = openToken?.end;
    const openKind = openToken?.kind;
    tokenizer.next();

    let innerSource = "";
    let fullSource = openValue;
    const contentToken = tokenizer.peek();
    if (contentToken !== undefined && contentToken.kind === BashTokenKind.Word && contentToken.start === openEnd) {
        innerSource = contentToken.value;
        fullSource += contentToken.value;
        tokenizer.next();
    }

    const expectedClose = openKind === BashTokenKind.Backtick ? BashTokenKind.Backtick : BashTokenKind.CloseParen;
    const closeToken = tokenizer.peek();
    if (closeToken !== undefined && closeToken.kind === expectedClose) {
        fullSource += closeToken.value;
        tokenizer.next();
    }

    return new SubstitutionAstNode({ command: parseBashExpression(innerSource, commandRegistry) }, fullSource);
}

// Consumes one shell word from the token stream, joining adjacent plain, quoted, and substitution tokens.
export function readShellWord(tokenizer: ITokenizer, commandRegistry: Map<string, ICommandDescriptor>): IShellWord {

    let value = "";
    let substitution: IAstNode | undefined = undefined;
    let prevEnd: number | undefined = undefined;

    while (true) {
        const token = tokenizer.peek();
        if (token === undefined || !isWordTokenKind(token.kind)) {
            break;
        }

        // A whitespace gap between tokens ends the current shell word.
        if (prevEnd !== undefined && token.start !== prevEnd) {
            break;
        }

        if (token.kind === BashTokenKind.Word) {
            value += token.value;
            prevEnd = token.end;
            tokenizer.next();
            continue;
        }

        if (token.kind === BashTokenKind.SingleQuote || token.kind === BashTokenKind.DoubleQuote) {
            const openKind = token.kind;
            let segmentEnd = token.end;
            tokenizer.next();
            const contentToken = tokenizer.peek();
            if (contentToken !== undefined && contentToken.kind === BashTokenKind.Word && contentToken.start === segmentEnd) {
                value += contentToken.value;
                segmentEnd = contentToken.end;
                tokenizer.next();
            }
            const closeToken = tokenizer.peek();
            if (closeToken !== undefined && closeToken.kind === openKind && closeToken.start === segmentEnd) {
                segmentEnd = closeToken.end;
                tokenizer.next();
            }
            prevEnd = segmentEnd;
            continue;
        }

        const substitutionStart = token.start;
        substitution = parseSubstitution(tokenizer, commandRegistry);
        prevEnd = substitutionStart + substitution.source.length;
    }

    return { value, substitution, endPos: prevEnd ?? 0 };
}

// Consumes the body token of a `<<` heredoc, when the lexer found one, and builds its node.
export function parseHeredoc(tokenizer: ITokenizer, source: string, operatorStart: number, terminatorEnd: number, terminator: string, quoted: boolean): IAstNode {

    let body = "";
    let heredocEnd = terminatorEnd;

    const bodyToken = tokenizer.peek();
    if (bodyToken !== undefined && bodyToken.kind === BashTokenKind.HeredocBody) {
        body = bodyToken.value;
        heredocEnd = bodyToken.end;
        tokenizer.next();
    }

    return new HeredocAstNode(terminator, quoted, body, source.slice(operatorStart, heredocEnd));
}

// Parses one command statement from the front of a token stream.
export function parseStatement(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const firstToken = tokenizer.peek();
    if (firstToken !== undefined && firstToken.kind === BashTokenKind.For) {
        return parseForLoop(tokenizer, source, commandRegistry);
    }
    if (firstToken !== undefined && (firstToken.kind === BashTokenKind.While || firstToken.kind === BashTokenKind.Until)) {
        return parseWhileLoop(tokenizer, source, commandRegistry);
    }
    if (firstToken !== undefined && firstToken.kind === BashTokenKind.If) {
        return parseIfStatement(tokenizer, source, commandRegistry);
    }
    if (firstToken !== undefined && firstToken.kind === BashTokenKind.Case) {
        return parseCaseStatement(tokenizer, source, commandRegistry);
    }
    if (firstToken !== undefined && firstToken.kind === BashTokenKind.OpenParen) {
        return parseSubshellGroup(tokenizer, source, commandRegistry);
    }
    if (firstToken !== undefined && firstToken.kind === BashTokenKind.OpenBrace) {
        return parseBraceGroup(tokenizer, source, commandRegistry);
    }

    const statementStart = firstToken?.start ?? source.length;
    const wordValues: string[] = [];
    let statementEnd = statementStart;
    let substitution: IAstNode | undefined = undefined;

    while (isWordTokenKind(tokenizer.peek()?.kind)) {
        const wordResult = readShellWord(tokenizer, commandRegistry);
        statementEnd = wordResult.endPos;
        if (wordResult.substitution !== undefined) {
            substitution = wordResult.substitution;
        }
        if (wordResult.value.length > 0) {
            wordValues.push(wordResult.value);
        }
    }

    const envPrefixResult = parseEnvPrefix(wordValues);
    const commandName = envPrefixResult.remainingTokens[0] ?? "";

    let baseNode: IAstNode;
    if (isWrapperInvocation(envPrefixResult.remainingTokens, commandRegistry)) {
        baseNode = parseWrapperNode(
            envPrefixResult.remainingTokens,
            source,
            statementStart,
            statementEnd,
            tokenizer.peek() === undefined,
            commandRegistry,
        );
    }
    else {
        const commandDef = commandRegistry.get(commandName);
        const parsedArguments = parseArguments(envPrefixResult.remainingTokens.slice(1), commandDef);

        let commandSource = source.slice(statementStart, statementEnd);
        if (tokenizer.peek() === undefined) {
            commandSource = source.slice(statementStart);
        }

        baseNode = new CommandAstNode(commandName, parsedArguments.options, parsedArguments.positionals, envPrefixResult.envPrefix, commandSource);
    }

    if (substitution !== undefined) {
        baseNode.children = { ...baseNode.children, substitution };
    }

    let node: IAstNode = baseNode;
    let heredocSeen = false;
    while (tokenizer.peek()?.kind === BashTokenKind.Redirect) {
        const redirectToken = tokenizer.peek();
        if (redirectToken === undefined) {
            break;
        }
        tokenizer.next();
        statementEnd = redirectToken.end;
        let target = "";
        let targetStart = redirectToken.end;
        let quotedTarget = false;
        const targetToken = tokenizer.peek();
        if (targetToken !== undefined && isWordTokenKind(targetToken.kind)) {
            quotedTarget = targetToken.kind === BashTokenKind.SingleQuote || targetToken.kind === BashTokenKind.DoubleQuote;
            targetStart = targetToken.start;
            const wordResult = readShellWord(tokenizer, commandRegistry);
            target = wordResult.value;
            statementEnd = wordResult.endPos;
        }

        // The right operand of a heredoc is its body, which the lexer has already set aside as data.
        if (redirectToken.value === "<<") {
            const heredoc = parseHeredoc(tokenizer, source, redirectToken.start, statementEnd, target, quotedTarget);
            statementEnd = redirectToken.start + heredoc.source.length;
            node = new RedirectAstNode(redirectToken.value, { left: node, right: heredoc }, source.slice(statementStart, statementEnd));
            heredocSeen = true;
            continue;
        }

        const targetNode = new TargetAstNode(target, source.slice(targetStart, statementEnd));
        const redirectNode = new RedirectAstNode(redirectToken.value, { left: node, right: targetNode }, source.slice(statementStart, statementEnd));
        node = redirectNode;
    }

    // The heredoc body is input data rather than part of the command, so the command keeps its own source.
    if (node !== baseNode && !heredocSeen) {
        let fullSource = source.slice(statementStart, statementEnd);
        if (tokenizer.peek() === undefined) {
            fullSource = source.slice(statementStart);
        }
        baseNode.source = fullSource;
    }

    return node;
}

// Parses a pipe-separated pipeline from a token stream.
export function parsePipeExpr(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    let left: IAstNode = parseStatement(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.Pipe) {
        tokenizer.next();
        const right = parseStatement(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.Pipe, left, right);
    }
    return left;
}

// Parses an ||-separated or-expression from a token stream.
export function parseOrExpr(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    let left: IAstNode = parsePipeExpr(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.Or) {
        tokenizer.next();
        const right = parsePipeExpr(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.Or, left, right);
    }
    return left;
}

// Parses an &&-separated and-expression from a token stream.
export function parseAndExpr(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    let left: IAstNode = parseOrExpr(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.And) {
        tokenizer.next();
        const right = parseOrExpr(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.And, left, right);
    }
    return left;
}

// Parses a semicolon-separated statement sequence from a token stream.
export function parseSequence(tokenizer: ITokenizer, source: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    skipSemicolonSeparators(tokenizer);
    if (tokenizer.peek() === undefined) {
        return parseBashCommand("", commandRegistry);
    }

    let left: IAstNode = parseAndExpr(tokenizer, source, commandRegistry);
    while (tokenizer.peek()?.kind === BashTokenKind.Semicolon) {
        tokenizer.next();
        skipSemicolonSeparators(tokenizer);
        if (tokenizer.peek() === undefined) {
            break;
        }
        const right = parseAndExpr(tokenizer, source, commandRegistry);
        left = makeBinopNode(BashTokenKind.Semicolon, left, right);
    }
    return left;
}

// Builds a binop node from two operand nodes.
export function makeBinopNode(op: BashTokenKind, left: IAstNode, right: IAstNode): IAstNode {

    return new BinopAstNode(op, { left, right }, `${left.source} ${op} ${right.source}`);
}

// Parses a bash command string into a command or compound expression AST node.
export function parseBashExpression(command: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const tokenizer = new Tokenizer(command);
    return parseSequence(tokenizer, command, commandRegistry);
}

// Parses a bash command string into a command node.
export function parseBashCommand(command: string, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const tokens = tokenizeCommand(command);
    const envPrefixResult = parseEnvPrefix(tokens);
    const commandName = envPrefixResult.remainingTokens[0] ?? "";
    const commandDef = commandRegistry.get(commandName);
    const parsedArguments = parseArguments(envPrefixResult.remainingTokens.slice(1), commandDef);

    return new CommandAstNode(commandName, parsedArguments.options, parsedArguments.positionals, envPrefixResult.envPrefix, command);
}

// Converts a Read, Write, Edit, or MultiEdit tool call into a file-path AST node.
export function parseFilePathToolCall(call: IToolCall): IAstNode {

    const filePath = call.tool_input["file_path"];
    return new FilePathToolAstNode(call.tool_name.toLowerCase(), filePath, `${call.tool_name} ${filePath}`);
}

// Converts a Grep tool call into a grep AST node.
export function parseGrepToolCall(call: IToolCall): IAstNode {

    const pattern = call.tool_input["pattern"];
    const path = call.tool_input["path"];
    return new GrepAstNode(pattern, path, `Grep ${pattern} ${path}`);
}

// Converts a WebFetch tool call into a webfetch AST node.
export function parseWebFetchToolCall(call: IToolCall): IAstNode {

    const url = call.tool_input["url"];
    return new WebFetchAstNode(url, `WebFetch ${url}`);
}

// Converts an Agent tool call into an agent AST node.
export function parseAgentToolCall(call: IToolCall): IAstNode {

    const description = call.tool_input["description"];
    const prompt = call.tool_input["prompt"];
    return new AgentAstNode(description, prompt, `Agent ${description}`);
}

// Converts an unmodeled tool call into a generic tool AST node.
export function parseToolNode(call: IToolCall): IAstNode {

    return new ToolAstNode(call.tool_name, call.tool_input, call.tool_name);
}

// Converts a Bash tool call into a bash AST node.
export function parseBashToolCall(call: IToolCall, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    const command = call.tool_input["command"];
    return new BashAstNode({ command: parseBashExpression(command, commandRegistry) }, command);
}

// Converts a tool call into an AST node.
export function parse(call: IToolCall, commandRegistry: Map<string, ICommandDescriptor>): IAstNode {

    if (call.tool_name === "Bash" || call.tool_name === "Shell") {
        return parseBashToolCall(call, commandRegistry);
    }
    if (call.tool_name === "Read" || call.tool_name === "Write" || call.tool_name === "Edit" || call.tool_name === "MultiEdit") {
        return parseFilePathToolCall(call);
    }
    if (call.tool_name === "Grep") {
        return parseGrepToolCall(call);
    }
    if (call.tool_name === "WebFetch") {
        return parseWebFetchToolCall(call);
    }
    if (call.tool_name === "Agent") {
        return parseAgentToolCall(call);
    }
    return parseToolNode(call);
}
