import * as _CLI from 'commander';

/**
 * Instance of command parser used to setup command syntax parsing
 */
export interface IProgramCommand extends _CLI.Command {
  
}

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
 * Option flag syntax of the format `-{shorthand}, --{longhand} {[value]}`
 * 
 * - `-c, --cheese <type>` requires "type" in cheese option
 * - `-p, --project [path]` "path" is optional for the project option
 * - `-d, --debug` simple boolean option
 * - `--test` a longhand only flag
 * 
 * Short boolean flags may be passed as a single argument, such as `-abc`. 
 * Multi-word arguments like `--with-token` become camelCase, as `options.withToken`.
 * Also note that multi-word arguments with `--no` prefix will result in `false` as
 * the option name value. So `--no-output` would parse as `options.output === false`
 */
export type TOptionFlag = string;

/**
 * Command option interface
 */
export interface ICommandOption {
  /** Option flag syntax. */
  flag: TOptionFlag;
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
 * CommanderJS adapter class for registering commands and applying methods to
 * a command instance.
 * @ignore
 */
export class CommandAdapter {

  private readonly _isRoot: boolean;
  private _hasSubcommand: boolean;
  private _hasOptions: boolean;
  private _argString: string;
  public static readonly HELP_FLAG = '--help';

  /**
   * Create adapter instance for the given command
   * @param cmd the command processing engine
   * @param syntax a syntax reference for the registered command adapter
   */
  constructor(private cmd: IProgramCommand = _CLI, public readonly syntax?: string) {
    // flag when is root
    this._isRoot = cmd === _CLI;
  }

  /**
   * Ensure the command on the root adapter instance
   * @param msg error message to throw when not root
   * @throws when not is root
   */
  private _ensureRoot(msg: string): void {
    if (!this._isRoot) {
      throw new Error(msg);
    }
  }

  /**
   * Set CLI version
   * @param version version string for the CLI
   * @param flag custom version flag syntax
   */
  public version(version: string, flag?: TOptionFlag): CommandAdapter {
    this.cmd.version(version, flag);
    return this;
  }

  /**
   * Get a subcommand
   * @param syntax syntax of subcommand (syntax)
   * @param desc command description
   */
  public subcommand(syntax: string, desc?: string): CommandAdapter {
    this._hasSubcommand = true;
    const childSyntax = [this.syntax, syntax].filter(p => !!p).join('');
    const adapter = new CommandAdapter(this.cmd.command(childSyntax, desc), childSyntax);
    this._setUsage();
    return adapter;
  }

  /**
   * update usage information from ivars
   */
  private _setUsage(): void {
    const usage = [];
    if (this._hasSubcommand) {
      usage.push(this._isRoot ? '[command]': '<subcommand>');
    }
    if (this._hasOptions) {
      usage.push('[options]');
    }
    if (this._argString) {
      usage.push(this._argString);
    }
    this.cmd.usage(usage.join(' '));
  }

  /**
   * Add command description
   * @param desc the command description
   */
  public description(desc: string): CommandAdapter {
    this.cmd.description(desc);
    return this;
  }

  /**
   * Apply arguments as parse-able syntax to the command
   * @param args command argument(s) to apply
   */
  public arguments(args?: ICommandArgument[]): CommandAdapter {
    this._argString = this._argumentSyntax(args);
    this.cmd.arguments(this._argString);
    this._setUsage();
    return this;
  }

  /**
   * Format args into a parse-able syntax string
   * @param args 
   */
  private _argumentSyntax(args?: ICommandArgument[]): string {
    return (args || []).map(arg => {
      const spread = arg.multi ? '...' : '';
      return arg.optional ? `[${arg.name}${spread}]` : `<${arg.name}${spread}>`
    }).join(' ');
  }

  /**
   * Add options to a command or program
   * @param options one or more options to add
   */
  public option(...options: ICommandOption[]): CommandAdapter {
    this._hasOptions = !!options.length;
    options.forEach(opt => {
      if (opt.fn) {
        this.cmd.option(opt.flag, opt.description, opt.fn, opt.default);
      } else {
        this.cmd.option(opt.flag, opt.description, opt.default);
      }
    });
    this._setUsage();
    return this;
  }

  /**
   * Support unknown options
   * @param allow whether or not to allow unknown options
   */
  public allowUnknown(allow: boolean): CommandAdapter {
    this.cmd.allowUnknownOption(allow);
    return this;
  }

  /**
   * Add a listener to specific command events
   * @param event adapter emitter event
   * @param listener event listener
   */
  public on(event: string | symbol, listener: any): CommandAdapter {
    this.cmd.on(event, listener);
    return this;
  }

  /**
   * Add a callback to an option when its values are parsed
   * @param name the option (long) name
   * @param cb value callback when option is parsed
   */
  public onOption<T>(name: string, cb: IProgramOptionCallback<T>): CommandAdapter {
    return this.on(`option:${name}`, cb);
  }

  /**
   * Register help listener callback
   * @param cb callback when help is parsed
   */
  public onHelp(cb: () => void): CommandAdapter {
    return this.on(CommandAdapter.HELP_FLAG, cb);
  }

  /**
   * Show help information
   * restricted to main cli only
   */
  public showHelp(): CommandAdapter {
    this._ensureRoot('Help text output only available on the root adapter');
    this.cmd.outputHelp();
    return this;
  }

  /**
   * execute the argv against the registered commands
   * @param argv argv as passthrough to the command processor
   */
  public exec(argv: string[]): CommandAdapter {
    this._ensureRoot('Can only exec the root adapter');
    this.cmd.parse(argv);
    return this;
  }

  /**
   * Add an invocation handler to the command
   * ```typescript
   * adapter.invocation((options: any, ...args: string[]) => {
   *   // handle options & arguments
   * })
   * @param handler command invocation callback when the command is parsed
   * ```
   */
  public invocation(handler: (options: any, ...args: any[]) => void): CommandAdapter {
    this.cmd.action((...invocation: any[]) => {
      // console.log('OVERRIDE', this.syntax, {invocation});
      // locate the invocation argument containing options
      // commander _usually_ has options last, but not always
      const optIdx = invocation.findIndex(v => typeof v === 'object' && Reflect.has(v, 'options')); 
      const opts = invocation.splice(optIdx, 1).shift();
      handler(opts, ...invocation);
    });
    return this;
  }

}
