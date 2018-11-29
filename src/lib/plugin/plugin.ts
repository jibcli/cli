import { ICtor, isCtor } from '../ctor';
import { Token } from '../token';

type ProviderToken = Token | ICtor<any>;

export interface IPluginProvider<T> {
  /** Key to use as provider if different than the decorated class itself */
  token?: ProviderToken;
  /** use a factory to provide the plugin instantiation */
  factory?: (...deps: any[]) => T;
  /** source dependencies to resolve for the factory or the constructor itself */
  deps?: any[];
}

/**
 * Plugin record once decorator factory is provided
 * @internal
 */
export interface IPluginRecord<T> extends IPluginProvider<T> {
  ctor: ICtor<T>;
}

/**
 * Map of registered plugin objects
 * @internal
 */
export const PluginRegistry = new Map<ProviderToken, IPluginRecord<any>>();

/**
 * @Provide decorator factory
 * @param config plugin provider configuration
 */
export function Provide<T = any>(config: IPluginProvider<T> = {}): any {
  return <K extends ICtor<T>>(ctor: K): any => {
    const token = config.token || ctor;
    const provider = PluginRegistry.get(token) || {};
    PluginRegistry.set(token, {...provider, ...config, ctor});
  };
}

/**
 * Signature when prototype property decorator is used:
 * ```ts
 * class Foo {
 *   @Bar()
 *   public bar: any;
 * }
 * ```
 */
export type PropertyDecorator<T = any> = (target: T, propertyKey: string, descriptor: undefined) => void;
/**
 * Signature when a ctor argument is decorated
 * class Foo {
 *   constructor(@Bar() public bar: any)
 * }
 */
export type CtorArgDecorator<T = any> = (target: ICtor<T>, propertyKey: undefined, index: number) => void;


/**
 * Injects a plugin into a class member or constructor argument
 * @param token a registered plugin token for injection
 * @param args any extra args to provide to the plugin factory
 */
export function Plugin(token: ProviderToken, ...args: any[]): any {
  return (target: ICtor | object, propkey: string | undefined, desc: undefined | number) => {
    // assert the token has a provider record
    const plugin = PluginRegistry.get(token);
    if (!plugin) {
      throw new Error(`${token['name'] || token} is not a registered plugin`);
    }

    // TODO: handle case when plugin is injected in the constructor arg
    if (isCtor(target)) {
      /**
       * In the TypeScript specification
       * >>> The return value of the parameter decorator is ignored.
       * BUT if we decorate the class itself, then we can assign static properties
       * and perform constructor overrides in the extension of the class
       */
    } else { // on prototype
      // TODO: handle properties with descriptors (getter/setter)
      target[propkey] = resolvePlugin(token, ...args);
    }
  };
}

/**
 * Resolves a plugin token to its instantiated self
 * @param token the provider token to resolve
 */
function resolvePlugin<T = any>(token: ProviderToken, ...args: any[]): T {
  const record = PluginRegistry.get(token);
  if (record) {
    const { ctor, factory, deps } = record;
    const dependencies = (deps || []).concat(args).map(d => resolvePlugin(d));
    // when the plugin uses a factory
    if (factory) {
      const instance = factory.apply(factory, dependencies);
      if (!(instance instanceof ctor)) {
        throw new Error(`Provider factory ${factory} must return an instance of ${ctor.name}`);
      }
      return instance;
    }
    // call provider ctor with resolved deps
    return new ctor(...dependencies);
  } else {
    // the record is already an object or usable member
    return token as any;
  }
}
