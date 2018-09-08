import * as path from 'path';
import { CLI } from '../../';
import { CONSTANTS } from '../../lib';

describe('CLI', () => {
  let testImplDir: string;

  beforeAll(() => {
    testImplDir = path.resolve(__dirname, '..', 'support', 'impl');
  });

  describe('Implementation', () => {

    it('should support options', () => {
      const cli = new CLI({
        basedir: testImplDir,
      });
      // read derivative configurations
      const { commandDir, commandDelim } = cli.program.config;
      expect(cli.COMMAND_DIR).toContain(testImplDir);
      expect(commandDir).toEqual(CONSTANTS.COMMAND_DIRECTORY);
      expect(commandDelim).toEqual(CONSTANTS.COMMAND_DELIMITER);
    });

  }); // end implementations

}); // end CLI
