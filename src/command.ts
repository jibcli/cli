import { CommandAdapter, ICommandArgument, ICommandOption } from './adapter';
import { Logger, UIWriter } from './lib';


/**
 * Interface for the decorated command implementation constructor
 */
export interface ICommandCtor<T extends BaseCommand> {
  hidden: boolean;
  description: string;
  args: ICommandArgument[];
  options: ICommandOption[];
  ctor: ICommandCtor<T>;
  init(command: CommandAdapter, ...argv: string[]): void;
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
  run(...args: any[]): Promise<any>;
}

/**
 * Annotations object for the Command implementation decorator
 */
export interface Command {
  /**
   * Describe what the command does
   */
  description: string;
  /**
   * Define custom usage syntax
   */
  usage?: string;
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
   ```typescript
   options: [
     { flag: '-f, --file <name>', description: 'file name', fn: /\.zip$/ }
   ]
   ```
   */
  options?: ICommandOption[];
  /**
   * If true, allows any options/flags to pass through the parser. This is useful
   * when command execution is delegated.
   */
  allowUnknownOption?: boolean;
  /**
   * Command should be hidden
   */
  hidden?: boolean;
}

/**
 * Command Implementation class decorator
 * @param annotations decorator annotation object
 * @example
 *
 ```typescript
 @Command({
   description: 'My super command',
   args: [
     { name: 'argone', optional: true }, // optional argument
   ],
   options: [
     { flag: '-f, --file <name>', description: 'input file'}
   ]
 })
 export class SuperCommand extends BaseCommand {
   public async run(argone: string, options: {file?: string}): Promise<any> {
     // ...
   }
 }
 ```
 */
export const Command = (annotations: Command): Function => { // decorator factory
  return <T extends ICommandCtor<CommandImplementation>>(ctor: T) => { // class decorator
    const { hidden, description, usage, args, options, allowUnknownOption } = annotations;
    // extend the decorated class ctor
    class CommandImpl extends ctor {
      // use annotations to seed static properties for reading without initializing
      public static readonly hidden = hidden;
      public static readonly usage = usage;
      public static readonly description = description;
      public static readonly args: ICommandArgument[] = args || [];
      public static readonly options: ICommandOption[] = options;
      public static readonly allowUnknown: boolean = allowUnknownOption ? true : false;
      /**
       * static getter for the (typed) constructor
       */
      public static get ctor(): ICommandCtor<CommandImplementation> {
        return <ICommandCtor<CommandImplementation>>this;
      }

      /**
       * init program with this command
       * @param program - command runner to which this is bound
       */
      public static init(adapter: CommandAdapter): void {
        
        // setup program
        adapter
          .description(this.description)
          .arguments(this.args) // set argument syntax
          .option(...(this.options || [])) // apply options
          .allowUnknown(this.allowUnknown);

      }

      /**
       * command specific help text emitter
       * commands must write the text as well
       */
      public help(): void {
        return super.help && super.help();
      }

    }

    return CommandImpl;
  };
};

/**
 * BaseCommand abstract which all implementations should extend.
 */
export abstract class BaseCommand {
  // ivars
  public logger = new Logger();
  public ui = new UIWriter();

  /**
   * Command action runner.
   * @param args - Command arguments where last representing the options object
   */
  public abstract async run(...args: any[]): Promise<any>;

}
