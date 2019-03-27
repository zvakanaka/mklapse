function understand(optionsConfig, args = process.argv.slice(2)) {
  const options = {
    command: args[0]
  };

  optionsConfig
    .filter(c => c.command === options.command && c.name)
    .forEach((c) => {
      options[c.name] = c.defaultValue;
    });
  // overlay command line arguments onto the config
  if (args.length > 1) {
    const matchingOptionsConfigs = optionsConfig.filter(c => c.command === options.command);
    const argsAfterCommand = args.slice(1); // remove command
    let giveMeABreak = false;
    argsAfterCommand.forEach((cur, i) => {
      // --delta value => options.delta = value
      if (!giveMeABreak) {
        const refType = cur.startsWith('--') ? 'name' : cur.startsWith('-') ? 'alias' : false; // name or alias
        if (!refType) throw new Error(`Unknown command line argument, '${cur}'`);
        const refName = cur.startsWith('--') ? cur.substr(2) : cur.startsWith('-') ? cur.substr(1) : cur;
        if (refType) {
          const matchingConfig = matchingOptionsConfigs.find(c => c[refType] === refName);
          if (!matchingConfig) throw new Error(`Unknown command line argument, '${cur}'`);
          const type =  matchingConfig.type ? matchingConfig.type : (val) => val;
          options[refName] = type(argsAfterCommand[i + 1]);
          giveMeABreak = true;
        }
      } else giveMeABreak = false;
    });
  }
  return options;
}

module.exports = understand;
