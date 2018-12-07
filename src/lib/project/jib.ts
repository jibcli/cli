import { CONSTANTS } from '../constants';

const pkg: any = require('../../../package.json');

export const VERSION: string = pkg.version;
export const JIB: string = CONSTANTS.NAMESPACE;
