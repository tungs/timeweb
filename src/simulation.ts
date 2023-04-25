import { realtimeCancelAnimationFrame, realtimeRequestAnimationFrame, realtimePerformance } from './realtime';
import { virtualNow } from './shared';
import { goTo } from './go-to';
import { addSetting } from './settings';

addSetting({
  name: 'realtimeSimulation',
  defaultValue: false,
  onUpdate(shouldSimulate) {
    if (shouldSimulate) {
      startRealtimeSimulation();
    } else {
      stopRealtimeSimulation();
    }
  }
});

var simulation;
export function startRealtimeSimulation({ fixedFrameDuration, requestNextFrameImmediately } = {}) {
  stopRealtimeSimulation();
  var simulationTime = virtualNow();
  var simulationStartTime = realtimePerformance.now() - simulationTime;
  var running = true;
  var simulationAnimationId;
  function simulate() {
    if (fixedFrameDuration) {
      simulationTime += fixedFrameDuration;
    } else {
      simulationTime = realtimePerformance.now() - simulationStartTime;
    }
    if (requestNextFrameImmediately) {
      if (running) {
        simulationAnimationId = realtimeRequestAnimationFrame(simulate);
      }
      goTo(simulationTime);
    } else {
      goTo(simulationTime).then(function () {
        if (running) {
          simulationAnimationId = realtimeRequestAnimationFrame(simulate);
        }
      });
    }
  }
  simulation = {
    stop: function () {
      running = false;
      realtimeCancelAnimationFrame(simulationAnimationId);
      simulation = null;
    }
  };
  simulationAnimationId = realtimeRequestAnimationFrame(simulate);
}

export function stopRealtimeSimulation() {
  if (simulation) {
    simulation.stop();
  }
}