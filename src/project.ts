/**
 * CLI configuration expected in a project's `package.json` configuration
 */
export interface IProjectConfig {
  /** a name for the CLI project, usually corresponding to the command name itself */
  name?: string;
  /** path to default command implementation, or a single command CLI */
  rootCommand?: string;
  /** path to compiled command outputs */
  commandDir?: string;
  /** syntax delimiter for subcommands. (default is `' '`) */
  commandDelim?: string | null;
}
