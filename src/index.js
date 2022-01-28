// exports to the `timeweb` module/object
// see overwrite-time.js to see exports written
// to `exportObject` (e.g. `window`)
import './overwrite-time.js';
import { processUntilTime } from './timeout-and-interval.js';
import { runAnimationFrames } from './animation-frames.js';
import { runFramePreparers, addFramePreparer } from './frame-preparers.js';
import { subscribe, unsubscribe, dispatch } from './library-events.js';
import { quasiAsyncThen } from './utils.js';
export { realtime } from './realtime.js';
export { version } from '../package.json';

export function goTo(ms, config) {
  return Promise.resolve(quasiAsyncGoTo(ms, config));
}

// TODO: export this function after finalizing the name
function quasiAsyncGoTo(ms, config) {
  var seekAndAnimate = quasiAsyncThen(
    seekTo(ms, config),
    function () {
      return animateFrame(ms, config);
    }
  );
  return quasiAsyncThen(
    seekAndAnimate,
    function () {
      return runFramePreparers(ms);
    }
  );
}

function seekTo(ms, { detail } = {}) {
  return quasiAsyncThen(
    dispatch('preseek', { time: ms, detail }),
    function () {
      processUntilTime(ms);
      return dispatch('postseek', { time: ms, detail });
    }
  );
}

function animateFrame(ms, { detail } = {}) {
  return quasiAsyncThen(
    dispatch('preanimate', { time: ms, detail }),
    function () {
      runAnimationFrames();
      return dispatch('postanimate', { time: ms, detail });
    }
  );
}

export const on = subscribe;
export const off = unsubscribe;

export {
  processUntilTime, runAnimationFrames, addFramePreparer, runFramePreparers
};