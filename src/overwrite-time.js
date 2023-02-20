// Since this file overwrites properties of the exportObject that other files
// assign from, it's important that those other files run first
// In particular `realtime.js` is one of those files
import './realtime.js';
import { virtualNow, exportObject, exportDocument } from './shared.js';
import { virtualSetTimeout, virtualSetInterval, virtualClearTimeout } from './timeout-and-interval.js';
import { virtualRequestAnimationFrame, virtualCancelAnimationFrame } from './animation-frames.js';
import { virtualCreateElement, virtualCreateElementNS } from './create-element.js';
import { VirtualDate } from './date.js';
import { VirtualCustomEvent } from './custom-event.js';
import { initializeMediaHandler } from './media.js';
import { initializeAnimatedSVGHandler } from './animated-svg.js';
import { initializeDOMHandler } from './dom.js';

if (exportDocument) {
  initializeMediaHandler();
  initializeAnimatedSVGHandler();
  initializeDOMHandler();
}

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
