import { _requestAnimationFrame, _cancelAnimationFrame, runAnimationFrames } from './animation-frames.js';
import { getNewId, virtualNow, setVirtualTime } from './shared.js';
var exportObject = window;
var startTime = virtualNow();
var oldDate = Date;
// a block is a segment of blocking code, wrapped in a function
// to be run at a certain virtual time. They're created by
// window.requestAnimationFrame, window.setTimeout, and window.setInterval
var pendingBlocks = [];
var intervals = {};
var sortPendingBlocks = function () {
  pendingBlocks = pendingBlocks.sort(function (a, b) {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    return a.id - b.id;
  });
};
var processNextBlock = function () {
  if (!pendingBlocks.length) {
    return null;
  }
  sortPendingBlocks();
  var block = pendingBlocks.shift();
  setVirtualTime(block.time);
  block.fn.apply(exportObject, block.args);
};
var processUntilTime = function (ms) {
  // We should be careful when iterating through pendingBlocks,
  // because other methods (i.e. sortPendingBlocks and _clearTimeout)
  // create new references to pendingBlocks
  sortPendingBlocks();
  while (pendingBlocks.length && pendingBlocks[0].time <= startTime + ms) {
    processNextBlock();
    sortPendingBlocks();
  }
  // TODO: maybe wait a little while for possible promises to resolve?
  setVirtualTime(startTime + ms);
};
// By assigning eval to a variable, it is invoked indirectly,
// therefor it runs in the global scope (outside the scope of internal variables)
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
// under the `Description` section
var globalEval = eval;
var _setTimeout = function (fn, timeout, ...args) {
  var id = getNewId();
  var blockFn;
  if (fn instanceof Function) {
    blockFn = fn;
  } else {
    // according to https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout,
    // setTimeout should support evaluating strings as code, though it's not recommended
    blockFn = function () {
      globalEval(fn);
    };
  }
  if (!timeout || isNaN(timeout)) {
    // If timeout is 0, there may be an infinite loop
    // Changing it to 1 shouldn't disrupt code, because
    // setTimeout doesn't usually execute code immediately
    timeout = 1;
  }
  pendingBlocks.push({
    time: timeout + virtualNow(),
    id: id,
    fn: blockFn,
    args: args
  });
  return id;
};

var _setInterval = function (fn, interval, ...args) {
  var lastCallId;
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
      lastCallId = _setTimeout(intervalFn, interval);
    }
  };
  intervals[id] = {
    clear: function () {
      _clearTimeout(lastCallId);
      running = false;
      intervals[id] = null; // dereference for garbage collection
    }
  };
  lastCallId = _setTimeout(intervalFn, interval);
  // according to https://developer.mozilla.org/en-US-docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
  // setInterval and setTimeout share the same pool of IDs, and clearInterval and clearTimeout
  // can technically be used interchangeably
  return id;
};

var _clearTimeout = function (id) {
  // according to https://developer.mozilla.org/en-US-docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
  // setInterval and setTimeout share the same pool of IDs, and clearInterval and clearTimeout
  // can technically be used interchangeably
  if (intervals[id]) {
    intervals[id].clear();
  }
  // We should be careful when creating a new reference for pendingBlocks,
  // (e.g. `pendingBlocks = pendingBlocks.filter...`), because _clearTimeout
  // can be called while iterating through pendingBlocks
  pendingBlocks = pendingBlocks.filter(function (block) {
    return block.id !== id;
  });
};

// keeping overwritten objects...
exportObject._timeweb_oldDate = exportObject.Date;
exportObject._timeweb_oldSetTimeout = exportObject.setTimeout;
exportObject._timeweb_oldRequestAnimationFrame = exportObject.requestAnimationFrame;
exportObject._timeweb_oldSetInterval = exportObject.setInterval;
exportObject._timeweb_oldCancelAnimationFrame = exportObject.cancelAnimationFrame;
exportObject._timeweb_oldClearTimeout = exportObject.clearTimeout;
exportObject._timeweb_oldClearInterval = exportObject.clearInterval;
exportObject._timeweb_oldPerformanceNow = exportObject.performance.now;

// overwriting built-in functions...
exportObject.Date = class Date extends oldDate {
  constructor() {
    if (!arguments.length) {
      super(virtualNow());
    } else {
      super(...arguments);
    }
  }
};
exportObject.Date.now = exportObject.performance.now = virtualNow;
exportObject.setTimeout = _setTimeout;
exportObject.requestAnimationFrame = _requestAnimationFrame;
exportObject.setInterval = _setInterval;
exportObject.cancelAnimationFrame = _cancelAnimationFrame;
exportObject.clearTimeout = _clearTimeout;
exportObject.clearInterval = _clearTimeout;
// exported custom functions
exportObject._timeweb_processNextBlock = processNextBlock;
exportObject._timeweb_processUntilTime  = processUntilTime;
exportObject._timeweb_runAnimationFrames = runAnimationFrames;
