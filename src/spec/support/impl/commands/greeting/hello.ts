import { Command, BaseCommand } from '../../';

export interface IHelloOptions {
  casual?: boolean;
}

@Command({
  description: 'greeting hello subcommand',
  options: [ ],
  args: [ ]
})
export class Hello extends BaseCommand {
  public async run(options: IHelloOptions, ...tail: string[]) {
    this.ui.output('Hi there');
  }
}
