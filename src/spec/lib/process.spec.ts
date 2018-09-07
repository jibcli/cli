import { ChildPromise } from '../../lib';

describe('ChildPromise', () => {

  it('should reject unknown command', done => {
    ChildPromise.spawn('_foo_', ['--version'])
      .then(v => done.fail(`Expected failure, got: ${v}`))
      .catch(() => done());
  });

  it('should run valid child process as promise', done => {
    ChildPromise.spawn('node', ['--version'])
      .then(v => expect(v).toMatch(/(\d+\.?){3}/))
      .then(done).catch(done.fail);
  });

});
