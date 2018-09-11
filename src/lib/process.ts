import * as child_process from 'child_process';

export interface IChildSpawnOptions extends child_process.SpawnOptions { }

export class ChildPromise {

  private static _child(type: string, command: string, args?: string[], options?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let [out, err] = ['', ''];
      const sub = child_process[type](command, args, options) as child_process.ChildProcess;
      if (sub.stdout) {
        sub.stdout.on('data', (data: Buffer) => out += `${data}`);
      }
      if (sub.stderr) {
        sub.stderr.on('data', (data: Buffer) => err += `${data}`);
      }
      sub.on('error', e => reject(e));
      sub.on('exit', code => {
        return code === 0 ? resolve(out.trim()) : reject(err);
      });
    });
  }

  public static spawn<T>(command: string, args?: string[], options?: IChildSpawnOptions): Promise<T> {
    return this._child('spawn', command, args, options);
  }
  public static fork<T>(command: string, args?: string[], options?: child_process.ExecOptions): Promise<T> {
    return this._child('fork', command, args, options);
  }
  public static exec<T>(command: string, args?: string[], options?: child_process.ExecOptions): Promise<T> {
    return this._child('exec', command, args, options);
  }

}
