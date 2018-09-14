import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI Project utilities
 */
export namespace Project {
  /**
   * Read/require package.json in a given directory
   * @param dir package directory
   */
  export function getPackageJson(dir: string): any {
    return require(resolveFile(dir, 'package.json'));
  }

  /**
   * List requireable module files in a given directory
   * @param dir directory to list
   */
  export function listRequirable(dir: string): string[] {
    return fs.readdirSync(dir)
      .filter(name => /^[\w-]+(\.[jt]s)?$/.test(name));
  }

  /**
   * resolve a file in the project workspace
   * @param dir starting directory
   * @param name file name to resolve
   * @param parent parent directory (of last call)
   */
  export function resolveFile(dir: string, name: string, parent?: string): string {
    const fp: string = path.join(dir, name);
    if (fs.existsSync(fp)) {
      return fp;
    } else if (dir !== parent) {
      return resolveFile(path.dirname(dir), name, dir);
    }
  }

  /**
   * Read/require tsconfig.json in a given directory
   * @param dir package directory
   * @internal
   */
  function getTsConfig(dir: string): any {
    const ts = resolveTsConfig(dir);
    return ts && require(ts);
  }

  /**
   * resolve path to a tsconfig file
   * @param dir project directory where tsconfig should exist
   * @internal
   */
  function resolveTsConfig(dir: string): string {
    return resolveFile(dir, 'tsconfig.json');
  }

  /**
   * Resolve the specified `commandDir` for the program/parser
   * It is common for the `"commandDir"` to be a "build/commands" path to the
   * eventual transpiled outputs. When running in development, we use `ts-node`
   * and `tsconfig.json` to resolve the source commands directory.
   * @param commandDir the expected command directory
   * @internal
   */
  export function _resolveCommandDir(baseDir: string, commandDir: string): string {

    // ensure command dir exists... otherwise try delegate to ts source
    if (fs.existsSync(path.join(baseDir, commandDir))) {
      // the directory exists, so use it
      return commandDir;
    } else {
      // read project compiler options
      const tsConf = getTsConfig(baseDir);
      if (tsConf && tsConf.compilerOptions) {
        const { compilerOptions: { rootDir, outDir} } = tsConf;
        const alternateDir = path.normalize(commandDir.replace(outDir, rootDir));
        // test for ts source directory
        if (fs.existsSync(path.join(baseDir, alternateDir))) {
          try {
            // register ts-node for requires (from project directory)
            if (typeof require.extensions['.ts'] !== 'function') {
              const tsNodeModule = path.join(baseDir, 'node_modules', 'ts-node');
              require(tsNodeModule).register({
                project: resolveTsConfig(baseDir),
              });
            }

            return alternateDir;
          } catch (e) { /* noop ts-node attempt */ }
        }
      }
    }

  }


}
