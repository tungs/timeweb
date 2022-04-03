// exports to the `timeweb` module/object
// see overwrite-time.js to see exports written
// to `exportObject` (e.g. `window`)
import './overwrite-time.js';
import { processUntilTime } from './timeout-and-interval.js';
import { runAnimationFrames } from './animation-frames.js';
import { subscribe, unsubscribe } from './library-events.js';
export { realtime } from './realtime.js';
export { version } from '../package.json';
export { goTo } from './go-to.js';

export const on = subscribe;
export const off = unsubscribe;

export {
  processUntilTime, runAnimationFrames
};