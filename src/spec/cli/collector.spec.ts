import { Collector, CollectorEvent, Flag, ICollectorResult } from '../../collector';

describe('Collector', () => {

  it('should support meta', () => {
    const cmd = new Collector(null);
    expect(cmd.name('foo') instanceof Collector).toBe(true);
    expect(cmd.name()).toBe('foo');
    expect(cmd.description('bar') instanceof Collector).toBe(true);
    expect(cmd.description()).toBe('bar');
  });

  it('should support version', () => {
    const cmd = new Collector(null);
    cmd.version('1.0');
    expect(cmd.version()).toEqual('1.0');
    cmd.version('1.2.3', { flag: '-V, --version' });
    expect(cmd.version()).toEqual('1.2.3');
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

  it('should parse arguments', () => {
    const cmd = new Collector(null)
      .option({flag: '-b, --bar [baz]'})
      .unknowns(true);

    const args = ['-f', 'arg', 'arg2', '--bar', 'baz'];
    const optR = cmd.optRight(args);
    expect(optR.length).toEqual(args.length);
    expect(optR.indexOf('-f')).toBeGreaterThan(0);
    const argonly = cmd.argShift(args);
    expect(argonly.length).toBeLessThan(args.length);
    expect(cmd.argShift(['one', 'two']).length).toBe(2);
  });

  it('should return usage', () => {
    const cmd = new Collector('root', 'I am root')
      .argument({name: 'single'})
      .argument({name: 'variadic', multi: true, optional: true})
      .option({flag: '-b, --bar [baz]'})
      .option({flag: '--multi [pass]', default: 'pass'})
      .subcommand('sub').root();
    const usage = cmd.usage();
    expect(usage.name).toEqual('root');
    expect(usage.desc).toBeTruthy();
    expect(usage.options.length).toBeGreaterThan(0);
    expect(usage.args.length).toBeGreaterThan(0);
    expect(usage.subcommands.length).toBeGreaterThan(0);
  });

  it('should resolve', done => {
    const cmd = new Collector(null).help();
    const sub = cmd.subcommand('bar');
    const unknowns = cmd.subcommand('unk').unknowns(true);
    // configure
    sub.argument({name: 'foo', optional: false})
      .option({flag: '--no-wammies'})
      .option({flag: '-x, --no-ext'})
      .option({flag: '-r --required <value>', fn: /./})
      .unknowns(false);

    const p: Promise<any>[] = [];
    p.push(cmd.resolve(['bar'])
      .catch(e => expect(e.message).toContain('missing required argument'))); // should throw
    p.push(cmd.resolve(['bar', 'baz', '--err'])
      .catch(e => expect(e.message).toContain('Unknown option'))); // should throw
    p.push(cmd.resolve(['bar', 'baz', '--required'])
      .catch(e => expect(e.message).toContain('requires a value'))); // should throw
    p.push(cmd.resolve(['unk', '--allowed']));
    p.push(sub.resolve(['bar', 'baz', '--help', '-x', '-r', 'val'])); // valid

    Promise.all(p)
      .then(r => {
        // subcommand
        const {options, args} = r.pop() as ICollectorResult;
        expect(options.help).toBe(true);
        expect(options.wammies).toBe(true);
        expect(options.ext).toBe(false);
        expect(options.required).toBeTruthy();
        expect(args[0]).toBe('baz');
      }).then(done).catch(done.fail);
  });

  describe('Flags', () => {

    it('should parse valid syntax', () => {
      const flag = () => new Flag('-f, --foo');
      expect(flag).not.toThrow();
      const f = flag();
      expect(f.defaultValue).toBeFalsy();
      expect(f.handler).toBeUndefined();
    });

    it('should throw invalid syntax', () => {
      const fail = () => new Flag('invalid');
      expect(fail).toThrow();
    });

    it('should handle flag with optional value', () => {
      const f = new Flag('--name=[value]', 'default');
      expect(f.meta.bool).toBe(false);
      expect(f.meta.vName).toEqual('value');
      expect(f.meta.vRequired).toBe(false);
      expect(f.defaultValue).toBe('default');
    });

    it('should handle flag with required value', () => {
      const f = new Flag('-n --name <value>');
      expect(f.name).toEqual('name');
      expect(f.alias).toContain('-n');
      expect(f.meta.vName).toEqual('value');
      expect(f.meta.vRequired).toBe(true);
    });

    it('should handle negative flag', () => {
      const f = new Flag('-x --no-wammies');
      expect(f.name).toEqual('wammies');
      expect(f.meta.bool).toBe(true);
      expect(f.meta.neg).toBe(true);
      expect(f.defaultValue).toBe(true);
    });

  });

});
