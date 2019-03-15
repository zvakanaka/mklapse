const exec = require('util').promisify(require('child_process').exec);
const sequentialPromiseAll = require('./lib/sequentialPromiseAll');
const fs = require('fs');
const {promisify} = require('util');
const readdir = promisify(fs.readdir);

const DEFUALT_TEMP_DIR = 'mklapse';
const ZOOM_DELTA = 1.0025;
const pwd = './';

module.exports = mklapse;

async function mklapse(inputArgs) {
  const operationType = inputArgs[0];
  const files = await readdir(pwd);
  const validFiles = files.filter(fileName => {
    return fileName.toLowerCase().endsWith('.jpg');
  });
  await clean();
  await mkdir(DEFUALT_TEMP_DIR);
  await exec(`cp ${validFiles[0]} ${DEFUALT_TEMP_DIR}/IMG_0000.jpg`);
  let last = '0000';
  let count = last;
  let [width, height] = await getPhotoDimensions(validFiles[0]);
  const originalWidth = width;
  const originalHeight = height;
  const commandsArray = validFiles.map(inputFile => { // build array of commands
    last = count;
    count = `${Number(count) + 1}`.padStart(4, '0');
    const outputFile = `${DEFUALT_TEMP_DIR}/IMG_${count}.jpg`;
    let command;
    switch (operationType) {
      case 'zoom':
        command = `convert ${inputFile} -resize ${width}x${height}^ -gravity center -extent ${originalWidth}x${originalHeight} ${outputFile}`;
        break;
      case 'trails':
        command = `convert ${DEFUALT_TEMP_DIR}/IMG_${last}.jpg ${inputFile} -gravity center -compose lighten -composite -format jpg ${outputFile}`;
        break;
      default:
        command = `convert ${inputFile} -resize ${width}x${height}^ -gravity center -extent ${originalWidth}x${originalHeight} ${outputFile}`;
    }
    width *= ZOOM_DELTA;
    height *= ZOOM_DELTA;
    return command;
  });
  let commandIndex = 0;

  process.stdout.write(`1/${commandsArray.length}`);
  sequentialPromiseAll(exec, [commandsArray[0]], commandsArray.length, (args, lastResponse) => {
    if (args[0]) args[0] = commandsArray[++commandIndex];
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${commandIndex + 1}/${commandsArray.length}`); // end the line
  });
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
};

async function mkdir(dirname) {
  const outputObj = await exec(`mkdir -p ${dirname}`);
  return outputObj;
}

async function getPhotoDimensions(fileName) {
  const output = await exec(`identify ${fileName}`);
  const [, width, height] = output.stdout.match(/(\d+)x(\d+)\s/);
  return [Number(width), Number(height)];
}

async function clean() {
  try {
    console.log(`removing temp dir '${DEFUALT_TEMP_DIR}'`);
    const rmOutputObj = await exec(`rm -r ${DEFUALT_TEMP_DIR}`);
  } catch (e) {
    console.error(e.message.trim().endsWith('No such file or directory') ? '' : e);
  }
}
