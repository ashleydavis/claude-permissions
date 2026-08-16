// Discriminator for bash expression token kinds produced by the lexer.
export enum BashTokenKind {

    // Word token (command name, argument, redirect target, quoted or substitution content, etc.).
    Word = "word",

    // Single-quote delimiter (') opening or closing a single-quoted string.
    SingleQuote = "'",

    // Double-quote delimiter (") opening or closing a double-quoted string.
    DoubleQuote = "\"",

    // Backtick delimiter (`) opening or closing a backtick command substitution.
    Backtick = "`",

    // Command substitution open delimiter ($(); the matching CloseParen delimits the end.
    SubstitutionOpen = "$(",

    // I/O redirect operator token (>, >>, <, 2>, etc.); value holds the operator string.
    Redirect = "redirect",

    // Heredoc body text following a << operator; value holds the body without its terminator line.
    HeredocBody = "heredoc_body",

    // Logical and (&&).
    And = "&&",

    // Logical or (||).
    Or = "||",

    // Statement separator (;).
    Semicolon = ";",

    // Pipeline (|).
    Pipe = "|",

    // Subshell open (( ).
    OpenParen = "(",

    // Subshell close ()).
    CloseParen = ")",

    // Brace group open ({).
    OpenBrace = "{",

    // Brace group close (}).
    CloseBrace = "}",

    // Shell reserved word: for.
    For = "for",

    // Shell reserved word: in.
    In = "in",

    // Shell reserved word: do.
    Do = "do",

    // Shell reserved word: done.
    Done = "done",

    // Shell reserved word: while.
    While = "while",

    // Shell reserved word: until.
    Until = "until",

    // Shell reserved word: if.
    If = "if",

    // Shell reserved word: then.
    Then = "then",

    // Shell reserved word: elif.
    Elif = "elif",

    // Shell reserved word: else.
    Else = "else",

    // Shell reserved word: fi.
    Fi = "fi",

    // Shell reserved word: case.
    Case = "case",

    // Shell reserved word: esac.
    Esac = "esac",

    // Case clause terminator (;;).
    CaseClauseEnd = ";;",
}

// A single token from the bash expression lexer.
export interface IBashToken {

    // Token kind; for operators the kind equals the operator string.
    kind: BashTokenKind;

    // For words: resolved word text. For operators: same as kind. For redirects: the operator string.
    value: string;

    // Start offset in the original input string (inclusive).
    start: number;

    // End offset in the original input string (exclusive).
    end: number;
}

// Cursor over a flat bash token stream for recursive-descent parsing.
export interface ITokenizer {

    // Returns the current token without consuming it, or undefined at end of stream.
    peek(): IBashToken | undefined;

    // Advances to the next token without returning it.
    next(): void;

    // Returns the token after the current one without advancing, or undefined at end of stream.
    peekNext(): IBashToken | undefined;
}

// Redirect operator token strings (longer alternatives first).
const REDIRECT_OPERATORS = ["2>&", ">>", "&>", "2>", ">", "<<<", "<<", "<"];

// Shell control operator kinds (longer lexemes first).
const BASH_OPERATOR_KINDS = [
    BashTokenKind.And,
    BashTokenKind.Or,
    BashTokenKind.Semicolon,
    BashTokenKind.Pipe,
    BashTokenKind.OpenParen,
    BashTokenKind.CloseParen,
    BashTokenKind.OpenBrace,
    BashTokenKind.CloseBrace,
];

// Maps unquoted reserved-word spellings to their keyword token kinds.
const SHELL_KEYWORD_KINDS: Record<string, BashTokenKind> = {
    for: BashTokenKind.For,
    in: BashTokenKind.In,
    do: BashTokenKind.Do,
    done: BashTokenKind.Done,
    while: BashTokenKind.While,
    until: BashTokenKind.Until,
    if: BashTokenKind.If,
    then: BashTokenKind.Then,
    elif: BashTokenKind.Elif,
    else: BashTokenKind.Else,
    fi: BashTokenKind.Fi,
    case: BashTokenKind.Case,
    esac: BashTokenKind.Esac,
};

// Tokenizes bash command strings and exposes a peek/next cursor for parsers.
export class Tokenizer implements ITokenizer {

    // Flat token stream produced from the constructor input.
    private readonly tokens: IBashToken[];

    // Current read position in the token stream.
    private position: number;

    // Builds a tokenizer over a bash command string.
    constructor(input: string) {
        this.tokens = Tokenizer.lexInput(input);
        this.position = 0;
    }

    // Returns the current token without consuming it, or undefined at end of stream.
    peek(): IBashToken | undefined {
        return this.tokens[this.position];
    }

    // Advances to the next token without returning it.
    next(): void {
        if (this.tokens[this.position] !== undefined) {
            this.position++;
        }
    }

    // Returns the token after the current one without advancing, or undefined at end of stream.
    peekNext(): IBashToken | undefined {
        return this.tokens[this.position + 1];
    }

    // Classify an unquoted standalone word as a reserved keyword when it spells one, otherwise a plain word.
    private static classifyPlainWord(wordValue: string): BashTokenKind {

        const keywordKind = SHELL_KEYWORD_KINDS[wordValue];
        if (keywordKind !== undefined) {
            return keywordKind;
        }

        return BashTokenKind.Word;
    }

    // Rebuilds the heredoc terminator word from the tokens lexed after a << operator.
    private static readHeredocTerminator(tokens: IBashToken[], operatorIndex: number): string {

        let terminator = "";
        let wordEnd: number | undefined = undefined;

        for (let tokenIndex = operatorIndex + 1; tokenIndex < tokens.length; tokenIndex++) {
            const token = tokens[tokenIndex];

            // A gap between tokens ends the terminator word; leading spaces before it are allowed.
            if (wordEnd !== undefined && token.start !== wordEnd) {
                break;
            }

            if (token.kind === BashTokenKind.Word) {
                terminator += token.value;
            }
            else if (token.kind !== BashTokenKind.SingleQuote && token.kind !== BashTokenKind.DoubleQuote) {
                break;
            }

            wordEnd = token.end;
        }

        return terminator;
    }

    // Reads the heredoc body that starts after the operator line, ending at the terminator line or at end of input.
    private static readHeredocBody(input: string, bodyStart: number, terminator: string): IBashToken {

        const bodyLines: string[] = [];
        let pos = bodyStart;
        let bodyEnd = bodyStart;

        while (pos < input.length) {
            let lineEnd = input.indexOf("\n", pos);
            if (lineEnd === -1) {
                lineEnd = input.length;
            }

            const line = input.slice(pos, lineEnd);
            if (line === terminator) {
                return { kind: BashTokenKind.HeredocBody, value: bodyLines.join("\n"), start: bodyStart, end: lineEnd };
            }

            bodyLines.push(line);
            bodyEnd = lineEnd;
            pos = lineEnd + 1;
        }

        return { kind: BashTokenKind.HeredocBody, value: bodyLines.join("\n"), start: bodyStart, end: bodyEnd };
    }

    // Tokenizes a bash command string into word and operator tokens.
    private static lexInput(input: string): IBashToken[] {

        const tokens: IBashToken[] = [];
        let pos = 0;
        let atWordBoundary = true;
        let heredocOperatorIndex: number | undefined = undefined;

        while (pos < input.length) {
            if (input[pos] === "\n" || input[pos] === "\r") {
                const separatorStart = pos;
                pos++;

                // The newline after a << operator starts the heredoc body, which is input data rather than commands.
                if (heredocOperatorIndex !== undefined) {
                    const terminator = Tokenizer.readHeredocTerminator(tokens, heredocOperatorIndex);
                    heredocOperatorIndex = undefined;
                    const bodyToken = Tokenizer.readHeredocBody(input, pos, terminator);
                    tokens.push(bodyToken);
                    pos = bodyToken.end;
                    atWordBoundary = true;
                    continue;
                }

                tokens.push({ kind: BashTokenKind.Semicolon, value: BashTokenKind.Semicolon, start: separatorStart, end: pos });
                atWordBoundary = true;
                continue;
            }

            if (/\s/.test(input[pos])) {
                atWordBoundary = true;
                pos++;
                continue;
            }

            if (input[pos] === "#" && atWordBoundary) {
                while (pos < input.length && input[pos] !== "\n" && input[pos] !== "\r") {
                    pos++;
                }
                continue;
            }

            let matchedRedirect: string | undefined = undefined;
            for (const operator of REDIRECT_OPERATORS) {
                if (input.startsWith(operator, pos)) {
                    matchedRedirect = operator;
                    break;
                }
            }
            if (matchedRedirect !== undefined) {
                const redirectStart = pos;
                pos += matchedRedirect.length;
                if (matchedRedirect === "<<") {
                    heredocOperatorIndex = tokens.length;
                }
                tokens.push({ kind: BashTokenKind.Redirect, value: matchedRedirect, start: redirectStart, end: pos });
                atWordBoundary = true;
                continue;
            }

            let matchedOperator: BashTokenKind | undefined = undefined;
            for (const kind of BASH_OPERATOR_KINDS) {
                if (input.startsWith(kind, pos)) {
                    matchedOperator = kind;
                    break;
                }
            }
            // Bare "&" backgrounds the preceding command but is normalised to Semicolon for permission analysis.
            if (matchedOperator === undefined && input.startsWith("&", pos)) {
                matchedOperator = BashTokenKind.Semicolon;
            }
            if (matchedOperator !== undefined) {
                const operatorStart = pos;
                const operatorLength = matchedOperator === BashTokenKind.Semicolon && input[operatorStart] === "&"
                    ? 1
                    : matchedOperator.length;
                pos += operatorLength;
                tokens.push({ kind: matchedOperator, value: matchedOperator, start: operatorStart, end: pos });
                atWordBoundary = true;
                continue;
            }

            atWordBoundary = false;

            // A shell word is a run of adjacent segments: plain runs, quoted strings, and command substitutions.
            // Each delimiter and content piece becomes its own token; parsers reassemble adjacent tokens into a word.
            const wordStart = pos;
            let plainStart = pos;
            let plainValue = "";

            while (pos < input.length) {
                if (/\s/.test(input[pos])) {
                    break;
                }

                let atRedirect = false;
                for (const operator of REDIRECT_OPERATORS) {
                    if (input.startsWith(operator, pos)) {
                        atRedirect = true;
                        break;
                    }
                }
                let atOperator = false;
                for (const kind of BASH_OPERATOR_KINDS) {
                    if (input.startsWith(kind, pos)) {
                        atOperator = true;
                        break;
                    }
                }
                if (!atOperator && input.startsWith("&", pos)) {
                    atOperator = true;
                }
                if (atRedirect || atOperator) {
                    break;
                }

                const isDelimiter = input[pos] === "'"
                    || input[pos] === '"'
                    || input[pos] === "`"
                    || (input[pos] === "$" && input[pos + 1] === "(");

                // A delimiter ends the current plain run, which is part of a larger word so it is never a keyword.
                if (isDelimiter && plainValue.length > 0) {
                    tokens.push({ kind: BashTokenKind.Word, value: plainValue, start: plainStart, end: pos });
                    plainValue = "";
                }

                if (input[pos] === "'") {
                    const openStart = pos;
                    pos++;
                    tokens.push({ kind: BashTokenKind.SingleQuote, value: "'", start: openStart, end: pos });
                    const contentStart = pos;
                    while (pos < input.length && input[pos] !== "'") {
                        pos++;
                    }
                    if (pos > contentStart) {
                        tokens.push({ kind: BashTokenKind.Word, value: input.slice(contentStart, pos), start: contentStart, end: pos });
                    }
                    if (pos < input.length) {
                        tokens.push({ kind: BashTokenKind.SingleQuote, value: "'", start: pos, end: pos + 1 });
                        pos++;
                    }
                    plainStart = pos;
                    continue;
                }

                if (input[pos] === '"') {
                    const openStart = pos;
                    pos++;
                    tokens.push({ kind: BashTokenKind.DoubleQuote, value: "\"", start: openStart, end: pos });
                    const contentStart = pos;
                    let contentValue = "";
                    while (pos < input.length && input[pos] !== '"') {
                        if (input[pos] === "\\" && pos + 1 < input.length) {
                            pos++;
                            contentValue += input[pos++];
                        }
                        else {
                            contentValue += input[pos++];
                        }
                    }
                    if (pos > contentStart) {
                        tokens.push({ kind: BashTokenKind.Word, value: contentValue, start: contentStart, end: pos });
                    }
                    if (pos < input.length) {
                        tokens.push({ kind: BashTokenKind.DoubleQuote, value: "\"", start: pos, end: pos + 1 });
                        pos++;
                    }
                    plainStart = pos;
                    continue;
                }

                if (input[pos] === "`") {
                    const openStart = pos;
                    pos++;
                    tokens.push({ kind: BashTokenKind.Backtick, value: "`", start: openStart, end: pos });
                    const contentStart = pos;
                    while (pos < input.length && input[pos] !== "`") {
                        pos++;
                    }
                    if (pos > contentStart) {
                        tokens.push({ kind: BashTokenKind.Word, value: input.slice(contentStart, pos), start: contentStart, end: pos });
                    }
                    if (pos < input.length) {
                        tokens.push({ kind: BashTokenKind.Backtick, value: "`", start: pos, end: pos + 1 });
                        pos++;
                    }
                    plainStart = pos;
                    continue;
                }

                if (input[pos] === "$" && pos + 1 < input.length && input[pos + 1] === "(") {
                    const openStart = pos;
                    pos += 2;
                    tokens.push({ kind: BashTokenKind.SubstitutionOpen, value: "$(", start: openStart, end: pos });
                    const contentStart = pos;
                    let depth = 1;
                    while (pos < input.length && depth > 0) {
                        if (input[pos] === "(") {
                            depth++;
                        }
                        else if (input[pos] === ")") {
                            depth--;
                            if (depth === 0) {
                                break;
                            }
                        }
                        pos++;
                    }
                    if (pos > contentStart) {
                        tokens.push({ kind: BashTokenKind.Word, value: input.slice(contentStart, pos), start: contentStart, end: pos });
                    }
                    if (pos < input.length) {
                        tokens.push({ kind: BashTokenKind.CloseParen, value: ")", start: pos, end: pos + 1 });
                        pos++;
                    }
                    plainStart = pos;
                    continue;
                }

                if (input[pos] === "\\" && pos + 1 < input.length) {
                    pos++;
                    plainValue += input[pos++];
                    continue;
                }

                plainValue += input[pos++];
            }

            // A trailing plain run that spans the whole word (no delimiter preceded it) may be a reserved keyword.
            if (plainValue.length > 0) {
                const tokenKind = plainStart === wordStart ? Tokenizer.classifyPlainWord(plainValue) : BashTokenKind.Word;
                tokens.push({ kind: tokenKind, value: plainValue, start: plainStart, end: pos });
            }
            else if (pos === wordStart) {
                pos++;
            }
        }

        return tokens;
    }
}
