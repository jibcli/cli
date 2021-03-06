import * as fs from 'fs';
import * as path from 'path';

import { ICommandCtor, ICommandDefinition, ICommandOption, isCommand } from './command';
import { Log, SPACE, Workspace } from './lib';
import { IProgramOptionCallback, IProgramOptions, Program } from './program';

/**
 * interface for fs scan result
 */
interface IScanResult {
  stats: fs.Stats;
  name: string;
  location: string;
}

/**
 * extension of main cli config with a working directory provided
 */
export interface ICLIOptions extends IProgramOptions {
  baseDir?: string; // working directory from which commands are based
}

/**
 * The main entrypoint for CLI argv parsing and execution
 */
export class CLI {

  public logger = new Log.Logger({name: this.constructor.name});
  public program: Program;

  private _arity: number;
  private _commandPath: string[];

  /**
   * Creates a new CLI parser instance
   *
   * ```ts
   * const cli = new CLI({
   *   baseDir: __dirname,
   *   commandDir: './relative/path/to/my/command/impls',
   *   commandDelim: ':', // use colons instead of spaces to traverse command tree
   * });
   * ```
   * @param options configurations or overrides to package.json configuration
   */
  constructor(private options?: ICLIOptions) {
    // construct options
    this.options = {
      // location of application running the process
      baseDir: Workspace.resolveRootDir(),
      ...(options || {} as ICLIOptions),
    };

    // instantiate main program
    try {
      this.program = this._initProgram();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  /**
   * Add help text to the main program
   * @param heading Add ui heading
   * @param body Help text to show
   * @param raw Flag to output the raw text without formatting
   */
  public addGlobalHelp(heading: string, body?: string, raw?: boolean): CLI {
    this.program.globalHelp(heading, body, raw);
    return this;
  }

  /**
   * Add global options to the main program
   * @param option global option configuration object
   * @param cb parsed option value callback
   */
  public addGlobalOption<T>(option: ICommandOption, cb?: IProgramOptionCallback<T>): CLI {
    this.program.globalOption<T>(option, cb);
    return this;
  }

  /**
   * Main execution method.
   * Parse arguments from the command line and run the program.
   *
   * ```ts
   * import { CLI } from '@jib/cli';
   *
   * const parser = new CLI({
   *   // options
   * });
   * parser.parse(process.argv);
   * ```
   * @param argv raw command line arguments
   */
  public parse(argv: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // normalize arguments to parse
      const rargs = this._normalizedArgs(argv.slice(2));
      const args = this.program.root.argShift(rargs);
      const fail = (e: Error) => {
        this.logger.error(e);
        this.logger.debug(e.stack);
        reject(e);
        process.exit(1);
      };

      const { rootCommand } = this.program.config;

      // placeholder for module resolution
      let commandModule: ICommandDefinition;

      // locate command according to arguments/options
      commandModule = this._locateCommand(this._commandRoot, args) ||
        rootCommand && this._locateCommand(this._commandRoot, [rootCommand].concat(args));

      if (commandModule) {
        const { name, tree, ctor, subcommands } = commandModule;
        // register the command handler
        if (name === rootCommand) { // single command
          this.program.registerRoot(ctor);
        } else {
          this.program.registerCommand(tree, ctor, subcommands);
        }
      } else if (args.length) {
        return fail(new Error(`Command '${args[0]}' was not found`));
      } else {
        // help | version
        this._initHelp(this._commandRoot);
      }

      // parse the program to invoke command run loop
      return this.program.exec(rargs, this._commandPath)
        .then(resolve)
        .catch(fail);
    });
  }

  /**
   * Manually output help text
   */
  public help(): CLI {
    this.program.help();
    return this;
  }

  /**
   * Resolve configurations and initialize the main program.
   */
  private _initProgram(): Program {
    const options = Workspace.resolveConfig(this.options);
    this.options.commandDir = options.commandDir;
    return new Program(options);
  }

  /**
   * get the absolute command dir
   */
  private get _commandRoot(): string {
    const { baseDir, commandDir } = this.options;
    return path.join(baseDir, commandDir);
  }

  /**
   * locate command by right recursive argv lookup.
   * NOTE: CLI strategy precludes aliasing with commander.
   * @param dir directory where to load
   * @param args argument list to detect command
   */
  private _locateCommand(dir: string, args: string[]): ICommandDefinition {

    let i = args.length;
    let command: ICommandDefinition;

    while (i--) {
      // find command at argument path
      const cmdFilePath = path.join(dir, ...args.slice(0, i + 1));
      const cmdPath = args.slice(0, i + 1);
      const name = args[i];
      this.logger.debug(`Attempt load ${cmdFilePath}`);
      let mod: any;
      try { // require() fails for nonsensical paths
        mod = require(cmdFilePath);
        const ctor = this._extractCommandCtor(mod);

        // if valid ctor is found, then we can instantiate
        if (ctor) {
          command = {
            name,
            ctor,
            file: cmdFilePath,
            tree: cmdPath,
          };
          break;
        }
      } catch (e) { /* noop on require exception */ }

      if (!mod && fs.existsSync(cmdFilePath)) {
        if (fs.statSync(cmdFilePath).isDirectory()) {
          // NOTE: Cannot register all sub commands because they will overwrite each other.
          // file does not exist, but directory does, so a command is synthesized
          // to register subcommand options
          // this.logger.debug(`Command directory: ${cmdPath.join(commandDelim)}`)
          command = {
            name,
            tree: cmdPath,
            subcommands: this._scanSubcommands(cmdFilePath, cmdPath),
          };

          break;
        }
      }
    }
    // assign depth and ref
    this._arity = i + 1;
    this._commandPath = args.slice(0, this._arity);
    return command;
  }

  /**
   * Scan a directory for potential command resources
   * @param dir directory to scan
   */
  private _scanDir(dir: string): IScanResult[] {
    return Workspace.listRequirable(dir)
      .map(item => {
        const location = path.join(dir, item);
        const name = item.replace(/\.\w+$/, ''); // remove extension for name
        return {
          name,
          location,
          stats: fs.statSync(location),
        };
      });
  }

  /**
   * scan a directory for subcommands
   * @param dir the directory to scan
   * @param ancestry prior ancestry
   */
  private _scanSubcommands(dir: string, ancestry: string[]): ICommandDefinition[] {
    return this._scanDir(dir)
      .map(({name, location, stats}) => {
        const def: ICommandDefinition = {
          name,
          tree: [...ancestry, name],
        };
        if (stats.isFile()) {
          def.ctor = this._extractCommandCtor(require(location));
        } else {
          def.subcommands = this._scanSubcommands(location, def.tree);
        }
        return def;
      });
  }

  /**
   * resolve an exported command from module exports
   * @param mod a module loaded with require()
   */
  private _extractCommandCtor(mod: any): ICommandCtor {
    let ctor: ICommandCtor;
    if (!isCommand(mod)) { // as in case of multiple exports: export class Foo ...
      // iterate exports to find command class
      for (const exp in mod) {
        if (isCommand(mod[exp])) {
          ctor = mod[exp];
          break;
        }
      }
    } else {
      // when export is the command Ctor (export = Foo...)
      ctor = mod;
    }
    return ctor;
  }

  /**
   * Provide command help for the current path
   * @param dir directory of commands
   * @param parent parent command list
   */
  private _initHelp(dir: string, parent?: string[]): CLI {

    const cmdPath: string[] = [...(parent || [])];
    this._scanDir(dir)
      .forEach(result => {
        // format command name syntax
        const tree = cmdPath.concat(result.name);

        if (result.stats.isDirectory()) {
          // check and skip if file by same name as directory exists
          if (!fs.existsSync(`${result.location}.js`) && !fs.existsSync(`${result.location}.ts`)) {
            // init without class
            this.program.registerCommandHelp(tree, null, []);
          } else {
            // has directory AND file by that name hmm...
          }
        } else {
          // load command path
          const mod = require(result.location);
          const ctor = this._extractCommandCtor(mod);
          if (ctor) {
            this.program.registerCommandHelp(tree, ctor);
          }
        }
      });

    return this;
  }

  /**
   * normalize raw arguments into an array of individual components
   * @param args raw arguments
   */
  private _normalizedArgs(args: string[]): string[] {
    const { commandDelim } = this.program.config;
    return commandDelim !== SPACE && args && args.length ?
      // reduce the args to a normalized array, without delimiters
      args.reduce((result: {did?: boolean, list: string[]}, arg) => {
        if (!result.did) {
          const list = arg.split(commandDelim);
          result.did = list.length > 1;
          result.list.push(...list);
        } else {
          result.list.push(arg);
        }
        return result;
      }, {list: []}).list : args;
  }
}
