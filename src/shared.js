export var exportObject = typeof window !== 'undefined' ? window : self;
export var exportDocument = typeof document !== 'undefined' ? document : undefined;

var virtualTime = 0;

export const startTime = Date.now();

export function setVirtualTime(time) {
  virtualTime = time;
}

export function virtualNow() {
  return virtualTime;
}

var idCount = 1;

export function getNewId() {
  return idCount++;
}