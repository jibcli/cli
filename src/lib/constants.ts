const NAMESPACE = 'jib';
export const SPACE = ' ';

export const CONSTANTS = {
  NAMESPACE,
  COMMAND_DELIMITER: SPACE,       // default command topic delimiter
  COMMAND_DIRECTORY: 'commands',  // default command directory
  INDENTATION: '  ',              // standard indentation (2 spaces)
  PKG_CONFIG_KEY: NAMESPACE,      // config in the CLI project package json.
  REGEX: {
    OPTARG: /^(--?[a-z_-]+)(?:=["']?(.+)["']?)?/i,    // flag argv pattern
    FLAGS: /--?([a-z_-]+)/ig,                         // all flags in syntax
    FLAG: /--?[a-z_-]+(?:[\s=]?([<[])(\w+)[>\]])?$/,  // the last flag with --name <val>
    DASH: /^-+/,                                      // leading dash
    NEG: /^--no-/,                                    // flag negative syntax
  },
};
