// IContext holds cwd and environment variables at one point during AST evaluation.
export interface IContext {

    // Current working directory for path resolution and cwd rules.
    cwd: string;

    // True when cwd is known to be accurate; false after an unresolvable cd.
    cwdResolved?: boolean;

    // Directory a ./ pattern and a relative rule path anchor to. Falls back to cwd when absent.
    projectDir?: string;

    // Directory a leading ~/ in a rule path resolves against. Such a path is left as written when absent.
    homeDir?: string;

    // Environment variable map threaded through the evaluation.
    env: Record<string, string>;
}
