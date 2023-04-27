import { virtualNow, startTime } from './shared';

var OldDate = Date;
var VirtualDateFunction = function Date(...args: ConstructorParameters<typeof OldDate> | []) {
  if (new.target === undefined) {
    return new OldDate(virtualNow() + startTime).toString();
  }
  if (args.length === 0) {
    return new OldDate(virtualNow() + startTime);
  }
  return new OldDate(...args);
}

export var VirtualDate = Object.assign(VirtualDateFunction, {
  prototype: OldDate.prototype,
  now() {
    return virtualNow() + startTime;
  },
  parse: OldDate.parse.bind(OldDate) as typeof OldDate.parse,
  UTC: OldDate.UTC.bind(OldDate) as typeof OldDate.UTC
}) as typeof OldDate;