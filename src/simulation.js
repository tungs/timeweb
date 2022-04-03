import { realtimeCancelAnimationFrame, realtimeRequestAnimationFrame, realtimePerformance } from './realtime.js';
import { virtualNow } from './shared.js';
import { goTo } from './go-to.js';

var simulationAnimationId;
export function startRealtimeSimulation({ fixedFrameDuration, requestNextFrameImmediately } = {}) {
  stopRealtimeSimulation();
  var simulationTime = virtualNow();
  var simulationStartTime = realtimePerformance.now() - simulationTime;
  function simulate() {
    if (fixedFrameDuration) {
      simulationTime += fixedFrameDuration;
    } else {
      simulationTime = realtimePerformance.now() - simulationStartTime;
    }
    if (requestNextFrameImmediately) {
      simulationAnimationId = realtimeRequestAnimationFrame(simulate);
      goTo(simulationTime);
    } else {
      goTo(simulationTime).then(function () {
        simulationAnimationId = realtimeRequestAnimationFrame(simulate);
      });
    }
  }
  simulationAnimationId = realtimeRequestAnimationFrame(simulate);
}

export function stopRealtimeSimulation() {
  realtimeCancelAnimationFrame(simulationAnimationId);
}