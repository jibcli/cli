import * as fs from 'fs';
import * as path from 'path';

/**
 * Read/require package.json in a given directory
 * @param dir package directory
 */
export function getPackageJson(dir: string): any {
  return require(path.join(dir, 'package.json'));
}

/**
 * List requireable module files in a given directory
 * @param dir directory to list
 */
export function listRequirable(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(name => /^[\w-]+(\.[jt]s)?$/.test(name));
}
