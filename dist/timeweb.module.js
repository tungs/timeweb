/**
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2018-2023, Steve Tung
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */
var exportObject = typeof window !== 'undefined' ? window : self;
var exportDocument = typeof document !== 'undefined' ? document : undefined;

var virtualTime = 0;

const startTime = Date.now();

function setVirtualTime(time) {
  virtualTime = time;
}

function virtualNow() {
  return virtualTime;
}

var idCount = 1;

function getNewId() {
  return idCount++;
}

const processedProperty = '_timeweb_processed';
const realtimeProperty = '_timeweb_realtime';

function markAsProcessed(element, processed = true) {
  element[processedProperty] = processed;
}

function markAsRealtime(element, realtime = true) {
  element[realtimeProperty] = realtime;
}

function shouldBeProcessed(element) {
  if (element.dataset && element.dataset.timewebRealtime !== undefined) {
    return false;
  }
  return !element[processedProperty] && !element[realtimeProperty];
}

// Note that since realtime depends on assigning from exportObject and exportDocument
let realtimeDate = exportObject.Date;
let realtimeCustomEvent = exportObject.CustomEvent;
let realtimeSetTimeout = exportObject.setTimeout.bind(exportObject);
let realtimeRequestAnimationFrame = exportObject.requestAnimationFrame.bind(exportObject);
let realtimeSetInterval = exportObject.setInterval.bind(exportObject);
let realtimeCancelAnimationFrame = exportObject.cancelAnimationFrame.bind(exportObject);
let realtimeClearTimeout = exportObject.clearTimeout.bind(exportObject);
let realtimeClearInterval = exportObject.clearInterval.bind(exportObject);
let oldPerformanceNow = exportObject.performance.now;
let oldPerformance = exportObject.performance;
// performance.now() requires performance to be the caller
let realtimePerformance = {
  now: oldPerformanceNow.bind(oldPerformance)
};
let oldCreateElement$1, oldCreateElementNS$1;
if (exportDocument) {
  oldCreateElement$1 = exportDocument.createElement;
  oldCreateElementNS$1 = exportDocument.createElementNS;
}

let realtimeCreateElement = !exportDocument ? undefined : function () {
  let element = oldCreateElement$1.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
};

let realtimeCreateElementNS = !exportDocument ? undefined : function () {
  let element = oldCreateElementNS$1.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
};

let realtime = {
  Date: realtimeDate,
  CustomEvent: realtimeCustomEvent,
  setTimeout: realtimeSetTimeout,
  clearTimeout: realtimeClearTimeout,
  requestAnimationFrame: realtimeRequestAnimationFrame,
  setInterval: realtimeSetInterval,
  clearInterval: realtimeClearInterval,
  cancelAnimationFrame: realtimeCancelAnimationFrame,
  performance: realtimePerformance,
  createElement: realtimeCreateElement,
  createElementNS: realtimeCreateElementNS
};

function isThenable(o) {
  return o && (o.then instanceof Function);
}

/* Quasi-Async Functions */
// These functions are asynchronous only if necessary
// They might not be necessary if awaiting resolved promises
// immediately continues the function, though according to
// https://stackoverflow.com/q/64367903 awaiting resolved promises
// isn't necessarily synchronous.
// These Quasi-Async functions are an alternative to the async model.
// Promises can be returned, but only if necessary (maybe-promise objects)
// They can be chained with themselves and each other, where they take
// arguments that are maybe-promises and functions that can return maybe-promises.
// An additional potential optimization could be
// to use a promise that calls `then` immediately after resolving
// These quasi-async functions are implemented instead of async/await because:
// 1. Some functions need to run immediately afterwards
//   (like copying WebGL canvas data after painting)
// 2. Potential performance (though this should be benchmarked, since this
//   impementation adds overhead with additional functions)
// 3. (To a much lesser extent) Compatibility for browsers without async/await
function quasiAsyncThen(a, fnB) {
  if (isThenable(a)) {
    return a.then(fnB);
  } else {
    return fnB();
  }
}

function quasiAsyncWhileLoop(condition, body) {
  while (condition()) {
    let r = body();
    if (isThenable(r)) {
      return r.then(function () {
        quasiAsyncWhileLoop(condition, body);
      });
    }
  }
}

function quasiAsyncIterateArray(array, body) {
  var i = 0;
  return quasiAsyncWhileLoop(
    function () {
      return i < array.length;
    },
    function () {
      return body(array[i++]);
    }
  );
}

// Microtasks are blocks of code that runs after currently running code completes.
// This can cause problems if timeweb is looping through a timeline, before
// allowing for microtask code to run.
// In some cases, there may be loops of microtasks (mostly promises)
// where one or more microtasks will recursively add themselves to a loop.
// In such cases, it's difficult to determine the end of a microtask loop,
// since there doesn't seem to be a way to monitor the number of microtasks
// in the queue. Instead, we'll take the approach of those issuing microtasks
// to dispatch custom events before and after microtasks are intended to run.
// This allows timeweb to exit and reenter loops to allow microtasks to run in
// the intended order.

function makeMicrotaskListener(cb) {
  // there should be a postmicrotask event for every premicrotask event
  var listener = function () {
    ret.shouldExit = true;
    self.addEventListener('postmicrotasks', function () {
      ret.shouldExit = false;
      cb();
    }, { once: true });
  };
  self.addEventListener('premicrotasks', listener);
  var ret = {
    shouldExit: false,
    cleanUp: function () {
      self.removeEventListener('premicrotasks', listener);
    }
  };
  return ret;
}

function getPropertyDescriptors(obj, properties) {
  var descriptions = {};
  properties.forEach(function (property) {
    descriptions[property] = Object.getOwnPropertyDescriptor(obj, property);
  });
  return descriptions;
}

var currentLogger = {
  logError() {
    // eslint-disable-next-line no-console
    console.error.apply(console, arguments);
  },
  logWarning() {
    // eslint-disable-next-line no-console
    console.warn.apply(console, arguments);
  },
  logMessage() {
    // eslint-disable-next-line no-console
    console.log.apply(console, arguments);
  }
};

function logWarning() {
  currentLogger.logWarning.apply(currentLogger, arguments);
}

var settingsPropertyName = 'timewebConfig';
var userSettings = {};
var settings = {};

function isOverwritable(obj) {
  return obj === undefined || obj === null;
}

function importGlobalSettings() {
  setUserSettings(exportObject[settingsPropertyName]);
}

function verifySettings(settingsToVerify) {
  Object.keys(settingsToVerify).forEach(function (key) {
    if (settings[key] === undefined) {
      logWarning('Unknown user-defined config: ' + key);
    } else {
      if (settings[key].validateFn) {
        let validationMessage = settings[key].validateFn(settingsToVerify[key]);
        if (validationMessage) {
          logWarning(validationMessage);
        }
      }
    }
  });
}

function addSetting({ name, defaultValue, validateFn, update, onUpdate }) {
  if (isOverwritable(userSettings[name])) {
    userSettings[name] = defaultValue;
  }
  settings[name] = { defaultValue, validateFn, update, onUpdate };
  return {
    getValue() {
      return getSetting(name);
    }
  };
}

function getSetting(name) {
  return userSettings[name];
}

function setUserSettings(config) {
  config = config || {};
  verifySettings(config);
  Object.keys(config).forEach(function (key) {
    var previousValue = userSettings[key];
    if (config[key] === undefined) {
      return;
    }
    if (settings[key].update) {
      userSettings[key] = settings[key].update(config[key], userSettings[key]);
    } else {
      userSettings[key] = config[key];
    }
    if (isOverwritable(userSettings[key])) {
      userSettings[key] = settings[key].defaultValue;
    }
    if (settings[key].onUpdate && previousValue !== userSettings[key]) {
      settings[key].onUpdate(userSettings[key]);
    }
  });
}

addSetting({
  name: 'minimumTimeout',
  defaultValue: 1
});

// a block is a segment of blocking code, wrapped in a function
// to be run at a certain virtual time. They're created by
// window.requestAnimationFrame, window.setTimeout, and window.setInterval
var pendingBlocks = [];
var intervals = {};
function sortPendingBlocks() {
  pendingBlocks = pendingBlocks.sort(function (a, b) {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    return a.id - b.id;
  });
}

function processNextBlock() {
  if (!pendingBlocks.length) {
    return null;
  }
  sortPendingBlocks();
  var block = pendingBlocks.shift();
  setVirtualTime(block.time);
  block.fn.apply(exportObject, block.args);
}

function processUntilTime(ms) {
  // We should be careful when iterating through pendingBlocks,
  // because other methods (i.e. sortPendingBlocks and virtualClearTimeout)
  // create new references to pendingBlocks
  var resolve;
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
function virtualSetTimeout(fn, timeout, ...args) {
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
  var minimumTimeout = getSetting('minimumTimeout');
  if (isNaN(timeout) || timeout < minimumTimeout) {
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

function virtualSetInterval(fn, interval, ...args) {
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

function virtualClearTimeout(id) {
  // according to https://developer.mozilla.org/en-US-docs/Web/API/WindowOrWorkerGlobalScope/setInterval,
  // setInterval and setTimeout share the same pool of IDs, and clearInterval and clearTimeout
  // can technically be used interchangeably
  if (intervals[id]) {
    intervals[id].clear();
  }
  // We should be careful when creating a new reference for pendingBlocks,
  // (e.g. `pendingBlocks = pendingBlocks.filter...`), because virtualClearTimeout
  // can be called while iterating through pendingBlocks
  pendingBlocks = pendingBlocks.filter(function (block) {
    return block.id !== id;
  });
}

var animationFrameBlocks = [];
var currentAnimationFrameBlocks = [];

function virtualRequestAnimationFrame(fn) {
  var id = getNewId();
  animationFrameBlocks.push({
    id: id,
    fn: fn
  });
  return id;
}
function virtualCancelAnimationFrame(id) {
  animationFrameBlocks = animationFrameBlocks.filter(function (block) {
    return block.id !== id;
  });
  currentAnimationFrameBlocks = currentAnimationFrameBlocks.filter(function (block) {
    return block.id !== id;
  });
}

function runAnimationFrames() {
  // since requestAnimationFrame usually adds new frames,
  // we want to these new ones to be separated from the
  // currently run frames
  currentAnimationFrameBlocks = animationFrameBlocks;
  animationFrameBlocks = [];
  // We should be careful when iterating through currentAnimationFrameBlocks,
  // because virtualCancelAnimationFrame creates a new reference to currentAnimationFrameBlocks
  var resolve;
  function run() {
    while (currentAnimationFrameBlocks.length) {
      let block = currentAnimationFrameBlocks.shift();
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

var elementCreateListeners = [];
var elementNSCreateListeners = [];

// TODO: merge references to oldCreateElement(NS) with `realtime.js`
var oldCreateElement, oldCreateElementNS;
if (exportDocument) {
  oldCreateElement = exportDocument.createElement;
  oldCreateElementNS = exportDocument.createElementNS;
}

function virtualCreateElement(tagName, options) {
  var element = oldCreateElement.call(exportDocument, tagName, options);
  elementCreateListeners.forEach(function (listener) {
    listener(element, tagName);
  });
  return element;
}

function addElementCreateListener(listener) {
  elementCreateListeners.push(listener);
}

function virtualCreateElementNS(ns, qualifiedName, options) {
  var element = oldCreateElementNS.call(exportDocument, ns, qualifiedName, options);
  elementNSCreateListeners.forEach(function (listener) {
    listener(element, qualifiedName);
  });
  return element;
}

function addElementNSCreateListener(listener) {
  elementNSCreateListeners.push(listener);
}

var oldDate = Date;
var VirtualDate = class Date extends oldDate {
  constructor() {
    if (!arguments.length) {
      super(virtualNow() + startTime);
    } else {
      super(...arguments);
    }
  }
};
VirtualDate.now = function () {
  return virtualNow() + startTime;
};

var oldCustomEvent = CustomEvent;
var VirtualCustomEvent = class CustomEvent extends oldCustomEvent {
  constructor() {
    super(...arguments);
    Object.defineProperty(this, 'timeStamp', { value: virtualNow() });
  }
};

// Since this file overwrites properties of the exportObject that other files

// overwriting built-in functions...
exportObject.Date = VirtualDate;
exportObject.CustomEvent = VirtualCustomEvent;
exportObject.performance.now = virtualNow;
exportObject.setTimeout = virtualSetTimeout;
exportObject.requestAnimationFrame = virtualRequestAnimationFrame;
exportObject.setInterval = virtualSetInterval;
exportObject.cancelAnimationFrame = virtualCancelAnimationFrame;
exportObject.clearTimeout = virtualClearTimeout;
exportObject.clearInterval = virtualClearTimeout;
if (exportDocument) {
  exportDocument.createElement = virtualCreateElement;
  exportDocument.createElementNS = virtualCreateElementNS;
}

var eventListeners = {
  preanimate: [],
  postanimate: [],
  preseek: [],
  postseek: []
};

function subscribe(type, fn, config) {
  if (!eventListeners[type]) {
    // eslint-disable-next-line no-console
    console.error('Invalid subscriber type: ' + type);
    return;
  }
  eventListeners[type].push({ fn, config });
}

function unsubscribe(type, fn) {
  if (!eventListeners[type]) {
    // eslint-disable-next-line no-console
    console.error('Invalid unsubscriber type: ' + type);
    return;
  }
  eventListeners[type] = eventListeners[type].filter(listener => listener.fn !== fn);
}

class TimewebEvent {
  constructor({ data, detail, virtualTime }) {
    this.data = data;
    this.detail = detail;
    this.virtualTime = virtualTime;
    this.afterPromises = [];
    this.immediateAfterPromises = [];
  }
  waitAfterFor(promise) {
    if (isThenable(promise)) {
      this.afterPromises.push(promise);
    }
  }
  waitImmediatelyAfterFor(promise) {
    if (isThenable(promise)) {
      this.immediateAfterPromises.push(promise);
    }
  }
}

function dispatch(type, { data, detail } = {}) {
  var waits = [];
  return quasiAsyncThen(
    quasiAsyncIterateArray(
      eventListeners[type],
      function (listener) {
        let config = listener.config || {};
        let e = new TimewebEvent({ data, detail, virtualTime: virtualNow() });
        let response = listener.fn(e);
        let afterPromises = e.afterPromises;
        let immediateAfterPromises = e.immediateAfterPromises;
        waits = waits.concat(afterPromises);
        if (config.wait && isThenable(response)) {
          // this allows skipping the await if the return is falsey
          // though this means the listener function should be a regular
          // function that sometimes returns a promise, instead of an
          // async function, since async always returns a promise
          waits.push(response);
        }
        if (config.waitImmediately && isThenable(response)) {
          immediateAfterPromises = immediateAfterPromises.concat([ response ]);
        }
        if (immediateAfterPromises.length) {
          return Promise.all(immediateAfterPromises);
        }
      }
    ),
    function () {
      // make sure this runs after the loop finishes, since it may not immediately add waits
      if (waits.length) {
        return Promise.all(waits);
      }
    }
  );
}

var domHandlers = [];
// When identifying media nodes, using a MutationObserver covers
// most use cases, since it directly observes the DOM
// The cases it doesn't cover is when elements are not added to DOM
// or significant operations occur on the elements before they are added,
// in which order matters (e.g. `addEventListener`).
// For many of those remaining cases, we'll also overwrite
// document.createElement and document.createElementNS
// There still remains cases where elements are created via other means
// (e.g. through `div.innerHTML`), and then operations are done on them
// before adding them to DOM

// mutationHandler covers elements when they're added to DOM
function mutationHandler(mutationsList) {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      for (let node of mutation.addedNodes) {
        domHandlers.forEach(function (handler) {
          if (handler.domAdded) {
            handler.domAdded(node);
          }
        });
      }
      for (let node of mutation.removedNodes) {
        domHandlers.forEach(function (handler) {
          if (handler.domRemoved) {
            handler.domRemoved(node);
          }
        });
      }
    }
  }
}

function observeDOM() {
  var domObserver = new MutationObserver(mutationHandler);
  domObserver.observe(exportDocument, {
    attributes: false,
    childList: true,
    characterData: false,
    subtree: true
  });
}

function addDOMHandler(handler) {
  domHandlers.push(handler);
  // Plugging into createElement and createElementNS covers
  // most cases where elements are created programatically.
  // domObserver will eventually cover them,
  // but before then event listeners may be added,
  // before e.stopImmediatePropagation can be called
  if (handler.elementCreated) {
    addElementCreateListener(handler.elementCreated);
    addElementNSCreateListener(handler.elementCreated);
  }
  if (handler.htmlElementCreated) {
    addElementCreateListener(handler.htmlElementCreated);
  }
  if (handler.nsElementCreated) {
    addElementNSCreateListener(handler.nsElementCreated);
  }
}

function initializeDOMHandler() {
  observeDOM();
}

const timewebEventDetail = 'timeweb generated';
var mediaList = [];
var currentTimePropertyDescriptor;
var srcPropertyDescriptor;

var shouldReplaceMediaWithBlobs = false;
function replaceMediaWithBlob(media, src) {
  var node = media.node;
  src = src || node.src;
  if (!src) {
    return;
  }
  if (src.startsWith('blob:')) {
    node._timeweb_srcIsBlob = true;
    return;
  }
  if (media.pendingReplaceWithBlob) {
    return media.pendingReplaceWithBlob;
  }
  media.pendingReplaceWithBlob = fetch(src).then(function (res) {
    return res.blob();
  }).then(function (blob) {
    return new Promise(function (resolve) {
      node.addEventListener('canplaythrough', resolve, { once: true });
      // probably can just use `node.src = URL.createObjectURL(blob)`
      // but if the functions change, this might create an infinite loop
      media.setSrc(URL.createObjectURL(blob));
      node._timeweb_srcIsBlob = true;
    });
  }, function (err) {
    if (err instanceof TypeError) {
      // eslint-disable-next-line no-console
      console.warn('Could not fetch ' + src + '. Is cross-origin downloading enabled on the server?');
    } else {
      media.pendingReplaceWithBlob = null;
      throw err;
    }
  }).then(function () {
    media.pendingReplaceWithBlob = null;
  });
  return media.pendingReplaceWithBlob;
}

function replaceMediaWithBlobs() {
  shouldReplaceMediaWithBlobs = true;
  return Promise.all(mediaList.map(function (media) {
    replaceMediaWithBlob(media);
  }));
}

function addMediaNode(node) {
  if (!shouldBeProcessed(node)) {
    return;
  }
  markAsProcessed(node);
  var lastUpdated = virtualNow();
  var precisionTime = node.currentTime * 1000;
  var pendingSeeked;
  var autoplay = node.autoplay;
  var paused = !node.autoplay && node.paused;
  var ended = node.ended;
  node._timeweb_oldPlay = node.play;
  node._timeweb_oldPause = node.pause;
  var media = {
    node: node,
    setSrc: function (src) {
      node._timeweb_oldSrc = src;
    },
    goToTime: function () {
      var elapsedTime = virtualNow() - lastUpdated;
      var p;
      var playbackRate;
      if (elapsedTime === 0) {
        // sometimes a seeked event is not dispatched the currentTime is the same
        return;
      }
      if (!paused) {
        if (precisionTime / 1000 < node.duration || node.loop) {
          ended = false;
        }
        if (!ended) {
          playbackRate = node.playbackRate;
          precisionTime = precisionTime + (elapsedTime * playbackRate);
          if (node.duration && precisionTime / 1000 > node.duration) {
            if (node.loop) {
              precisionTime -= node.duration * 1000;
            } else {
              precisionTime = node.duration * 1000;
              ended = true;
              node.dispatchEvent(new CustomEvent('ended', { detail: timewebEventDetail }));
            }
          }
          if (playbackRate < 0 && node.duration && precisionTime < 0) {
            // negative playbackRate is not currently supported in Chromium/Chrome,
            // but this is here if it does in the future
            if (node.loop) {
              precisionTime += node.duration * 1000;
            } else {
              precisionTime = 0;
              // should 'ended' be fired here?
            }
          }
          p = new Promise(function (resolve) {
            pendingSeeked = resolve;
          });
          node._timeweb_oldCurrentTime = precisionTime / 1000;
        }
      }
      lastUpdated = virtualNow();
      return p;
    }
  };
  node.addEventListener('seeked', function () {
    if (pendingSeeked) {
      pendingSeeked();
      pendingSeeked = null;
    } else {
      // possibly generated by user or by another program
      lastUpdated = virtualNow();
      precisionTime = node._timeweb_oldCurrentTime * 1000;
    }
  });
  mediaList.push(media);
  node._timeweb_oldPause();
  Object.defineProperty(node, '_timeweb_oldCurrentTime', currentTimePropertyDescriptor);
  Object.defineProperty(node, 'currentTime', {
    get: function () {
      return node._timeweb_oldCurrentTime;
    },
    set: function (time) {
      lastUpdated = virtualNow();
      precisionTime = time * 1000;
      node._timeweb_oldCurrentTime = time;
    }
  });
  Object.defineProperty(node, 'autoplay', {
    get: function () {
      return autoplay;
    },
    set: function (shouldAutoplay) {
      autoplay = shouldAutoplay;
      if (autoplay && paused) {
        lastUpdated = virtualNow();
        paused = false;
        node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
      }
    }
  });
  Object.defineProperty(node, 'paused', {
    get: function () {
      return paused;
    }
  });
  Object.defineProperty(node, 'ended', {
    get: function () {
      return ended;
    }
  });
  node.play = function () {
    lastUpdated = virtualNow();
    paused = false;
    node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
  };
  node.pause = function () {
    media.goToTime(virtualNow());
    paused = true;
    node.dispatchEvent(new CustomEvent('pause', { detail: timewebEventDetail }));
  };
  node.addEventListener('play', function (e) {
    if (e.isTrusted) {
      media.goToTime();
      paused = false;
      node._timeweb_oldPause();
    } else if (e.detail !== timewebEventDetail) {
      e.stopImmediatePropagation();
    }
  });
  node.addEventListener('pause', function (e) {
    // e.isTrusted checks whether the event is user generated
    if (e.isTrusted) {
      media.goToTime();
      paused = true;
    } else if (e.detail !== timewebEventDetail) {
      e.stopImmediatePropagation();
    }
  });
  Object.defineProperty(node, '_timeweb_oldSrc', srcPropertyDescriptor);
  Object.defineProperty(node, 'src', {
    get: function () {
      return node._timeweb_oldSrc;
    },
    set: function (src) {
      node._timeweb_oldSrc = src;
      if (shouldReplaceMediaWithBlobs) {
        replaceMediaWithBlob(media, src);
      }
    }
  });
  if (shouldReplaceMediaWithBlobs) {
    replaceMediaWithBlob(media);
  }
  if (!paused && !ended) {
    // a 'pause' event may have been unintentionally dispatched
    // before with `node._timeweb_oldPause()`
    // now we'll dispatch a `play` event, which also covers `autoplay` media
    // we'll also use a virtual setTimeout, since in practice
    // the user may be adding a listener afterwards (see issue #1)
    virtualSetTimeout(function () {
      node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
    });
  }
}

function removeMediaNode(node) {
  mediaList = mediaList.filter(function (media) {
    return media.node !== node;
  });
}

function pendingReplaceWithBlob(node) {
  return node.pendingReplaceWithBlob;
}

function initializeMediaHandler() {
  currentTimePropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  srcPropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  addDOMHandler({
    domAdded: function (node) {
      if (node.nodeName === 'VIDEO') {
        addMediaNode(node);
      }
    },
    domRemoved: function (node) {
      if (node.nodeName === 'VIDEO') {
        removeMediaNode(node);
      }
    },
    elementCreated: function (element, name) {
      var type = name.toLowerCase();
      if (type === 'video' || type.endsWith(':video')) {
        addMediaNode(element);
      }
    }
  });
  // may also want to make this a listener for preanimate
  // but currently only seeking changes time
  subscribe('preseek', function () {
    let replacedMedia = mediaList.filter(pendingReplaceWithBlob);
    if (replacedMedia.length) {
      return Promise.all(replacedMedia.map(pendingReplaceWithBlob));
    }
  }, { wait: true });
  subscribe('postseek', function () {
    let activeMedia = mediaList.filter(function (node) {
      return !node.paused && !node.ended;
    });
    if (activeMedia.length) {
      return Promise.all(activeMedia.map(function (media) {
        return media.goToTime();
      }));
    }
  }, { wait: true });
}

var svgList = [];
function addAnimatedSVGNode(node) {
  if (!shouldBeProcessed(node)) {
    return;
  }
  var lastUpdated = virtualNow();
  var currentTime = node.getCurrentTime();
  var paused = node.animationsPaused();
  if (!paused) {
    node.pauseAnimations();
  }
  node._timeweb_oldAnimationsPaused = node.animationsPaused;
  node._timeweb_oldPauseAnimations = node.pauseAnimations;
  node._timeweb_oldUnpauseAnimations = node.unpauseAnimations;
  node._timeweb_oldSetCurrentTime = node.setCurrentTime;
  node.animationsPaused = function () {
    return paused;
  };
  node.pauseAnimations = function () {
    goToTime();
    paused = true;
  };
  node.unpauseAnimations = function () {
    paused = false;
  };
  node.setCurrentTime = function (seconds) {
    currentTime = seconds;
    node._timeweb_oldSetCurrentTime(seconds);
    lastUpdated = virtualNow();
  };
  function goToTime() {
    var virtualTime = virtualNow();
    var elapsedTime = virtualTime - lastUpdated;
    if (!paused) {
      currentTime += elapsedTime / 1000; // currentTime is in seconds
      node._timeweb_oldSetCurrentTime(currentTime);
      // TODO: investigate whether node.forceRedraw() is useful here
    }
    lastUpdated = virtualTime;
  }
  markAsProcessed(node);
  svgList.push({
    goToTime,
    node
  });
}

function removeAnimatedSVGNode(node) {
  svgList = svgList.filter(function (svg) {
    return svg.node !== node;
  });
}

function initializeAnimatedSVGHandler() {
  addDOMHandler({
    domAdded: function (node) {
      if (node.nodeName.toLowerCase() === 'svg') {
        addAnimatedSVGNode(node);
      }
    },
    domRemoved: function (node) {
      if (node.nodeName.toLowerCase() === 'svg') {
        removeAnimatedSVGNode(node);
      }
    },
    elementCreated: function (element, name) {
      if (name.toLowerCase() === 'svg') {
        addAnimatedSVGNode(element);
      }
    }
  });
  subscribe('postseek', function () {
    svgList.forEach(function (node) {
      node.goToTime();
    });
  });
}

// This file overwrites instances of the Animation Class
// It can cover CSS Transitions, CSS Animations, and the Web-Animations API
// see https://developer.mozilla.org/en_US/docs/Web/API/Animation

var descriptors, animations = [];
function getAnimationDuration(animation) {
  return animation.effect.getComputedTiming().endTime;
}
function processAnimation(animation) {
  if (!animationsInitialized) {
    initializeAnimationClassHandler();
  }

  if (!shouldBeProcessed(animation)) {
    return;
  }
  var ended = false;
  var playbackRate = animation.playbackRate;
  var lastUpdated = virtualNow();
  var currentTime = animation.currentTime;

  // to avoid firing a paused event, we'll change the playbackRate to 0
  animation.playbackRate = 0;
  Object.defineProperty(animation, '_timeweb_oldPlaybackRate', descriptors.playbackRate);
  Object.defineProperty(animation, 'playbackRate', {
    get: function () {
      return playbackRate;
    },
    set: function (rate) {
      goToTime();
      playbackRate = rate;
    }
  });
  Object.defineProperty(animation, '_timeweb_oldCurrentTime', descriptors.currentTime);
  Object.defineProperty(animation, 'currentTime', {
    get: function () {
      return animation._timeweb_oldCurrentTime;
    },
    set: function (time) {
      lastUpdated = virtualNow();
      currentTime = time;
      animation._timeweb_oldCurrentTime = time;
    }
  });
  function endAnimation() {
    if (ended) {
      return;
    }
    if (playbackRate < 0) {
      currentTime = 0;
    } else {
      // In Firefox, for some situations, the computed animation duration is fractions
      // of a millisecond beyond the actual animation duration. When this happens, the animation
      // loops to the beginning. This should be irrelevant because `animation._timeweb_oldFinish()`
      // is called later, but we'll set the time here anyway
      currentTime = getAnimationDuration(animation) - 1;
    }
    animation._timeweb_oldCurrentTime = currentTime;
    lastUpdated = virtualNow();
    ended = true;
    // for now we'll just restore the playback rate
    // and let the browser dispatch events
    animation._timeweb_oldPlaybackRate = playbackRate;
    animation._timeweb_oldFinish();
  }
  animation._timeweb_oldFinish = animation.finish;
  animation.finish = endAnimation;
  var anticipatedEndingTimeout;
  // should call anticipateEnding() whenever the duration/playbackRate changes
  // TODO: for anything that changes duration/playbackRate call anticipateEnding()
  function anticipateEnding() {
    if (ended || playbackRate === 0 || isNaN(currentTime)) {
      return;
    }
    virtualClearTimeout(anticipatedEndingTimeout);
    var target = playbackRate < 0 ? 0 : getAnimationDuration(animation);
    var futureTime = (target - currentTime) / playbackRate;
    if (futureTime < 0) {
      endAnimation();
      return;
    }
    anticipatedEndingTimeout = virtualSetTimeout(function () {
      if (ended || animation.playState === 'idle') {
        return;
      }
      if (
        (playbackRate < 0 && currentTime <= 0) ||
        (playbackRate > 0 && currentTime >= getAnimationDuration(animation))
      ) {
        endAnimation();
      } else {
        anticipateEnding();
      }
    }, futureTime);
  }
  function goToTime() {
    var virtualTime = virtualNow();
    var elapsedTime = virtualTime - lastUpdated;
    var duration = getAnimationDuration(animation);
    if (elapsedTime === 0) {
      return;
    }
    if (animation.playState !== 'paused') {
      if (currentTime < duration) {
        ended = false;
      }
      if (!ended) {
        currentTime += elapsedTime * playbackRate;
        if (
          (playbackRate > 0 && currentTime > duration) ||
          (playbackRate < 0 && currentTime < 0)
        ) {
          endAnimation();
        } else {
          animation._timeweb_oldCurrentTime = currentTime;
        }
      }
    }
    lastUpdated = virtualTime;
  }
  function remove() {
    virtualClearTimeout(anticipatedEndingTimeout);
    removeAnimation(animation);
  }
  animation.addEventListener('cancel', remove);
  animation.addEventListener('finish', remove);
  anticipateEnding();
  markAsProcessed(animation);
  animations.push({
    goToTime,
    animation
  });
}

function removeAnimation(animation) {
  animations = animations.filter(a => a.animation !== animation);
}

function getDocumentAnimations() {
  return getAnimations(exportDocument);
}

function getAnimations(obj) {
  // note that obj can be an element or a document
  if (obj.getAnimations) {
    return obj.getAnimations();
  }
  return [];
}

function processDocumentAnimations() {
  getDocumentAnimations().forEach(processAnimation);
}

function processElementAnimations(element) {
  getAnimations(element).forEach(processAnimation);
}


var animationsInitialized = false;
function initializeAnimationClassHandler() {
  if (animationsInitialized) {
    return;
  }
  descriptors = getPropertyDescriptors(Animation.prototype, [
    'currentTime',
    'playbackRate'
  ]);
  subscribe('preseek', function () {
    processDocumentAnimations();
  });
  subscribe('postseek', function () {
    return Promise.all(animations.map(function (animation) {
      return animation.goToTime();
    }));
  }, { wait: true });
  animationsInitialized = true;
}

const pollerTimeout = 1;
var pollAnimationSetting = addSetting({
  name: 'pollAnimations',
  defaultValue: false,
  onUpdate: function (pollAnimations) {
    if (pollAnimations) {
      startAnimationPoller();
    } else {
      stopAnimationPoller();
    }
  }
});

var pollerId;
function startAnimationPoller() {
  stopAnimationPoller();
  function poller() {
    pollerId = realtimeSetTimeout(poller, pollerTimeout);
    initializeAnimationClassHandler();
    processDocumentAnimations();
  }
  pollerId = realtimeSetTimeout(poller, pollerTimeout);
}

function stopAnimationPoller() {
  realtimeClearTimeout(pollerId);
}

function initializeAnimationPoller() {
  if (pollAnimationSetting.getValue()) {
    startAnimationPoller();
  }
}

function initializeCSSHandler() {
  initializeAnimationClassHandler();
  function listener(event) {
    processElementAnimations(event.target);
  }
  function init() {
    processDocumentAnimations();
    exportDocument.body.addEventListener('transitionrun', listener);
    // 'animationstart' is only dispatched after animation-delay, so it doesn't
    // fully cover getting all animations from CSS animations immediately
    // there doesn't seem to be an equivalent of 'transitionrun' for CSS animations
    exportDocument.body.addEventListener('animationstart', listener);
  }
  if (!exportDocument.body) {
    exportDocument.addEventListener('load', init);
  } else {
    init();
  }
}

function overwriteElementAnimate() {
  initializeAnimationClassHandler();
  var oldElementAnimate = Element.prototype.animate;
  Element.prototype.animate = function (...args) {
    var animation = oldElementAnimate.apply(this, args);
    processAnimation(animation);
    return animation;
  };
}

function warnConversionLimit(elapsedTime, conversionLimit) {
  logWarning('When converting elapsed time, ' + elapsedTime + 'ms exceeded conversion limit (' + conversionLimit + 'ms)');
}

function convertWithRealTimeStep(fn, realTimeStep, maximumConversionTime) {
  return function (virtualTime, elapsedRealTime) {
    if (maximumConversionTime !== null && elapsedRealTime > maximumConversionTime) {
      warnConversionLimit(elapsedRealTime, maximumConversionTime);
      return elapsedRealTime;
    }
    var elapsedTime = 0, step, time;
    for (time = 0; time < elapsedRealTime; time += realTimeStep) {
      step = Math.min(realTimeStep, elapsedRealTime - time);
      elapsedTime += fn(virtualTime + elapsedTime) * step;
    }
    return elapsedTime;
  };
}

function convertWithVirtualTimeStep(fn, virtualTimeStep, maximumConversionTime) {
  return function (virtualTime, elapsedRealTime) {
    if (maximumConversionTime !== null && elapsedRealTime > maximumConversionTime) {
      warnConversionLimit(elapsedRealTime, maximumConversionTime);
      return elapsedRealTime;
    }
    var elapsedTime = 0;
    var scale;
    var timeLeft = elapsedRealTime;
    var step;
    while (timeLeft > 0) {
      scale = fn(virtualTime + elapsedTime);
      if (scale <= 0) {
        return;
      }
      step = Math.max(virtualTimeStep / scale, 0.001);
      if (step > timeLeft) {
        elapsedTime += timeLeft * scale;
      } else {
        elapsedTime += step * scale;
      }
      timeLeft -= step;
    }
    return elapsedTime;
  };
}

function convertTimingScale(fn, {
  realTimeStep, virtualTimeStep, maximumConversionTime = 10000
} = {}) {
  if (!realTimeStep && !virtualTimeStep) {
    realTimeStep = 0.1;
  }
  if (realTimeStep) {
    return convertWithRealTimeStep(fn, realTimeStep, maximumConversionTime);
  } else if (virtualTimeStep) {
    return convertWithVirtualTimeStep(fn, virtualTimeStep, maximumConversionTime);
  }
}

var version = "0.4.0-prerelease";

function goTo(ms, config = {}) {
  return Promise.resolve(quasiAsyncGoTo(ms, config));
}

function increment(ms, config) {
  return goTo(virtualNow() + ms, config);
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

addSetting({
  name: 'realtimeSimulation',
  defaultValue: false,
  onUpdate(shouldSimulate) {
    if (shouldSimulate) {
      startRealtimeSimulation();
    } else {
      stopRealtimeSimulation();
    }
  }
});

var simulation;
function startRealtimeSimulation({ fixedFrameDuration, requestNextFrameImmediately } = {}) {
  stopRealtimeSimulation();
  var simulationTime = virtualNow();
  var simulationStartTime = realtimePerformance.now() - simulationTime;
  var running = true;
  var simulationAnimationId;
  function simulate() {
    if (fixedFrameDuration) {
      simulationTime += fixedFrameDuration;
    } else {
      simulationTime = realtimePerformance.now() - simulationStartTime;
    }
    if (requestNextFrameImmediately) {
      if (running) {
        simulationAnimationId = realtimeRequestAnimationFrame(simulate);
      }
      goTo(simulationTime);
    } else {
      goTo(simulationTime).then(function () {
        if (running) {
          simulationAnimationId = realtimeRequestAnimationFrame(simulate);
        }
      });
    }
  }
  simulation = {
    stop: function () {
      running = false;
      realtimeCancelAnimationFrame(simulationAnimationId);
      simulation = null;
    }
  };
  simulationAnimationId = realtimeRequestAnimationFrame(simulate);
}

function stopRealtimeSimulation() {
  if (simulation) {
    simulation.stop();
  }
}

function realtimeLoop({ requestTimingFn, cancelTimingFn, fn, queueNextImmediately = false }) {
  var lastUpdated = realtimePerformance.now();
  var running = true;
  var requestId;
  var previousResult;
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
function animationLoop(fn, { queueNextImmediately } = {}) {
  return realtimeLoop({
    fn,
    requestTimingFn: realtimeRequestAnimationFrame,
    cancelTimingFn: realtimeCancelAnimationFrame,
    queueNextImmediately
  });
}

function timeoutLoop(fn, { queueNextImmediately, timeout = 17 } = {}) {
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

// exports to the `timeweb` module/object
const on = subscribe;
const off = unsubscribe;

// make sure to import the user settings before initializing
// things that might use those settings
importGlobalSettings();
if (exportDocument) {
  initializeMediaHandler();
  initializeAnimatedSVGHandler();
  overwriteElementAnimate();
  initializeCSSHandler();
  initializeDOMHandler();
  initializeAnimationPoller();
}

export { setUserSettings as config, convertTimingScale, goTo, increment, off, on, processUntilTime, realtime, animationLoop as realtimeAnimationLoop, timeoutLoop as realtimeTimeoutLoop, replaceMediaWithBlobs, runAnimationFrames, startRealtimeSimulation, stopRealtimeSimulation, version };
