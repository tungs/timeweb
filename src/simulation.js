import { realtimeCancelAnimationFrame, realtimeRequestAnimationFrame, realtimePerformance } from './realtime.js';
import { virtualNow } from './shared.js';
import { goTo } from './go-to.js';

var simulationAnimationId;
export function startRealtimeSimulation({ fixedFrameRate } = {}) {
  realtimeCancelAnimationFrame(simulationAnimationId);
  var simulationTime = virtualNow();
  var simulationStartTime = realtimePerformance.now() - simulationTime;
  function simulate() {
    if (fixedFrameRate) {
      simulationTime += fixedFrameRate;
    } else {
      simulationTime = realtimePerformance.now() - simulationStartTime;
    }
    goTo(simulationTime).then(function () {
      simulationAnimationId = realtimeRequestAnimationFrame(simulate);
    });
  }
  simulationAnimationId = realtimeRequestAnimationFrame(simulate);
}

export function stopRealtimeSimulation() {
  realtimeCancelAnimationFrame(simulationAnimationId);
}