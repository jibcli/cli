import { UI } from '../../';
import { Writable } from 'stream';
import chalk from 'chalk';

describe('UI features', () => {

  describe('Writer', () => {
    let mockStream: Writable;
    let ui: UI.Writer;

    const isNotNewLine = (str: string): boolean =>  str && !!str.replace(/\n/g, '');

    class NoopStream extends Writable {
      _write(chunk: Buffer, encoding: string, cb: () => void) {
        cb()
      }
    };

    beforeEach(() => {
      mockStream = new NoopStream();
      ui = new UI.Writer({ stream: mockStream });
    });

    it('should default to stdout stream', () => {
      let u = new UI.Writer();
      spyOn(process.stdout, 'write').and.throwError('hi');
      expect(() => u.write('hello')).toThrowError('hi');
    });

    it('should support BYOStream', done => {
      spyOn(mockStream, 'write').and.callThrough();

      ui.write('foo').end();
      mockStream.on('finish', () => {
        expect(mockStream.write).toHaveBeenCalled();
        done();
      });
    });

    it('should get indent', () => {
      expect(ui['_indent']()).toEqual('  ');
      expect(ui['_indent'](UI.TAB.ONE)).toEqual('  ');
      expect(ui['_indent'](UI.TAB.TWO)).toEqual('    ');
    });

    it(`should alias write as 'output'`, () => {
      const spy = spyOn(ui, 'write');
      ui.output('foo');
      expect(spy).toHaveBeenCalled();
    });

    it('should write multiple messages', () => {
      const spy = spyOn(mockStream, 'write');

      ui.write('foo', 'bar');
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should write error', () => {
      const spy = spyOn(mockStream, 'write');
      const e = new Error('foo');
      ui.write(e);
      expect(spy.calls.first().args[0]).toEqual(e.toString());
    });

    it('should write objects', () => {
      spyOn(mockStream, 'write').and.callFake((str: string) => {
        expect(typeof str).toBe('string');
      });
      let msg: any = {foo: 'bar'};
      ui.write(msg);
      msg.bar = msg;
      ui.write(msg); // recursive
    });

    it('should format basic heading ', () => {
      const spy = spyOn(mockStream, 'write').and.callFake((str: string) => {
        return isNotNewLine(str) && expect(str).toContain(`Heading:\n\n  body text`);
      });
      ui.outputSection('Heading', 'body text');
    });

    it('should format lines', () => {
      const spy = spyOn(mockStream, 'write').and.callFake((str: string) => {
        return isNotNewLine(str) && expect(str).toContain(`  one\n  two`);
      });

      ui.outputLines(`
      one
      two
      `, UI.TAB.ONE);
    });

    it('should clean text', () => {
      expect(UI.cleanText(chalk.red('foo'))).toEqual('foo');
      expect(UI.cleanText(chalk.red('bar')).length).toEqual(3);
    });

    it('should create a basic grid as string', () => {

      const table: (string | number)[][] = [
        ['1', 'this is', 'row 1'],
        ['2     ', 'and this is', 'row 2 with longer text'],
        [chalk.yellow('3'), 'this row has\n lines', chalk.green('colored text, and a \n line break')],
        [4, 'bye'],
      ];
      const grid = ui.grid(table);
      // console.log(grid);
      // TODO: improve assertions
      expect(grid).toContain(`1    this is         row 1`)
      expect(grid).toContain(`2    and this is     row 2 with longer text`);
      expect(grid).toContain(chalk.yellow('3') + '    ');
    });

    it('should output a grid', () => {
      const spy = spyOn(mockStream, 'write').and.callFake((str: string) => {
        return isNotNewLine(str) && expect(str).toContain(`one    two`);
      });

      ui.outputGrid([
        ['one', 'two']
      ]);
    });

  });

});
