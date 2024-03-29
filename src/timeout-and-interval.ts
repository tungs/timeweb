import { getNewId, virtualNow, setVirtualTime, exportObject } from './shared';
import { makeMicrotaskListener } from './utils';
import { addSetting, getSetting } from './settings';

addSetting({
  name: 'minimumTimeout',
  defaultValue: 1
});

// a block is a segment of blocking code, wrapped in a function
// to be run at a certain virtual time. They're created by
// window.requestAnimationFrame, window.setTimeout, and window.setInterval
type BlockFn = (this: typeof exportObject, ...args: any[]) => unknown;
interface Block {
  time: number;
  id: number;
  fn: BlockFn;
  args?: any[];
}
var pendingBlocks: Block[] = [];
var intervals: { [id: number]: { clear(): void } | null } = {};
function sortPendingBlocks() {
  pendingBlocks = pendingBlocks.sort(function (a, b) {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    return a.id - b.id;
  });
}

export function processNextBlock() {
  if (!pendingBlocks.length) {
    return null;
  }
  sortPendingBlocks();
  var block = pendingBlocks.shift() as Block;
  setVirtualTime(block.time);
  block.fn.apply(exportObject, block.args);
}

export function processUntilTime(ms: number) {
  // We should be careful when iterating through pendingBlocks,
  // because other methods (i.e. sortPendingBlocks and virtualClearTimeout)
  // create new references to pendingBlocks
  var resolve: undefined | ((result?: any) => void);
  function run() {
    sortPendingBlocks();
    while (pendingBlocks.length && pendingBlocks[0].time <= ms) {
      processNextBlock();
      sortPendingBlocks();
      if (listener.shouldExit) {
        if (!resolve) {
          return new Promise(function (res) {
            resolve = res;
          });
        } else {
          return;
        }
      }
    }
    // TODO: maybe wait a little while for possible promises to resolve?
    listener.cleanUp();
    setVirtualTime(ms);
    if (resolve) {
      resolve();
    }
  }
  var listener = makeMicrotaskListener(run);
  return run();
}
// By assigning eval to a variable, it is invoked indirectly,
// therefor it runs in the global scope (outside the scope of internal variables)
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
// under the `Description` section
var globalEval = eval;
export function virtualSetTimeout(fn: TimerHandler, timeout?: number, ...args: any[]) {
  var id = getNewId();
  var blockFn: BlockFn;
  if (fn instanceof Function) {
    blockFn = fn as BlockFn;
  } else {
    // according to https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout,
    // setTimeout should support evaluating strings as code, though it's not recommended
    blockFn = function () {
      globalEval(fn);
    };
  }
  var minimumTimeout = getSetting('minimumTimeout') as number;
  if (timeout === undefined || isNaN(timeout) || timeout < minimumTimeout) {
    // If timeout is 0 or a small number, there may be an infinite loop
    // Changing it shouldn't disrupt code, because
    // setTimeout doesn't usually execute code immediately
    // Also note that virtual setInterval relies on this
    // to prevent infinite loops with intervals of 0
    timeout = minimumTimeout;
  }
  pendingBlocks.push({
    time: timeout + virtualNow(),
    id: id,
    fn: blockFn,
    args: args
  });
  return id;
}

export function virtualSetInterval(fn: TimerHandler, interval?: number, ...args: any[]) {
  var lastCallId: undefined | number;
  var id = getNewId();
  var running = true;
  var intervalFn = function () {
    if (fn instanceof Function) {
      fn.apply(exportObject, args);
    } else {
      // according to https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
      // setInterval should support evaluating strings as code, though it's not recommended
      globalEval(fn);
    }
    if (running) {
      lastCallId = virtualSetTimeout(intervalFn, interval);
    }
  };
  intervals[id] = {
    clear: function () {
      virtualClearTimeout(lastCallId);
      running = false;
      intervals[id] = null; // dereference for garbage collection
    }
  };
  lastCallId = virtualSetTimeout(intervalFn, interval);
  // according to https://developer.mozilla.org/en-US-docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
  // setInterval and setTimeout share the same pool of IDs, and clearInterval and clearTimeout
  // can technically be used interchangeably
  return id;
}

export function virtualClearTimeout(id: number | undefined) {
  // according to https://developer.mozilla.org/en-US-docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
  // setInterval and setTimeout share the same pool of IDs, and clearInterval and clearTimeout
  // can technically be used interchangeably
  if (id && intervals[id]) {
    intervals[id]!.clear();
  } else {
    return;
  }
  // We should be careful when creating a new reference for pendingBlocks,
  // (e.g. `pendingBlocks = pendingBlocks.filter...`), because virtualClearTimeout
  // can be called while iterating through pendingBlocks
  pendingBlocks = pendingBlocks.filter(function (block) {
    return block.id !== id;
  });
}
