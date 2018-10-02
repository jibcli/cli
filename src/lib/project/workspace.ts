import * as fs from 'fs';
import * as path from 'path';
import { ICLIOptions } from '../../parser';
import { CONSTANTS } from '../constants';

/**
 * CLI Workspace utilities
 */
export namespace Workspace {
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
   * resolve a file or directory in the project workspace
   * @param from starting directory or file path
   * @param name file name to resolve
   * @param parent parent directory (of last call)
   * @internal
   */
  function _resolveFile(from: string, name: string, parent?: string): string {
    const fp: string = path.join(from, name);
    if (fs.existsSync(fp)) {
      return fp;
    } else if (from !== parent) { // `dir === parent` when traversal tops out
      return _resolveFile(path.dirname(from), name, from);
    }
  }

  /**
   * resolve a file upwards in the project workspace
   * @param from starting directory or file path
   * @param name file name to resolve
   */
  export function resolveFile(from: string, name: string) {
    return _resolveFile(from, name);
  }

  /**
   * resolve a directory upwards in the project workspace
   * @param from starting directory or file path
   * @param name directory name to resolve
   */
  export function resolveDir(from: string, name: string): string {
    return _resolveFile(from, name);
  }

  /**
   * Resolve the project root directory
   * @param from a directory or file path from which base scan occurs
   */
  export function resolveRootDir(from?: string): string {
    from = from || process.mainModule.filename;
    const dir = path.dirname(resolveFile(from, 'package.json') || '');
    return dir === '.' ? null : dir;
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
   * @param from project directory (or child directory) where tsconfig should apply
   * @internal
   */
  function resolveTsConfig(from: string): string {
    return resolveFile(from, 'tsconfig.json');
  }

  /**
   * Resolve the specified `commandDir` for the program/parser as a relative path
   * It is common for the `"commandDir"` to be a "build/commands" path to the
   * eventual transpiled outputs. When running in development, we use `ts-node`
   * and `tsconfig.json` to resolve the source commands directory.
   * @param commandDir the expected command directory
   * @internal
   */
  function _resolveCommandDir(baseDir: string, commandDir: string): string {

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

  /**
   * get the absolute directory of the workspace commands
   */
  export function commandsRoot(): string {
    const { baseDir, commandDir } = resolveConfig();
    return path.join(baseDir, commandDir);
  }

  // basic store for resolved configuration
  let _config: ICLIOptions;

  /**
   * Resolves CLI configuration object for the main parser/program.
   * Note that by exposing this function, a caller might obtain different props
   * If called with different options than the main program.
   * @param options options propagated by parser or program implementation
   */
  export function resolveConfig(options?: ICLIOptions): ICLIOptions {
    if (_config && !options) { // use cache
      return _config;
    }
    const { baseDir, ...other } = options;
    const root = baseDir || resolveRootDir();

    // resolve package.json
    let pkgJson: any;
    try {
      pkgJson = getPackageJson(root);
    } catch (e) {
      throw new Error(`Invalid project: '${root}'`);
    }

    // read config from package.json
    const pkgJsonConfig = pkgJson[CONSTANTS.PKG_CONFIG_KEY] || {};

    // resolve command directory & update config
    let commandDir = pkgJsonConfig.commandDir || CONSTANTS.COMMAND_DIRECTORY;
    const resolvedDir = _resolveCommandDir(root, commandDir);
    commandDir = resolvedDir;
    if (!resolvedDir) {
      throw new Error(`Unable to resolve command directory '${commandDir}' in '${root}`);
    }

    // init program with full options
    _config = <ICLIOptions>{
      baseDir: root,
      version: pkgJson.version, // default version from package.json
      ...pkgJsonConfig, // add from package json
      ...other, // add the options manually provided as overrides
      commandDir, // use resolved commandDirectory
    };
    return _config;
  }

}
