import { realtimeRequestAnimationFrame, realtimeCancelAnimationFrame, realtimeSetTimeout, realtimeClearTimeout, realtimePerformance } from './realtime';

type LoopTimingFn = (elapsed: number) => void;
type RequestTimingFn = (runFn: (time?: number) => any) => number;
type CancelTimingFn = (id: number) => void;
function realtimeLoop({ requestTimingFn, cancelTimingFn, fn, queueNextImmediately = false }
  : { requestTimingFn: RequestTimingFn, cancelTimingFn: CancelTimingFn, fn: LoopTimingFn, queueNextImmediately: boolean }
  ) {
  var lastUpdated = realtimePerformance.now();
  var running = true;
  var requestId: number;
  var previousResult: any;
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
export function animationLoop(fn: LoopTimingFn, { queueNextImmediately = false } = {}) {
  return realtimeLoop({
    fn,
    requestTimingFn: realtimeRequestAnimationFrame,
    cancelTimingFn: realtimeCancelAnimationFrame,
    queueNextImmediately
  });
}
export function timeoutLoop(fn: LoopTimingFn, { queueNextImmediately = false, timeout = 17 } = {}) {
  function requestTimeout(runFn: TimerHandler) {
    return realtimeSetTimeout(runFn, timeout);
  }
  return realtimeLoop({
    fn,
    requestTimingFn: requestTimeout,
    cancelTimingFn: realtimeClearTimeout,
    queueNextImmediately
  });
}