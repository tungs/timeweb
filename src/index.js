// exports to the `timeweb` module/object
// see overwrite-time.js to see exports written
// to `exportObject` (e.g. `window`)
import './overwrite-time.js';
import { exportDocument } from './shared.js';
import { processUntilTime } from './timeout-and-interval.js';
import { runAnimationFrames } from './animation-frames.js';
import { subscribe, unsubscribe } from './library-events.js';
import { importGlobalSettings } from './settings.js';
import { initializeMediaHandler } from './media.js';
import { initializeAnimatedSVGHandler } from './animated-svg.js';
import { initializeDOMHandler } from './dom.js';
import { initializeCSSHandler } from './css-transitions-and-animations.js';
export { replaceMediaWithBlobs } from './media.js';
export { realtime } from './realtime.js';
export { version } from '../package.json';
export { goTo, increment } from './go-to.js';
export { startRealtimeSimulation, stopRealtimeSimulation } from './simulation.js';
export { animationLoop as realtimeAnimationLoop, timeoutLoop as realtimeTimeoutLoop } from './realtime-loop.js';
export { setUserSettings as config } from './settings.js';
export const on = subscribe;
export const off = unsubscribe;

// make sure to import the user settings before initializing
// things that might use those settings
importGlobalSettings();
if (exportDocument) {
  initializeMediaHandler();
  initializeAnimatedSVGHandler();
  initializeCSSHandler();
  initializeDOMHandler();
}
export {
  processUntilTime, runAnimationFrames
};