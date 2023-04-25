import { virtualNow, exportDocument } from './shared';
import { getPropertyDescriptors } from './utils';
import type { DescriptorsType } from './utils';
import { markAsProcessed, shouldBeProcessed } from './markings';
import { subscribe } from './library-events';
import { virtualSetTimeout, virtualClearTimeout } from './timeout-and-interval';

// This file overwrites instances of the Animation Class
// It can cover CSS Transitions, CSS Animations, and the Web-Animations API
// see https://developer.mozilla.org/en_US/docs/Web/API/Animation

interface AnimationItem {
  goToTime(): void;
  animation: CustomizedAnimation;
}
var descriptors: DescriptorsType | undefined, animations: AnimationItem[] = [];

function getAnimationDuration(animation: Animation) {
  return animation.effect!.getComputedTiming().endTime!;
}

interface CustomizedAnimation extends Animation {
  _timeweb_oldCurrentTime: Animation['currentTime'];
  _timeweb_oldPlaybackRate: Animation['playbackRate'];
  _timeweb_oldFinish: Animation['finish'];
}
export function processAnimation(animation: CustomizedAnimation) {
  if (!animationsInitialized) {
    initializeAnimationClassHandler();
  }

  if (!shouldBeProcessed(animation)) {
    return;
  }
  var ended = false;
  var playbackRate = animation.playbackRate;
  var lastUpdated = virtualNow();
  var currentTime = animation.currentTime || 0;

  // to avoid firing a paused event, we'll change the playbackRate to 0
  animation.playbackRate = 0;
  Object.defineProperty(animation, '_timeweb_oldPlaybackRate', descriptors!.playbackRate as PropertyDescriptor);
  Object.defineProperty(animation, 'playbackRate', {
    get: function () {
      return playbackRate;
    },
    set: function (rate) {
      goToTime();
      playbackRate = rate;
    }
  });
  Object.defineProperty(animation, '_timeweb_oldCurrentTime', descriptors!.currentTime as PropertyDescriptor);
  Object.defineProperty(animation, 'currentTime', {
    get: function () {
      return animation._timeweb_oldCurrentTime;
    },
    set: function (time) {
      lastUpdated = virtualNow();
      currentTime = time;
      animation._timeweb_oldCurrentTime = time;
    }
  });
  function endAnimation() {
    if (ended) {
      return;
    }
    if (playbackRate < 0) {
      currentTime = 0;
    } else {
      // In Firefox, for some situations, the computed animation duration is fractions
      // of a millisecond beyond the actual animation duration. When this happens, the animation
      // loops to the beginning. This should be irrelevant because `animation._timeweb_oldFinish()`
      // is called later, but we'll set the time here anyway
      currentTime = getAnimationDuration(animation) - 1;
    }
    animation._timeweb_oldCurrentTime = currentTime;
    lastUpdated = virtualNow();
    ended = true;
    // for now we'll just restore the playback rate
    // and let the browser dispatch events
    animation._timeweb_oldPlaybackRate = playbackRate;
    animation._timeweb_oldFinish();
  }
  animation._timeweb_oldFinish = animation.finish;
  animation.finish = endAnimation;
  var anticipatedEndingTimeout;
  // should call anticipateEnding() whenever the duration/playbackRate changes
  // TODO: for anything that changes duration/playbackRate call anticipateEnding()
  function anticipateEnding() {
    if (ended || playbackRate === 0 || isNaN(currentTime)) {
      return;
    }
    virtualClearTimeout(anticipatedEndingTimeout);
    var target = playbackRate < 0 ? 0 : getAnimationDuration(animation);
    var futureTime = (target - currentTime) / playbackRate;
    if (futureTime < 0) {
      endAnimation();
      return;
    }
    anticipatedEndingTimeout = virtualSetTimeout(function () {
      if (ended || animation.playState === 'idle') {
        return;
      }
      if (
        (playbackRate < 0 && currentTime <= 0) ||
        (playbackRate > 0 && currentTime >= getAnimationDuration(animation))
      ) {
        endAnimation();
      } else {
        anticipateEnding();
      }
    }, futureTime);
  }
  function goToTime() {
    var virtualTime = virtualNow();
    var elapsedTime = virtualTime - lastUpdated;
    var duration = getAnimationDuration(animation);
    if (elapsedTime === 0) {
      return;
    }
    if (animation.playState !== 'paused') {
      if (currentTime < duration) {
        ended = false;
      }
      if (!ended) {
        currentTime += elapsedTime * playbackRate;
        if (
          (playbackRate > 0 && currentTime > duration) ||
          (playbackRate < 0 && currentTime < 0)
        ) {
          endAnimation();
        } else {
          animation._timeweb_oldCurrentTime = currentTime;
        }
      }
    }
    lastUpdated = virtualTime;
  }
  function remove() {
    virtualClearTimeout(anticipatedEndingTimeout);
    removeAnimation(animation);
  }
  animation.addEventListener('cancel', remove);
  animation.addEventListener('finish', remove);
  anticipateEnding();
  markAsProcessed(animation);
  animations.push({
    goToTime,
    animation
  });
}

export function removeAnimation(animation) {
  animations = animations.filter(a => a.animation !== animation);
}

export function getDocumentAnimations() {
  return getAnimations(exportDocument as Document);
}

export function getAnimations(obj: Document | Element) {
  // note that obj can be an element or a document
  if (obj.getAnimations) {
    return obj.getAnimations();
  }
  return [];
}

export function processDocumentAnimations() {
  getDocumentAnimations().forEach(processAnimation as (a: Animation) => undefined);
}

export function processElementAnimations(element) {
  getAnimations(element).forEach(processAnimation as (a: Animation) => undefined);
}


var animationsInitialized = false;
export function initializeAnimationClassHandler() {
  if (animationsInitialized) {
    return;
  }
  descriptors = getPropertyDescriptors(Animation.prototype, [
    'currentTime',
    'playbackRate'
  ]);
  subscribe('preseek', function () {
    processDocumentAnimations();
  });
  subscribe('postseek', function () {
    return Promise.all(animations.map(function (animation) {
      return animation.goToTime();
    }));
  }, { wait: true });
  animationsInitialized = true;
}