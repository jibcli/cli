import { Collector, CollectorEvent, CollectorOpt, Flag, ICollectorResult, IResolvedOptionListener} from './collector';
import { getCommandMeta, ICommandCtor, ICommandDefinition, ICommandOption } from './command';
import { CONSTANTS, Log, SPACE, UI } from './lib';
import { IProjectConfig } from './project';

/**
 * Callback for an option with value callback
 */
export interface IProgramOptionCallback<T> extends IResolvedOptionListener<T> {
  (value: T, helper: { ui: UI.Writer; logger: Log.Logger; }): void;
}

/**
 * extend package config
 */
export interface IProgramOptions extends IProjectConfig {
  version?: string;
}

/**
 * Global program options
 */
export interface IGlobalOptions {
  version?: boolean;
  help?: boolean;
}

/**
 * Main program registry
 */
export class Program {

  // define ivars
  public root: Collector;
  private _ui = new UI.Writer();
  private _logger = new Log.Logger({ name: this.constructor.name });
  private _rargs: string[];
  private _done: (value?: void | PromiseLike<void>) => void;
  private _err: (err: Error) => void;
  private _registry = new Map<Collector, ICommandCtor>();

  /**
   * Create the program executor
   * @param options program options for command handling
   */
  constructor(private readonly options: IProgramOptions = {}) {
    // ensure required configs
    options.commandDelim = options.commandDelim || CONSTANTS.COMMAND_DELIMITER;
    // validate delimiter
    if (options.commandDelim.length !== 1) {
      throw new Error(`Invalid delimiter '${options.commandDelim}'. Must have length === 1`);
    }
    // register plugins
    this._registerPlugins();
    // create main cli connector
    this.root = new Collector(null);
    this.root.help().version(this.version);
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
   * @param names the command names (hierarchy) to be registered
   * @param ctor the command implementation constructor
   */
  public registerCommandHelp(
    names: string[],
    ctor?: ICommandCtor,
    subcommands?: ICommandDefinition[]): Collector {
    return !(ctor && getCommandMeta(ctor).hidden) ? this.registerCommand(names, ctor, subcommands) : null;
  }

  /**
   * Register a class as the handler for the root command
   * @param ctor The root command "default" implementation
   */
  public registerRoot(ctor?: ICommandCtor): Collector {
    this._registerMeta(this.root, ctor);
    this._attachHandlers(this.root, ctor);
    return this.root;
  }

  /**
   * register a resolved command by its name and constructor
   * @param names the command names as registered
   * @param ctor the instance contstructor
   * @param subcommands Subcommands of the parent. If zero-length array,
   * it is assumed subcommands exist so '<subcommand>' will be used
   */
  public registerCommand(
    tree: string[], ctor?: ICommandCtor, subcommands?: ICommandDefinition[]): Collector {
    // this._logger.debug(`Registering command with syntax '${tree}'`);

    // create new child adapter
    let child: Collector;
    if (ctor) {
      // setup command from static annotations
      child = this._command(tree);
      this._registerMeta(child, ctor);

    } else if (subcommands) {

      if (subcommands.length) {
        child = this._command(tree);
        // subcommands exist, so we can register them with the adapter
        subcommands.forEach((sub: ICommandDefinition) => {
          const desc = sub.ctor ? getCommandMeta(sub.ctor).description : '...';
          child.subcommand(sub.name, desc);
        });
      } else {
        // subcommands exist but are stubbed
        child = this._command(tree.concat('<subcommand>'));
      }
    }

    // where rubber meets road...
    this._attachHandlers(child, ctor);

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
      const flag = new Flag(option.flag);
      this.root.onOption<T>(flag.name, val => {
        cb(val, {
          ui: this._ui,
          logger: this._logger,
        });
      });
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
   * @param argv argv as passthrough to the command collector
   * @param path command invocation path
   */
  public exec(argv: string[], path: string[] = []): Promise<void> {
    return this._deferred(() => this.root.resolve(argv)
      .then((result: ICollectorResult) => {
        const { collector, args } = result;
        const options: IGlobalOptions = result.options;
        const ctor = this._registry.get(collector);
        this._logger.debug(`Resolved ${collector.name()} => ${ctor && ctor.name}`);

        if (collector.isRoot() && options[CollectorOpt.VERSION]) {
          this._ui.output(this.version);
          return this._done();
        } else if (options[CollectorOpt.HELP] || !ctor) {
          const usage = collector.usage();
          this.help(collector);
          collector.emit(CollectorEvent.HELP, usage); // invoke for custom help
        } else {
          // instantiate and run
          try {
            const instance = new ctor();
            // assign raw arguments
            instance.argv = result.argv;
            // invoke run with options and parsed args
            const p = instance.run(options, ...args);

            if (p && p instanceof Promise) {
              p.then(this._done).catch(this._err);
            } else {
              this._logger.warn(`${ctor.name}::run method should return a Promise`);
            }
          } catch (e) {
            return this._err(e);
          }
        }
      }).catch(this._err));
  }

  /**
   * output help text
   */
  public help(collector?: Collector): void {
    const usage = (collector || this.root).usage();
    const { commandDelim } = this.options;
    const { desc, options, args, subcommands } = usage;
    // show usage
    const syntax = [usage.path.concat(subcommands.length ? '<command>' : [])
                      .filter(p => !!p)
                      .join(commandDelim),
                    options.length && '[options]',
                    ...args.map(row => row[0]),
                  ].join(SPACE);
    this._ui.paragraph(`Usage: ${syntax}`);
    if (desc) {
      this._ui.paragraph(desc);
    }

    this._helpSection(`Arguments`, args)
      ._helpSection('Options', options)
      ._helpSection('Commands', subcommands.map(sub => {
        const subSyntx = [sub.name].concat(sub.subcommands.length ? '<command>' : []).join(commandDelim);
        return [subSyntx, sub.desc];
      }));
    // EOL
    this._ui.output();
  }

  private _helpSection(title: string, grid?: UI.IOutputGrid): this {
    if (grid && grid.length) {
      this._ui.outputSection(title, this._ui.grid(grid));
    }
    return this;
  }

  /**
   * register plugins with the plugin manager
   */
  private _registerPlugins(): void {
    /** noop for now */
  }

  /**
   * create a command for the CLI processor
   * @param tree - command name/syntax tree
   * @param desc - description for the command
   * @return A command bound to the main program
   */
  private _command(tree: string[], desc?: string): Collector {
    return tree
      .reduce((parent: Collector, name: string) => parent.subcommand(name), this.root)
      .description(desc || null);
  }

  /**
   * Apply command constructor annotation metadata to the adapter implementation
   * @param adapter adapter to which command is bound
   * @param ctor command constructor
   */
  private _registerMeta(adapter: Collector, ctor: ICommandCtor): Collector {
    const meta = getCommandMeta(ctor);
    adapter.description(meta.description)
      .argument(...(meta.args || [])) // set argument syntax
      .option(...(meta.options || [])) // apply options
      .unknowns(meta.allowUnknown);
    return adapter;
  }

  /**
   * Attach handlers to the adapter from the command implementation
   * @param adapter A registered command processing adapter
   * @param ctor The command implementation constructor
   */
  private _attachHandlers(adapter: Collector, ctor?: ICommandCtor): void {
    this._registry.set(adapter, ctor);
    // attach custom help handler
    adapter.onHelp(() => {
      const inst = ctor && new ctor();
      return this._done(inst && inst.help && inst.help());
    });
    return;
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

}
