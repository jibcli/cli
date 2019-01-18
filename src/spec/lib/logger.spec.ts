import chalk from 'chalk';
import { Writable } from 'stream';
import { Log } from '../../';

describe('Logger', () => {

  let mockStream: Writable;

  class MockLogger extends Log.Logger {
    constructor(level?: Log.LOG_LEVEL) {
      super({level, stream: mockStream, name: 'mock'});
    }
  }
  class NoopStream extends Writable {
    public _write(chunk: Buffer, encoding: string, cb: () => void) {
      cb();
    }
  }

  beforeAll(() => mockStream = new NoopStream());

  it('should accept default level', () => {
    Log.Logger.setDefaultLevel(Log.LOG_LEVEL.DEBUG);
    expect(new MockLogger()['_level']).toEqual(Log.LOG_LEVEL.DEBUG);
  });

  it('should create default logger', () => {
    MockLogger['_default'] = null;
    const log = MockLogger.defaultLogger();
    expect(log instanceof Log.Logger).toBe(true);
    expect(MockLogger.defaultLogger()).toBe(log, 'did not reuse the singleton logger');
  });

  it('should allow supplying a default logger', () => {
    const info = spyOn(console, 'info');
    MockLogger.setDefaultLogger(console as any);
    const log = MockLogger.defaultLogger();
    expect(log).toEqual(console as any);
    const logger = new MockLogger();
    logger.info('test');
    expect(info).toHaveBeenCalled();
  });

  it('should support partial logger', () => {
    MockLogger.provide({} as any);
    const logger = new MockLogger();
    expect(() => logger.error('foo')).not.toThrow();
  });

  it('should allow level to be set', () => {
    const logger = new MockLogger();
    expect(logger.setLevel.bind(logger, Log.LOG_LEVEL.OFF)).not.toThrow();
    expect(logger['_level']).toBe(Log.LOG_LEVEL.OFF);
  });

  Object.keys(Log.LOG_LEVEL)
    .filter(k => ~~k) // enum integers
    .forEach((level: any) => {
      const levelName = Log.LOG_LEVEL[level];
      it(`should write log at '${chalk.bold(levelName)}' level`, () => {
        const logger = new MockLogger(level);
        const write = spyOn(mockStream, 'write');
        const _log = spyOn(logger as any, '_log').and.callThrough();
        logger[levelName.toLowerCase()]('Check', levelName);
        expect(_log).toHaveBeenCalled();
      });
    });

});
