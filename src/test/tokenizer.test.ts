import { IBashToken, Tokenizer, BashTokenKind } from "../tokenizer";

// collectAllTokens drains a tokenizer and returns every token in order.
function collectAllTokens(input: string): IBashToken[] {

    const tokenizer = new Tokenizer(input);
    const tokens: IBashToken[] = [];
    while (true) {
        const token = tokenizer.peek();
        if (token === undefined) {
            break;
        }
        tokens.push(token);
        tokenizer.next();
    }
    return tokens;
}

describe("Tokenizer", () => {

    describe("peekNext", () => {

        test("peek next token: returns following token without advancing (peek-next)", () => {
            const tokenizer = new Tokenizer("echo a;; echo b");
            expect(tokenizer.peek()?.value).toBe("echo");
            expect(tokenizer.peekNext()?.value).toBe("a");
            tokenizer.next();
            expect(tokenizer.peek()?.value).toBe("a");
            expect(tokenizer.peekNext()?.kind).toBe(BashTokenKind.Semicolon);
        });
    });

    describe("lexing", () => {

        test("lex semicolon separator: produces word and op tokens (semicolon-separator)", () => {
            expect(collectAllTokens("echo a; echo b")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 6, end: 7 },
                { kind: BashTokenKind.Word, value: "echo", start: 8, end: 12 },
                { kind: BashTokenKind.Word, value: "b", start: 13, end: 14 },
            ]);
        });

        test("lex newline separator: normalizes newline to semicolon op (newline-separator)", () => {
            expect(collectAllTokens("echo a\necho b")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 6, end: 7 },
                { kind: BashTokenKind.Word, value: "echo", start: 7, end: 11 },
                { kind: BashTokenKind.Word, value: "b", start: 12, end: 13 },
            ]);
        });

        test("lex background operator: normalizes bare ampersand to semicolon op (background)", () => {
            expect(collectAllTokens("server & client")).toEqual([
                { kind: BashTokenKind.Word, value: "server", start: 0, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 7, end: 8 },
                { kind: BashTokenKind.Word, value: "client", start: 9, end: 15 },
            ]);
        });

        test("lex and operator: produces && op token between commands (and-operator)", () => {
            expect(collectAllTokens("cd /tmp && rm -rf *")).toEqual([
                { kind: BashTokenKind.Word, value: "cd", start: 0, end: 2 },
                { kind: BashTokenKind.Word, value: "/tmp", start: 3, end: 7 },
                { kind: BashTokenKind.And, value: "&&", start: 8, end: 10 },
                { kind: BashTokenKind.Word, value: "rm", start: 11, end: 13 },
                { kind: BashTokenKind.Word, value: "-rf", start: 14, end: 17 },
                { kind: BashTokenKind.Word, value: "*", start: 18, end: 19 },
            ]);
        });

        test("lex or operator: produces || op token between commands (or-operator)", () => {
            expect(collectAllTokens("make || echo failed")).toEqual([
                { kind: BashTokenKind.Word, value: "make", start: 0, end: 4 },
                { kind: BashTokenKind.Or, value: "||", start: 5, end: 7 },
                { kind: BashTokenKind.Word, value: "echo", start: 8, end: 12 },
                { kind: BashTokenKind.Word, value: "failed", start: 13, end: 19 },
            ]);
        });

        test("lex pipe operator: produces | op token between commands (pipe)", () => {
            expect(collectAllTokens("git status | grep modified")).toEqual([
                { kind: BashTokenKind.Word, value: "git", start: 0, end: 3 },
                { kind: BashTokenKind.Word, value: "status", start: 4, end: 10 },
                { kind: BashTokenKind.Pipe, value: "|", start: 11, end: 12 },
                { kind: BashTokenKind.Word, value: "grep", start: 13, end: 17 },
                { kind: BashTokenKind.Word, value: "modified", start: 18, end: 26 },
            ]);
        });

        test("lex subshell delimiters: produces open and close paren op tokens (subshell)", () => {
            expect(collectAllTokens("(cd src && make)")).toEqual([
                { kind: BashTokenKind.OpenParen, value: "(", start: 0, end: 1 },
                { kind: BashTokenKind.Word, value: "cd", start: 1, end: 3 },
                { kind: BashTokenKind.Word, value: "src", start: 4, end: 7 },
                { kind: BashTokenKind.And, value: "&&", start: 8, end: 10 },
                { kind: BashTokenKind.Word, value: "make", start: 11, end: 15 },
                { kind: BashTokenKind.CloseParen, value: ")", start: 15, end: 16 },
            ]);
        });

        test("lex brace group delimiters: produces open and close brace op tokens (brace-group)", () => {
            expect(collectAllTokens("{ echo a; echo b; }")).toEqual([
                { kind: BashTokenKind.OpenBrace, value: "{", start: 0, end: 1 },
                { kind: BashTokenKind.Word, value: "echo", start: 2, end: 6 },
                { kind: BashTokenKind.Word, value: "a", start: 7, end: 8 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 8, end: 9 },
                { kind: BashTokenKind.Word, value: "echo", start: 10, end: 14 },
                { kind: BashTokenKind.Word, value: "b", start: 15, end: 16 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 16, end: 17 },
                { kind: BashTokenKind.CloseBrace, value: "}", start: 18, end: 19 },
            ]);
        });

        test("lex command substitution: emits open, content, and close tokens (command-substitution)", () => {
            expect(collectAllTokens("echo $(whoami)")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.SubstitutionOpen, value: "$(", start: 5, end: 7 },
                { kind: BashTokenKind.Word, value: "whoami", start: 7, end: 13 },
                { kind: BashTokenKind.CloseParen, value: ")", start: 13, end: 14 },
            ]);
        });

        test("lex backtick substitution: emits backtick delimiters around content (backtick-substitution)", () => {
            expect(collectAllTokens("rm `cat list`")).toEqual([
                { kind: BashTokenKind.Word, value: "rm", start: 0, end: 2 },
                { kind: BashTokenKind.Backtick, value: "`", start: 3, end: 4 },
                { kind: BashTokenKind.Word, value: "cat list", start: 4, end: 12 },
                { kind: BashTokenKind.Backtick, value: "`", start: 12, end: 13 },
            ]);
        });

        test("lex stdout redirect: produces redirect token before target word (redirect-stdout)", () => {
            expect(collectAllTokens("cmd > out.log")).toEqual([
                { kind: BashTokenKind.Word, value: "cmd", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: ">", start: 4, end: 5 },
                { kind: BashTokenKind.Word, value: "out.log", start: 6, end: 13 },
            ]);
        });

        test("lex append redirect: produces >> redirect token (redirect-append)", () => {
            expect(collectAllTokens("echo foo >> bar.txt")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "foo", start: 5, end: 8 },
                { kind: BashTokenKind.Redirect, value: ">>", start: 9, end: 11 },
                { kind: BashTokenKind.Word, value: "bar.txt", start: 12, end: 19 },
            ]);
        });

        test("lex stderr redirect: produces redirect token with 2> operator (redirect-stderr)", () => {
            expect(collectAllTokens("cmd 2> err.log")).toEqual([
                { kind: BashTokenKind.Word, value: "cmd", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "2>", start: 4, end: 6 },
                { kind: BashTokenKind.Word, value: "err.log", start: 7, end: 14 },
            ]);
        });

        test("lex fd merge redirect: produces redirect token with 2>& operator (redirect-fd-merge)", () => {
            expect(collectAllTokens("cmd 2>&1")).toEqual([
                { kind: BashTokenKind.Word, value: "cmd", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "2>&", start: 4, end: 7 },
                { kind: BashTokenKind.Word, value: "1", start: 7, end: 8 },
            ]);
        });

        test("lex stdin redirect: produces < redirect token (redirect-stdin)", () => {
            expect(collectAllTokens("cat < in.txt")).toEqual([
                { kind: BashTokenKind.Word, value: "cat", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "<", start: 4, end: 5 },
                { kind: BashTokenKind.Word, value: "in.txt", start: 6, end: 12 },
            ]);
        });

        test("lex heredoc redirect: produces << redirect token (redirect-heredoc)", () => {

            // << is the heredoc operator in its own right, not two < redirects. REDIRECT_OPERATORS
            // lists longer alternatives first so >> is matched before >, but it has no << at all,
            // so << currently matches < twice and the heredoc body is left as ordinary input.
            expect(collectAllTokens("cat <<EOF")).toEqual([
                { kind: BashTokenKind.Word, value: "cat", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "<<", start: 4, end: 6 },
                { kind: BashTokenKind.Word, value: "EOF", start: 6, end: 9 },
            ]);
        });

        test("lex here-string redirect: produces <<< redirect token (redirect-here-string)", () => {
            expect(collectAllTokens('cat <<<"hi"')).toEqual([
                { kind: BashTokenKind.Word, value: "cat", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "<<<", start: 4, end: 7 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 7, end: 8 },
                { kind: BashTokenKind.Word, value: "hi", start: 8, end: 10 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 10, end: 11 },
            ]);
        });

        test("lex heredoc body: consumes body and terminator line as one token (redirect-heredoc-body)", () => {
            expect(collectAllTokens("cat <<EOF\nline one\nEOF\necho hi")).toEqual([
                { kind: BashTokenKind.Word, value: "cat", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "<<", start: 4, end: 6 },
                { kind: BashTokenKind.Word, value: "EOF", start: 6, end: 9 },
                { kind: BashTokenKind.HeredocBody, value: "line one", start: 10, end: 22 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 22, end: 23 },
                { kind: BashTokenKind.Word, value: "echo", start: 23, end: 27 },
                { kind: BashTokenKind.Word, value: "hi", start: 28, end: 30 },
            ]);
        });

        test("lex quoted heredoc body: terminator quotes do not end the body early (redirect-heredoc-quoted)", () => {
            expect(collectAllTokens("cat <<'EOF'\nbody\nEOF")).toEqual([
                { kind: BashTokenKind.Word, value: "cat", start: 0, end: 3 },
                { kind: BashTokenKind.Redirect, value: "<<", start: 4, end: 6 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 6, end: 7 },
                { kind: BashTokenKind.Word, value: "EOF", start: 7, end: 10 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 10, end: 11 },
                { kind: BashTokenKind.HeredocBody, value: "body", start: 12, end: 20 },
            ]);
        });

        test("lex carriage return newline: normalizes CRLF to semicolon op (crlf-separator)", () => {
            expect(collectAllTokens("echo a\r\necho b")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 6, end: 7 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 7, end: 8 },
                { kind: BashTokenKind.Word, value: "echo", start: 8, end: 12 },
                { kind: BashTokenKind.Word, value: "b", start: 13, end: 14 },
            ]);
        });

        test("lex semicolon inside double quotes: keeps the semicolon in quoted content (quoted-semicolon)", () => {
            expect(collectAllTokens('echo "a;b"; echo c')).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 5, end: 6 },
                { kind: BashTokenKind.Word, value: "a;b", start: 6, end: 9 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 9, end: 10 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 10, end: 11 },
                { kind: BashTokenKind.Word, value: "echo", start: 12, end: 16 },
                { kind: BashTokenKind.Word, value: "c", start: 17, end: 18 },
            ]);
        });

        test("lex semicolon inside single quotes: keeps the semicolon in quoted content (single-quoted-semicolon)", () => {
            expect(collectAllTokens("echo 'a;b'; echo c")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 5, end: 6 },
                { kind: BashTokenKind.Word, value: "a;b", start: 6, end: 9 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 9, end: 10 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 10, end: 11 },
                { kind: BashTokenKind.Word, value: "echo", start: 12, end: 16 },
                { kind: BashTokenKind.Word, value: "c", start: 17, end: 18 },
            ]);
        });

        test("lex double-quoted word: emits quote delimiters around content preserving spaces (quoted-arg)", () => {
            expect(collectAllTokens('echo "hello world"')).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 5, end: 6 },
                { kind: BashTokenKind.Word, value: "hello world", start: 6, end: 17 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 17, end: 18 },
            ]);
        });

        test("lex single-quoted word: emits quote delimiters around content preserving spaces (single-quoted)", () => {
            expect(collectAllTokens("echo 'hello world'")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 5, end: 6 },
                { kind: BashTokenKind.Word, value: "hello world", start: 6, end: 17 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 17, end: 18 },
            ]);
        });

        test("lex backslash escape: consumes next character literally (escaped-char)", () => {
            expect(collectAllTokens("echo \\$HOME")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "$HOME", start: 5, end: 11 },
            ]);
        });

        test("lex trailing semicolon: emits separator without following words (trailing-semicolon)", () => {
            expect(collectAllTokens("echo a;")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 6, end: 7 },
            ]);
        });

        test("lex repeated semicolons: emits one op token per separator (repeated-semicolon)", () => {
            expect(collectAllTokens("echo a;; echo b")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 6, end: 7 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 7, end: 8 },
                { kind: BashTokenKind.Word, value: "echo", start: 9, end: 13 },
                { kind: BashTokenKind.Word, value: "b", start: 14, end: 15 },
            ]);
        });

        test("lex leading semicolon: emits separator before words (leading-semicolon)", () => {
            expect(collectAllTokens("; echo a")).toEqual([
                { kind: BashTokenKind.Semicolon, value: ";", start: 0, end: 1 },
                { kind: BashTokenKind.Word, value: "echo", start: 2, end: 6 },
                { kind: BashTokenKind.Word, value: "a", start: 7, end: 8 },
            ]);
        });

        test("lex single statement: emits word tokens only (simple-command)", () => {
            expect(collectAllTokens("ls")).toEqual([
                { kind: BashTokenKind.Word, value: "ls", start: 0, end: 2 },
            ]);
        });

        test("lex multiple words: splits on whitespace (multiple-positionals)", () => {
            expect(collectAllTokens("ls /tmp /var")).toEqual([
                { kind: BashTokenKind.Word, value: "ls", start: 0, end: 2 },
                { kind: BashTokenKind.Word, value: "/tmp", start: 3, end: 7 },
                { kind: BashTokenKind.Word, value: "/var", start: 8, end: 12 },
            ]);
        });

        test("lex empty input: returns no tokens (empty)", () => {
            expect(collectAllTokens("")).toEqual([]);
        });

        test("lex whitespace-only input: returns no tokens (whitespace)", () => {
            expect(collectAllTokens("   ")).toEqual([]);
        });

        test("lex trailing comment: omits comment text (comment-trailing)", () => {
            expect(collectAllTokens("ls -la # list the directory")).toEqual([
                { kind: BashTokenKind.Word, value: "ls", start: 0, end: 2 },
                { kind: BashTokenKind.Word, value: "-la", start: 3, end: 6 },
            ]);
        });

        test("lex comment between statements: skips comment and keeps newline separator (comment-line)", () => {
            expect(collectAllTokens("echo a # note\necho b")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "a", start: 5, end: 6 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 13, end: 14 },
                { kind: BashTokenKind.Word, value: "echo", start: 14, end: 18 },
                { kind: BashTokenKind.Word, value: "b", start: 19, end: 20 },
            ]);
        });

        test("lex comment-only input: returns no tokens (comment-only)", () => {
            expect(collectAllTokens("# set up the project")).toEqual([]);
        });

        test("lex hash inside word: keeps hash literally (hash-in-word)", () => {
            expect(collectAllTokens("echo foo#bar")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.Word, value: "foo#bar", start: 5, end: 12 },
            ]);
        });

        test("lex env assignment: keeps assignment as one word token (env-prefix)", () => {
            expect(collectAllTokens("FOO=bar cmd")).toEqual([
                { kind: BashTokenKind.Word, value: "FOO=bar", start: 0, end: 7 },
                { kind: BashTokenKind.Word, value: "cmd", start: 8, end: 11 },
            ]);
        });

        test("lex quoted env assignment value: emits the prefix and quoted value as adjacent tokens (quoted-env-prefix)", () => {
            expect(collectAllTokens('FOO="hello world" cmd')).toEqual([
                { kind: BashTokenKind.Word, value: "FOO=", start: 0, end: 4 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 4, end: 5 },
                { kind: BashTokenKind.Word, value: "hello world", start: 5, end: 16 },
                { kind: BashTokenKind.DoubleQuote, value: "\"", start: 16, end: 17 },
                { kind: BashTokenKind.Word, value: "cmd", start: 18, end: 21 },
            ]);
        });

        test("lex shell keywords: reserved words become keyword token kinds (for-loop)", () => {
            expect(collectAllTokens("for f in a b c; do echo $f; done")).toEqual([
                { kind: BashTokenKind.For, value: "for", start: 0, end: 3 },
                { kind: BashTokenKind.Word, value: "f", start: 4, end: 5 },
                { kind: BashTokenKind.In, value: "in", start: 6, end: 8 },
                { kind: BashTokenKind.Word, value: "a", start: 9, end: 10 },
                { kind: BashTokenKind.Word, value: "b", start: 11, end: 12 },
                { kind: BashTokenKind.Word, value: "c", start: 13, end: 14 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 14, end: 15 },
                { kind: BashTokenKind.Do, value: "do", start: 16, end: 18 },
                { kind: BashTokenKind.Word, value: "echo", start: 19, end: 23 },
                { kind: BashTokenKind.Word, value: "$f", start: 24, end: 26 },
                { kind: BashTokenKind.Semicolon, value: ";", start: 26, end: 27 },
                { kind: BashTokenKind.Done, value: "done", start: 28, end: 32 },
            ]);
        });

        test("lex quoted reserved word: single-quoted content is not a keyword (for-loop)", () => {
            expect(collectAllTokens("echo 'done'")).toEqual([
                { kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 5, end: 6 },
                { kind: BashTokenKind.Word, value: "done", start: 6, end: 10 },
                { kind: BashTokenKind.SingleQuote, value: "'", start: 10, end: 11 },
            ]);
        });
    });

    describe("peek", () => {

        test("peek returns current token without consuming it (peek)", () => {
            const tokenizer = new Tokenizer("echo ;");
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 });
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 });
        });

        test("peek on empty input: returns undefined (empty)", () => {
            const tokenizer = new Tokenizer("");
            expect(tokenizer.peek()).toBeUndefined();
        });

        test("peek after draining stream: returns undefined (end-of-stream)", () => {
            const tokenizer = new Tokenizer("ls");
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "ls", start: 0, end: 2 });
            tokenizer.next();
            expect(tokenizer.peek()).toBeUndefined();
        });
    });

    describe("next", () => {

        test("next advances stream without returning a token (next)", () => {
            const tokenizer = new Tokenizer("echo ;");
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "echo", start: 0, end: 4 });
            tokenizer.next();
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Semicolon, value: ";", start: 5, end: 6 });
            tokenizer.next();
            expect(tokenizer.peek()).toBeUndefined();
        });

        test("next on empty input: leaves peek at undefined (empty)", () => {
            const tokenizer = new Tokenizer("");
            tokenizer.next();
            expect(tokenizer.peek()).toBeUndefined();
        });

        test("next after end of stream: is a no-op (end-of-stream)", () => {
            const tokenizer = new Tokenizer("ls");
            tokenizer.next();
            tokenizer.next();
            expect(tokenizer.peek()).toBeUndefined();
        });

        test("interleaved peek and next: peek reads current token before next advances (interleaved)", () => {
            const tokenizer = new Tokenizer("a; b");
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "a", start: 0, end: 1 });
            tokenizer.next();
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Semicolon, value: ";", start: 1, end: 2 });
            tokenizer.next();
            expect(tokenizer.peek()).toEqual({ kind: BashTokenKind.Word, value: "b", start: 3, end: 4 });
            tokenizer.next();
            expect(tokenizer.peek()).toBeUndefined();
        });
    });
});
