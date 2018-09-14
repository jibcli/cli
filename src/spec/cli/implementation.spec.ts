import * as os from 'os';
import * as path from 'path';
import { CLI, ICLIOptions, Log } from '../../';
import { CONSTANTS, ChildPromise } from '../../lib';
import chalk from 'chalk';

describe('CLI', () => {
  let testImplDir: string;

  beforeAll(() => {
    testImplDir = path.resolve(__dirname, '..', 'support', 'impl');
  });

  it('should support configuration', () => {
    // read derivative configurations
    const cli = new CLI({ baseDir: testImplDir });
    const { commandDir, commandDelim } = cli.program.config;
    expect(cli['_commandRoot']).toContain(testImplDir);
    expect(commandDir).toEqual(CONSTANTS.COMMAND_DIRECTORY);
    expect(commandDelim).toEqual(CONSTANTS.COMMAND_DELIMITER);
  });

  it('should read version from package.json', () => {
    const cli = new CLI({ baseDir: testImplDir });
    expect(cli.program.config.version).toMatch(/(\d+\.?){3}/);
  });

  it('should instantiate without options', () => {
    spyOn(CLI.prototype as any, '_initProgram');
    const cli = new CLI();
    expect(cli['options']).toBeDefined();
    expect(cli['options'].baseDir).toBeTruthy();
  });

  it('should throw on invalid project', () => {
    const logspy = spyOn(Log.Logger.prototype, 'error');
    const getBad = (): CLI => {
      return new CLI({
        baseDir: os.tmpdir()
      });
    };
    expect(getBad).toThrow();
    expect(logspy).toHaveBeenCalled();
  });

  it('should throw on invalid delimiter', () => {
    const logspy = spyOn(Log.Logger.prototype, 'error');
    const getBad = (): CLI => {
      return new CLI({
        baseDir: testImplDir,
        commandDelim: '--'
      });
    };
    expect(getBad).toThrow();
    expect(logspy).toHaveBeenCalled();
  });

  describe('Implementation', () => {

    const TEST_CONFIG_ENV = {
      root: 'JIB_TEST_ROOT_COMMAND',
      delim: 'JIB_TEST_COMMAND_DELIM',
      cmdDir: 'JIB_TEST_COMMAND_DIR',
    };

    /**
     * Execute the parser execution in child processes
     * @param syntax command syntax to parse
     * @param opts option flags
     * @param env env configuration
     */
    const testImpl = (syntax: string, opts?: string[], env?: any): Promise<string> => {
      const args = [].concat(syntax ? syntax.split(' ') : [], opts || []);
      return ChildPromise.spawn(path.join('bin', 'jib'), args, {
        cwd: testImplDir,
        env,
      });
    };

    it('should output version', done => {
      testImpl(null, ['--version'])
        .then(ver => expect(ver).toMatch(/(\d+\.?){3}/))
        .then(done).catch(done.fail);
    });

    it('should create help', done => {
      testImpl(null, ['--help'])
        .then(help => {
          expect(help).toContain('test hello command', 'did not render command help');
          expect(help).toMatch(/other\:[\S\s]+additional/i, 'did not render global help');
        })
        .then(done).catch(done.fail);
    });

    describe(`Root (single) command`, () => {

      it('should register root command help', done => {
        testImpl(null, ['--help'], { [TEST_CONFIG_ENV.root]: 'default' })
          .then(out => {
            expect(out).toContain('A default implementation', 'did not display root command description');
            expect(out).toContain('-o, --opt', 'did not display option for root command');
            expect(out).toContain('[options] [foo]', 'did not display argument syntax for root command');
          })
          .then(done).catch(done.fail);
      });
      
      it('should run root command', done => {
        testImpl(null, null, { [TEST_CONFIG_ENV.root]: 'default' })
          .then(out => expect(out).toContain('Ran a single command'))
          .then(done).catch(done.fail);
      });

      it('should parse root command args', done => {
        testImpl(null, ['bar', '--opt'], { [TEST_CONFIG_ENV.root]: 'default' })
          .then(out => {
            expect(out).toContain('Opt true', 'did not receive option flag');
            expect(out).toContain('Foo bar', 'did not receive argument');
          })
          .then(done).catch(done.fail);
      });

    }); // end root command tests

    describe(`Top level command: ${chalk.bold('hello.ts')}`, () => {

      it('should get help', done => {
        testImpl('hello', ['-h'])
          .then(help => expect(help).toContain('test hello command'))
          .then(done).catch(done.fail);
      });

      it('should handle global option', done => {
        testImpl('hello', ['--help', '--info'])
          .then(help => expect(help).toContain('Got info option'))
          .then(done).catch(done.fail);
      });

      it('should run with args', done => {
        testImpl('hello', ['unit', 'tester'])
          .then(output => expect(output).toContain('Hello unit|tester!'))
          .then(done).catch(done.fail);
      });

      it('should run with options', done => {
        Promise.all([
          testImpl('hello', ['dude', '--casual']),
          testImpl('hello', ['dude', '-c']),
        ]).then(results => results.forEach(res => {
          expect(res).toBe('Hi!');
        }))
        .then(done).catch(done.fail);
      });

      it('should fail without required args', done => {
        testImpl('hello')
          .then(output => Promise.reject(`Should not have run ${output}`), e => {
            expect(e).toContain('missing required argument');
            expect(e).toContain('world');
          })
          .then(done).catch(done.fail);
      });
    }); // end 'hello' (top level) tests

    describe('Subcommands (topics)', () => {

      it('should list subcommands', done => {
        testImpl('project', ['--help'])
          .then(output => {
            expect(output).toMatch(/commands\:[\S\s]+build\s{2,}build\sa\sproject/i);
            expect(output).toMatch(/commands\:[\S\s]+init\s{2,}/i);
          })
          .then(done).catch(done.fail);
      });

      it('should output subcommand help', done => {
        const subs = ['build', 'init'];
        Promise.all(subs.map(sub => testImpl(`project ${sub}`, ['--help'])))
          .then(tests => {
            subs.forEach((sub, i) => {
              expect(tests[i]).toMatch(
                new RegExp(`usage:\\s+project\\s${sub}`, 'i'),
                `did not show subcommand help '${sub}'`
              );
              // case where sub has subs
              if (sub === 'init') {
                expect(tests[i]).toContain('project init <command>');
                expect(tests[i]).toMatch(/desktop\s{2,}[\w\s]+/i);
                expect(tests[i]).toMatch(/mobile\s{2,}[\w\s]+/i);
              }
            });
          })
          .then(done).catch(done.fail);
      });

      describe('Using delimiters', () => {

        const delimTests = [' ' /* This is the default */, ':', '.'];
        const parts = ['project', 'init', 'web'];

        delimTests.forEach(delim => {
          const cmd = parts.join(delim);

          it(`should render command '${chalk.bold(cmd)}' help using delimiter '${delim}'`, done => {
            testImpl(cmd, ['--help'], {[TEST_CONFIG_ENV.delim]: delim})
              .then(output => expect(output).toContain(`Usage: ${cmd}`, `Usage not reundered using delim '${delim}'`))
              .then(done).catch(done.fail);
          });

          it(`should run command '${chalk.bold(cmd)}' using delimiter '${delim}'`, done => {
            testImpl(cmd, ['app'], {[TEST_CONFIG_ENV.delim]: delim})
              .then(output => expect(output).toContain('Init web app', `Command was not run using delim '${delim}'`))
              .then(done).catch(done.fail);
          });
          
        });

      });

    });

  }); // end implementations

}); // end CLI
