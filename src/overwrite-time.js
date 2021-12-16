// Since this file overwrites properties of the exportObject that other files
// assign from, it's important that those other files run first
// In particular `realtime.js` is one of those files
import { virtualNow, exportObject, exportDocument } from './shared.js';
import { processNextBlock, processUntilTime, _setTimeout, _setInterval, _clearTimeout } from './timeout-and-interval.js';
import { _requestAnimationFrame, _cancelAnimationFrame, runAnimationFrames } from './animation-frames.js';
import { _createElement, _createElementNS } from './create-element.js';
import { _Date } from './date.js';
import { runFramePreparers, addFramePreparer } from './frame-preparers.js';
import { initializeMediaHandler } from './media.js';
import { realtimeDate, realtimeSetTimeout, realtimeRequestAnimationFrame, realtimeSetInterval, realtimeCancelAnimationFrame, realtimeClearTimeout, realtimeClearInterval, realtimePerformance, realtimeCreateElement, realtimeCreateElementNS } from './realtime.js';

initializeMediaHandler();

// overwriting built-in functions...
exportObject.Date = _Date;
exportObject.performance.now = virtualNow;
exportObject.setTimeout = _setTimeout;
exportObject.requestAnimationFrame = _requestAnimationFrame;
exportObject.setInterval = _setInterval;
exportObject.cancelAnimationFrame = _cancelAnimationFrame;
exportObject.clearTimeout = _clearTimeout;
exportObject.clearInterval = _clearTimeout;
exportDocument.createElement = _createElement;
exportDocument.createElementNS = _createElementNS;
