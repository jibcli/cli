import * as fs from 'fs';
import * as path from 'path';
import { Program, IProgramOptions } from './program';
import { BaseCommand, CommandImplementation, ICommandCtor, ICommandDefinition } from './command';
import { Logger, LOG_LEVEL, listRequirable } from './lib';
import { ICommandOption, IProgramOptionCallback } from './adapter';

/**
 * interface for fs scann result
 */
interface IScanResult {
  stats: fs.Stats,
  name: string,
  location: string,
}

/**
 * extension of main cli config with a working directory provided
 */
export interface ICLIOptions extends IProgramOptions {
  basedir?: string; // working directory from which commands are based
}

export class CLI {

  public logger = new Logger();
  public program: Program;
  public readonly COMMAND_DIR: string;


  /**
   * Creates a new CLI parser instance
   * @param options configurations or overrides to package.json configuration
   * @example
   *
   ```typescript
   const cli = new CLI({
     basedir: __dirname,
     commandDir: 'path/to/my/command/impls',
     commandDelim: ':', // use a colon instead of space
   });
   ```
   */
  constructor(private options?: ICLIOptions) {
    // construct options
    this.options = {
      basedir: path.dirname(process.mainModule.filename), // location of file running the process
      ...(options || {} as ICLIOptions),
    };

    // deconstruct options into consituents
    const { basedir, ...passthrough } = this.options;

    // get main program
    this.program = new Program(basedir, passthrough);

    // assign ivars
    const { commandDir } = this.program.config;
    this.COMMAND_DIR = path.join(basedir, commandDir);
  }

  /**
   * locate command by right recursive argv lookup.
   * NOTE: this strategy precludes aliasing with commander.
   * @param args - argument list to detect command
   */
  private _loadCommand(args: string[]): ICommandDefinition {
    const { commandDelim } = this.program.config;

    let i = args.length;
    let command: ICommandDefinition;

    while (i--) {
      // find command at argument path
      const cmdFilePath = path.join(this.COMMAND_DIR, ...args.slice(0, i + 1));
      let mod: any;
      try { // require() fails for nonsensical paths
        mod = require(cmdFilePath);
        const ctor = this._extractCommandCtor(mod);

        // if valid ctor is found, then we can instantiate
        if (ctor) {
          const cmdPath = args.slice(0, i + 1);
          const argsTail = args.slice(i + 1);
          command = {
            ctor,
            name: cmdPath.join(commandDelim),
            path: cmdPath,
            args: argsTail,
          };
          break;
        }
      } catch (e) { /* noop on require exception */ }

      if (!mod && fs.existsSync(cmdFilePath)) {
        if (fs.statSync(cmdFilePath).isDirectory()) {

          // NOTE: Cannot register all sub commands because they will overwrite each other.
          // file does not exist, but directory does, so a command is synthesized
          // to register subcommand options
          const cmdPath = args.slice(0, i + 1);
          command = {
            name: cmdPath.join(commandDelim),
            path: cmdPath,
            subcommands: this._scanSubcommands(cmdFilePath, cmdPath),
          };
        }
      }
    }
    return command;
  }

  /**
   * Scan a directory for potential command resources
   * @param dir directory to scan
   */
  private _scanDir(dir: string): IScanResult[] {
    return listRequirable(dir)
      .map(item => {
        const location = path.join(dir, item);
        const name = item.replace(/\.\w+$/, ''); // remove extension for name
        return {
          name,
          location,
          stats: fs.statSync(location)
        }
      })
  }

  /**
   * scan a directory for subcommands
   * @param dir the directory to scan
   * @param ancestry prior ancestry
   */
  private _scanSubcommands(dir: string, ancestry: string[]): ICommandDefinition[] {
    return this._scanDir(dir)
      .map(({name, location, stats}) => {
        let def: ICommandDefinition = {
          name,
          path: ancestry.slice().concat(name)
        };
        if (stats.isFile()) {
          def.ctor = this._extractCommandCtor(require(location));
        } else {
          def.subcommands = this._scanSubcommands(location, def.path);
        }
        return def;
      });
  }

  /**
   * resolve an exported command from module exports
   * @param mod a module loaded with require()
   */
  private _extractCommandCtor(mod: any): ICommandCtor<CommandImplementation> {
    let ctor: ICommandCtor<CommandImplementation>;
    if (!(mod.prototype instanceof BaseCommand)) { // export class Foo ...
      // iterate exports to find command class
      for (let exp in mod) {
        if (mod[exp].prototype && mod[exp].prototype instanceof BaseCommand) {
          ctor = mod[exp];
          break;
        }
      }
    } else {
      // export is the command Ctor (export = Foo...)
      ctor = mod;
    }
    return ctor;
  }

  /**
   * Provide command help for the current path
   * @param dir directory of commands
   * @param parent parent command list
   */
  private _initHelpFromPath(dir: string, parent?: string[]): void {

    const { commandDelim } = this.program.config;

    const cmdPath: string[] = [].concat(parent || []);
    this._scanDir(dir)
      .forEach(result => {
        // format command name syntax
        const syntax = cmdPath
          .concat(result.name)
          .join(commandDelim);
        // this.logger.debug('help init', cmdName, result.location);

        if (result.stats.isDirectory()) {
          // check and skip if file by same name as directory exists
          if (!fs.existsSync(`${result.location}.js`) && !fs.existsSync(`${result.location}.ts`)) {
            // init without class
            this.program.registerCommandHelp(syntax, null, []);
          } else {
            // has directory AND file by that name hmm...
          }
        } else {
          // load command path
          const mod = require(result.location);
          const ctor = this._extractCommandCtor(mod);
          if (ctor) {
            this.program.registerCommandHelp(syntax, ctor);
          }
        }
      });
  }

  /**
   * normalize raw arguments into an array of individual components
   * @param args raw arguments
   */
  private _normalizedArgs(args: string[]): string[] {
    const { commandDelim } = this.program.config;
    return [].concat(...args.map(arg => arg.split(commandDelim)));
  }

  /**
   * Add help text to the main program
   * @param body Help text to show
   * @param heading Add ui heading
   * @param raw Flag to output the raw text without formatting
   */
  public addGlobalHelp(body: string, heading?: string, raw?: boolean): this {
    this.program.globalHelp(body, heading, raw);
    return this;
  }

  /**
   * Add global options to the main program
   * @param option global option configuration object
   * @param cb parsed option value callback
   */
  public addGlobalOption<T>(option: ICommandOption, cb?: IProgramOptionCallback<T>): this {
    this.program.globalOption<T>(option, cb);
    return this;
  }

  /**
   * Main execution method.
   * Parse arguments from the command line and run the program.
   * @param argv raw command line arguments
   */
  public parse(argv: string[]): this {
    const args = argv.slice(2);

    // handle help & version
    const isHelp = args.length && /^-+h(elp)?$/.test(args[0]);
    if (!args.length || isHelp) { // case when no arguments passed, or explicitly -h|--help
      this._initHelpFromPath(this.COMMAND_DIR);
      if (isHelp) {
        this.help();
      }
    } else if (/^-+v(ersion)?$/.test(args[0])) { // case when explicitly -v|--version
      this.program.exec(argv);
    } else {
      // locate command in specified directory
      const commandModule: ICommandDefinition = this._loadCommand(this._normalizedArgs(args));
      if (commandModule) {
        // init with program
        const { name, ctor, subcommands } = commandModule;
        this.program.registerCommand(name, ctor, subcommands);
        // parse the program to invoke command run loop
        this.program.exec(argv);
      } else {
        this.logger.error(`Command '${this.logger.color.bold(args[0])}' was not found`);
        this.help();
        process.exit(1);
      }
    }

    return this;
  }

  /**
   * Manually output help text
   */
  public help(): this {
    this.program.help();
    return this;
  }
}
