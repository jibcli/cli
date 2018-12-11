import * as project from '../../index';

describe('Project', () => {
  it('should expose cli version', () => {
    expect(project.VERSION).toMatch(/(\d+\.?){3}/);
  });

  it('should expos jib namespace', () => {
    expect(project.JIB).toEqual('jib');
  });
});
