import { exportDocument } from './shared';

export type ElementCreateListener = (element: HTMLElement, name: string) => unknown;
export type ElementNSCreateListener = (element: Element, name: string) => unknown;
var elementCreateListeners: ElementCreateListener[] = [];
var elementNSCreateListeners: ElementNSCreateListener[] = [];

// TODO: merge references to oldCreateElement(NS) with `realtime.ts`
type CreateElementType = (this: Document, tagName: string, options?: ElementCreationOptions) => HTMLElement;
type CreateElementNSType = (this: Document, ns: string | null, tagName: string, options?: ElementCreationOptions | string) => Element;

var oldCreateElement: CreateElementType | undefined;
var oldCreateElementNS: CreateElementNSType | undefined;
if (exportDocument) {
  oldCreateElement = exportDocument.createElement;
  oldCreateElementNS = exportDocument.createElementNS;
}
export function virtualCreateElement(tagName: string, options?: ElementCreationOptions | string): HTMLElement {
  var element: HTMLElement = (oldCreateElement as CreateElementType).call(exportDocument, tagName, options);
  elementCreateListeners.forEach(function (listener) {
    listener(element, tagName);
  });
  return element;
}

export function addElementCreateListener(listener: ElementCreateListener) {
  elementCreateListeners.push(listener);
}
export function virtualCreateElementNS(ns: string | null, qualifiedName: string, options?: ElementCreationOptions | string) {
  var element = (oldCreateElementNS as CreateElementNSType).call(exportDocument, ns, qualifiedName, options);
  elementNSCreateListeners.forEach(function (listener) {
    listener(element, qualifiedName);
  });
  return element;
}

export function addElementNSCreateListener(listener: ElementNSCreateListener) {
  elementNSCreateListeners.push(listener);
}