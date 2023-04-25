import { initializeAnimationClassHandler, processDocumentAnimations } from './animation-class';
import { addSetting } from './settings';
import { realtimeSetTimeout, realtimeClearTimeout } from './realtime';

const pollerTimeout = 1;
var pollAnimationSetting = addSetting({
  name: 'pollAnimations',
  defaultValue: false,
  onUpdate: function (pollAnimations) {
    if (pollAnimations) {
      startAnimationPoller();
    } else {
      stopAnimationPoller();
    }
  }
});

var pollerId;
function startAnimationPoller() {
  stopAnimationPoller();
  function poller() {
    pollerId = realtimeSetTimeout(poller, pollerTimeout);
    initializeAnimationClassHandler();
    processDocumentAnimations();
  }
  pollerId = realtimeSetTimeout(poller, pollerTimeout);
}

function stopAnimationPoller() {
  realtimeClearTimeout(pollerId);
}

export function initializeAnimationPoller() {
  if (pollAnimationSetting.getValue()) {
    startAnimationPoller();
  }
}