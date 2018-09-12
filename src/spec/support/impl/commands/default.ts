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
    this.ui.output(`Foo ${foo}`);
    this.ui.output(`Opt ${options.opt}`);
    
    this.ui.outputSection('CLI Default Command', `
    If specified, this command is executed when
    - No arguments are passed
    - Another command is not otherwise detected based on the args`);
  }
}
