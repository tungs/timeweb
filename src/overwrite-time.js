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

// keeping overwritten objects...
exportObject._timeweb_oldDate = realtimeDate;
exportObject._timeweb_oldSetTimeout = realtimeSetTimeout;
exportObject._timeweb_oldRequestAnimationFrame = realtimeRequestAnimationFrame;
exportObject._timeweb_oldSetInterval = realtimeSetInterval;
exportObject._timeweb_oldCancelAnimationFrame = realtimeCancelAnimationFrame;
exportObject._timeweb_oldClearTimeout = realtimeClearTimeout;
exportObject._timeweb_oldClearInterval = realtimeClearInterval;
exportObject._timeweb_oldPerformance = realtimePerformance;
exportDocument._timeweb_oldCreateElement = realtimeCreateElement;
exportDocument._timeweb_oldCreateElementNS = realtimeCreateElementNS;

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

// exported custom functions
exportObject._timeweb_processNextBlock = processNextBlock;
exportObject._timeweb_processUntilTime = processUntilTime;
exportObject._timeweb_runAnimationFrames = runAnimationFrames;
exportObject._timeweb_addFramePreparer = addFramePreparer;
exportObject._timeweb_runFramePreparers = runFramePreparers;
