import { CommandAdapter, IAdapterOptionCallback, ICommandOption } from './adapter';
import { getCommandMeta, ICommand, ICommandCtor, ICommandDefinition } from './command';
import { CONSTANTS, Log, UI } from './lib';
import { PluginManager } from './lib/plugin/manager';
import { IProjectConfig } from './project';

/**
 * Callback for an option with value callback
 */
export interface IProgramOptionCallback<T> extends IAdapterOptionCallback<T> {
  (value: T, helper: { ui: UI.Writer; logger: Log.Logger; }): void;
}

/**
 * extend package config
 */
export interface IProgramOptions extends IProjectConfig {
  version?: string;
}

/**
 * Main program registry
 */
export class Program {
  // static members
  public static main(): Program {
    return this._main;
  }
  private static _main: Program;

  // define ivars
  public root: CommandAdapter;
  private _ui = new UI.Writer();
  private _logger = new Log.Logger({ name: this.constructor.name });
  private _rargs: string[];
  private _done: (value?: void | PromiseLike<void>) => void;
  private _err: (err: Error) => void;

  /**
   * Create the program executor
   * @param options program options for command handling
   */
  constructor(private readonly options: IProgramOptions = {}) {
    // ensure required configs
    this.options.commandDelim = this.options.commandDelim || CONSTANTS.COMMAND_DELIMITER;

    // validate delimiter
    if (this.options.commandDelim.length !== 1) {
      throw new Error(`Invalid delimiter '${this.options.commandDelim}'. Must have length == 1`);
    }

    // register plugins
    this._registerPlugins();

    // create main cli adapter
    this.root = this._initAdapter();

    // assign static instance
    Program._main = Program._main || this;
  }

  /**
   * getter for the resolved configuration
   */
  public get config(): IProgramOptions {
    return this.options;
  }

  /**
   * get the version specified for the program
   */
  public get version(): string {
    const { version } = this.options;
    return version;
  }

  /**
   * Register a command for help context
   * @param syntax the command name (syntax) to be registered
   * @param ctor the command implementation constructor
   */
  public registerCommandHelp(
    syntax: string,
    ctor?: ICommandCtor,
    subcommands?: ICommandDefinition[]): CommandAdapter {
    // this._logger.debug(`Registering help with syntax '${syntax}'`);
    return !(ctor && getCommandMeta(ctor).hidden) ? this.registerCommand(syntax, ctor, subcommands) : null;
  }

  /**
   * Register a class as the handler for the root command
   * @param ctor The root command "default" implementation
   */
  public registerRoot(ctor?: ICommandCtor): CommandAdapter {
    this._applyCommandMeta(this.root, ctor);
    this._attachHandlers(this.root, ctor);
    return this.root;
  }

  /**
   * register a resolved command by its name and constructor
   * @param syntax the command name as registered
   * @param ctor the instance contstructor
   * @param subcommands Subcommands of the parent. If zero-length array,
   * it is assumed subcommands exist so '<subcommand>' will be used
   */
  public registerCommand(
    syntax: string, ctor?: ICommandCtor, subcommands?: ICommandDefinition[]): CommandAdapter {
    // this._logger.debug(`Registering command with syntax '${syntax}'`);
    const { commandDelim } = this.config;

    // create new child adapter
    let child: CommandAdapter;
    if (ctor) {
      // setup command from static annotations
      child = this._command(syntax);
      this._applyCommandMeta(child, ctor);

    } else if (subcommands) {

      if (subcommands.length) {
        child = this._command(syntax);
        // subcommands exist, so we can register them with the adapter
        subcommands.forEach((sub: ICommandDefinition) => {
          const desc = sub.ctor ? getCommandMeta(sub.ctor).description : '...';
          child.subcommand(sub.name, desc);
        });
      } else {
        // subcommands stubbed only
        // note that the syntax must be separated from the subcommand
        // child = this._command(`${syntax} <subcommand>`);
        child = this._command(`${syntax}${commandDelim}<subcommand>`);
      }
    }

    // where rubber meets road...
    this._attachHandlers(child, ctor, subcommands);

    return child;
  }

  /**
   * Add an option to the main program
   * @param option option configuration object
   * @param cb optional callback when value is captured
   */
  public globalOption<T>(option: ICommandOption, cb?: IProgramOptionCallback<T>): Program {

    this.root.option(option);
    if (cb) {
      // determine option name from flag
      const flag = option.flag.match(/-+([\w-]+)$/);
      if (flag) {
        const name: string = flag[1];
        this.root.onOption<T>(name, val => {
          cb(val, {
            ui: this._ui,
            logger: this._logger,
          });
        });
      } else {
        throw new Error(`Cannot determine option name from flag: ${option.flag}`);
      }
    }
    return this;
  }

  /**
   * Add help text to the main program
   * @param heading Add ui heading
   * @param body Help text to show
   * @param raw Flag to output the raw text without formatting
   */
  public globalHelp(heading: string, body?: string, raw?: boolean): Program {
    this.root.onHelp(() => {
      if (raw) {
        [heading, body]
          .filter(t => !!t)
          .forEach(t => this._ui.output(t));
      } else if (heading && body) {
        this._ui.outputSection(heading, body);
      } else {
        this._ui.output();
        this._ui.outputLines(heading || body, 1);
      }
      return this._done && this._done();
    });
    return this;
  }

  /**
   * execute the argv against the registered commands
   * @param argv argv as passthrough to the command processor
   * @param path command invocation path
   */
  public exec(argv: string[], path: string[] = []): Promise<void> {
    return this._deferred(() => {
      const { commandDelim } = this.options;
      // resolve raw arguments after command
      this._rargs = path.join(commandDelim).split(' ').reduce((args, arg) => {
        return args.slice(args.indexOf(arg));
      }, argv).slice(1);
      // execute parser
      this.root.exec(argv);
    });
  }

  /**
   * output help text
   */
  public help(): Promise<void> {
    return this._deferred(() => {
      this.root.showHelp();
    });
  }

  /**
   * defer callback and assign done
   * @param cb callback to invoke
   */
  private _deferred(cb: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this._done = resolve;
      this._err = reject;
      cb();
    });
  }

  /**
   * initialize a command adapter
   */
  private _initAdapter(): CommandAdapter {
    return new CommandAdapter()
      .version(this.version, '-v, --version'); // set default version option
  }

  /**
   * register plugins with the plugin manager
   */
  private _registerPlugins(): void {
    const { plugins } = this.config;
    PluginManager.register(plugins);
  }

  /**
   * create a command for the CLI processor
   * @param syntax - command name/syntax
   * @param desc - description for the command
   * @return A command bound to the main program
   */
  private _command(syntax: string, desc?: string): CommandAdapter {
    return this.root.subcommand(syntax, desc);
  }

  /**
   * Apply command constructor annotation metadata to the adapter implementation
   * @param adapter adapter to which command is bound
   * @param ctor command constructor
   */
  private _applyCommandMeta(adapter: CommandAdapter, ctor: ICommandCtor): CommandAdapter {
    const meta = getCommandMeta(ctor);
    adapter.description(meta.description)
      .arguments(...(meta.args || [])) // set argument syntax
      .option(...(meta.options || [])) // apply options
      .allowUnknown(meta.allowUnknown);
    return adapter;
  }

  /**
   * Attach handlers to the adapter from the command implementation
   * @param adapter A registered command processing adapter
   * @param ctor The command implementation constructor
   * @param subcommands Any subcommands
   */
  private _attachHandlers(
    adapter: CommandAdapter, ctor?: ICommandCtor, subcommands?: ICommandDefinition[]): void {
    // initialize with command class
    let instance: ICommand;
    const meta = getCommandMeta(ctor);

    // assign action while slicing non-interpreted args from command path
    adapter.invocation((options: any, ...args: any[]) => {
      // instantiate and call
      this._logger.debug(`Will instantiate command ${adapter.syntax || ''}`);
      try {
        instance = ctor && new ctor();
        this._logger.debug(`Instantiate command ${adapter.syntax || ''}`);
      } catch (e) {
        return this._err(e);
      }
      if (instance) {
        // assign raw arguments
        instance.argv = [...this._rargs];
        const argL: number = (meta.args || []).length;
        // invoke run with options and parsed args
        const p = instance.run.call(instance, options, ...args.slice(0, argL));

        if (p && p instanceof Promise) {
          p.then(this._done).catch(this._err);
        } else {
          this._logger.warn(`${ctor.name}::run method should return a Promise`);
        }
      }

    }).onHelp(() => {
      instance = ctor && new ctor();
      if (instance) {
        if (meta.args && meta.args.length) {
          this._ui.outputSection(`Arguments`, this._ui.grid(meta.args.map(arg => {
            return [arg.name, arg.description || ''];
          })));
        }
        // tslint:disable-next-line:no-unused-expression
        return this._done(instance.help && instance.help());
      }
      this._done();
    });
  }

}
