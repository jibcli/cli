import { EventEmitter } from 'events';
import { ICommandArgument, ICommandOption, IOptionHandler, TOptionFlag } from './command';
import { CONSTANTS, UI } from './lib';
import { camelize } from './lib/string';


/**
 * Option item specific to the collector
 */
interface ICollectorOption extends ICommandOption {
  inherits?: boolean;
  _flag?: Flag;
}

/**
 * Callback signature for a parsed option value
 * @param value value that was collected
 */
export type IResolvedOptionListener<T = any> = (value?: T, name?: string) => void;
export type IResolvedHelpListener = (usage: ICollectorSummary) => void;

/**
 * flag parser
 * @ignore
 */
export class Flag {
  public readonly name: string;
  public readonly alias: string[];
  public readonly meta: { vName: string; vRequired?: boolean; bool: boolean; neg: boolean; };

  constructor(public syntax: TOptionFlag, public defaultValue?: any, public handler?: IOptionHandler) {
    const f = syntax.match(CONSTANTS.REGEX.FLAG);
    const list = this.alias = syntax.match(CONSTANTS.REGEX.FLAGS);
    if (!f) {
      throw new Error(`Invalid option syntax ${syntax}`);
    }
    const [vName, vRequired] = [f[2] || null, f[1] === '<'];
    const long = list[list.length - 1];
    const bool = !vName;
    const neg = bool && CONSTANTS.REGEX.NEG.test(long);
    this.name = camelize(neg ? long.replace(CONSTANTS.REGEX.NEG, '') : long);
    this.meta = {
      vName,
      vRequired,
      neg,
      bool,
    };
    if (bool) {
      this.defaultValue = neg ? true : false;
    }
  }
}

interface ICollectorMeta {
  name?: string;
  description?: string;
  version?: string;
  unknowns?: boolean;
}

export type TCollectorArg = string | string[];

export interface ICollectorResult {
  collector?: Collector;
  argv?: string[];
  options: {[key: string]: any};
  args: TCollectorArg[];
}

export interface ICollectorSummary {
  name: string;
  path: string[];
  desc: string;
  options: UI.IOutputGrid;
  args: UI.IOutputGrid;
  subcommands: ICollectorSummary[];
}

export enum CollectorEvent {
  HELP = 'help',
  VERSION = 'version',
  OPTION = 'option',
  PARSE = 'parse',
}

export enum CollectorOpt {
  HELP = 'help',
  VERSION = 'version',
}

export class Collector extends EventEmitter {
  // ivars
  private readonly _options: ICollectorOption[] = [];
  private readonly _args: ICommandArgument[] = [];
  private readonly _commands = new Map<string, Collector>();
  private readonly _flags = new Map<TOptionFlag, Flag>();
  private readonly _metadata: ICollectorMeta = {};
  private _parent: Collector;
  private _result: ICollectorResult = {options: {}, args: []};

  constructor(name: string, description?: string) {
    super();
    this._meta('name', name)
      ._meta('description', description || null);
  }

  public name(): string;
  public name(name: string): this;
  public name(name?: string): string | this {
    return this._meta('name', name);
  }

  public description(): string;
  public description(desc: string): this;
  public description(desc?: string): string | this {
    return this._meta('description', desc);
  }

  public unknowns(allow: boolean): this {
    return this._meta('unknowns', allow);
  }

  public version(): string;
  public version(v: string, opt?: ICommandOption): this;
  public version(v?: string, opt?: ICommandOption): string | this {
    const that = this._meta('version', v);
    return v ?
      that.option({
        inherits: false,
        ...(opt || { flag: `-v, --${CollectorOpt.VERSION}`, description: 'display command version number' }),
      }) :
      that;
  }

  public help(opt?: ICommandOption): this {
    return this.option(opt || {flag: `-h, --${CollectorOpt.HELP}`, description: 'output command usage information'});
  }

  public option(...opts: ICollectorOption[]): this {
    const { _options, _flags } = this;
    opts.forEach(opt => {
      const flag = new Flag(opt.flag, opt.default, opt.fn);
      flag.alias.forEach(a => _flags.set(a, flag));
      _options.forEach((o, i) => o._flag.name === flag.name && _options.splice(i, 1)); // dedupe
      _options.push({
        ...opt,
        _flag: flag,
      });
    });
    return this;
  }

  public argument(...args: ICommandArgument[]): this {
    this._args.push(...args);
    return this;
  }

  public parent(p?: Collector): Collector {
    if (p) {
      this._parent = p;
      return this;
    }
    return this._parent;
  }

  public root(): Collector {
    let command: Collector = this;
    while (command.parent()) {
      command = command.parent();
    }
    return command;
  }

  public isRoot(): boolean {
    return !this._parent;
  }

  public subcommand(name: string, description?: string) {
    const command = new Collector(name, description).parent(this);
    this._commands.set(name, command);
    return command;
  }

  public isOpt(arg: string): boolean {
    return CONSTANTS.REGEX.OPTARG.test(arg || '');
  }

  public usage(): ICollectorSummary {
    const tree: string[] = [];
    this._all(cmd => tree.unshift(cmd.name()));
    return {
      name: this.name(),
      path: tree.filter(p => !!p),
      desc: this.description() || '',
      args: this._args.map(a => [
        (a.optional ? '[' : '<') + (a.multi ? '...' : '') + a.name + (a.optional ? ']' : '>'),
        a.description || '']),
      options: this._options
        .filter(o => !o.hidden)
        .map(o => [o._flag.alias.join(', '), o.description || '', o.default ? `(default ${o.default})` : '']),
      subcommands: [...this._commands.values()].map(c => c.usage()),
    };

  }

  public on(event: CollectorEvent.OPTION, listener: IResolvedOptionListener<any>): this;
  public on(event: CollectorEvent.VERSION, listener: IResolvedOptionListener<boolean>): this;
  public on(event: CollectorEvent.HELP, listener: IResolvedHelpListener): this;
  public on(event: CollectorEvent.PARSE, listener: (result: ICollectorResult) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this;
  public on(event: CollectorEvent, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * listener for named option
   * @param name
   * @param listener
   */
  public onOption<T = any>(name: string, listener: IResolvedOptionListener<T>): this {
    return this.on(`option:${name}`, listener);
  }

  /**
   * alias for help event
   * @param listener
   */
  public onHelp(listener: IResolvedHelpListener): this {
    return this.on(CollectorEvent.HELP, listener);
  }

  /**
   * resolve process arguments into a parsed set of options/args
   * @param argv sliced process.argv
   */
  public resolve(argv: string[]): Promise<ICollectorResult> {
    return new Promise(resolve => {
      if (!this.isRoot()) {
        return resolve(this.root().resolve(argv));
      }
      const list = [...argv];

      // resolve the command from the args
      const collector = this._sliceInstance(list);

      // non-command args
      const iargv = [...list];

      // reduce list into opts/args
      while (list.length) {
        const next = list.shift();
        collector._receive(next, list);
      }

      // finish
      const result: ICollectorResult = {
        collector,
        argv: iargv,
        ...collector.result(),
      };

      resolve(result);
    });
  }

  public result(): ICollectorResult {
    return this._defaults()._verify()._result;
  }

  /**
   * resolve argument-only and reduce original args to remaining options
   * @param args
   */
  public argShift(args: string[]): string[] {
    const arg = this.optRight(args);
    const opt = arg.findIndex(a => this.isOpt(a));
    return arg.slice(0, ~opt ? opt : undefined);
  }

  /**
   * restructure args such that all opts and values are preceded by the "args"
   * @param args
   */
  public optRight(args: string[]): string[] {
    const all = [...args];
    const arg: string[] = [];
    const opt: string[] = [];

    while (all.length) {
      const next = all.shift();
      if (this.isOpt(next)) {
        opt.push(next);
        const [flag, flagVal] = this._flagVal(next);
        const o = this._flags.get(flag);
        if (!flagVal && o && !o.meta.bool) {
          opt.push(all.shift());
        }
      } else {
        arg.push(next);
      }
    }
    return [...arg, ...opt];
  }

  /**
   * resolve Collector instance and update args
   * @param args
   */
  protected _sliceInstance(args: string[]): Collector {
    let start: number;
    let len: number = 0;

    const inst = args.reduce((prev: Collector, current: string, i: number) => {
      const next = prev._commands.get(current);
      if (next instanceof Collector) {
        start = typeof start === 'undefined' ? i : start;
        len++;
        next._inherit(prev._options);
      }
      return next || prev;
    }, this);

    if (len) {
      args.splice(start, len);
    }

    return inst;
  }

  protected _inherit(options: ICollectorOption[]): this {
    this._flags.clear();
    const own = this._options.splice(0);
    [options.filter(o => o.inherits !== false), own]
      .forEach(optSet => this.option(...optSet));
    return this;
  }

  protected _defaults(): this {
    const { options } = this._result;
    this._options
      .map(opt => opt._flag)
      .filter(flag => typeof options[flag.name] === 'undefined')
      .forEach(flag => options[flag.name] = flag.defaultValue);
    return this;
  }

  protected _verify(): this {
    const { args, options } = this._result;
    if (!options[CollectorOpt.HELP]) {
      this._args.forEach((a, i) => {
        if (!a.optional && !args[i]) {
          this._err(`missing required argument: ${a.name}`);
        }
      });
    }
    return this;
  }

  protected _receive(current: string, rest: string[]) {
    const { options, args } = this._result;
    if (this.isOpt(current)) {
      this._result.options = {
        ...options,
        ...this._optVal(current, rest),
      };
    } else {
      const last: number = args.length;
      const max: number = this._args.length - 1;
      const defn: ICommandArgument = this._args[Math.min(last, max)];
      if (defn && defn.multi) {
        const slot = this._args.length - 1;
        args[slot] = args[slot] || [];
        (args[slot] as string[]).push(current);
      } else {
        args.push(current);
      }
    }
  }

  /**
   * process an --{flag}="{val}" syntax
   * @param arg argument
   */
  private _flagVal(arg: string): string[] {
    const [match, flag, flagVal] = arg.match(CONSTANTS.REGEX.OPTARG);
    return [flag, flagVal];
  }

  /**
   * resolves value from option argument
   * @param current the present flag
   * @param rest remaining args
   */
  private _optVal(current: string, rest: string[]): {[name: string]: any} {
    const [flag, flagVal] = this._flagVal(current);
    const opt = this._flags.get(flag);
    const name = opt ? opt.name : camelize(flag);
    let val: any = flagVal;

    if (!(opt instanceof Flag)) {
      if (!this._meta('unknowns')) {
        this._err(`Unknown option: ${flag}`);
      }
      val = val || true;
    } else {
      const { meta } = opt;
      if (meta.bool) {
        val = meta.neg ? false : true;
      } else if (!val) {
        val = !this.isOpt(rest[0]) ? rest.shift() : opt.defaultValue;
        if (!val && meta.vRequired) {
          this._err(`Option '${name}' requires a value: '${meta.vName}'`);
        }
      }

      // apply option handler
      if (!meta.bool && opt.handler) {
        if (opt.handler instanceof RegExp) {
          val = val.match(opt.handler);
        } else {
          val = opt.handler(val, this._result.options[name]);
        }
      }
    }
    this._emitOpt(name, val);
    return { [name]: val };
  }

  private _emitOpt(name: string, val: any) {
    this._all(cmd => {
      cmd.emit(CollectorEvent.OPTION, name, val);
      cmd.emit(`option:${name}`, val);
    });
  }

  private _all(cb: (cmd: Collector) => void): void {
    cb(this);
    const p = this.parent();
    return p && p._all(cb);
  }

  private _err(msg: string): never {
    throw new Error(msg);
  }

  private _meta(key: keyof ICollectorMeta): string | boolean;
  private _meta(key: keyof ICollectorMeta, val: string | boolean): this;
  private _meta(key: keyof ICollectorMeta, val?: string | boolean): string | boolean | this {
    if (typeof val !== 'undefined') {
      this._metadata[key] = val;
      return this;
    }
    return this._metadata[key];
  }
}
