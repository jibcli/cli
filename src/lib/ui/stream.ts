import chalk from 'chalk';
import { Writable } from 'stream';
import { inspect } from 'util';

type TOutputMessage = string | object | Error;

export type TOutputWritable = Writable;

export interface IOutputStreamOptions {
  stream?: TOutputWritable;
}

export class OutputStream {
  /** ivar reference to chalk as 'color' */
  public color = chalk;

  constructor(protected _options: IOutputStreamOptions = {}) {
    this._options = {
      stream: process.stdout as TOutputWritable, // default
      ..._options,
    };
  }

  /**
   * Write messages to the stream
   * @param msgs messages to write
   */
  public write(...msgs: any[]): this {
    msgs.forEach((msg, i) => this.stream.write(`${i ? ' ' : ''}${this._format(msg)}`));
    this.stream.write(`\n`);
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
      return msg;
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
