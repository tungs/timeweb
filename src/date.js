import { virtualNow } from './shared.js';

var oldDate = Date;
export var VirtualDate = class Date extends oldDate {
  constructor() {
    if (!arguments.length) {
      super(virtualNow());
    } else {
      super(...arguments);
    }
  }
};
VirtualDate.now = virtualNow;