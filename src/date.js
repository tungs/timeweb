import { virtualNow, startTime } from './shared.js';

var oldDate = Date;
export var VirtualDate = class Date extends oldDate {
  constructor() {
    if (!arguments.length) {
      super(virtualNow() + startTime);
    } else {
      super(...arguments);
    }
  }
};
VirtualDate.now = function () {
  return virtualNow() + startTime;
};