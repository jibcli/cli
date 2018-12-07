import * as project from '../../lib/project';

describe('Project', () => {
  it('should expose cli version', () => {
    expect(project.VERSION).toMatch(/(\d+\.?){3}/);
  });
});
