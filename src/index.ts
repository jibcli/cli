// expose some core libs
export { JIB, VERSION } from './lib';
export { UI, Log, Workspace } from './lib';

// expose plugin extensibility & tokens
export * from './tokens';
export { /*Extends,*/ Provide, Plugin, IPluginProvider } from './lib';

// expose main objects and interfaces
export { IProjectConfig } from './project';
export { Command, BaseCommand } from './command';
export { Program, IProgramOptionCallback } from './program';
export { CLI, ICLIOptions } from './parser';
