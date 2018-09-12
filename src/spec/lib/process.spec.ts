import * as path from 'path';
import { ChildPromise } from '../../lib';

describe('ChildPromise', () => {

  it('should reject unknown command', done => {
    ChildPromise.spawn('_foo_', ['--version'])
      .then(v => done.fail(`Expected failure, got: ${v}`))
      .catch(() => done());
  });

  it('should spawn valid child process as promise', done => {
    ChildPromise.spawn('node', ['--version'])
      .then(v => expect(v).toMatch(/(\d+\.?){3}/))
      .then(done).catch(done.fail);
  });

  it('should exec child process as promise', done => {
    ChildPromise.exec('ls', { cwd: __dirname})
      .then(files => expect(files).toContain(path.basename(__filename)))
      .then(done).catch(done.fail);
  });

});
