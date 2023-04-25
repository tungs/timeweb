import { realtimeRequestAnimationFrame, realtimeCancelAnimationFrame, realtimeSetTimeout, realtimeClearTimeout, realtimePerformance } from './realtime';

function realtimeLoop({ requestTimingFn, cancelTimingFn, fn, queueNextImmediately = false }) {
  var lastUpdated = realtimePerformance.now();
  var running = true;
  var requestId;
  var previousResult;
  function processResult() {
    if (running) {
      requestId = requestTimingFn(run);
    }
  }
  function run() {
    if (!running) {
      return;
    }
    var currentTime = realtimePerformance.now();
    var elapsed = currentTime - lastUpdated;
    lastUpdated = currentTime;
    if (queueNextImmediately) {
      Promise.resolve(previousResult).then(function () {
        if (!running) {
          return;
        }
        requestId = requestTimingFn(run);
        previousResult = fn(elapsed);
      });
    } else {
      Promise.resolve(fn(elapsed)).then(processResult);
    }
  }
  requestId = requestTimingFn(run);
  return {
    stop() {
      running = false;
      cancelTimingFn(requestId);
    }
  };
}
export function animationLoop(fn, { queueNextImmediately } = {}) {
  return realtimeLoop({
    fn,
    requestTimingFn: realtimeRequestAnimationFrame,
    cancelTimingFn: realtimeCancelAnimationFrame,
    queueNextImmediately
  });
}

export function timeoutLoop(fn, { queueNextImmediately, timeout = 17 } = {}) {
  function requestTimeout(runFn) {
    return realtimeSetTimeout(runFn, timeout);
  }
  return realtimeLoop({
    fn,
    requestTimingFn: requestTimeout,
    cancelTimingFn: realtimeClearTimeout,
    queueNextImmediately
  });
}