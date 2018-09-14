import { Command, BaseCommand } from '../';

interface IDefaultOptions {
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
class DefaultCommand extends BaseCommand {
  public async run(options: IDefaultOptions, foo: string) {
    this.ui.output(`Ran a single command`);
    this.ui.outputLines([
      `Foo ${foo}`,
      `Opt ${options.opt}`,
    ]);
  }
}
// tests direct export
export = DefaultCommand;