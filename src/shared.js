export var exportObject = typeof window !== 'undefined' ? window : self;
export var exportDocument = typeof document !== 'undefined' ? document : undefined;

var virtualTime = Date.now();

export const startTime = virtualTime;

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