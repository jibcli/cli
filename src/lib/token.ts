/**
 * Opaque identifier for object reference management
 */
export type Token = symbol;

/**
 * Create a token for establishing unique reference symbols
 * @param key a string denoting the token
 */
export const GetToken = (key?: string): Token => Symbol(key);
