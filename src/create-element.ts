import { exportDocument } from './shared';

var elementCreateListeners = [];
var elementNSCreateListeners = [];

// TODO: merge references to oldCreateElement(NS) with `realtime.js`
var oldCreateElement, oldCreateElementNS;
if (exportDocument) {
  oldCreateElement = exportDocument.createElement;
  oldCreateElementNS = exportDocument.createElementNS;
}

export function virtualCreateElement(tagName, options) {
  var element = oldCreateElement.call(exportDocument, tagName, options);
  elementCreateListeners.forEach(function (listener) {
    listener(element, tagName);
  });
  return element;
}

export function addElementCreateListener(listener) {
  elementCreateListeners.push(listener);
}

export function virtualCreateElementNS(ns, qualifiedName, options) {
  var element = oldCreateElementNS.call(exportDocument, ns, qualifiedName, options);
  elementNSCreateListeners.forEach(function (listener) {
    listener(element, qualifiedName);
  });
  return element;
}

export function addElementNSCreateListener(listener) {
  elementNSCreateListeners.push(listener);
}