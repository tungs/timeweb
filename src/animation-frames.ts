import { getNewId, virtualNow } from './shared';
import { makeMicrotaskListener } from './utils';

type RequestFrameFn = (time: number) => unknown;
interface AnimationFrameBlock {
  id: number;
  fn: RequestFrameFn;
}
var animationFrameBlocks: AnimationFrameBlock[] = [];
var currentAnimationFrameBlocks: AnimationFrameBlock[] = [];

export function virtualRequestAnimationFrame(fn: RequestFrameFn) {
  var id = getNewId();
  animationFrameBlocks.push({
    id: id,
    fn: fn
  });
  return id;
}
export function virtualCancelAnimationFrame(id: number) {
  animationFrameBlocks = animationFrameBlocks.filter(function (block) {
    return block.id !== id;
  });
  currentAnimationFrameBlocks = currentAnimationFrameBlocks.filter(function (block) {
    return block.id !== id;
  });
}

export function runAnimationFrames() {
  // since requestAnimationFrame usually adds new frames,
  // we want to these new ones to be separated from the
  // currently run frames
  currentAnimationFrameBlocks = animationFrameBlocks;
  animationFrameBlocks = [];
  // We should be careful when iterating through currentAnimationFrameBlocks,
  // because virtualCancelAnimationFrame creates a new reference to currentAnimationFrameBlocks
  var resolve: undefined | ((result?: any) => unknown);
  function run() {
    while (currentAnimationFrameBlocks.length) {
      let block = currentAnimationFrameBlocks.shift() as AnimationFrameBlock;
      // According to https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame,
      // the passed argument to the callback should be the starting time of the
      // chunk of requestAnimationFrame callbacks that are called for that particular frame
      block.fn(virtualNow());
      if (listener.shouldExit) {
        if (resolve) {
          return;
        } else {
          return new Promise(function (res) {
            resolve = res;
          });
        }
      }
    }
    listener.cleanUp();
    if (resolve) {
      resolve();
    }
  }
  var listener = makeMicrotaskListener(run);
  return run();
}
