import { inspect } from 'util';
import { Writable } from 'stream';
import chalk from 'chalk';

import { CONSTANTS } from '../constants';

export type UIStream = Writable;

export type UIMessage = string | object | Error;

export interface IUIOptions {
  stream?: UIStream,
}

export enum UITab {
  ONE = 1,
  TWO,
  THREE,
};

export class UIWriter {
  /** ivar reference to chalk as 'color' */
  public color = chalk;

  constructor(protected _options: IUIOptions = {}) {
    this._options = {
      stream: process.stdout as UIStream, // default
      ..._options
    };
  }

  /**
   * Write messages to the stream
   * @param msgs messages to write
   */
  public write(...msgs: any[]): this {
    msgs.forEach((msg, i) => this.stream.write(`${i ? ' ' : ''}${this._format(msg)}`))
    this.stream.write(`\n`);
    return this;
  }

  /**
   * write messages and close the stream
   * @param msgs 
   */
  public end(...msgs: any[]): this {
    this.write(...msgs);
    this.stream.end();
    return this;
  }

  /**
   * format message according to type
   * @param msg
   */
  protected _format(msg: UIMessage): any {
    if (msg instanceof Error) {
      return msg;
    } else if (typeof msg === 'object') {
      try {
        return JSON.stringify(msg, null, UITab.TWO);
      } catch (e) {
        return inspect(msg);
      }
    }
    return msg;
  }

  /**
   * Print messages to the ui stream
   * @param msg messages to print
   */
  public output(...msg: any[]): this {
    return this.write(...msg);
  }

  /**
   * Print a section to the ui with heading.
   * @param heading section heading
   * @param body section text
   */
  public outputSection(heading: string, body: string | string[]): this {
    return this.write(`\n${this._indent(UITab.ONE)}${heading}:\n\n${this._indentLines(body, UITab.TWO)}`)
  }

  /**
   * Print a multiline message with specified indentation
   * @param body message to print
   * @param tabs indentation tabs (1 tab = 2 spaces)
   */
  public outputLines(body: string | string[], tabs = UITab.TWO): this {
    return this.write(this._indentLines(body, tabs));
  }

  /**
   * get indent by tabs
   * @param tabs
   */
  private _indent(tabs = UITab.ONE) {
    return new Array(tabs + 1)
      .join(CONSTANTS.INDENTATION);
  }

  /**
   * format text with same indent for each line
   * @param text
   * @param tabs
   */
  private _indentLines(text: string | string[], tabs = UITab.ONE): string {
    const chunks = [].concat(...[text]);
    const lines = [].concat(...chunks.map(item => item.trim().split('\n')));
    return lines.map(line => `${this._indent(tabs)}${line.trim()}`).join('\n');
  }

  /**
   * getter for the output stream
   */
  public get stream(): UIStream {
    return this._options.stream;
  }

}
