import { Command, BaseCommand } from '../';

export interface IDefaultOptions {
  opt: boolean;
}

@Command({
  hidden: true,
  description: 'A default implementation',
  options: [
    {flag: '-o, --opt', description: 'an option'},
  ],
  args: [
    {name: 'foo', optional: true},
  ],
})
export class DefaultCommand extends BaseCommand {
  public async run(options: IDefaultOptions, foo: string) {
    this.ui.output(`Ran a single command`);
    this.ui.outputLines([
      `Foo ${foo}`,
      `Opt ${options.opt}`,
    ]);
  }
}
