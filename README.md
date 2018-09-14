# The jib Command Line Framework

This project is meant to serve as a lightweight, reusable, TypeScript first
CLI framework for projects with any level of CLI command functionality.

## Why `'jib'`

OK, so there's actually _some_ method to the madness... The `@jib/cli` is
based on the extremely popular [Commander.js](https://www.npmjs.com/package/commander)
CLI development framework. As many sailors might attest, the **_jib_** is an essential
component to commanding their ship - thus the name.

> **Jib `| jib |`:** A triangular staysail set forward of the forwardmost mast.

While it's not a dependency, this package was also somewhat influenced by Heroku's
[`@oclif/command`](https://www.npmjs.com/package/@oclif/command) - namely that it's
designed to be highly performant for large CLI applications. Other similiarities are:

- TypeScript first development experience.
- Only `require`(s) a file when its command is called.
- Minimal dependencies & lightweight.

Some additional benefits of `@jib/cli` include:

- Run any combination of single/multi command CLIs in one project.
- Supports custom command delimiter syntax (such as `<command>:<subcommand>` or `<command> <subcommand>`).
- Built-in logger and ui stream classes.

## Structure

The basis for command processing is the project structure where they're defined.
The example below shows one possible structure and its resulting commands.

```text
sample $> tree
.
├── bin
├── package.json
├── src
│   └── commands
│       ├── help.ts
│       └── project
│           ├── build.ts
│           └── init
│               ├── desktop.ts
│               ├── mobile.ts
│               └── web.ts
└── tsconfig.json
```

1. `sample help`
1. `sample project build`
1. `sample project init <desktop|mobile|web>`

## Get Started

1. Install & configure the `@jib/cli` in `package.json`:

```javascript
{
  "jib": {
    "commandDir": "./build/commands", // default "commands"
    "commandDelim": ":", // default " "
  },
  "dependencies": {
    "@jib/cli": "latest"
  }
}
```

> **NOTE:** that the `"jib"` configuration should reference the final _compiled_
project outputs. The `@jib/cli` parser will automatically detect development envs
where `ts-node` is used to transpile on the fly.

2. Add a `"bin"` configuration to `package.json` where the node executable is located within the project, such as `./bin/jib`:

```javascript
#! /usr/bin/env node

/* Example `bin/jib` implementation */
const { CLI } = require('@jib/cli');

const parser = new CLI({ /* options */ });
parser.parse(process.argv);
```

```javascript
/* "bin" entry in package.json */
{
  "bin": {
    "myjib": "bin/jib"
  }
}
```

> **NOTE:** because of certain nuances in local development enviromments, it is
best to use a static file as the bin, rather than a file emitted by TypeScript.
Generally it's a good idea to ensure this file has executable permissions
(ie `chmod +x bin/jib` in the example above).

3. Configure the `new CLI({ /* options */ })` for your implementation

| Option | Description | Default | Required |
|--|--|--|--|
| `baseDir` | Used to specify an alternate project directory. ⚠️  _Unlikely to be necessary - approach with caution_ | `'.'` | |
| `commandDelim` | Use a custom delimiter for subcommands. Must have `length === 1` | `' '` | |
| `commandDir` | Directory where command implementations are stored. This should be the _transpiled_ output directory, such as `"build/commands"` | `null` | ✅  |
| `rootCommand` | Run a single command implementation when arguments don't resolve as subcommands. For example, create a `main.ts` implementation and specify `rootCommand: "main"` | `null` | |

4. Add files and folders to the `commandDir` path, then invoke by name:

> Example command implementation `hello.ts`

```typescript
import { Command, BaseCommand } from '@jib/cli';

export interface IOptsHello {
  /* optionally define option types for `run` method signature */
}

@Command({
  description: 'my hello world command',
  args: [ /* configure command args here */ ],
  options: [ /* configure option flags here */ ],
})
export class Hello extends BaseCommand {
  public async run(options: IOptsHello, ...args: any[]) {
    this.ui.output('hello world');
  }
}
```

## Command Anatomy

This is meant to cover all facets of `@jib/cli` command implementations. If
you'd rather move along and read details of CLI processing, then skip ahead to
the [run method](#the-run-method) section.

### `Command` and `BaseCommand`

The first line of most commands will import two objects from `@jib/cli`. These
objects are the foundation of any command implementation, and the use of each
is **required**.

```typescript
import { Command, BaseCommand } from '@jib/cli';
```

|  | ¯\\_(ツ)_/¯ |
|--|--|
| `Command` | Class decorator providing static command configuration as "annotations" |
| `BaseCommand` | Extensible command abstract that declares the `public async run()` contract, and provides `ui` and `logger` member instantiations |

### `@Command` decorator

Aside from the project structure, this is the main instruction between a command
implementation and the parser. The `@Command()` decorator is what describes the
command and its arguments/options.

```typescript
@Command({
  description: 'The purpose of your command',
  args: [ /* configure command args here */ ],
  options: [ /* configure option flags here */ ],
})
export class MyCommand extends BaseCommand { /* see below*/ }
```

### Command Arguments

As part of the `@Command` annotations, `args` are specified as an array of
argument definitions where `ICommandArgument`

```typescript
interface {
  args?: ICommandArgument[];
}
```

| `ICommandArgument` | Type | Description | Default | Required |
|--|--|--|--|--|
| `name` | `string` | The argument name to be rendered in usage text | | ✅  |
| `optional` | `boolean` | Indication of whether or not the argument is optional | `false` | |
| `multi` | `boolean` | Indicate variadic argument (multiple args as one array). If `true`, then must also be the last | `false` | |

### Command Options

Specifing `options` for a command is also done with the `@Command` decorator.

```typescript
interface {
  options?: ICommandOption[];
}
```

| `ICommandOption` | Type | Description | Default | Required |
|--|--|--|--|--|
| `flag` | `string` | The [option flag syntax](#option-flag-syntax) | | ✅  |
| `description` | `string` | Option description for help rendering | `''` | |
| `default` | `any` | Default option value | | |
| `fn` | `((val: any, values: any) => any) | RegExp` | Value processing function, especially useful for accepting multiple values with a single flag | | |

#### Option Flag Syntax

Each flag may be written in the format `[-{short}, ]--{name}[ [value]|<value>]`.
Some examples:

- `-c, --cheese <type>` requires "type" in cheese option
- `-p, --project [path]` "path" is optional for the project option
- `-d, --debug` simple boolean option
- `--test` a longhand only flag

Short boolean flags may be passed as a single argument, such as `-abc`.
Multi-word arguments like `--with-token` become camelCase, as `options.withToken`.
Also note that multi-word arguments with `--no` prefix will result in `false` as
the option name value. So `--no-output` would parse as `options.output === false`.
  
If necessary, refer to [commander](https://www.npmjs.com/package/commander#option-parsing)
for more information.

### The `run` method

The last part of a command implementation is its `public async run` method.
Once the parser is done parsing, and the program is done programming, it's
finally time for a resolved command to `run`.

```typescript
interface {
  /* Async method called on the instantiated command */
  run(options: {[name: string]: any}, ...args: any[]): Promise<any>;
}
```

Naturally it is the job of each command implementation to do whatever magic it
must do according to its user's wishes. Hmm... sort of like a genie. All the
program needs is for this method to return a `Promise`.

As is shown in the call signature above, the first argument will be the resolved
`options` as defined in the decorator. Note that each option key is the long,
camelCased option name (unless using the `--no` prefix as mentioned).

Then, all resolved `args` will be passed in the order which they are defined,
again in the decorator. Note that if an argument is declared as `multi: true`,
then its value will be the final argument, and of type `string[]`.

## TypeScript

I was a JavaScript developer, then learned TypeScript but hated static typing,
so went back to plain 'ol JavaScript

> ... said no one ever

## TODOs

- [x] Add support for single, named, command - this is configured as `"rootCommand"`
- [ ] Enable command ordering with `ICommand.priority` annotation
- [ ] Support command group with file implementation (descriptor) & directory of same name
- [ ] Test harness for implementations `@jib/cli/testing`
- [ ] Add `Dockerfile` to cli implementations for docker-based execution
- [ ] Add built-in support for `stdin` pipes
- [ ] Add support for custom text additions on `-v|--version` (copyright, foo, etc.)
- [ ] Add support for command aliases
- [ ] Add support for plugins
  - [ ] Yeoman generator framework `@jib/yeoman`
  - [ ] UI spinner `@jib/cli-spinner`
  - [ ] UI table `@jib/cli-table`
  - [ ] UI image rendering `@jib/cli-image`
  - [ ] UI video rendering `@jib/cli-video`