import * as child_process from 'child_process';

export interface IChildSpawnOptions extends child_process.SpawnOptions { }

/**
 * Execute child processes as promise
 * @ignore
 */
export class ChildPromise {

  public static spawn(command: string, args?: string[], options?: IChildSpawnOptions): Promise<string> {
    return this._child('spawn', command, args, options);
  }

  public static exec(command: string, options?: child_process.ExecOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const cb = (err: child_process.ExecException, stdout: string, stderr: string) => {
        return err ? reject(err) : resolve(stdout);
      };
      return options ? child_process.exec(command, options, cb) : child_process.exec(command, cb);
    });
  }

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
        return code === 0 ? resolve(out.trim()) : reject(err || out);
      });
    });
  }

}
