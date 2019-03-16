const exec = require('util').promisify(require('child_process').exec);
const sequentialPromiseAll = require('./lib/sequentialPromiseAll');
const fileParts = require('./lib/fileParts');
const fs = require('fs');
const {promisify} = require('util');
const readdir = promisify(fs.readdir);

const DEFUALT_TEMP_DIR = 'mklapse';
const pwd = './';

module.exports = mklapse;

async function mklapse(inputArgs) {
  const operationType = inputArgs[0];
  const files = await readdir(pwd);
  const validFiles = files.filter(fileName => {
    return fileName.toLowerCase().endsWith('.jpg');
  });
  const options = {};
  const optionsConfig = [
    {operationType: 'trails'},
    {operationType: 'zoom', name: 'delta', alias: 'd', defaultValue: 1.001, type: Number},
    {operationType: 'play'},
    {operationType: 'video', name: 'framerate', alias: 'r', defaultValue: 30, type: Number}
  ];
  // set up defaults
  optionsConfig
    .filter(c => c.operationType === operationType)
    .forEach((c) => {
      options[c.name] = c.defaultValue;
    });
  // overlay command line arguments onto the config
  if (inputArgs.length > 1) {
    const matchingOptionsConfigs = optionsConfig.filter(c => c.operationType === operationType);
    const args = inputArgs.slice(1); // remove operationType
    let giveMeABreak = false;
    args.forEach((cur, i) => {
      // --delta value => name: delta
      if (!giveMeABreak) {
        const refType = cur.startsWith('--') ? 'name' : cur.startsWith('-') ? 'alias' : false; // name or alias
        if (!refType) throw new Error(`Unknown command line argument, '${cur}'`);
        const refName = cur.startsWith('--') ? cur.substr(2) : cur.startsWith('-') ? cur.substr(1) : cur;
        if (refType) {
          const matchingConfig = matchingOptionsConfigs.find(c => c[refType] === refName);
          if (!matchingConfig) throw new Error(`Unknown command line argument, '${cur}'`);
          const type =  matchingConfig.type ? matchingConfig.type : (val) => val;
          options[refName] = type(args[i + 1]);
          giveMeABreak = true;
        }
      } else giveMeABreak = false;
    });
  }
  console.log('options', options);
  if (operationType === 'video') mkvideo(validFiles, options);
  else if (operationType === 'play') play();
  else if (optionsConfig.map(c => c.operationType).includes(operationType)) mkphotos({validFiles, operationType, options});
  else console.log('invalid parameter(s) specified');
};

async function mkphotos({validFiles, operationType, options}) {
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
        width *= options.delta;
        height *= options.delta;
        break;
      case 'trails':
        command = `convert ${DEFUALT_TEMP_DIR}/IMG_${last}.jpg ${inputFile} -gravity center -compose lighten -composite -format jpg ${outputFile}`;
        break;
      default:
        throw new Error(`Invalid operation type specified, '${operationType}'`);
    }
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
  console.log();
}

async function mkvideo(validFiles, options) {
  const {ext: extension, fileWithoutExt: filePrefix} = fileParts(validFiles[0]);
  const [, startNumber] = filePrefix.match(/(\d{4})/);
  const ffmpegCommand = `ffmpeg -y -framerate ${options.framerate} -start_number "${startNumber}" -i IMG_%04d.${extension} -s:v 1080x720 -c:v libx264 -pix_fmt yuv420p -r ${options.framerate} $(basename $(pwd)).mp4`;
  await exec(ffmpegCommand);
}

async function play() {
  const ffplayCommand = `ffplay -loop 0 $(basename $(pwd)).mp4`;
  await exec(ffplayCommand);
}

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
