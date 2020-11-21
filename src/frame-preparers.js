var framePreparers = [];
// can maybe optimize this to use only callbacks
export function addFramePreparer(preparer) {
  if (typeof preparer === 'function') {
    preparer = {
      shouldRun: function () { return true; },
      prepare: preparer
    };
  }
  framePreparers.push(preparer);
}
export function runFramePreparers(time, cb) {
  // instead of solely promises, callbacks are used for performance
  // this code can be significantly simplified if performance is not a concern
  var shouldRun = framePreparers.reduce(function (a, b) {
    return a || b.shouldRun(time);
  }, false);
  if (shouldRun) {
    // can maybe optimize this to use only callbacks
    return Promise.all(framePreparers.map(preparer=>preparer.prepare(time))).then(function () {
      if (cb) {
        return cb(time);
      }
    });
  } else {
    if (cb) {
      cb(time);
    }
  }
  return Promise.resolve();
}
