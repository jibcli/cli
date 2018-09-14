import { Command, BaseCommand } from '../../../';

@Command({
  description: 'Init a mobile project'
})
export class Mobile extends BaseCommand {

  public async run(options: any, ...args: any[]) {
  }
}