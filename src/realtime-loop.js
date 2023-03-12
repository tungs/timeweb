import { realtimeRequestAnimationFrame, realtimeCancelAnimationFrame, realtimeSetTimeout, realtimeClearTimeout, realtimePerformance } from './realtime.js';

function realtimeLoop({ requestTimingFn, cancelTimingFn, fn, queueNextImmediately = false }) {
  var lastUpdated = realtimePerformance.now();
  var running = true;
  // it's important that requestId is shared among
  // the many instances of `run`, so the latest
  // request is canceled and not a stale one
  var requestId;
  function processResult(result) {
    if (!running) {
      cancelTimingFn(requestId);
      return;
    }
    if (queueNextImmediately) {
      // next already requested
      if (result === null) {
        // cancel the last, maybe active request
        cancelTimingFn(requestId);
        running = false;
      }
    } else {
      if (result !== null) {
        requestTimingFn(run);
      } else {
        running = false;
      }
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
      requestId = requestTimingFn(run);
    }
    Promise.resolve(fn(elapsed)).then(processResult);
  }
  requestTimingFn(run);
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