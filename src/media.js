import { virtualNow } from './shared.js';
import { virtualSetTimeout } from './timeout-and-interval.js';
import { markAsProcessed, shouldBeProcessed } from './element.js';
import { addDOMHandler } from './dom.js';
import { subscribe } from './library-events.js';
const timewebEventDetail = 'timeweb generated';
var mediaList = [];
var currentTimePropertyDescriptor;
var srcPropertyDescriptor;

var shouldReplaceMediaWithBlobs = false;
function replaceMediaWithBlob(media, src) {
  var node = media.node;
  src = src || node.src;
  if (!src) {
    return;
  }
  if (src.startsWith('blob:')) {
    node._timeweb_srcIsBlob = true;
    return;
  }
  if (media.pendingReplaceWithBlob) {
    return media.pendingReplaceWithBlob;
  }
  media.pendingReplaceWithBlob = fetch(src).then(function (res) {
    return res.blob();
  }).then(function (blob) {
    return new Promise(function (resolve) {
      node.addEventListener('canplaythrough', resolve, { once: true });
      // probably can just use `node.src = URL.createObjectURL(blob)`
      // but if the functions change, this might create an infinite loop
      media.setSrc(URL.createObjectURL(blob));
      node._timeweb_srcIsBlob = true;
    });
  }, function (err) {
    if (err instanceof TypeError) {
      // eslint-disable-next-line no-console
      console.warn('Could not fetch ' + src + '. Is cross-origin downloading enabled on the server?');
    } else {
      media.pendingReplaceWithBlob = null;
      throw err;
    }
  }).then(function () {
    media.pendingReplaceWithBlob = null;
  });
  return media.pendingReplaceWithBlob;
}

export function replaceMediaWithBlobs() {
  shouldReplaceMediaWithBlobs = true;
  return Promise.all(mediaList.map(function (media) {
    replaceMediaWithBlob(media);
  }));
}

export function addMediaNode(node) {
  if (!shouldBeProcessed(node)) {
    return;
  }
  markAsProcessed(node);
  var lastUpdated = virtualNow();
  var precisionTime = node.currentTime * 1000;
  var pendingSeeked;
  var autoplay = node.autoplay;
  var paused = !node.autoplay && node.paused;
  var ended = node.ended;
  node._timeweb_oldPlay = node.play;
  node._timeweb_oldPause = node.pause;
  var media = {
    node: node,
    setSrc: function (src) {
      node._timeweb_oldSrc = src;
    },
    goToTime: function () {
      var elapsedTime = virtualNow() - lastUpdated;
      var p;
      var playbackRate;
      if (elapsedTime === 0) {
        // sometimes a seeked event is not dispatched the currentTime is the same
        return;
      }
      if (!paused) {
        if (precisionTime / 1000 < node.duration || node.loop) {
          ended = false;
        }
        if (!ended) {
          playbackRate = node.playbackRate;
          precisionTime = precisionTime + (elapsedTime * playbackRate);
          if (node.duration && precisionTime / 1000 > node.duration) {
            if (node.loop) {
              precisionTime -= node.duration * 1000;
            } else {
              precisionTime = node.duration * 1000;
              ended = true;
              node.dispatchEvent(new CustomEvent('ended', { detail: timewebEventDetail }));
            }
          }
          if (playbackRate < 0 && node.duration && precisionTime < 0) {
            // negative playbackRate is not currently supported in Chromium/Chrome,
            // but this is here if it does in the future
            if (node.loop) {
              precisionTime += node.duration * 1000;
            } else {
              precisionTime = 0;
              // should 'ended' be fired here?
            }
          }
          p = new Promise(function (resolve) {
            pendingSeeked = resolve;
          });
          node._timeweb_oldCurrentTime = precisionTime / 1000;
        }
      }
      lastUpdated = virtualNow();
      return p;
    }
  };
  node.addEventListener('seeked', function () {
    if (pendingSeeked) {
      pendingSeeked();
      pendingSeeked = null;
    } else {
      // possibly generated by user or by another program
      lastUpdated = virtualNow();
      precisionTime = node._timeweb_oldCurrentTime * 1000;
    }
  });
  mediaList.push(media);
  node._timeweb_oldPause();
  Object.defineProperty(node, '_timeweb_oldCurrentTime', currentTimePropertyDescriptor);
  Object.defineProperty(node, 'currentTime', {
    get: function () {
      return node._timeweb_oldCurrentTime;
    },
    set: function (time) {
      lastUpdated = virtualNow();
      precisionTime = time * 1000;
      node._timeweb_oldCurrentTime = time;
    }
  });
  Object.defineProperty(node, 'autoplay', {
    get: function () {
      return autoplay;
    },
    set: function (shouldAutoplay) {
      autoplay = shouldAutoplay;
      if (autoplay && paused) {
        lastUpdated = virtualNow();
        paused = false;
        node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
      }
    }
  });
  Object.defineProperty(node, 'paused', {
    get: function () {
      return paused;
    }
  });
  Object.defineProperty(node, 'ended', {
    get: function () {
      return ended;
    }
  });
  node.play = function () {
    lastUpdated = virtualNow();
    paused = false;
    node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
  };
  node.pause = function () {
    media.goToTime(virtualNow());
    paused = true;
    node.dispatchEvent(new CustomEvent('pause', { detail: timewebEventDetail }));
  };
  node.addEventListener('play', function (e) {
    if (e.isTrusted) {
      media.goToTime();
      paused = false;
      node._timeweb_oldPause();
    } else if (e.detail !== timewebEventDetail) {
      e.stopImmediatePropagation();
    }
  });
  node.addEventListener('pause', function (e) {
    // e.isTrusted checks whether the event is user generated
    if (e.isTrusted) {
      media.goToTime();
      paused = true;
    } else if (e.detail !== timewebEventDetail) {
      e.stopImmediatePropagation();
    }
  });
  Object.defineProperty(node, '_timeweb_oldSrc', srcPropertyDescriptor);
  Object.defineProperty(node, 'src', {
    get: function () {
      return node._timeweb_oldSrc;
    },
    set: function (src) {
      node._timeweb_oldSrc = src;
      if (shouldReplaceMediaWithBlobs) {
        replaceMediaWithBlob(media, src);
      }
    }
  });
  if (shouldReplaceMediaWithBlobs) {
    replaceMediaWithBlob(media);
  }
  if (!paused && !ended) {
    // a 'pause' event may have been unintentionally dispatched
    // before with `node._timeweb_oldPause()`
    // now we'll dispatch a `play` event, which also covers `autoplay` media
    // we'll also use a virtual setTimeout, since in practice
    // the user may be adding a listener afterwards (see issue #1)
    virtualSetTimeout(function () {
      node.dispatchEvent(new CustomEvent('play', { detail: timewebEventDetail }));
    });
  }
}

export function removeMediaNode(node) {
  mediaList = mediaList.filter(function (media) {
    return media.node !== node;
  });
}

function pendingReplaceWithBlob(node) {
  return node.pendingReplaceWithBlob;
}

export function initializeMediaHandler() {
  currentTimePropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  srcPropertyDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  addDOMHandler({
    domAdd: function (node) {
      if (node.nodeName === 'VIDEO') {
        addMediaNode(node);
      }
    },
    domRemove: function (node) {
      if (node.nodeName === 'VIDEO') {
        removeMediaNode(node);
      }
    },
    createElement: function (element, name) {
      var type = name.toLowerCase();
      if (type === 'video' || type.endsWith(':video')) {
        addMediaNode(element);
      }
    }
  });
  // may also want to make this a listener for preanimate
  // but currently only seeking changes time
  subscribe('preseek', function () {
    let replacedMedia = mediaList.filter(pendingReplaceWithBlob);
    if (replacedMedia.length) {
      return Promise.all(replacedMedia.map(pendingReplaceWithBlob));
    }
  }, { wait: true });
  subscribe('postseek', function () {
    let activeMedia = mediaList.filter(function (node) {
      return !node.paused && !node.ended;
    });
    if (activeMedia.length) {
      return Promise.all(activeMedia.map(function (media) {
        return media.goToTime();
      }));
    }
  }, { wait: true });
}
