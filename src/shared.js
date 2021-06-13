export var exportObject = window;
export var exportDocument = document;

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