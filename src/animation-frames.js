import { getNewId, virtualNow } from './shared.js';

var animationFrameBlocks = [];
var currentAnimationFrameBlocks = [];
export function _requestAnimationFrame(fn) {
  var id = getNewId();
  animationFrameBlocks.push({
    id: id,
    fn: fn
  });
  return id;
}
export function _cancelAnimationFrame(id) {
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
  // because _cancelAnimationFrame creates a new reference to currentAnimationFrameBlocks
  var block;
  while (currentAnimationFrameBlocks.length) {
    block = currentAnimationFrameBlocks.shift();
    // According to https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame,
    // the passed argument to the callback should be the starting time of the
    // chunk of requestAnimationFrame callbacks that are called for that particular frame
    block.fn(virtualNow());
  }
}
