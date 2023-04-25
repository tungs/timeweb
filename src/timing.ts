import { logWarning } from './logging';

function warnConversionLimit(elapsedTime: number, conversionLimit: number) {
  logWarning('When converting elapsed time, ' + elapsedTime + 'ms exceeded conversion limit (' + conversionLimit + 'ms)');
}

export type TimeDilationFunction = (virtualTime: number) => number;

function convertWithRealTimeStep(fn: TimeDilationFunction, realTimeStep: number, maximumConversionTime: number | null) {
  return function (virtualTime: number, elapsedRealTime: number) {
    if (maximumConversionTime !== null && elapsedRealTime > maximumConversionTime) {
      warnConversionLimit(elapsedRealTime, maximumConversionTime);
      return elapsedRealTime;
    }
    var elapsedTime = 0, step: number, time: number;
    for (time = 0; time < elapsedRealTime; time += realTimeStep) {
      step = Math.min(realTimeStep, elapsedRealTime - time);
      elapsedTime += fn(virtualTime + elapsedTime) * step;
    }
    return elapsedTime;
  };
}

function convertWithVirtualTimeStep(fn: TimeDilationFunction, virtualTimeStep: number, maximumConversionTime: number | null) {
  return function (virtualTime: number, elapsedRealTime: number) {
    if (maximumConversionTime !== null && elapsedRealTime > maximumConversionTime) {
      warnConversionLimit(elapsedRealTime, maximumConversionTime);
      return elapsedRealTime;
    }
    var elapsedTime = 0;
    var scale: number;
    var timeLeft = elapsedRealTime;
    var step: number;
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

interface ConvertTimingScaleOptions {
  realTimeStep?: number | undefined;
  virtualTimeStep?: number | undefined;
  maximumConversionTime?: number | null;
}
export function convertTimingScale(fn: TimeDilationFunction, {
  realTimeStep, virtualTimeStep, maximumConversionTime = 10000
}: ConvertTimingScaleOptions = {}) {
  if (!realTimeStep && !virtualTimeStep) {
    realTimeStep = 0.1;
  }
  if (realTimeStep) {
    return convertWithRealTimeStep(fn, realTimeStep, maximumConversionTime);
  } else if (virtualTimeStep) {
    return convertWithVirtualTimeStep(fn, virtualTimeStep, maximumConversionTime);
  }
}