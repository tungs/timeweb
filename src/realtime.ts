// Note that since realtime depends on assigning from exportObject and exportDocument
// this file should be imported before the time properties of exportObject and exportDocument
// are overwritten

import { exportObject, exportDocument } from './shared';
import { markAsRealtime } from './markings';
export let realtimeDate = exportObject.Date;
export let realtimeCustomEvent = exportObject.CustomEvent;
export let realtimeSetTimeout: typeof exportObject.setTimeout = exportObject.setTimeout.bind(exportObject);
export let realtimeRequestAnimationFrame: typeof exportObject.requestAnimationFrame = exportObject.requestAnimationFrame.bind(exportObject);
export let realtimeSetInterval: typeof exportObject.setInterval = exportObject.setInterval.bind(exportObject);
export let realtimeCancelAnimationFrame: typeof exportObject.cancelAnimationFrame = exportObject.cancelAnimationFrame.bind(exportObject);
export let realtimeClearTimeout: typeof exportObject.clearTimeout = exportObject.clearTimeout.bind(exportObject);
export let realtimeClearInterval: typeof exportObject.clearInterval = exportObject.clearInterval.bind(exportObject);
let oldPerformanceNow = exportObject.performance.now;
let oldPerformance = exportObject.performance;
// performance.now() requires performance to be the caller
export let realtimePerformance = {
  now: oldPerformanceNow.bind(oldPerformance) as () => number
};
let oldCreateElement: undefined | typeof document.createElement;
let oldCreateElementNS: undefined | typeof document.createElementNS;
if (exportDocument) {
  oldCreateElement = exportDocument.createElement;
  oldCreateElementNS = exportDocument.createElementNS;
}

export let realtimeCreateElement = !exportDocument ? undefined : function () {
  let element = oldCreateElement!.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
} as typeof exportDocument.createElement;

export let realtimeCreateElementNS = !exportDocument ? undefined : function () {
  let element = oldCreateElementNS!.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
} as typeof exportDocument.createElementNS;

export let realtime = {
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