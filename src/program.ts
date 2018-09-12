import { ICommandCtor, CommandImplementation, ICommandDefinition } from './command';
import { Project, CONSTANTS, UI, Log } from './lib';
import { CommandAdapter, ICommandOption, IProgramOptionCallback } from './adapter';
import { IProjectConfig } from './project';

/**
 * extend package config
 */
export interface IProgramOptions extends IProjectConfig { }

/**
 * Main program registry
 */
export class Program {
  // define ivars
  public root: CommandAdapter;
  public version: string;
  private _ui = new UI.Writer();
  private _logger = new Log.Logger();

  constructor(dir: string, private options?: IProgramOptions) {
    // load package json for the CLI package
    let pkgJson: any;
    try {
      pkgJson = Project.getPackageJson(dir);
      this.version = pkgJson.version;
    } catch (e) {
      throw new Error(`Cannot read project ${dir}`);
    }

    this.options = {
      ...(pkgJson[CONSTANTS.PKG_CONFIG_KEY] || {}), // add from package json
      ...(options || {}), // allow explicit config defs as well
    };
    // ensure required configs
    this.options.commandDelim = this.options.commandDelim || CONSTANTS.COMMAND_DELIMITER;
    this.options.commandDir = this.options.commandDir || CONSTANTS.COMMAND_DIRECTORY;

    // create main cli
    this.root = new CommandAdapter()
      .version(this.version, '-v, --version'); // set default version option

  }

  /**
   * getter for the resolved configuration
   */
  public get config(): IProgramOptions {
    return this.options;
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
   * Register a command for help context
   * @param syntax the command name (syntax) to be registered
   * @param ctor the command implementation constructor
   */
  public registerCommandHelp(syntax: string, ctor?: ICommandCtor<CommandImplementation>, subcommands?: ICommandDefinition[]): CommandAdapter {
    return !(ctor && ctor.hidden) ? this.registerCommand(syntax, ctor, subcommands) : null;
  }

  /**
   * Register a class as the handler for the root command
   * @param ctor The root command "default" implementation
   */
  public registerRoot(ctor?: ICommandCtor<CommandImplementation>): CommandAdapter {
    this._applyCommandMeta(this.root, ctor);
    this._attachHandlers(this.root, ctor);
    return this.root;
  }

  /**
   * register a resolved command by its name and constructor
   * @param syntax the command name as registered
   * @param ctor the instance contstructor
   * @param subcommands Subcommands of the parent. If zero-length array, it is assumed subcommands exist so '<subcommand>' will be used
   */
  public registerCommand(syntax: string, ctor?: ICommandCtor<CommandImplementation>, subcommands?: ICommandDefinition[]): CommandAdapter {
    const { commandDelim } = this.config;

    // create new child adapter
    let child: CommandAdapter;
    if (ctor) {
      // setup command from static annotations
      child = this._command(syntax);
      this._applyCommandMeta(child, ctor);

    } else if (subcommands) {
      if (subcommands.length) {
        child = this._command(syntax); // create new command
        // subcommands exist, so we can register them with the adapter
        subcommands.forEach(sub => {
          child.subcommand(`${commandDelim}${sub.name}`, sub.ctor ? sub.ctor.description : null);
        });
      } else {
        // subcommands stubbed only
        child = this._command(`${syntax}${commandDelim}<subcommand>`); // create new command
      }
    }

    // where rubber meets road...
    this._attachHandlers(child, ctor, subcommands);

    return child;
  }

  /**
   * Apply command constructor annotation metadata to the adapter implementation
   * @param adapter 
   * @param ctor 
   */
  private _applyCommandMeta(adapter: CommandAdapter, ctor: ICommandCtor<CommandImplementation>): CommandAdapter {
    adapter.description(ctor.description)
      .arguments(ctor.args) // set argument syntax
      .option(...(ctor.options || [])) // apply options
      .allowUnknown(ctor.allowUnknown);
    return adapter;
  }

  /**
   * Attach handlers to the adapter from the command implementation
   * @param adapter A registered command processing adapter
   * @param ctor The command implementation constructor
   * @param subcommands Any subcommands
   */
  private _attachHandlers(adapter: CommandAdapter, ctor?: ICommandCtor<CommandImplementation>, subcommands?: ICommandDefinition[]): void {
    // initialize with command class
    let instance: CommandImplementation;

    // assign action while slicing non-interpreted args from command path
    adapter.invocation((options: any, ...cmdArgs: any[]) => {
      // normalize actual arguments based on command syntax (space-delims become args)
      const args: any[] = adapter.syntax ? cmdArgs.slice(adapter.syntax.split(' ').length - 1) : cmdArgs;
      instance = ctor && new ctor();
      return instance && instance.run.call(instance, options, ...args)
        .catch((e: any) => this._logger.error(e));

    }).onHelp(() => {
      instance = ctor && new ctor();
      if (subcommands && subcommands.length) {
        // print subcommands in an aligned grid format
        this._ui.outputSection('Subcommands', this._ui.grid(subcommands.map(item => {
          return [item.name, item.ctor ? item.ctor.description : ''];
        })));
      }
      return instance && instance.help();
    });
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
        this.root.onOption(name, cb);
      } else {
        throw new Error(`Cannot determine option name from flag: ${option.flag}`);
      }
    }
    return this;
  }

  /**
   * Add help text to the main program
   * @param body Help text to show
   * @param heading Add ui heading
   * @param raw Flag to output the raw text without formatting
   */
  public globalHelp(body: string, heading?: string, raw?: boolean): Program {
    this.root.onHelp(() => {
      if (raw) {
        this._ui.output(body);
      } else  if (heading) {
        this._ui.outputSection(heading, body);
      } else {
        this._ui.output();
        this._ui.outputLines(body, 1);
      }
    });
    return this;
  }

  /**
   * execute the argv against the registered commands
   * @param argv argv as passthrough to the command processor
   */
  public exec(argv: string[]): void {
    this.root.exec(argv);
  }

  /**
   * output help text
   */
  public help(): void {
    this.root.showHelp();
  }

}
