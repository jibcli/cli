import * as CLI from 'commander';
import { ICommandCtor, CommandImplementation, ICommandDefinition } from './command';
import { getPackageJson, CONSTANTS, UIWriter, Logger } from './lib';
import { addCommandOptions, IProgramCommand, ICommandOption, addOptionCallback, IProgramOptionCallback } from './adapter';
import { IProjectConfig } from './project';

/**
 * extend package config
 */
export interface IProgramOptions extends IProjectConfig { }

/**
 * 
 */
export class Program {
  // define ivars
  public cli: CLI.Command;
  public version: string;
  public ui = new UIWriter();
  public logger = new Logger();

  constructor(dir: string, private options?: IProgramOptions) {
    // load package json for the CLI package
    const pkgJson = getPackageJson(dir);
    this.version = pkgJson.version;

    this.options = {
      ...(pkgJson[CONSTANTS.PKG_CONFIG_KEY] || {}), // add from package json
      ...(options || {}), // allow explicit config defs as well
    };
    // ensure required configs
    this.options.commandDelim = this.options.commandDelim || CONSTANTS.COMMAND_DELIMITER;
    this.options.commandDir = this.options.commandDir || CONSTANTS.COMMAND_DIRECTORY;

    // create main cli
    this.cli = CLI
      .version(this.version, '-v, --version') // set default verison option
      .usage('[command] [options]'); // set default usage
  }

  /**
   * getter for the resolved configuration
   */
  public get config(): IProgramOptions {
    return this.options;
  }

  /**
   * create a command for the CLI processor
   * @param name - command name
   * @param desc - description for the command
   * @return A command bound to the main program
   */
  private _command(name: string, desc?: string): IProgramCommand {
    return this.cli.command(name, desc);
  }

  /**
   * Register a command for help context
   * @param name the command name (syntax) to be registered
   * @param ctor the command implementation constructor
   */
  public registerCommandHelp(name: string, ctor?: ICommandCtor<CommandImplementation>): IProgramCommand {
    return (!ctor || !ctor.hidden) ? this.registerCommand(name, ctor) : null;
  }

  /**
   * register a resolved command by its name and constructor
   * @param name the command name as registered
   * @param ctor the instance contstructor
   * @param subcommands any subcommands it may have
   */
  public registerCommand(name: string, ctor?: ICommandCtor<CommandImplementation>, subcommands?: ICommandDefinition[]): IProgramCommand {
    // define command syntax
    const { commandDelim } = this.config;
    const cmdPath = name.split(commandDelim);
    const syntax = name;

    // attach command to the program
    const command = this._command(syntax); // create new command

    // use static init to bind description and options
    if (ctor && ctor.init) {
      ctor.init(command);
    } else if (subcommands) {
      command.usage(`${commandDelim}<subcommand> [options]`)
    }

    // initialize with command class
    let instance: CommandImplementation;

    // assign action while slicing non-interpreted args from command path
    command.action((...invocation: any[]) => {
      // console.log('OVERRIDE', syntax, {cmdPath, invocation});
      const args = invocation.slice(name.split(' ').length - 1); // normalize based command path
      const optIdx = args.findIndex(v => typeof v === 'object' && Reflect.has(v, 'options'));
      const opts = args.splice(optIdx, 1);
      // call with options as first argument
      instance = ctor && new ctor();
      return instance && instance.run.call(instance, opts, ...args)
        .catch(e => this.logger.error(e));
    }).on('--help', () => {
      instance = ctor && new ctor();
      if (subcommands && subcommands.length) {
        // TODO: need to get descriptions, etc on the subcommands
        this.ui.outputSection('Subcommands', subcommands.map(item => item.name));
      }
      return instance && instance.help();
    });

    return command;
  }

  /**
   * Add an option to the main program
   * @param option option configuration object
   * @param cb optional callback when value is captured
   */
  public globalOption<T>(option: ICommandOption, cb?: IProgramOptionCallback<T>): this {
    addCommandOptions(this.cli, option);
    if (cb) {
      // determine option name from flag
      const flag = option.flag.match(/-+([\w-]+)$/);
      if (flag) {
        const name: string = flag[1];
        addOptionCallback(this.cli, name, cb);
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
  public globalHelp(body: string, heading?: string, raw?: boolean): this {
    this.cli.on('--help', () => {
      if (raw) {
        this.ui.output(body);
      } else  if (heading) {
        this.ui.outputSection(heading, body);
      } else {
        this.ui.output();
        this.ui.outputLines(body, 1);
      }
    });
    return this;
  }

  /**
   * execute the argv against the registered commands
   * @param argv argv as passthrough to the command processor
   */
  public exec(argv: string[]): void {
    this.cli.parse(argv);
  }

  /**
   * output help text
   */
  public help(cb?: (str: string) => string): void {
    this.cli.outputHelp(cb);
  }

}
