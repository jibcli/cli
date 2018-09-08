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
  FOUR,
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
   * Output an aligned grid of the text matrix
   * @param table matrix of rows/cols
   * @param spacing spacing between items
   */
  public outputGrid(table: (string | number)[][], spacing = UITab.TWO): this {
    return this.outputLines(this.grid(table, spacing));
  }

  /**
   * Create an aligned grid of the text matrix. Very basic for the time-being
   * @param table matrix of rows/cols
   * @param spacing spacing between items
   */
  public grid(table: (string | number)[][], spacing = UITab.TWO): string {
    let widths = this._colWidths(table);
    const rows = table.reduce((list: string[], row: string[]) => {
      
      // determine the number of lines in this row
      const linesInRow = Math.max(...row
        .map(cell => this._lines(cell + '').length));

      // prefill a subgrid array
      const subgrid: string[][] = Array.apply(null, new Array(linesInRow))
        .map(() => new Array(widths.length));
    
      // adjust cells in each row by the column width
      row.map(cell => cell + '') // to string
        .forEach((text: string, col: number) => {
          const w = widths[col];
          let lines = this._lines(text);
          for (let i=0; i<subgrid.length; i++) {
            // create new cells for this line
            let cellText = (lines[i] || '').trim();
            let clean = cleanText(cellText);
            const diff = w - clean.length;
            const rpad = diff > 0 ? new Array(diff + 1).join(' ') : '';

            subgrid[i][col] = cellText + rpad;
          }
        });

      return list.concat(subgrid.map(cells => cells.join(this._indent(spacing))));
    }, [] as string[]);

    return rows.join('\n');
  }

  /**
   * determine col widths from a rows/colums in a table
   * @param table 
   */
  private _colWidths(table: (string | number)[][]): number[] {
    let widths: number[] = [];
    table.forEach(row => {
      row.forEach((cell, col) => {
        const cellW = this._lines(cleanText(`${cell}`)).map(line => line.length);
        widths[col] = Math.max(widths[col] || 0, ...cellW);
      });
    });
    return widths;
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
    return this._lines(text).map(line => `${this._indent(tabs)}${line.trim()}`).join('\n');
  }

  /**
   * Lineify text
   * @param text text to convert to lines
   */
  private _lines(text: string | string[]): string[] {
    const chunks = [].concat(text);
    const lines = [].concat(...chunks.map(item => item.trim().split('\n')));
    return lines;
  }

  /**
   * getter for the output stream
   */
  public get stream(): UIStream {
    return this._options.stream;
  }

}

export function cleanText(text: string): string {
  return text.replace(/\x1B\[(?:[0-9]{1,2}(?:;[0-9]{1,2})?)?[m|K]/g, '');
}