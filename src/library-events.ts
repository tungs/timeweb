import { quasiAsyncIterateArray, quasiAsyncThen, isThenable } from './utils';
import { virtualNow } from './shared';

type TimewebEventHandlerType = (e: TimewebEvent) => any;
type TimewebEventTypes = 'preanimate' | 'postanimate' | 'preseek' | 'postseek';
type ListenerType = {
  config?: any;
  fn: TimewebEventHandlerType;
};
var eventListeners: Record<TimewebEventTypes, ListenerType[]> = {
  preanimate: [],
  postanimate: [],
  preseek: [],
  postseek: []
};

export function subscribe(type: TimewebEventTypes, fn: TimewebEventHandlerType, config?: any) {
  if (!eventListeners[type]) {
    // eslint-disable-next-line no-console
    console.error('Invalid subscriber type: ' + type);
    return;
  }
  eventListeners[type].push({ fn, config });
}

export function unsubscribe(type: TimewebEventTypes, fn: TimewebEventHandlerType) {
  if (!eventListeners[type]) {
    // eslint-disable-next-line no-console
    console.error('Invalid unsubscriber type: ' + type);
    return;
  }
  eventListeners[type] = eventListeners[type].filter(listener => listener.fn !== fn);
}

class TimewebEvent {
  data: any;
  detail: any;
  virtualTime: number;
  afterPromises: Promise<any>[];
  immediateAfterPromises: Promise<any>[];
  constructor({ data, detail, virtualTime }: { data?: any, detail?: any, virtualTime: number }) {
    this.data = data;
    this.detail = detail;
    this.virtualTime = virtualTime;
    this.afterPromises = [];
    this.immediateAfterPromises = [];
  }
  waitAfterFor(promise: any) {
    if (isThenable(promise)) {
      this.afterPromises.push(promise);
    }
  }
  waitImmediatelyAfterFor(promise: any) {
    if (isThenable(promise)) {
      this.immediateAfterPromises.push(promise);
    }
  }
}

export function dispatch(type: TimewebEventTypes, { data, detail }: { data?: any, detail?: any } = {}) {
  var waits: Promise<any>[] = [];
  return quasiAsyncThen(
    quasiAsyncIterateArray(
      eventListeners[type],
      function (listener) {
        let config = listener.config || {};
        let e = new TimewebEvent({ data, detail, virtualTime: virtualNow() });
        let response = listener.fn(e);
        let afterPromises = e.afterPromises;
        let immediateAfterPromises = e.immediateAfterPromises;
        waits = waits.concat(afterPromises);
        if (config.wait && isThenable(response)) {
          // this allows skipping the await if the return is falsey
          // though this means the listener function should be a regular
          // function that sometimes returns a promise, instead of an
          // async function, since async always returns a promise
          waits.push(response);
        }
        if (config.waitImmediately && isThenable(response)) {
          immediateAfterPromises = immediateAfterPromises.concat([ response ]);
        }
        if (immediateAfterPromises.length) {
          return Promise.all(immediateAfterPromises);
        }
      }
    ),
    function () {
      // make sure this runs after the loop finishes, since it may not immediately add waits
      if (waits.length) {
        return Promise.all(waits);
      }
    }
  );
}