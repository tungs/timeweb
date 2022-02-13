/**
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2018-2022, Steve Tung
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
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.timeweb = {}));
})(this, (function (exports) { 'use strict';

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
    sortPendingBlocks();
    while (pendingBlocks.length && pendingBlocks[0].time <= ms) {
      processNextBlock();
      sortPendingBlocks();
    }
    // TODO: maybe wait a little while for possible promises to resolve?
    setVirtualTime(ms);
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
    if (!timeout || isNaN(timeout)) {
      // If timeout is 0, there may be an infinite loop
      // Changing it to 1 shouldn't disrupt code, because
      // setTimeout doesn't usually execute code immediately
      // Also note that virtual setInterval relies on this
      // to prevent infinite loops with intervals of 0
      timeout = 1;
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
    var block;
    while (currentAnimationFrameBlocks.length) {
      block = currentAnimationFrameBlocks.shift();
      // According to https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame,
      // the passed argument to the callback should be the starting time of the
      // chunk of requestAnimationFrame callbacks that are called for that particular frame
      block.fn(virtualNow());
    }
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

  const timewebEventDetail = 'timeweb generated';
  var mediaList = [];
  var currentTimePropertyDescriptor;
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
      goToTime: function () {
        var elapsedTime = virtualNow() - lastUpdated;
        var p;
        var playbackRate;
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
          if (node.nodeName === 'VIDEO') {
            addMediaNode(node);
          }
        }
        for (let node of mutation.removedNodes) {
          if (node.nodeName === 'VIDEO') {
            removeMediaNode(node);
          }
        }
      }
    }
  }

  function observeMedia() {
    var mediaObserver = new MutationObserver(mutationHandler);
    mediaObserver.observe(exportDocument, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true
    });
  }
  // Plugging into createElement and createElementNS covers
  // most cases where elements are created programatically.
  // mediaObserver will eventually cover them,
  // but before then event listeners may be added,
  // before e.stopImmediatePropagation can be called
  function mediaCreateListener(element, name) {
    var type = name.toLowerCase();
    if (type === 'video' || type.endsWith(':video')) {
      addMediaNode(element);
    }
  }


  function initializeMediaHandler() {
    currentTimePropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    observeMedia();
    addElementCreateListener(mediaCreateListener);
    addElementNSCreateListener(mediaCreateListener);
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

  // Since this file overwrites properties of the exportObject that other files

  if (exportDocument) {
    initializeMediaHandler();
  }

  // overwriting built-in functions...
  exportObject.Date = VirtualDate;
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

  var version = "0.3.1-prerelease";

  // exports to the `timeweb` module/object

  function goTo(ms, config = {}) {
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
        processUntilTime(ms);
        return dispatch('postseek', { detail });
      }
    );
  }

  function animateFrame(ms, { detail } = {}) {
    return quasiAsyncThen(
      dispatch('preanimate', { detail }),
      function () {
        runAnimationFrames();
        return dispatch('postanimate', { detail });
      }
    );
  }

  const on = subscribe;
  const off = unsubscribe;

  exports.goTo = goTo;
  exports.off = off;
  exports.on = on;
  exports.processUntilTime = processUntilTime;
  exports.realtime = realtime;
  exports.runAnimationFrames = runAnimationFrames;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
