import './overwrite-time.js';
export function goTo(ms) {
  window._timeweb_processUntilTime(ms);
  window._timeweb_runAnimationFrames(ms);
}