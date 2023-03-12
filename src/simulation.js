import { realtimeCancelAnimationFrame, realtimeRequestAnimationFrame, realtimePerformance } from './realtime.js';
import { virtualNow } from './shared.js';
import { goTo } from './go-to.js';
import { addSetting } from './settings.js';

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