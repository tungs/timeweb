import { virtualNow, exportObject } from './shared.js';
import { processNextBlock, processUntilTime, _setTimeout, _setInterval, _clearTimeout } from './timeout-and-interval.js';
import { _requestAnimationFrame, _cancelAnimationFrame, runAnimationFrames } from './animation-frames.js';
import { _Date } from './date.js';

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
exportObject.Date = _Date;
exportObject.performance.now = virtualNow;
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
