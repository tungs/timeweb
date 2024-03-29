import { virtualNow } from './shared';
import { markAsProcessed, shouldBeProcessed } from './markings';
import { addDOMHandler } from './dom';
import { subscribe } from './library-events';
interface CustomSVGNode extends SVGSVGElement {
  _timeweb_oldAnimationsPaused: SVGSVGElement['animationsPaused'];
  _timeweb_oldPauseAnimations: SVGSVGElement['pauseAnimations'];
  _timeweb_oldUnpauseAnimations: SVGSVGElement['unpauseAnimations'];
  _timeweb_oldSetCurrentTime: SVGSVGElement['setCurrentTime'];
}
var svgList: Array<{
  goToTime(): void;
  node: CustomSVGNode;
}> = [];
export function addAnimatedSVGNode(node: CustomSVGNode) {
  if (!shouldBeProcessed(node)) {
    return;
  }
  var lastUpdated = virtualNow();
  var currentTime = node.getCurrentTime();
  var paused = node.animationsPaused();
  if (!paused) {
    node.pauseAnimations();
  }
  node._timeweb_oldAnimationsPaused = node.animationsPaused;
  node._timeweb_oldPauseAnimations = node.pauseAnimations;
  node._timeweb_oldUnpauseAnimations = node.unpauseAnimations;
  node._timeweb_oldSetCurrentTime = node.setCurrentTime;
  node.animationsPaused = function () {
    return paused;
  };
  node.pauseAnimations = function () {
    goToTime();
    paused = true;
  };
  node.unpauseAnimations = function () {
    paused = false;
  };
  node.setCurrentTime = function (seconds) {
    currentTime = seconds;
    node._timeweb_oldSetCurrentTime(seconds);
    lastUpdated = virtualNow();
  };
  function goToTime() {
    var virtualTime = virtualNow();
    var elapsedTime = virtualTime - lastUpdated;
    if (!paused) {
      currentTime += elapsedTime / 1000; // currentTime is in seconds
      node._timeweb_oldSetCurrentTime(currentTime);
      // TODO: investigate whether node.forceRedraw() is useful here
    }
    lastUpdated = virtualTime;
  }
  markAsProcessed(node);
  svgList.push({
    goToTime,
    node
  });
}

export function removeAnimatedSVGNode(node: CustomSVGNode) {
  svgList = svgList.filter(function (svg) {
    return svg.node !== node;
  });
}

export function initializeAnimatedSVGHandler() {
  addDOMHandler({
    domAdded: function (node) {
      if (node.nodeName.toLowerCase() === 'svg') {
        addAnimatedSVGNode(node as CustomSVGNode);
      }
    },
    domRemoved: function (node) {
      if (node.nodeName.toLowerCase() === 'svg') {
        removeAnimatedSVGNode(node as CustomSVGNode);
      }
    },
    elementCreated: function (element, name) {
      if (name.toLowerCase() === 'svg') {
        addAnimatedSVGNode(element as CustomSVGNode);
      }
    }
  });
  subscribe('postseek', function () {
    svgList.forEach(function (node) {
      node.goToTime();
    });
  });
}