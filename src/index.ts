// expose some core libs
export { UI, Log, Workspace } from './lib';

// expose plugin extensibility & tokens
export * from './tokens';
export { /*Extends,*/ Provide, Plugin } from './lib';

// expose main objects and interfaces
export { IProjectConfig } from './project';
export { Command, BaseCommand } from './command';
export { Program, IProgramOptionCallback } from './program';
export { CLI, ICLIOptions } from './parser';
