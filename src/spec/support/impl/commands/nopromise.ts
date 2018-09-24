import { Command, BaseCommand } from '../';


@Command({
  description: 'no async command',
})
export class NoAsync extends BaseCommand {
  public run(options: any, ...args: any[]): any {
    this.ui.output('Run without promise');
  }
}
