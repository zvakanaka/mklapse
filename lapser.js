const exec = require('util').promisify(require('child_process').exec);

const DEFUALT_TEMP_DIR = 'lapser';

module.exports = lapser;

async function lapser(inputArgs) {
  const inputFileName = inputArgs[0];
  const inputFileNameNoBase = inputFileName.substr(inputFileName.lastIndexOf('/') + 1, inputFileName.length);
  const outputFileName = inputArgs[1] || inputFileNameNoBase.substr(0,inputFileNameNoBase.lastIndexOf('.')) + '.gif';
  const width = 260;
  const fps = 10;
  const outputObj = await exec(`ffmpeg -i ${inputFileName} -vf scale=${width}:-1 -r ${fps} -f image2pipe -vcodec ppm - | convert -delay ${fps} -layers Optimize -loop 0 - ${outputFileName}`);
  return outputObj;
};

async function mkdir(dirname) {
  const outputObj = await exec(`mkdir -p ${dirname}`);
  return outputObj;
}

async function getDimensions(fileName) {
  const output = await exec(`identify ${fileName}`);
  const [, width, height] = output.stdout.match(/(\d+)x(\d+)\s/);
  return [Number(width), Number(height)];
}

// read in all files in directory
const pwd = './';
const fs = require('fs');

fs.readdir(pwd, async (err, files) => {
  const validFiles = files.filter(fileName => {
    return fileName.toLowerCase().endsWith('.jpg');
  });
  console.log(validFiles.length, 'valid files');
  try {
    console.log(`removing temp dir '${DEFUALT_TEMP_DIR}'`);
    const rmOutputObj = await exec(`rm -r ${DEFUALT_TEMP_DIR}`);
  } catch (e) {
    console.error(e.message.trim().endsWith('No such file or directory') ? '' : e);
  }
  await mkdir(DEFUALT_TEMP_DIR);
  await exec(`cp ${validFiles[0]} ${DEFUALT_TEMP_DIR}/IMG_0000.jpg`);
  let last = '0000';
  let count = last;
  const ZOOM_DELTA = 1.005;
  let [width, height] = await getDimensions(validFiles[0]);
  const originalWidth = width;
  const originalHeight = height;
  const commandsArray = validFiles.map(inputFile => { // build array of commands
    last = count;
    count = `${Number(count) + 1}`.padStart(4, '0');
    const outputFile = `${DEFUALT_TEMP_DIR}/IMG_${count}.jpg`;
    // const command = `convert ${inputFile} -resize ${width}x${height}^ -gravity center -extent ${originalWidth}x${originalHeight} ${outputFile}`;
    width *= ZOOM_DELTA;
    height *= ZOOM_DELTA;
    const command = `convert ${DEFUALT_TEMP_DIR}/IMG_${last}.jpg ${inputFile} -gravity center -compose lighten -composite -format jpg ${outputFile}`;
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
});

/**
 * Call a function n times, waiting for each call to call it again.
 * @param  {function} func           function that returns a Promise (will be called after prior one finishes)
 * @param  {Array}    args           arguments to pass to func
 * @param  {Number}   num            number of times to call func
 * @param  {function} [updateCb]     callback that is called at every resolution
 * @return {Promise[]}               array of responses from each promise
 */
function sequentialPromiseAll(func, args, num, updateCb) {
  return new Promise((resolve, reject) => {
    const responses = [];
    const arr = Array.from(Array(num), (d, i) => i);
    arr.reduce((p, item, i) => {
      return p.then((lastResponse) => {
        if (lastResponse) {
          responses.push(lastResponse);
          if (updateCb) updateCb(args, lastResponse, i);
        }
        return func(...args);
      });
    }, Promise.resolve()).then((lastResponse) => {
      responses.push(lastResponse);
      resolve(responses);
    }).catch((err) => {
      console.warn(err, responses);
      reject(responses);
    });
  });
}
