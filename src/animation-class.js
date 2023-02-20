import { virtualNow } from './shared.js';
import { getPropertyDescriptors } from './utils.js';
import { markAsProcessed, shouldBeProcessed } from './element.js';
import { subscribe } from './library-events.js';
// This file overwrites instances of the Animation Class
// It can cover CSS Transitions, CSS Animations, and the Web-Animations API
// see https://developer.mozilla.org/en_US/docs/Web/API/Animation

var descriptors, animations = [];
export function processAnimation(animation) {
  if (!animationsInitialized) {
    initializeAnimationClassHandler();
  }

  if (!shouldBeProcessed(animation)) {
    // TODO: rename shouldBeProcessed/markAsProcessed from element file
    // to generic objects
    return;
  }
  var ended = false;
  var playbackRate = animation.playbackRate;
  var lastUpdated = virtualNow();
  var currentTime = animation.currentTime;

  // to avoid firing a paused event, we'll change the playbackRate to 0
  animation.playbackRate = 0;
  Object.defineProperty(animation, '_timeweb_oldPlaybackRate', descriptors.playbackRate);
  Object.defineProperty(animation, 'playbackRate', {
    get: function () {
      return playbackRate;
    },
    set: function (rate) {
      goToTime();
      playbackRate = rate;
    }
  });
  Object.defineProperty(animation, '_timeweb_oldCurrentTime', descriptors.currentTime);
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

  function goToTime() {
    var elapsedTime = virtualNow() - lastUpdated;
    var timing = animation.effect.getComputedTiming();
    var duration = timing.endTime;
    if (elapsedTime === 0) {
      return;
    }
    if (!animation.playState !== 'paused') {
      if (currentTime < duration) {
        ended = false;
      }
      if (!ended) {
        currentTime += elapsedTime * playbackRate;
        if (playbackRate > 0 && currentTime > duration) {
          currentTime = duration;
          ended = true;
          // for now we'll just restore the playback rate
          // and let the browser dispatch events
          animation._timeweb_oldPlaybackRate = playbackRate;
        }
        if (playbackRate < 0 && currentTime < 0) {
          currentTime = 0;
          ended = true;
          // for now we'll just restore the playback rate
          // and let the browser dispatch events
          animation._timeweb_oldPlaybackRate = playbackRate;
        }
        animation._timeweb_oldCurrentTime = currentTime;
      }
    }
    lastUpdated += elapsedTime;
  }
  animation.addEventListener('cancel', () => removeAnimation(animation));
  markAsProcessed(animation);
  animations.push({
    goToTime,
    animation
  });
}

export function removeAnimation(animation) {
  animations = animations.filter(a => a.animation !== animation);
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
  subscribe('postseek', function () {
    return Promise.all(animations.map(function (animation) {
      animation.goToTime();
    }));
  }, { wait: true });
  animationsInitialized = true;
}