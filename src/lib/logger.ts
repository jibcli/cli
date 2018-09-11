import chalk from 'chalk';
import { UIWriter, UIStream, IUIOptions } from './ui/writer';

export enum LOG_LEVEL {
  OFF = 0,
  TRACE = 1,
  DEBUG,
  INFO,
  WARN,
  ERROR,
  FATAL,
};

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

export type LoggerStream = UIStream;

export interface ILoggerOptions extends IUIOptions {
  name?: string;
  level?: LOG_LEVEL;
  stream?: LoggerStream;
}

export class Logger extends UIWriter {
  private static _default: Logger;
  private static _defaultLevel: LOG_LEVEL = LOG_LEVEL.WARN;
  private _level: LOG_LEVEL;
  public name: string;

  public static setDefaultLevel(level: LOG_LEVEL): void {
    this._defaultLevel = level;
  }

  /**
   * Get a singleton, default logger instance.
   * @param options options for the default logger, when not yet instantiated
   */
  public static defaultLogger(options?: ILoggerOptions): Logger {
    if (!this._default) {
      this._default = new this(options);
    }
    return this._default;
  }

  constructor(options: ILoggerOptions = <ILoggerOptions>{}) {
    super(options);
    this.name = options.name || null;
    this._level = options.level || Logger._defaultLevel;
  }

  private _log(msgs: any[], level: LOG_LEVEL): this {
    if (this._level && level >= this._level) {
      const { name } = this;
      // colorize level label
      const label = chalk.bold(chalk[LogLevelChalkMap.get(level)](LOG_LEVEL[level]));
      const nameLabel = name ? chalk.dim(` (${name})`) : '';
      this.write(`${label}:${nameLabel}`, ...msgs);
    }
    return this;
  }

  /**
   * output stream getter
   */
  public get stream(): LoggerStream {
    return this._options.stream;
  }

  /**
   * log level setter
   * @param level log level to set
   */
  public setLevel(level: LOG_LEVEL): this {
    this._level = level;
    return this;
  }

  /**
   * Trace log
   * @param msg messages to log
   */
  public trace(...msg: any[]): this {
    return this._log(msg, LOG_LEVEL.TRACE);
  }
  /**
   * Debug log
   * @param msg messages to log
   */
  public debug(...msg: any[]): this {
    return this._log(msg, LOG_LEVEL.DEBUG);
  }
  /**
   * Info log
   * @param msg messages to log
   */
  public info(...msg: string[]): this {
    return this._log(msg, LOG_LEVEL.INFO);
  }
  /**
   * Warn log
   * @param msg messages to log
   */
  public warn(...msg: (string | Error)[]): this {
    return this._log(msg, LOG_LEVEL.WARN);
  }
  /**
   * Error log
   * @param msg messages to log
   */
  public error(...msg: (string | Error)[]): this {
    return this._log(msg, LOG_LEVEL.ERROR);
  }
  /**
   * Fatal log
   * @param msg messages to log
   */
  public fatal(msg: Error): this {
    return this._log([msg], LOG_LEVEL.FATAL);
  }

}
