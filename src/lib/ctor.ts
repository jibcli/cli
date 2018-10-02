/**
 * Generic type for a class constructor
 * @internal
 */
export type ICtor<T = any> = new (...args: any[]) => T;

/**
 * Test if an object reference is a constructor
 * @param type an object to check
 * @internal
 */
export const isCtor = (type: any): type is ICtor => (typeof type === 'function' && !!type.prototype);
