import { exportDocument } from './shared';
import { addElementCreateListener, addElementNSCreateListener } from './create-element';
import type { ElementCreateListener, ElementNSCreateListener } from './create-element';

interface DOMHandler {
  domAdded?(node: Node): unknown;
  domRemoved?(node: Node): unknown;
  elementCreated?: ElementNSCreateListener;
  htmlElementCreated?: ElementCreateListener;
  nsElementCreated?: ElementNSCreateListener;
}

var domHandlers: DOMHandler[] = [];
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
function mutationHandler(mutationsList: MutationRecord[]) {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(function (node) {
        domHandlers.forEach(function (handler) {
          if (handler.domAdded) {
            handler.domAdded(node);
          }
        });
      });
      mutation.removedNodes.forEach(function (node) {
        domHandlers.forEach(function (handler) {
          if (handler.domRemoved) {
            handler.domRemoved(node);
          }
        });
      });
    }
  }
}

export function observeDOM() {
  var domObserver = new MutationObserver(mutationHandler);
  domObserver.observe(exportDocument!, {
    attributes: false,
    childList: true,
    characterData: false,
    subtree: true
  });
}

export function addDOMHandler(handler: DOMHandler) {
  domHandlers.push(handler);
  // Plugging into createElement and createElementNS covers
  // most cases where elements are created programatically.
  // domObserver will eventually cover them,
  // but before then event listeners may be added,
  // before e.stopImmediatePropagation can be called
  if (handler.elementCreated) {
    addElementCreateListener(handler.elementCreated);
    addElementNSCreateListener(handler.elementCreated);
  }
  if (handler.htmlElementCreated) {
    addElementCreateListener(handler.htmlElementCreated);
  }
  if (handler.nsElementCreated) {
    addElementNSCreateListener(handler.nsElementCreated);
  }
}

export function initializeDOMHandler() {
  observeDOM();
}