# Meet the jib Command Line Framework

This source is meant to serve as a reusable CLI framework for projects with any
level of CLI command functionality.

## Why `@jib`

OK, so there's actually _some_ method to the madness... The `@jib/cli` is
based on the extremely popular [Commander.js](https://www.npmjs.com/package/commander)
CLI development framework. As many sailors might attest, the **_jib_** is an essential
component to commanding their ship - thus the name.

> **jib:** A triangular staysail set forward of the forwardmost mast.

## Get Started with Jib

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

2. Add define `bin.js` file to process command line arguments:

```javascript
{
  "bin": {
    "mycmd": "bin.js"
  }
}
```

```javascript
#! /usr/bin/env node

const { CLI } = require('@jib/cli');

const parser = new CLI({ /* options */ });
parser.parse(process.argv);

if (!process.argv.slice(2).length) {
  parser.help();
}
```

> **NOTE:** because of certain nuances in local development enviromments, it is
best to use a JavaScript file as the bin, rather than a file emitted by TypeScript.

3. Add files and folders to the `commandDir` path, then invoke by name:

```typescript
import { Command, BaseCommand }
```

## TODOs

- [x] Add support for single, named, command - this is configured as `"rootCommand"`
- [ ] Test harness for implementations `@jib/cli/testing`
- [ ] Add `Dockerfile` to cli implementations for docker-based execution
- [ ] Add support for `stdin` pipes
- [ ] Add support for custom text additions on `-v|--version` (copyright, foo, etc.)
- [ ] Add support for command aliases
- [ ] Add support for plugins
  - [ ] Yeoman generator framework `@jib/yeoman`
  - [ ] UI spinner `@jib/cli-spinner`
  - [ ] UI table `@jib/cli-table`
  - [ ] UI image rendering `@jib/cli-image`
  - [ ] UI video rendering `@jib/cli-video`