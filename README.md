# Jib Command Line Framework

This source is meant to serve as a reusable CLI framework for projects with any
level of CLI command functionality.

## Get Started with Jib

1. Configure the Jib CLI in `package.json`:

```javascript
{
  "jib": {
    "commandDir": "./build/commands", // default "commands"
    "commandDelim": ":", // default " "
  },
  "bin": {
    "mycmd": "bin.js"
  }
}
```

2. Add `bin.js` file to process command line arguments:

```javascript
#! /usr/bin/env node

const { CLIParser } = require('@jib/cli');

const parser = new CLIParser();
parser.parse(process.argv);

if (!process.argv.slice(2).length) {
  parser.help();
}
```

> **NOTE:** because of certain nuances in local development enviromments, it is
best to use a `.js` file as the bin, rather than a file emitted by TypeScript.

3. Add files and folders to the `commandDir` path, then invoke by name:

```typescript
// TODO
```

## TODOs

- [ ] Add support for single named command
- [ ] Add support for `stdin`
- [ ] Add support for custom text additions on `-v|--version` (foo, copyright, etc.)
- [ ] Add support for plugins
  - [ ] UI spinner `@jib/cli-spinner`
  - [ ] UI table `@jib/cli-table`
  - [ ] UI image `@jib/cli-image`
  - [ ] UI video `@jib/cli-video`
  - [ ] Yeoman generator framework `@jib/yeoman`