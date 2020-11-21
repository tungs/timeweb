/**
 *
 * BSD 3-Clause License
 *
 * Copyright (c) 2018-2020, Steve Tung
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
  (global = global || self, factory(global.timeweb = {}));
}(this, (function (exports) { 'use strict';

  var exportObject = window;

  var virtualTime = Date.now();

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

  var startTime = virtualNow();
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
    // because other methods (i.e. sortPendingBlocks and _clearTimeout)
    // create new references to pendingBlocks
    sortPendingBlocks();
    while (pendingBlocks.length && pendingBlocks[0].time <= startTime + ms) {
      processNextBlock();
      sortPendingBlocks();
    }
    // TODO: maybe wait a little while for possible promises to resolve?
    setVirtualTime(startTime + ms);
  }

  // By assigning eval to a variable, it is invoked indirectly,
  // therefor it runs in the global scope (outside the scope of internal variables)
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
  // under the `Description` section
  var globalEval = eval;
  function _setTimeout(fn, timeout, ...args) {
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
  }

  function _setInterval(fn, interval, ...args) {
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
  }

  function _clearTimeout(id) {
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
  }

  var animationFrameBlocks = [];
  var currentAnimationFrameBlocks = [];
  function _requestAnimationFrame(fn) {
    var id = getNewId();
    animationFrameBlocks.push({
      id: id,
      fn: fn
    });
    return id;
  }
  function _cancelAnimationFrame(id) {
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

  var elementCreateListeners = [];
  var elementNSCreateListeners = [];

  var oldCreateElement = document.createElement;
  function _createElement(tagName, options) {
    var element = oldCreateElement.call(document, tagName, options);
    elementCreateListeners.forEach(function (listener) {
      listener(element, tagName);
    });
    return element;
  }

  function addElementCreateListener(listener) {
    elementCreateListeners.push(listener);
  }

  var oldCreateElementNS = document.createElementNS;
  function _createElementNS(ns, qualifiedName, options) {
    var element = oldCreateElementNS.call(document, ns, qualifiedName, options);
    elementNSCreateListeners.forEach(function (listener) {
      listener(element, qualifiedName);
    });
    return element;
  }

  function addElementNSCreateListener(listener) {
    elementNSCreateListeners.push(listener);
  }

  var oldDate = Date;
  var _Date = class Date extends oldDate {
    constructor() {
      if (!arguments.length) {
        super(virtualNow());
      } else {
        super(...arguments);
      }
    }
  };
  _Date.now = virtualNow;

  var framePreparers = [];
  // can maybe optimize this to use only callbacks
  function addFramePreparer(preparer) {
    if (typeof preparer === 'function') {
      preparer = {
        shouldRun: function () { return true; },
        prepare: preparer
      };
    }
    framePreparers.push(preparer);
  }
  function runFramePreparers(time, cb) {
    // instead of solely promises, callbacks are used for performance
    // this code can be significantly simplified if performance is not a concern
    var shouldRun = framePreparers.reduce(function (a, b) {
      return a || b.shouldRun(time);
    }, false);
    if (shouldRun) {
      // can maybe optimize this to use only callbacks
      return Promise.all(framePreparers.map(preparer=>preparer.prepare(time))).then(function () {
        if (cb) {
          return cb(time);
        }
      });
    } else {
      if (cb) {
        cb(time);
      }
    }
    return Promise.resolve();
  }

  const timewebEventDetail = 'timeweb generated';
  var mediaList = [];
  var currentTimePropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  function addMediaNode(node) {
    if (node._timeweb_customized) { // this function has already been called
      return;
    }
    node._timeweb_customized = true;
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
      // now we'll dispatch a `play` event
      node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
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

  // mediaObserver covers elements when they're added to DOM
  var mediaObserver = new MutationObserver(function (mutationsList) {
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
  });

  function observeMedia() {
    mediaObserver.observe(document, {
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
    observeMedia();
    addElementCreateListener(mediaCreateListener);
    addElementNSCreateListener(mediaCreateListener);
    addFramePreparer({
      shouldRun: function () {
        return mediaList.length && mediaList.reduce(function (a, b) {
          return a || (!b.paused && !b.ended);
        }, false);
      },
      prepare: function (time) {
        // TODO: maybe optimize this to use callbacks instead of promises
        return Promise.all(mediaList.map(media => media.goToTime(time)));
      }
    });
  }

  initializeMediaHandler();

  // keeping overwritten objects...
  exportObject._timeweb_oldDate = exportObject.Date;
  exportObject._timeweb_oldSetTimeout = exportObject.setTimeout;
  exportObject._timeweb_oldRequestAnimationFrame = exportObject.requestAnimationFrame;
  exportObject._timeweb_oldSetInterval = exportObject.setInterval;
  exportObject._timeweb_oldCancelAnimationFrame = exportObject.cancelAnimationFrame;
  exportObject._timeweb_oldClearTimeout = exportObject.clearTimeout;
  exportObject._timeweb_oldClearInterval = exportObject.clearInterval;
  exportObject._timeweb_oldPerformanceNow = exportObject.performance.now;
  exportObject._timeweb_oldCreateElement = exportObject.createElement;
  exportObject._timeweb_oldCreateElementNS = exportObject.createElementNS;

  // overwriting built-in functions...
  exportObject.Date = _Date;
  exportObject.performance.now = virtualNow;
  exportObject.setTimeout = _setTimeout;
  exportObject.requestAnimationFrame = _requestAnimationFrame;
  exportObject.setInterval = _setInterval;
  exportObject.cancelAnimationFrame = _cancelAnimationFrame;
  exportObject.clearTimeout = _clearTimeout;
  exportObject.clearInterval = _clearTimeout;
  exportObject.createElement = _createElement;
  exportObject.createElementNS = _createElementNS;

  // exported custom functions
  exportObject._timeweb_processNextBlock = processNextBlock;
  exportObject._timeweb_processUntilTime  = processUntilTime;
  exportObject._timeweb_runAnimationFrames = runAnimationFrames;
  exportObject._timeweb_addFramePreparer = addFramePreparer;
  exportObject._timeweb_runFramePreparers = runFramePreparers;

  var version = "0.0.3-prerelease";

  function goTo(ms) {
    processUntilTime(ms);
    runAnimationFrames();
    return runFramePreparers(ms);
  }

  exports.goTo = goTo;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
