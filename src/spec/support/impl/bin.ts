#! /usr/bin/env node

// ################################
// For unit tests in parser.spec.ts
// ################################

import { CLI } from './';

// parser is env-based, to allow different test scenarios
const parser = new CLI({
  rootCommand: process.env.ROOT_COMMAND,
  commandDelim: process.env.JIB_DELIM,
});

parser.parse(process.argv);