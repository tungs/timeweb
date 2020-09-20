import { virtualNow } from './shared.js';

var oldDate = Date;
export var _Date = class Date extends oldDate {
  constructor() {
    if (!arguments.length) {
      super(virtualNow());
    } else {
      super(...arguments);
    }
  }
};
_Date.now = virtualNow;