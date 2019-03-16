#!/usr/bin/env node
const mklapse = require('../mklapse.js');

const optionDefinitions = [
  { name: 'verbose', alias: 'v', type: Boolean },
  { name: 'src', type: String, multiple: true, defaultOption: true },
  { name: 'framerate', alias: 'r', type: Number }
];

async function init() {
  if (process.argv.length >= 3) {
    try {
      const inputArgs = process.argv.slice(2);
      await mklapse(inputArgs);
    } catch (e) {
      console.error(e);
    }
  } else {
    console.error('Not enough arguments\nUsage:\n\tmklapse [video | trails | zoom | play]');
  }
}

init();
