var elementCreateListeners = [];
var elementNSCreateListeners = [];

var oldCreateElement = document.createElement;
export function virtualCreateElement(tagName, options) {
  var element = oldCreateElement.call(document, tagName, options);
  elementCreateListeners.forEach(function (listener) {
    listener(element, tagName);
  });
  return element;
}

export function addElementCreateListener(listener) {
  elementCreateListeners.push(listener);
}

var oldCreateElementNS = document.createElementNS;
export function virtualCreateElementNS(ns, qualifiedName, options) {
  var element = oldCreateElementNS.call(document, ns, qualifiedName, options);
  elementNSCreateListeners.forEach(function (listener) {
    listener(element, qualifiedName);
  });
  return element;
}

export function addElementNSCreateListener(listener) {
  elementNSCreateListeners.push(listener);
}