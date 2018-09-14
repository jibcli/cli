import { Command, BaseCommand } from '../../../';

@Command({
  description: 'Init a web project',
  args: [
    {name: 'name', optional: true}
  ],
})
export class Web extends BaseCommand {

  public async run(options: any, name: string) {
    this.ui.output(`Init web ${name}`);
  }
}