import { realtimeRequestAnimationFrame, realtimeCancelAnimationFrame, realtimeSetTimeout, realtimeClearTimeout, realtimePerformance } from './realtime.js';

function realtimeLoop({ requestTimingFn, cancelTimingFn, fn, queueNextImmediately = false }) {
  var lastUpdated = realtimePerformance.now();
  // it's important that requestId is shared among
  // the many instances of `run`, so the latest
  // request is canceled and not a stale one
  var requestId;
  function processResult(result) {
    if (queueNextImmediately) {
      // next already requested
      if (result === null) {
        // cancel the last, maybe active request
        cancelTimingFn(requestId);
      }
    } else {
      if (result !== null) {
        requestTimingFn(run);
      }
    }
  }
  function run() {
    var currentTime = realtimePerformance.now();
    var elapsed = currentTime - lastUpdated;
    lastUpdated = currentTime;
    if (queueNextImmediately) {
      requestId = requestTimingFn(run);
    }
    Promise.resolve(fn(elapsed)).then(processResult);
  }
  requestTimingFn(run);
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