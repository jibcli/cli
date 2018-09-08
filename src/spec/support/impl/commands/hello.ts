import { Command, BaseCommand } from '../';

@Command({
  description: 'test hello command',
})
export class Hello extends BaseCommand {
  public async run() {
    this.ui.output('Hello');
  }
}
