/**
 * CLI configuration expected in a project's package.json under the respective
 * namespace
 */
export interface IProjectConfig {
  /** path to single command CLI */
  command?: string, 
  /** path to compiled command outputs */
  commandDir?: string,
  commandDelim?: string | null,
}
