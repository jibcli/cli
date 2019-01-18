import chalk from 'chalk';
import { EOL } from 'os';
import { Writable } from 'stream';
import { inspect } from 'util';
import { SPACE } from '../constants';

type TOutputMessage = string | object | Error;

export type TOutputWritable = Writable;

export interface IOutputStreamOptions {
  stream?: TOutputWritable;
}

export class OutputStream {
  /**
   * Provide own write stream
   * @param stream
   */
  public static stream(stream: TOutputWritable): typeof OutputStream {
    this._defaultStream = stream;
    return this;
  }
  protected static _defaultStream: TOutputWritable = process.stdout;

  /** ivar reference to chalk as 'color' */
  public color = chalk;

  constructor(protected _options: IOutputStreamOptions = {}) {
    const { _defaultStream } = this.constructor as typeof OutputStream;
    this._options = {
      stream: _defaultStream,
      ..._options,
    };
  }

  /**
   * Write messages to the stream
   * @param msgs messages to write
   */
  public write(...msgs: any[]): this {
    this.append(...msgs).stream.write(EOL);
    return this;
  }

  /**
   * Append text to existing line
   * @param msgs
   */
  public append(...msgs: any[]) {
    msgs.forEach((msg, i) => this.stream.write(`${i ? SPACE : ''}${this._format(msg)}`));
    return this;
  }

  /**
   * write messages and close the stream
   * @param msgs end stream with messages
   */
  public end(...msgs: any[]): this {
    this.write(...msgs);
    this.stream.end();
    return this;
  }

  /**
   * Print messages to the ui stream
   * @param msg messages to print
   */
  public output(...msg: any[]): this {
    return this.write(...msg);
  }

  /**
   * getter for the output stream
   */
  public get stream(): TOutputWritable {
    return this._options.stream;
  }

  /**
   * format message according to type
   * @param msg
   */
  protected _format(msg: TOutputMessage): any {
    if (msg instanceof Error) {
      return msg.message;
    } else if (typeof msg === 'object') {
      try {
        return JSON.stringify(msg, null, 2);
      } catch (e) {
        return inspect(msg);
      }
    }
    return msg;
  }

}
