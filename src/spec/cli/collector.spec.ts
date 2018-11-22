import { Collector, CollectorEvent, ICollectorResult } from '../../collector';

describe('Collector', () => {

  it('should support meta', () => {
    const cmd = new Collector(null);
    expect(cmd.name('foo') instanceof Collector).toBe(true);
    expect(cmd.name()).toBe('foo');
    expect(cmd.description('bar') instanceof Collector).toBe(true);
    expect(cmd.description()).toBe('bar');
  });

  it('should support options', () => {
    const cmd = new Collector(null);
    expect(cmd.isOpt(null)).toBe(false);
    expect(cmd.isOpt('-f')).toBe(true);
    expect(cmd.isOpt('--foo-bar')).toBe(true);
  });

  it('should support inheritance', () => {
    const cmd = new Collector(null);
    const sub = cmd.subcommand('sub');
    expect(sub.isRoot()).toBe(false);
    expect(sub.root()).toBe(cmd);
  });

  it('should handle listeners', () => {
    const cmd = new Collector(null);
    const cb: any = { help: null };
    spyOn(cb, 'help');
    cmd.on(CollectorEvent.HELP, cb.help);
    cmd.emit(CollectorEvent.HELP);
    expect(cb.help).toHaveBeenCalled();
  });

  it('should resolve', done => {
    const cmd = new Collector(null).help();
    const sub = cmd.subcommand('bar');
    // configure
    sub.argument({name: 'foo', optional: false})
      .option({flag: '--no-wammies'});

    const p: Promise<any>[] = [];
    p.push(cmd.resolve(['bar']).catch(e => e)); // should throw
    p.push(sub.resolve(['bar', 'baz', '--help']));

    Promise.all(p)
      .then(r => {
        const {options, args} = r[1] as ICollectorResult;
        expect(r[0] instanceof Error).toBe(true);
        expect(options.help).toBe(true);
        expect(options.wammies).toBe(true);
        expect(args[0]).toBe('baz');
      }).then(done).catch(done.fail);
  });

});
