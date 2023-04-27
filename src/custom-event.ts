import { virtualNow } from './shared';

var OldCustomEvent = CustomEvent;
export var VirtualCustomEvent = class CustomEvent<Type> extends OldCustomEvent<Type> {
  constructor(type: string, eventInitDict?: CustomEventInit<Type>) {
    super(type, eventInitDict);
    Object.defineProperty(this, 'timeStamp', { value: virtualNow() });
  }
};
