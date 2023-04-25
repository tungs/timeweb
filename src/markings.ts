const processedProperty = '_timeweb_processed';
const realtimeProperty = '_timeweb_realtime';

export function markAsProcessed(element: any, processed = true) {
  element[processedProperty] = processed;
}

export function markAsRealtime(element: any, realtime = true) {
  element[realtimeProperty] = realtime;
}

export function shouldBeProcessed(element: any) {
  if (element.dataset && element.dataset.timewebRealtime !== undefined) {
    return false;
  }
  return !element[processedProperty] && !element[realtimeProperty];
}
