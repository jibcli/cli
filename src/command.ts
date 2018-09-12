import { ICommandArgument, ICommandOption } from './adapter';
import { Log, UI } from './lib';


/**
 * Interface for the decorated command implementation constructor
 */
export interface ICommandCtor<T extends BaseCommand> {
  hidden: boolean;
  description: string;
  args: ICommandArgument[];
  options: ICommandOption[];
  allowUnknown: boolean;
  ctor: ICommandCtor<T>;
  new (...args: any[]): T;
}

/**
 * Definition for a parsed command implementation
 * @private
 */
export interface ICommandDefinition {
  name: string;
  path: string[];
  args?: string[];
  ctor?: ICommandCtor<CommandImplementation>;
  subcommands?: ICommandDefinition[];
}

/**
 * Interface to denote an implementation of required abstract
 * methods in BaseCommand
 */
export interface CommandImplementation extends BaseCommand {
  help?(): void;
  run(options: any, ...args: any[]): Promise<any>;
}

/**
 * Annotations object for the Command implementation decorator
 */
export interface ICommand {
  /**
   * Describe what the command does
   */
  description: string;
  /**
   * Specify arguments expected by the command. All arguments will be passed to
   * the `run` method in the order which they are declared. If providing variadic
   * arguments with `multi: true`, then this must be the last argument listed.
   */
  args?: ICommandArgument[];
  /**
   * Define command options (flags) to be parsed. All options will be passed to
   * the `run` method as the **first** argument, where the key is always the "--long"
   * name declared in the option flag syntax.
   *
   * Using the `fn` property as a callback supports accepting multiple values
   * in a manner like Array.prototype.reduce: `(val: any, values: any) => any)`
   * where the first argument is the current value, the second argument is the
   * aggregated values to that point, and the new object is returned.
   *
   * ```typescript
   * options: [
   *   { flag: '-f, --file <name>', description: 'file name', fn: /\.zip$/ }
   * ]
   * ```
   */
  options?: ICommandOption[];
  /**
   * If true, allows any options/flags to pass through the parser. This is useful
   * when command execution is delegated to other APIs.
   */
  allowUnknown?: boolean;
  /**
   * Command should be hidden
   */
  hidden?: boolean;
}

/**
 * Command Implementation class decorator
 *
 * ```typescript
 * @Command({
 *   description: 'My super command',
 *   args: [
 *     { name: 'somearg', optional: true }, // optional argument
 *   ],
 *   options: [
 *     { flag: '-f, --file <name>', description: 'input file'}
 *   ]
 * })
 * export class MyCommand extends BaseCommand {
 *   public async run(options: {file?: string}, somearg?: string) {
 *     // ...
 *   }
 * }
 * ```
 * @param annotations decorator annotation object
 */
export function Command(annotations: ICommand): Function { // decorator factory
  return <T extends ICommandCtor<CommandImplementation>>(ctor: T) => { // class decorator
    const { hidden, description, args, options, allowUnknown } = annotations;
    // extend the decorated class ctor
    class CommandImpl extends ctor {
      // use annotations to seed static properties for reading without initializing
      public static readonly hidden = hidden;
      public static readonly description = description;
      public static readonly args: ICommandArgument[] = args || [];
      public static readonly options: ICommandOption[] = options;
      public static readonly allowUnknown: boolean = null == allowUnknown ? false : true;
      /**
       * static getter for the (typed) constructor
       */
      public static get ctor(): ICommandCtor<CommandImplementation> {
        return <ICommandCtor<CommandImplementation>>this;
      }

      /**
       * Command specific help text emitter.
       * Implementations must write the text as well
       */
      public help(): void {
        return super.help && super.help();
      }

    }

    return CommandImpl;
  };
};

/**
 * Command abstract which all implementations should extend.
 * This allows the parser to detect Command implementations,
 * and provides a layer of abstraction for `ui` and `logger` instantiation.
 * 
 * ```typescript
 * @Command({
 *   description: 'a useful command of some kind'
 * })
 * export MyCommand extends BaseCommand {
 *  public async run(options: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export abstract class BaseCommand {
  // ivars
  public logger = new Log.Logger();
  public ui = new UI.Writer();

  /**
   * Command action runner.
   * @param options Parsed options for the command invocation
   * @param args Any arguments passed to the command
   */
  public abstract async run(options: any, ...args: any[]): Promise<any>;

}
