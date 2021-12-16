// Note that since realtime depends on assigning from exportObject and exportDocument
// this file should be imported before the time properties of exportObject and exportDocument
// are overwritten

import { exportObject, exportDocument } from './shared.js';
import { markAsRealtime } from './element.js';
export let realtimeDate = exportObject.Date;
export let realtimeSetTimeout = exportObject.setTimeout.bind(exportObject);
export let realtimeRequestAnimationFrame = exportObject.requestAnimationFrame.bind(exportObject);
export let realtimeSetInterval = exportObject.setInterval.bind(exportObject);
export let realtimeCancelAnimationFrame = exportObject.cancelAnimationFrame.bind(exportObject);
export let realtimeClearTimeout = exportObject.clearTimeout.bind(exportObject);
export let realtimeClearInterval = exportObject.clearInterval.bind(exportObject);
let oldPerformanceNow = exportObject.performance.now;
let oldPerformance = exportObject.performance;
// performance.now() requires performance to be the caller
export let realtimePerformance = {
  now: oldPerformanceNow.bind(oldPerformance)
};
let oldCreateElement = exportDocument.createElement;
let oldCreateElementNS = exportDocument.createElementNS;

export let realtimeCreateElement = function () {
  let element = oldCreateElement.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
};

export let realtimeCreateElementNS = function () {
  let element = oldCreateElementNS.apply(exportDocument, arguments);
  markAsRealtime(element);
  return element;
};

export let realtime = {
  Date: realtimeDate,
  setTimeout: realtimeSetTimeout,
  requestAnimationFrame: realtimeRequestAnimationFrame,
  setInterval: realtimeSetInterval,
  cancelAnimationFrame: realtimeCancelAnimationFrame,
  clearTimeout: realtimeClearTimeout,
  performance: realtimePerformance,
  createElement: realtimeCreateElement,
  createElementNS: realtimeCreateElementNS
};