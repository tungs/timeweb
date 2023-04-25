// Since this file overwrites properties of the exportObject that other files
// assign from, it's important that those other files run first
// In particular `realtime.js` is one of those files
import './realtime';
import { virtualNow, exportObject, exportDocument } from './shared';
import { virtualSetTimeout, virtualSetInterval, virtualClearTimeout } from './timeout-and-interval';
import { virtualRequestAnimationFrame, virtualCancelAnimationFrame } from './animation-frames';
import { virtualCreateElement, virtualCreateElementNS } from './create-element';
import { VirtualDate } from './date';
import { VirtualCustomEvent } from './custom-event';

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
