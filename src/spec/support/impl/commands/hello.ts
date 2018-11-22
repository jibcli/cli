import { Command, BaseCommand } from '../';

export interface IHelloOptions {
  casual?: boolean;
  multi?: string[];
}

function multiCb(val: any, values: string[]): any {
  values = values || [];
  return values.concat(val);
}

@Command({
  description: 'test hello command',
  allowUnknown: true,
  options: [
    {flag: '-c, --casual', description: 'be casual'},
    {flag: '-m, --multi <val>', description: 'multi option', fn: multiCb},
    {flag: '--no-color', description: 'negative flag'},
  ],
  args: [
    /** must provide <world...> args */
    {name: 'world', multi: true, optional: false, description: 'variadic arg'},
  ],
})
export class Hello extends BaseCommand {
  public async run(options: IHelloOptions, worlds: string[]) {
    if (options.casual) {
      this.ui.output('Hi!');
    } else if (options.multi) {
      options.multi.forEach(opt => this.ui.output(`Hello ${opt}`));
    } else {
      this.ui.output(`Hello ${worlds.join('|')}!`);
    }
  }

  public help(): void {
    this.ui.output('Custom command help');
  }
}
