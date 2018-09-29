import { ICommandArgument, ICommandOption } from './adapter';
import { /*Extensible,*/ Log, UI } from './lib';
import { ICtor, isCtor } from './lib/ctor';
import { GetToken } from './lib/token';

/**
 * Definition for a parsed command implementation
 * @private
 */
export interface ICommandDefinition {
  name: string;
  tree: string[];
  file?: string;
  ctor?: ICommandCtor;
  subcommands?: ICommandDefinition[];
}

/**
 * Annotation metadata for the Command implementation decorator
 */
export interface Command {
  /**
   * Describes what the command does for help rendering
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
 * Command Implementation decorator factory
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
export function Command(annotations: Command): (ctor: any) => any { // decorator factory
  return <T extends ICommandCtor>(ctor: T): T => { // class decorator
    CommandRegistry.set(ctor, annotations);
    return ctor;
  };
}

/**
 * Interface for the decorated command implementation constructor
 */
export interface ICommandCtor extends ICtor<ICommand> {
}

/**
 * Interface to denote an implementation of required abstract
 * methods in BaseCommand
 */
export interface ICommand extends BaseCommand {
  help?(): void;
  run(options: any, ...args: any[]): Promise<any>;
}

/**
 * A reference of commands and their annotation metadata
 * @internal
 */
const CommandRegistry = new Map<ICommandCtor, Command>();

/**
 * Test an object for type
 * @param type object to check against registry
 * @internal
 */
export const isCommand = (type: any): type is ICommandCtor => isCtor(type) && CommandRegistry.has(type);

/**
 * Gets annotation metadata for a command from its constructor
 * @param ctor a command constructor
 * @internal
 */
export const getCommandMeta = (ctor: ICommandCtor): Command => CommandRegistry.get(ctor);

/**
 * The token for extensibility of the base command
 */
export const COMMAND_TOKEN = GetToken('command');
/**
 * Command abstract defining the implementation contract,
 * which all implementations _should_ extend.
 * It also provides a layer of abstraction for `ui` and `logger` members.
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
// @Extensible<BaseCommand>(COMMAND_TOKEN, {
//   restricted: ['ui'],
//   args: self => self,
// })
export abstract class BaseCommand implements ICommand {

  /** reference to raw args used in the invocation */
  public argv: string[] = [];
  /** ui writer instance */
  public ui = new UI.Writer();
  /** logging instance */
  public logger: Log.Logger = new Log.Logger({ name: this.constructor.name });

  /**
   * Command action runner.
   * @param options Parsed options for the command invocation
   * @param args Any arguments passed to the command
   */
  public abstract async run(options: object, ...args: any[]): Promise<any>;

}
