import { initializeAnimationClassHandler, processAnimation } from './animation-class';

export function overwriteElementAnimate() {
  initializeAnimationClassHandler();
  var oldElementAnimate = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    var animation = oldElementAnimate.call(this, keyframes, options);
    processAnimation(animation);
    return animation;
  };
}