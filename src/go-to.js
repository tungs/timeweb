import { processUntilTime } from './timeout-and-interval.js';
import { runAnimationFrames } from './animation-frames.js';
import { dispatch } from './library-events.js';
import { quasiAsyncThen } from './utils.js';

export function goTo(ms, config = {}) {
  return Promise.resolve(quasiAsyncGoTo(ms, config));
}

function quasiAsyncGoTo(ms, config = {}) {
  return quasiAsyncThen(
    seekTo(ms, config),
    function () {
      if (!config.skipAnimate) {
        return animateFrame(ms, config);
      }
    }
  );
}

function seekTo(ms, { detail } = {}) {
  return quasiAsyncThen(
    dispatch('preseek', { data: { seekTime: ms }, detail }),
    function () {
      return quasiAsyncThen(
        processUntilTime(ms),
        function () {
          return dispatch('postseek', { detail });
        }
      );
    }
  );
}

function animateFrame(ms, { detail } = {}) {
  return quasiAsyncThen(
    dispatch('preanimate', { detail }),
    function () {
      return quasiAsyncThen(
        runAnimationFrames(),
        function () {
          return dispatch('postanimate', { detail });
        }
      );
    }
  );
}