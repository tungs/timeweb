const processedProperty = '_timeweb_processed';
const realtimeProperty = '_timeweb_realtime';

export function markAsProcessed(element, processed = true) {
  element[processedProperty] = processed;
}

export function markAsRealtime(element, realtime = true) {
  element[realtimeProperty] = realtime;
}

export function shouldBeProcessed(element) {
  if (element.dataset && 'timewebRealtime' in element.dataset) {
    return false;
  }
  return !element[processedProperty] && !element[realtimeProperty];
}
