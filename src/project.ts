/**
 * CLI configuration expected in a project's `package.json` configuration
 */
export interface IProjectConfig {
  /** path to default command implementation, or a single command CLI */
  rootCommand?: string,
  /** path to compiled command outputs */
  commandDir?: string,
  /** syntax delimiter for subcommands. (default is `' '`) */
  commandDelim?: string | null,
}
