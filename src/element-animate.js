import { initializeAnimationClassHandler, processAnimation } from './animation-class';

export function overwriteElementAnimate() {
  initializeAnimationClassHandler();
  var oldElementAnimate = Element.prototype.animate;
  Element.prototype.animate = function (...args) {
    var animation = oldElementAnimate.apply(this, args);
    processAnimation(animation);
    return animation;
  };
}