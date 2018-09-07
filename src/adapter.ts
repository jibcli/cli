import * as CLI from 'commander';
export { CLI };

/**
 * Instance of command parser used to setup command syntax parsing
 */
export interface IProgramCommand extends CLI.Command { }

/**
 * Command argument interface.
 */
export interface ICommandArgument {
  /** Argument name in syntax processing */
  name: string;
  /** Describe the argument for help text */
  description?: string;
  /** Flag to indicate optional argument */
  optional?: boolean; // default false
  /** Indicate variadic argument (multiple args as one). If true, then must be the last argument */
  multi?: boolean; // default false
  // type?: StringConstructor | NumberConstructor | ArrayConstructor | ObjectConstructor;
  // default?: string | number | any[] | object;
}

/**
 * Command option interface
 */
export interface ICommandOption {
  /** Option flag syntax. Can include -{shorthand}, --{longhand} {[value]} such as -c, --cheese [type] */
  flag: string;
  /** Describe the option to be listed with help */
  description?: string;
  /** Default option value */
  default?: any;
  /** Value processing function or RegExp - Useful for accepting multiple values for same flag */
  fn?: ((val: any, values: any) => any) | RegExp;
}

/**
 * Callback for an option with value callback
 */
export interface IProgramOptionCallback<T> {
  (value: T): void
}

/**
 * Add options to a command or program
 * @param program the program or command to apply options
 * @param options one or more options to add
 */
export function addCommandOptions(program: IProgramCommand, ...options: ICommandOption[]): IProgramCommand {
  options.forEach(opt => {
    if (opt.fn) {
      program.option(opt.flag, opt.description, opt.fn, opt.default);
    } else {
      program.option(opt.flag, opt.description, opt.default);
    }
  });
  return program;
}

/**
 * Add a callback to an option when its values are parsed
 * @param program the program or command to add callback
 * @param name the option (long) name
 * @param cb value callback when option is parsed
 */
export function addOptionCallback<T>(program: IProgramCommand, name: string, cb: IProgramOptionCallback<T>): IProgramCommand {
  return program;
}