import { isCtor } from '../../lib/ctor';

describe('Constructor Util', () => {

  it('should assert ctor', () => {
    class Foo {}
    expect(isCtor(Foo)).toBe(true);
    function Bar() {}
    expect(isCtor(Bar)).toBe(true);
  });

  it('should assert non-ctor', () => {
    expect(isCtor(true)).toBe(false);
    expect(isCtor({})).toBe(false);
  });

});
