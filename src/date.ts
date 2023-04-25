import { virtualNow, startTime } from './shared';

var OldDate = Date;
// The type signature for Date seems to be difficult/maybe impossible to recreate.
// When called as a function (without `new`, e.g. `Date(...)`), it returns a string.
// When used as a constructor (with `new`, e.g. `new Date(...)`), it returns a `Date` object.
// Due to limitations in JavaScript, the callable function and constructor function
// are defined by the same function, and TypeScript does not seem to be able to distinguish
// between them. While TypeScript could narrow type based off of constructor
// (like `typeof new.target`), it does not currently seem to do so.
// This is an edge case, as functions that are both constructors and callables
// are unconventional/bad practice in modern JavaScript
var VirtualDateFunction = function Date(
  timestampOrYearOrDateOrString?: number | string | Date,
  monthIndex?: number,
  day?: number,
  hours?: number,
  minutes?: number,
  seconds?: number,
  milliseconds?: number
) {
  if (new.target === undefined) {
    return new OldDate(virtualNow() + startTime).toString();
  }
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date
  // Notably, if there's only one argument, it is coerced into a primitive. For example,
  // `new Date(undefined)` is not the same as `new Date()`, though it's unlikely this is the user's
  // intent.
  if (arguments.length === 0) {
    return new OldDate(virtualNow() + startTime);
  }
  if (arguments.length === 1) {
    return new OldDate(timestampOrYearOrDateOrString!);
  }
  return new OldDate(
    timestampOrYearOrDateOrString as number,
    monthIndex as number,
    day,
    hours,
    minutes,
    seconds,
    milliseconds
  );
}
export var VirtualDate = Object.assign(VirtualDateFunction, {
  prototype: OldDate.prototype,
  now() {
    return virtualNow() + startTime;
  },
  parse: OldDate.parse.bind(OldDate) as typeof OldDate.parse,
  UTC: OldDate.UTC.bind(OldDate) as typeof OldDate.UTC
});