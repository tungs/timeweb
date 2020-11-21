import { virtualNow, exportObject } from './shared.js';
import { processNextBlock, processUntilTime, _setTimeout, _setInterval, _clearTimeout } from './timeout-and-interval.js';
import { _requestAnimationFrame, _cancelAnimationFrame, runAnimationFrames } from './animation-frames.js';
import { _createElement, _createElementNS } from './create-element.js';
import { _Date } from './date.js';
import { runFramePreparers, addFramePreparer } from './frame-preparers.js';
import { initializeMediaHandler } from './media.js';

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
