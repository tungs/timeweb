import './overwrite-time.js';
export { version } from '../package.json';
export function goTo(ms) {
  window._timeweb_processUntilTime(ms);
  window._timeweb_runAnimationFrames(ms);
}