import { initializeAnimationClassHandler, processDocumentAnimations, processElementAnimations } from './animation-class';
import { exportDocument } from './shared';

export function initializeCSSHandler() {
  initializeAnimationClassHandler();
  function listener(event) {
    processElementAnimations(event.target);
  }
  function init() {
    processDocumentAnimations();
    exportDocument.body.addEventListener('transitionrun', listener);
    // 'animationstart' is only dispatched after animation-delay, so it doesn't
    // fully cover getting all animations from CSS animations immediately
    // there doesn't seem to be an equivalent of 'transitionrun' for CSS animations
    exportDocument.body.addEventListener('animationstart', listener);
  }
  if (!exportDocument.body) {
    exportDocument.addEventListener('load', init);
  } else {
    init();
  }
}