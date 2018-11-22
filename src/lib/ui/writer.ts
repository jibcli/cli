import chalk from 'chalk';
import { EOL } from 'os';
import { CONSTANTS, SPACE } from '../constants';
import { OutputStream } from './stream';

/**
 * User interface layer for command line outputs.
 */
export namespace UI {

  export enum TAB {
    ZERO = 0,
    ONE = 1,
    TWO,
    THREE,
    FOUR,
  }

  export type IOutputBody = string | string[];
  export type IOutputGrid = (string | number)[][];

  export class Writer extends OutputStream {
    /** ivar reference to chalk as 'color' */
    public color = chalk;

    /**
     * output a block of text
     * @param body paragraph text
     * @param tab indentation
     */
    public paragraph(body: IOutputBody, tab = TAB.ZERO) {
      return this.output().outputLines(body, tab);
    }

    /**
     * Print a section to the ui with heading.
     * @param heading section heading
     * @param body section text
     */
    public outputSection(heading: string, body: IOutputBody): Writer {
      return this.write(`${EOL}${heading}:${EOL + EOL}${this._indentLines(body, TAB.ONE)}`);
    }

    /**
     * Print a multiline message with specified indentation
     * @param body message to print
     * @param tabs indentation tabs (1 tab = 2 spaces)
     * @param trim whether or not to trim each line's content
     */
    public outputLines(body: IOutputBody, tabs = TAB.TWO, trim = true): Writer {
      return this.write(this._indentLines(body, tabs, trim));
    }

    /**
     * Output an aligned grid of the text matrix
     * @param table matrix of rows/cols
     * @param spacing spacing between items
     * @param indent grid indentation
     */
    public outputGrid(table: IOutputGrid, spacing = TAB.TWO, indent = TAB.ONE): Writer {
      return this.outputLines(this.grid(table, spacing), indent, false);
    }

    /**
     * Create an aligned grid of the text matrix. Very basic for the time-being
     * @param table matrix of rows/cols
     * @param spacing spacing between items
     */
    public grid(table: IOutputGrid, spacing = TAB.TWO): string {
      const widths = this._colWidths(table);
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
            const lines = this._lines(text);
            for (let i = 0; i < subgrid.length; i++) {
              // create new cells for this line
              const cellText = (lines[i] || '').trim();
              const clean = cleanText(cellText);
              const diff = w - clean.length;
              const rpad = diff > 0 ? new Array(diff + 1).join(SPACE) : '';

              subgrid[i][col] = cellText + rpad;
            }
          });

        return list.concat(subgrid.map(cells => cells.join(this._indent(spacing))));
      }, [] as string[]);

      return rows.join(EOL);
    }

    /**
     * determine col widths from a rows/colums in a table
     * @param table a table structure with columns
     */
    private _colWidths(table: IOutputGrid): number[] {
      const widths: number[] = [];
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
    private _indent(tabs = TAB.ONE) {
      return new Array(tabs + 1)
        .join(CONSTANTS.INDENTATION);
    }

    /**
     * format text with same indent for each line
     */
    private _indentLines(text: IOutputBody, tabs = TAB.ONE, trim = true): string {
      return this._lines(text).map(line => `${this._indent(tabs)}${trim ? line.trim() : line}`).join(EOL);
    }

    /**
     * Lineify text
     */
    private _lines(text: IOutputBody): string[] {
      const chunks = [].concat(text);
      const lines = [].concat(...chunks.map(item => item.trim().split(EOL)));
      return lines;
    }
  }

  export function cleanText(text: string): string {
    return text.replace(/\x1B\[(?:[0-9]{1,2}(?:;[0-9]{1,2})?)?[m|K]/g, '');
  }

}
