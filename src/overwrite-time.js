// Since this file overwrites properties of the exportObject that other files
// assign from, it's important that those other files run first
// In particular `realtime.js` is one of those files
import { virtualNow, exportObject, exportDocument } from './shared.js';
import { processNextBlock, processUntilTime, virtualSetTimeout, virtualSetInterval, virtualClearTimeout } from './timeout-and-interval.js';
import { virtualRequestAnimationFrame, virtualCancelAnimationFrame, runAnimationFrames } from './animation-frames.js';
import { virtualCreateElement, virtualCreateElementNS } from './create-element.js';
import { VirtualDate } from './date.js';
import { runFramePreparers, addFramePreparer } from './frame-preparers.js';
import { initializeMediaHandler } from './media.js';
import { realtimeDate, realtimeSetTimeout, realtimeRequestAnimationFrame, realtimeSetInterval, realtimeCancelAnimationFrame, realtimeClearTimeout, realtimeClearInterval, realtimePerformance, realtimeCreateElement, realtimeCreateElementNS } from './realtime.js';

initializeMediaHandler();

// overwriting built-in functions...
exportObject.Date = VirtualDate;
exportObject.performance.now = virtualNow;
exportObject.setTimeout = virtualSetTimeout;
exportObject.requestAnimationFrame = virtualRequestAnimationFrame;
exportObject.setInterval = virtualSetInterval;
exportObject.cancelAnimationFrame = virtualCancelAnimationFrame;
exportObject.clearTimeout = virtualClearTimeout;
exportObject.clearInterval = virtualClearTimeout;
exportDocument.createElement = virtualCreateElement;
exportDocument.createElementNS = virtualCreateElementNS;
