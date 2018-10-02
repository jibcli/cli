import { GetToken, IPluginProvider, Plugin, Provide } from '../../index';
import { PluginRegistry } from '../../lib/plugin';

describe('Plugin Framework', () => {

  describe('Plugin Provider', () => {

    it('should register a class by reference', () => {
      @Provide()
      class Test {}
      expect(PluginRegistry.has(Test)).toBe(true);
    });


    it('should register by token', () => {
      const token = GetToken('test');
      @Provide({ token })
      class Test {}
      expect(PluginRegistry.has(Test)).toBe(false);
      expect(PluginRegistry.has(token)).toBe(true);
    });

    it('should resolve plugin dependencies', () => {
      @Provide()
      class TestDep {}

      @Provide({ deps: [TestDep, 'somestr'] })
      class Test {
        public injected: any[];
        // injects TestDep as first ctor arg, and name
        constructor(public dep: TestDep, public str?: string, ...rest: any[]) {
          this.injected = rest;
        }
      }

      class Impl {
        @Plugin(Test, 'injected.arg')
        public test: Test;
      }

      const impl = new Impl();
      expect(impl.test.dep instanceof TestDep).toBe(true);
      expect(impl.test.str).toEqual('somestr');
      expect(impl.test.injected[0]).toEqual('injected.arg');

    });

    it('should use a factory when provided', () => {
      const stub: IPluginProvider<Test> = { factory: null };
      // create a factory that returns a Date when no name is passed
      spyOn(stub, 'factory').and.callFake((name: string) => {
        return name ? new Test(name) : new Date();
      });

      @Provide(stub)
      class Test {
        constructor(public name: string) {}
      }

      // happy path
      class Ext {
        @Plugin(Test, 'ext')
        public test: Test;
      }
      expect(stub.factory).toHaveBeenCalledWith('ext');
      expect(Ext.prototype.test instanceof Test).toBe(true);
      expect(Ext.prototype.test.name).toBe('ext');

      const unhappy = () => {
        class Throwy {
          @Plugin(Test)
          public test: Test;
        }
      };
      expect(unhappy).toThrow();
    });

  });

  describe('Plugin Injector', () => {

    it('should throw when plugin not registered', () => {
      const bad = () => {
        class Test {
          @Plugin(GetToken())
          public never: any;
        }
      };
      expect(bad).toThrow();
    });

    it('should not inject into ctor (yet)', () => {
      @Provide()
      class MyPlugin {
        constructor() { this.init(); }
        public init() { /* noop */ }
      }
      const spy = spyOn(MyPlugin.prototype, 'init');

      class Test {
        constructor(@Plugin(MyPlugin) public foo?: MyPlugin) {}
      }
      const test = new Test();
      expect(spy).not.toHaveBeenCalled();
      expect(test.foo).toBeUndefined();
    });

    it('should inject plugin as property on the prototype', () => {

      @Provide()
      class Hi {
        constructor() { this.init(); }
        public init() { /* for spy */ }
        public speak = () => 'hi';
      }
      const hiSpy = spyOn(Hi.prototype, 'init').and.callThrough();
      class Test {
        @Plugin(Hi)
        public hi: Hi;
      }
      // plugin constructor is called at the time of decoration
      expect(hiSpy).toHaveBeenCalled();

      const test = new Test();
      expect(test.hi instanceof Hi).toBe(true);
      expect(test.hi.speak()).toEqual('hi');
    });

  });

});
