import { processAnimation, initializeAnimationClassHandler } from './animation-class.js';
import { exportDocument } from './shared.js';

export function initializeCSSHandler() {
  initializeAnimationClassHandler();
  exportDocument.body.addEventListener('transitionrun', function (event) {
    var element = event.target;
    element.getAnimations().forEach(processAnimation);
  });
  // 'animationstart' is only dispatched after animation-delay, so it doesn't
  // fully cover getting all animations from CSS animations soon
  // there doesn't seem to be an equivalent of 'transitionrun' for CSS animations
  exportDocument.body.addEventListener('animationstart', function (event) {
    var element = event.target;
    element.getAnimations().forEach(processAnimation);
  });
}