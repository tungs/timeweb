interface Logger {
  logError(...args: any[]): void | unknown;
  logWarning(...args: any[]): void | unknown;
  logMessage(...args: any[]): void | unknown;
  flush?(): void | unknown;
}

var currentLogger: Logger = {
  logError() {
    // eslint-disable-next-line no-console
    console.error.apply(console, arguments);
  },
  logWarning() {
    // eslint-disable-next-line no-console
    console.warn.apply(console, arguments);
  },
  logMessage() {
    // eslint-disable-next-line no-console
    console.log.apply(console, arguments);
  }
};

export function setLogger({
  logMessage,
  logWarning,
  logError,
  flush
}) {
  logError = logError || logMessage || currentLogger.logError;
  logWarning = logWarning || logMessage || currentLogger.logWarning;
  logMessage = logMessage || currentLogger.logMessage;
  currentLogger = {
    logMessage,
    logWarning,
    logError,
    flush
  };
}

export function getLogger() {
  return currentLogger;
}

export function logError(..._: any[]) {
  currentLogger.logError.apply(currentLogger, arguments);
}

export function logMessage(..._: any[]) {
  currentLogger.logMessage.apply(currentLogger, arguments);
}

export function logWarning(..._: any[]) {
  currentLogger.logWarning.apply(currentLogger, arguments);
}

export function flushLog() {
  if (currentLogger.flush) {
    return currentLogger.flush();
  }
}