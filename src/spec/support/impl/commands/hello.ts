import { Command, BaseCommand } from '../';

export interface IHelloOptions {
  casual?: boolean;
}

@Command({
  description: 'test hello command',
  options: [
    {flag: '-c, --casual', description: 'be casual'},
  ],
  args: [
    /** must provide <world...> args */
    {name: 'world', multi: true, optional: false}
  ]
})
export class Hello extends BaseCommand {
  public async run(options: IHelloOptions, worlds: string[]) {
    if (options.casual) {
      this.ui.output('Hi!');
    } else {
      this.ui.output(`Hello ${worlds.join('|')}!`);
    }
  }
}
