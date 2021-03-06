const { spawn } = require('child_process');
const exec = require('util').promisify(require('child_process').exec);
const barChart = require('bar-charts');
const fileParts = require('./lib/fileParts');
const filesInDir = require('files-in-dir');
const understand = require('./lib/understand');
const sequentialCommands = require('./lib/sequentialCommands');
const DEFUALT_TEMP_DIR = 'mklapse';
const pwd = './';
const scriptPath = require('path').dirname(require.main.filename);
const BLANK = '⠀'; // braille blank emoji (because jstrace-bars removes leading spaces)

module.exports = mklapse;

async function mklapse(inputArgs) {
  const validFiles = filesInDir(pwd, ['jpg']);
  // TODO: support multiple and unnamed options
  const optionsConfig = [
    {command: 'trails', name: 'reverse', alias: 'r', defaultValue: false, type: Boolean},
    {command: 'zoom', name: 'delta', alias: 'd', defaultValue: 1.001, type: Number},
    {command: 'resize', name: 'percentage', alias: 'p', defaultValue: '25%', type: String},
    {command: 'custom', name: 'script', alias: 's', type: String},
    {command: 'planet'},
    {command: 'video', name: 'framerate', alias: 'r', defaultValue: 30, type: Number}
  ];
  // set up defaults
  const options = understand(optionsConfig);

  console.log('options', options);
  if (options.command === 'video') mkvideo(validFiles, options);
  else if (optionsConfig.map(c => c.command).includes(options.command)) mkphotos({validFiles, options});
  else console.log('invalid parameter(s) specified');
};

async function mkphotos({validFiles, options}) {
  await clean();
  await mkdir(DEFUALT_TEMP_DIR);
  if (options.reverse === true) validFiles.reverse();
  await exec(`cp ${validFiles[0]} ${DEFUALT_TEMP_DIR}/IMG_0000.jpg`);
  let last = '0000';
  let countString = last;
  let [width, height] = await getPhotoDimensions(validFiles[0]);
  const originalWidth = width;
  const originalHeight = height;
  const commandsArray = validFiles.map(inputFile => { // build array of commands
    last = countString;
    countString = `${Number(countString) + 1}`.padStart(4, '0');
    const outputFile = `${DEFUALT_TEMP_DIR}/IMG_${countString}.jpg`;
    let command;
    switch (options.command) {
      case 'zoom':
        command = `convert ${inputFile} -resize ${width}x${height}^ -gravity North -extent ${originalWidth}x${originalHeight} ${outputFile}`;
        width *= options.delta;
        height *= options.delta;
        break;
      case 'trails':
        command = `convert ${DEFUALT_TEMP_DIR}/IMG_${last}.jpg ${inputFile} -gravity center -compose lighten -composite -format jpg ${outputFile}`;
        break;
      case 'resize':
        command = `convert -resize ${options.percentage} ${inputFile} ${outputFile}`;
        break;
      case 'custom': // run a custom script for every image in a directory
        // options.script e.g. 'nameOfScriptInScriptsDir -args here -yo 2'
        command = `bash ${scriptPath}/../custom-scripts/${options.script.split(' ')[0]} ${options.script.split(' ').length > 1 ? ' ' + options.script.split(' ').slice(1).join(' ') : ''} ${inputFile} ${outputFile}`;
        break;
      case 'planet':
        command = `convert ${inputFile} -distort arc 360 ${outputFile}`;
        break;
      default:
        throw new Error(`Invalid operation type specified, '${options.command}'`);
    }
    return command;
  });

  await sequentialCommands(commandsArray);
  console.log(`${commandsArray.length}/${commandsArray.length}`);
}

async function mkvideo(validFiles, options) {
  const {ext: extension, fileWithoutExt: filePrefix} = fileParts(validFiles[0]);
  const [, startNumber] = filePrefix.match(/(\d{4})/);
  const ffmpegCommand = `ffmpeg -hide_banner -y -framerate ${options.framerate} -start_number "${startNumber}" -i IMG_%04d.${extension} -s:v 1080x720 -c:v libx264 -pix_fmt yuv420p -r ${options.framerate} ${DEFUALT_TEMP_DIR}.mp4`;
  const args = ffmpegCommand.split(' ').slice(1);
  console.log('RUNNING', args);
  try {
    const ffmpeg = spawn('ffmpeg', args, {shell: true});
    ffmpeg.stdout.on('data', function(data) { console.log('data:', data); });
    ffmpeg.stderr.on('data', function(data) {
      const text = data.toString('utf8');
      const regexArr = text.match(/frame=\s+(\d+)\sfps=\s?(\d+\.?\d*)\sq=(\d+\.?\d*)\ssize=\s+(\d+)kB\stime=(\d{2}:\d{2}:\d{2}\.\d{2})\sbitrate=\s*((N\/A)|(\d+\.?\d*))(kbits\/s)?\sspeed=\s*(\d\.?\d*e?-?\d*)x?/);
      if (regexArr) {
        const [, frame, fps, q, size, time] = regexArr;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        const count = parseInt(frame, 10) / validFiles.length * 100;
        const output = barChart([{label: `${`${parseInt(frame, 10) + 1}`.padStart(`${validFiles.length}`.length, BLANK)}/${validFiles.length}`, count}], {percentages: true});
        process.stdout.write(output); // end the line
      }
    });

    ffmpeg.stdout.on('end', function(data) {
     data && console.log('end', data);
    });
    ffmpeg.on('exit', function(code) {
      if (code != 0) console.log('Error code: ' + code);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`${validFiles.length}/${validFiles.length}`);
    });
  } catch (e) {
    console.error(e);
  }
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
    // console.log(`Removing temp dir '${DEFUALT_TEMP_DIR}'`);
    const rmOutputObj = await exec(`rm -r ${DEFUALT_TEMP_DIR}`);
  } catch (e) {
    console.error(e.message.trim().endsWith('No such file or directory') ? '' : e);
  }
}
