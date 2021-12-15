import './overwrite-time.js';
import { processUntilTime } from './timeout-and-interval.js';
import { runAnimationFrames } from './animation-frames.js';
import { runFramePreparers } from './frame-preparers.js';
export { realtime } from './realtime.js';
// exports to the `timeweb` module/object
// see overwrite-time.js to see exports written
// to `exportObject` (e.g. `window`)
export { version } from '../package.json';
export function goTo(ms) {
  processUntilTime(ms);
  runAnimationFrames(ms);
  return runFramePreparers(ms);
}