const { spawn } = require('child_process');
const exec = require('util').promisify(require('child_process').exec);
const sequentialPromiseAll = require('sequential-promise-all');
const barChart = require('bar-charts');

const BLANK = '⠀'; // braille blank emoji (because jstrace-bars removes leading spaces)

function spawnWrapper(args, options) { // for programs with much output
  return new Promise((resolve, reject) => {
    try {
      const programName = args.split(' ')[0];
      const spawned = spawn(programName, args.split(' ').slice(1), { shell: true });
      let outputString = '';
      spawned[options && options.stderr ? 'stderr' : 'stdout'].on('data', data => {
        const text = data.toString('utf8');
        outputString += text;
      });
      spawned[options && options.stderr ? 'stderr' : 'stdout'].on('end', data => {
        resolve(outputString);
      });
      spawned.on('exit', code => {
        if (code != 0) {
          console.log('Error code: ' + code);
          reject();
        }
      });
    } catch (e) {
      console.error(e);
      reject();
    }
  });
}

const sequentialCommands = async (commandsArray, options) => {
  let count = 0;
  const response = await sequentialPromiseAll(options && options.spawn ? spawnWrapper : exec, [commandsArray[0]], commandsArray.length, (args, lastResponse, i) => {
    if (args[0]) args[0] = commandsArray[i];
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    count = parseInt(i + 1, 10) / commandsArray.length * 100;
    const output = barChart([{ label: `${`${parseInt(i, 10) + 1}`.padStart(`${commandsArray.length}`.length, BLANK)}/${commandsArray.length}`, count }], { percentages: true });
    process.stdout.write(output);
    if (options && options.cb && typeof options.cb === 'function') options.cb(args, lastResponse, i);
  });
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(); // end the line
  return response;
};

module.exports = sequentialCommands;
