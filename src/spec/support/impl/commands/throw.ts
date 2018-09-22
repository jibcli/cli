import { Command, BaseCommand } from '../';

export interface IThrowOpts {
  throw?: boolean;
}

@Command({
  description: 'test errors command',
  allowUnknown: true,
  options: [
    {flag: '-t, --throw', description: 'throws an error'},
  ]
})
export class IThrowOpts extends BaseCommand {
  public async run(options: IThrowOpts, worlds: string[]) {
    if (options.throw) {
      throw new Error('A thrown error');
    } else {
      return Promise.reject('A Promise rejection');
    }
  }

  public help(): void {
    this.ui.output('Custom command help');
  }
}
