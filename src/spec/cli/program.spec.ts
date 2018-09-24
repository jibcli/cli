import { IProgramOptionCallback, Program } from '../../';
import { CONSTANTS } from '../../lib';

describe('Program', () => {

  it('should support default options', () => {
    const program = new Program();
    const { commandDelim } = program.config;

    expect(commandDelim).toEqual(CONSTANTS.COMMAND_DELIMITER);
  });

  it('should throw on invalid delimiter', () => {
    expect(() => new Program({
      commandDelim: '::',
    })).toThrow();
  });

  it('should expose static singleton', () => {
    const program = new Program();
    expect(Program.main() instanceof Program).toBe(true);
  });

  it('should expose version', () => {
    const program = new Program({
      version: '1.2.3',
    });
    expect(program.version).toBe(`1.2.3`);
  });

  it('should support global options', () => {
    const program = new Program();
    const stub = { onOpt: null as IProgramOptionCallback<any> };
    spyOn(stub, 'onOpt'); // callback for option parsed
    spyOn(program.root, 'onOption') // stub option received
      .and.callFake((name: string, cb: (val: any) => void) => cb(true));

    const badopt = () => program.globalOption({ flag: 'whoops' }, stub.onOpt);
    expect(badopt).toThrow();
    expect(stub.onOpt).not.toHaveBeenCalled();
    program.globalOption({ flag: '-d, --debug' }, stub.onOpt);
    expect(stub.onOpt).toHaveBeenCalledWith(true, jasmine.any(Object));
  });

  it('should support global help', () => {
    const program = new Program();
    spyOn(program.root, 'onHelp') // stub help parsed
      .and.callFake((cb: () => void) => cb());
    const uispy = spyOn(program['_ui'], 'write');

    program.globalHelp('Examples', 'help text');
    expect(uispy).toHaveBeenCalledWith(jasmine.stringMatching(/examples\:[\S\s]+help/i));
    uispy.and.stub();
    program.globalHelp(null, 'raw help', true);
    expect(uispy).toHaveBeenCalledWith(jasmine.stringMatching('raw help'));
    uispy.and.stub();
    program.globalHelp(null, 'body help');
    expect(uispy).toHaveBeenCalledWith(jasmine.stringMatching('body help'));
  });

  it('should delegate help to the adapter', () => {
    const program = new Program();
    spyOn(program.root, 'showHelp');
    program.help();
    expect(program.root.showHelp).toHaveBeenCalled();
  });

  it('should delegate exec to the adapter', () => {
    const program = new Program();
    spyOn(program.root, 'exec');
    program.exec([]);
    expect(program.root.exec).toHaveBeenCalled();
  });

  it('should error when exec called on non-root adapter', () => {
    const program = new Program();
    expect(() => program.root.subcommand('fail').exec([])).toThrow();
  });

});
