import chalk from 'chalk';
import { IOutputStreamOptions, OutputStream, TOutputWritable } from '../ui';

/**
 * Module to handle logging outputs
 */
export namespace Log {

  export enum LOG_LEVEL {
    OFF = 0,
    TRACE = 1,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL,
  }

  /**
   * Map of log level color treatments
   */
  const LogLevelChalkMap = new Map<LOG_LEVEL, string>([
    [LOG_LEVEL.TRACE, 'dim'],
    [LOG_LEVEL.DEBUG, 'gray'],
    [LOG_LEVEL.INFO, 'cyan'],
    [LOG_LEVEL.WARN, 'yellow'],
    [LOG_LEVEL.ERROR, 'red'],
    [LOG_LEVEL.FATAL, 'red'],
  ]);

  export type TLoggerStream = TOutputWritable;

  export type TLogFn = (...msg: any[]) => any;
  /**
   * Basic interface for any logger implementation
   */
  export interface ILogger {
    name?: string;
    trace: TLogFn;
    debug: TLogFn;
    info: TLogFn;
    warn: TLogFn;
    error: TLogFn;
    fatal: TLogFn;
  }

  /**
   * Options for a logger instance
   */
  export interface ILoggerOptions extends IOutputStreamOptions {
    name?: string;
    level?: LOG_LEVEL;
    stream?: TLoggerStream;
  }

  /**
   * Standard logger instance for the program and its commands
   * @todo Allow BYO logger
   */
  export class Logger extends OutputStream implements ILogger {

    /**
     * Set a default level to be used by all logger instantantiations
     * @param level default level used for Logger instances
     */
    public static setDefaultLevel(level: LOG_LEVEL): void {
      this._defaultLevel = level;
    }

    /**
     * set a default logger instance
     * @param logger the logger implementation to use
     */
    public static setDefaultLogger(logger: ILogger): void {
      this._default = logger;
    }

    /**
     * Provide a logging interface to use
     * @param logger alternate logger to utilize
     */
    public static provide(logger: ILogger): void {
      this.setDefaultLogger(logger);
    }

    /**
     * Get a singleton, default logger instance.
     * @param options options for the default logger, when not yet instantiated
     */
    public static defaultLogger(options?: ILoggerOptions): ILogger {
      if (!this._default) {
        this._default = new this(options);
      }
      return this._default;
    }

    private static _default: ILogger;
    private static _defaultLevel: LOG_LEVEL = LOG_LEVEL.WARN;
    public name: string;
    private _level: LOG_LEVEL;

    constructor(options: ILoggerOptions = <ILoggerOptions> { }) {
      super(options);
      this.name = options.name || null;
      this._level = options.level || Logger._defaultLevel;
    }

    /**
     * log level setter
     * @param level log level to set
     */
    public setLevel(level: LOG_LEVEL): Logger {
      this._level = level;
      return this;
    }

    /**
     * Trace log
     * @param msg messages to log
     */
    public trace(...msg: any[]): Logger {
      return this._log(msg, LOG_LEVEL.TRACE);
    }
    /**
     * Debug log
     * @param msg messages to log
     */
    public debug(...msg: any[]): Logger {
      return this._log(msg, LOG_LEVEL.DEBUG);
    }
    /**
     * Info log
     * @param msg messages to log
     */
    public info(...msg: string[]): Logger {
      return this._log(msg, LOG_LEVEL.INFO);
    }
    /**
     * Warn log
     * @param msg messages to log
     */
    public warn(...msg: (string | Error)[]): Logger {
      return this._log(msg, LOG_LEVEL.WARN);
    }
    /**
     * Error log
     * @param msg messages to log
     */
    public error(...msg: (string | Error)[]): Logger {
      return this._log(msg, LOG_LEVEL.ERROR);
    }
    /**
     * Fatal log
     * @param msg messages to log
     */
    public fatal(msg: Error): Logger {
      return this._log([msg], LOG_LEVEL.FATAL);
    }

    /**
     * Write the log messages to the stream
     * @param msgs messages to write
     * @param level log level to write
     */
    private _log(msgs: any[], level: LOG_LEVEL): Logger {
      const { _default } = this.constructor as typeof Logger;
      if (_default) {
        const method = LOG_LEVEL[level].toLowerCase() as keyof ILogger;
        if (_default[method]) {
          (_default[method] as TLogFn)(...msgs);
        }
      } else if (this._level && level >= this._level) {
        const { name } = this;
        // colorize level label
        const label = chalk.bold(chalk[LogLevelChalkMap.get(level)](LOG_LEVEL[level]));
        const nameLabel = name ? chalk.dim(` (${name})`) : '';
        this.write(`${label}${nameLabel}:`, ...msgs);
      }
      return this;
    }

  }
}
