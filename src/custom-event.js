import { virtualNow } from './shared';

var oldCustomEvent = CustomEvent;
export var VirtualCustomEvent = class CustomEvent extends oldCustomEvent {
  constructor() {
    super(...arguments);
    Object.defineProperty(this, 'timeStamp', { value: virtualNow() });
  }
};
