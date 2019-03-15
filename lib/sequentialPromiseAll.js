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

module.exports = sequentialPromiseAll;
