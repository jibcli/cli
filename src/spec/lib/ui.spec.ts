import { UIWriter } from '../../';
import { Writable } from 'stream';
import { UITab } from '../../lib';

describe('UI features', () => {

  describe('Writer', () => {
    let mockStream: Writable;
    let ui: UIWriter;

    const isNotNewLine = (str: string): boolean =>  str && !!str.replace(/\n/g, '');

    beforeEach(() => {
      class NoopStream extends Writable {
        _write(chunk, encoding, cb) { cb() }
      };
      mockStream = new NoopStream();
      ui = new UIWriter({ stream: mockStream });
    });

    it('should default to stdout stream', () => {
      let ui = new UIWriter();
      spyOn(process.stdout, 'write').and.throwError('hi');
      expect(ui.write.bind(ui, 'hello')).toThrowError('hi');
    });

    it('should support BYOStream', done => {
      spyOn(mockStream, 'write').and.callThrough();

      ui.write('foo').end();
      mockStream.on('finish', () => {
        expect(mockStream.write).toHaveBeenCalled();
        done();
      });
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
      spyOn(mockStream, 'write').and.callFake(msg => {
        expect(typeof msg).toBe('string');
      });
      let msg: any = {foo: 'bar'};
      ui.write(msg);
      msg.bar = msg;
      ui.write(msg); // recursive
    });
    
    it('should format basic heading ', () => {
      const spy = spyOn(mockStream, 'write').and.callFake(str => {
        return isNotNewLine(str) && expect(str).toContain(`Heading:\n\n    body text`);
      });
      ui.outputSection('Heading', 'body text');
    });

    it('should format lines', () => {
      const spy = spyOn(mockStream, 'write').and.callFake(str => {
        return isNotNewLine(str) && expect(str).toContain(`  one\n  two`);
      });

      ui.outputLines(`
      one
      two
      `, UITab.ONE);
    });



  });

});
