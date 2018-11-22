export const SPACE = ' ';
export const CONSTANTS = {
  COMMAND_DELIMITER: SPACE,       // default command topic delimiter
  COMMAND_DIRECTORY: 'commands',  // default command directory
  INDENTATION: '  ',              // standard indentation (2 spaces)
  PKG_CONFIG_KEY: 'jib',          // config in the CLI project package json.
  REGEX: {
    OPTARG: /^(--?[a-z_-]+)(?:=["']?(.+)["']?)?/i,    // flag argv pattern
    FLAGS: /--?([a-z_-]+)/ig,                         // all flags in syntax
    FLAG: /--?[a-z_-]+(?:[\s=]?([<[])(\w+)[>\]])?$/,  // the last flag with --name <val>
    DASH: /^-+/,                                      // leading dash
    NEG: /^--no-/,                                    // flag negative syntax
  },
};
