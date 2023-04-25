import { processUntilTime } from './timeout-and-interval';
import { runAnimationFrames } from './animation-frames';
import { dispatch } from './library-events';
import { quasiAsyncThen } from './utils';
import { virtualNow } from './shared';

export function goTo(ms: number, config: any = {}) {
  return Promise.resolve(quasiAsyncGoTo(ms, config));
}

export function increment(ms: number, config?: any) {
  return goTo(virtualNow() + ms, config);
}

function quasiAsyncGoTo(ms: number, config: any = {}) {
  return quasiAsyncThen(
    seekTo(ms, config),
    function () {
      if (!config.skipAnimate) {
        return animateFrame(ms, config);
      }
    }
  );
}

function seekTo(ms: number, { detail }: { detail?: any } = {}) {
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

function animateFrame(ms: number, { detail }: {detail?: any} = {}) {
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