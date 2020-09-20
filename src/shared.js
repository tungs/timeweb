export var exportObject = window;

var virtualTime = Date.now();

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