// exports to the `timeweb` module/object
// see overwrite-time.ts to see exports written
// to `exportObject` (e.g. `window`)
import './overwrite-time';
import { exportDocument } from './shared';
import { subscribe, unsubscribe } from './library-events';
import { importGlobalSettings } from './settings';
import { initializeMediaHandler } from './media';
import { initializeAnimatedSVGHandler } from './animated-svg';
import { initializeDOMHandler } from './dom';
import { initializeAnimationPoller } from './animation-class-poller';
import { initializeCSSHandler } from './css-transitions-and-animations';
import { overwriteElementAnimate } from './element-animate';
export { convertTimingScale } from './timing';
export { processUntilTime } from './timeout-and-interval';
export { runAnimationFrames } from './animation-frames';
export { replaceMediaWithBlobs } from './media';
export { realtime } from './realtime';
export { version } from '../package.json';
export { goTo, increment } from './go-to';
export { startRealtimeSimulation, stopRealtimeSimulation } from './simulation';
export { animationLoop as realtimeAnimationLoop, timeoutLoop as realtimeTimeoutLoop } from './realtime-loop';
export { setUserSettings as config } from './settings';
export const on = subscribe;
export const off = unsubscribe;

// make sure to import the user settings before initializing
// things that might use those settings
importGlobalSettings();
if (exportDocument) {
  initializeMediaHandler();
  initializeAnimatedSVGHandler();
  overwriteElementAnimate();
  initializeCSSHandler();
  initializeDOMHandler();
  initializeAnimationPoller();
}