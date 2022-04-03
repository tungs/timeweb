import { realtimeCancelAnimationFrame, realtimeRequestAnimationFrame, realtimePerformance } from './realtime.js';
import { virtualNow } from './shared.js';
import { goTo } from './go-to.js';

var simulationAnimationId;
export function startRealtimeSimulation({ fixedFrameRate } = {}) {
  realtimeCancelAnimationFrame(simulationAnimationId);
  var simulationStartTime = realtimePerformance.now();
  var simulationTime = virtualNow();
  function simulate() {
    realtimeRequestAnimationFrame(simulate);
    var frameDelta;
    if (fixedFrameRate) {
      frameDelta = fixedFrameRate;
    } else {
      frameDelta = realtimePerformance.now() - simulationStartTime();
    }
    simulationTime += frameDelta;
    goTo(simulationTime);
  }
  realtimeRequestAnimationFrame(simulate);
}

export function stopRealtimeSimulation() {
  realtimeCancelAnimationFrame(simulationAnimationId);
}