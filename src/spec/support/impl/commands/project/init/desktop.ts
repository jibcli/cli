import { Command, BaseCommand } from '../../../';

@Command({
  description: 'Init project for desktop'
})
export class Desktop extends BaseCommand {

  public async run(options: any, ...args: any[]) {
  }
}