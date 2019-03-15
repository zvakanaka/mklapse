#!/usr/bin/env node
const mklapse = require('../mklapse.js');

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
