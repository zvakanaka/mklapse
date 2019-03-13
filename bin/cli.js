#!/usr/bin/env node
const lapser = require('../lapser.js');

async function init() {
  if (process.argv.length >= 3) {
    try {
      const inputArgs = process.argv.slice(2);
      const {stdout, stderr} = await lapser(inputArgs);
    } catch (e) {
      console.error(e);
    }
  } else {
    console.error('Not enough arguments\nUsage:\n\tlapser in-file.mov [outfile.gif]');
  }
}

init();
