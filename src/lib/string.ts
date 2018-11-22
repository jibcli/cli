/**
 * create camelcase string
 * @param str
 */
export function camelize(str: string) {
  return str.replace(/^\W+/, '').replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    return +match === 0 ? '' : (index === 0 ? match.toLowerCase() : match.toUpperCase());
  }).replace(/\W/g, '');
}
