import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import { listRequireable, getPackageJson, CONSTANTS } from '../../lib';

describe('Package utilities', () => {
  let tmpdir: string = path.join(os.tmpdir(), '' + Math.random());
  beforeAll(() => fs.mkdirSync(tmpdir));
  afterAll(() => fs.remove(tmpdir));

  function mkEmptyFile(file: string): void {
    fs.writeFileSync(path.join(tmpdir, file), '');
  }
  function mkEmptyDir(name: string): void {
    fs.mkdirSync(path.join(tmpdir, name));
  }

  it('should read package.json contents', () => {
    // write package.json
    let pkg: any = {
      name: 'tmp-project',
      version: '1.0.0',
      [CONSTANTS.PKG_CONFIG_KEY]: {
        foo: 'bar'
      }
    };
    fs.writeFileSync(path.join(tmpdir, 'package.json'), JSON.stringify(pkg, null, 2));

    let read = getPackageJson(tmpdir);
    Object.keys(pkg).forEach(key => {
      expect(read[key]).toEqual(pkg[key], `${key} not read correctly`);
    });
  });

  it('should list only "requireable" files', () => {
    // write some tmps
    const tests = {
      jsFile: 'file.js',
      tsFile: 'file.ts',
      dotDelimited: 'dot.delimited.js',
      mapFile: 'file.js.map',
      declarationFile: 'file.d.ts',
      subdir: 'subdir',
    };
    mkEmptyFile(tests.jsFile);
    mkEmptyFile(tests.tsFile);
    mkEmptyFile(tests.dotDelimited);
    mkEmptyFile(tests.mapFile);
    mkEmptyFile(tests.declarationFile);
    mkEmptyDir(tests.subdir);
    
    // run assertions
    const list = listRequireable(tmpdir);
    // files
    expect(~list.indexOf(tests.jsFile)).toBeTruthy(`JavaScript file was excluded`);
    expect(~list.indexOf(tests.tsFile)).toBeTruthy(`TypeScript file was excluded`);
    expect(~list.indexOf(tests.mapFile)).not.toBeTruthy(`.map file was not ignored`);
    expect(~list.indexOf(tests.declarationFile)).not.toBeTruthy(`declaration file was not ignored`);
    expect(~list.indexOf(tests.dotDelimited)).not.toBeTruthy(`dot delimited filenames were not excluded`);
    // directory
    expect(~list.indexOf(tests.subdir)).toBeTruthy('a subdirectory was excluded');
  });

});