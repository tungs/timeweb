function convertWithRealTimeStep(fn, realTimeStep) {
  return function (virtualTime, elapsedRealTime) {
    var elapsedTime = 0, step, time;
    for (time = 0; time < elapsedRealTime; time += realTimeStep) {
      step = Math.min(realTimeStep, elapsedRealTime - time);
      elapsedTime += fn(virtualTime + elapsedTime) * step;
    }
    return elapsedTime;
  };
}

function convertWithVirtualTimeStep(fn, virtualTimeStep) {
  return function (virtualTime, elapsedRealTime) {
    var elapsedTime = 0;
    var scale;
    var timeLeft = elapsedRealTime;
    var step;
    while (timeLeft > 0) {
      scale = fn(virtualTime + elapsedTime);
      if (scale <= 0) {
        return;
      }
      step = Math.max(virtualTimeStep / scale, 0.001);
      if (step > timeLeft) {
        elapsedTime += timeLeft * scale;
      } else {
        elapsedTime += step * scale;
      }
      timeLeft -= step;
    }
    return elapsedTime;
  };
}

export function convertTimingScale(fn, {
  realTimeStep, virtualTimeStep
} = {}) {
  if (!realTimeStep && !virtualTimeStep) {
    realTimeStep = 0.1;
  }
  if (realTimeStep) {
    return convertWithRealTimeStep(fn, realTimeStep);
  } else if (virtualTimeStep) {
    return convertWithVirtualTimeStep(fn, virtualTimeStep);
  }
}