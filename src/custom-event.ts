import { virtualNow } from './shared';

var OldCustomEvent = CustomEvent;
export var VirtualCustomEvent = class CustomEvent<Type> extends OldCustomEvent<Type> {
  constructor(...args: ConstructorParameters<typeof OldCustomEvent<Type>>) {
    super(...args);
    Object.defineProperty(this, 'timeStamp', { value: virtualNow() });
  }
};