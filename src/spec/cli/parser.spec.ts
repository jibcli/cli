import * as path from 'path';
import * as tsNode from 'ts-node';
import { CLI } from '../../';
import { CONSTANTS, ChildPromise, IChildSpawnOptions } from '../../lib';
import chalk from 'chalk';

/**
 * run TS-Node child process
 * @param entry 
 * @param args 
 * @param opts 
 */
const ChildBin = 
  (entry: string, args: string[], opts: IChildSpawnOptions) => {
    return ChildPromise.spawn('npm', ['bin'], {
      cwd: __dirname,
    }).then(bin => {
      return ChildPromise.spawn(path.join(bin, 'ts-node'),
        ['--transpile-only'].concat(entry, ...args),
        {...opts});
    });
  }

describe('CLI', () => {
  let testImplDir: string;

  beforeAll(() => {
    testImplDir = path.resolve(__dirname, '..', 'support', 'impl');
  });

  let cli: CLI;
  beforeAll(() => cli = new CLI({
    basedir: testImplDir,
  }));

  it('should support configuration', () => {
    // read derivative configurations
    const { commandDir, commandDelim } = cli.program.config;
    expect(cli['_commandRoot']).toContain(testImplDir);
    expect(commandDir).toEqual(CONSTANTS.COMMAND_DIRECTORY);
    expect(commandDelim).toEqual(CONSTANTS.COMMAND_DELIMITER);
  });

  describe('implementation', () => {
    /**
     * Execute the parser execution in child processes
     * @param args 
     * @param delim  alternate delimeter
     */
    const testImpl = (args: string[], delim = ' '): Promise<string> => {
      return ChildBin('bin.ts', args, {
        cwd: testImplDir,
        env: {JIB_DELIM: delim}, // to test alternate delims
      });
    };

    it('should init version from package, and read during execution', done => {
      expect(cli.program.version).toMatch(/(\d+\.?){3}/);
      testImpl(['--version'])
        .then(ver => expect(ver).toEqual(cli.program.version))
        .then(done).catch(done.fail);
    });

    it('should create help', done => {
      testImpl(['--help'])
        .then(help => expect(help).toContain('test hello command'))
        .then(done).catch(done.fail);
    });

    describe(`named top level command: ${chalk.bold('hello.ts')}`, () => {

      it('should get help', done => {
        testImpl(['hello', '-h'])
          .then(help => expect(help).toContain('test hello command'))
          .then(done).catch(done.fail);
      });

      it('should run with args', done => {
        testImpl(['hello', 'unit', 'tester'])
          .then(output => expect(output).toContain('Hello unit|tester!'))
          .then(done).catch(done.fail);
      });

      it('should run with options', done => {
        Promise.all([
          testImpl(['hello', 'dude', '--casual']),
          testImpl(['hello', 'dude', '-c']),
        ]).then(results => results.forEach(res => {
          expect(res).toBe('Hi!');
        }))
        .then(done).catch(done.fail);
      });

      it('should fail without required args', done => {
        testImpl(['hello'])
          .then(output => Promise.reject(`Should not have run ${output}`), e => {
            expect(e).toContain('missing required argument');
            expect(e).toContain('world');
          })
          .then(done).catch(done.fail);
      });
    }); // end 'hello'

    

  }); // end implementations

}); // end CLI
