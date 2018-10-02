import { Command, BaseCommand } from '../../';

@Command({
  description: 'Build a project',
})
export class Build extends BaseCommand {

  public async run(options: any, ...args: any[]) {
  }
}