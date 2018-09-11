#! /usr/bin/env node
import { CLI } from './';

const parser = new CLI({
  commandDelim: process.env.JIB_DELIM,
});

parser.parse(process.argv);