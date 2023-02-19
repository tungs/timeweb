import { exportDocument } from './shared.js';
import { addElementCreateListener, addElementNSCreateListener } from './create-element.js';

var domHandlers = [];
// When identifying media nodes, using a MutationObserver covers
// most use cases, since it directly observes the DOM
// The cases it doesn't cover is when elements are not added to DOM
// or significant operations occur on the elements before they are added,
// in which order matters (e.g. `addEventListener`).
// For many of those remaining cases, we'll also overwrite
// document.createElement and document.createElementNS
// There still remains cases where elements are created via other means
// (e.g. through `div.innerHTML`), and then operations are done on them
// before adding them to DOM

// mutationHandler covers elements when they're added to DOM
function mutationHandler(mutationsList) {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      for (let node of mutation.addedNodes) {
        domHandlers.forEach(function (handler) {
          if (handler.domAdd) {
            handler.domAdd(node);
          }
        });
      }
      for (let node of mutation.removedNodes) {
        domHandlers.forEach(function (handler) {
          if (handler.domRemove) {
            handler.domRemove(node);
          }
        });
      }
    }
  }
}

export function observeDOM() {
  var mediaObserver = new MutationObserver(mutationHandler);
  mediaObserver.observe(exportDocument, {
    attributes: false,
    childList: true,
    characterData: false,
    subtree: true
  });
}

export function addDOMHandler(handler) {
  domHandlers.push(handler);
  // Plugging into createElement and createElementNS covers
  // most cases where elements are created programatically.
  // mediaObserver will eventually cover them,
  // but before then event listeners may be added,
  // before e.stopImmediatePropagation can be called
  if (handler.createElement) {
    addElementCreateListener(handler.createElement);
    addElementNSCreateListener(handler.createElement);
  }
  if (handler.createHTMLElement) {
    addElementCreateListener(handler.createHTMLElement);
  }
  if (handler.createNSElement) {
    addElementNSCreateListener(handler.createNSElement);
  }
}

export function initializeDOMHandler() {
  observeDOM();
}