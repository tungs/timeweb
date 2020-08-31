import overwriteTime from './overwrite-time.js';

overwriteTime();
export function goTo(ms) {
  window._timeweb_processUntilTime(ms);
  window._timeweb_runAnimationFrames(ms);
}