import * as project from '../../index';

describe('Project', () => {
  it('should expose cli version', () => {
    expect(project.VERSION).toMatch(/(\d+\.?){3}/);
  });

  it('should expose jib namespace', () => {
    expect(project.JIB).toEqual('jib');
  });
});
