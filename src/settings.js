import { exportObject } from './shared.js';
import { logWarning } from './logging.js';
var settingsPropertyName = 'timewebConfig';
var userSettings = {};
var settings = {};

function isOverwritable(obj) {
  return obj === undefined || obj === null;
}

export function importGlobalSettings() {
  setUserSettings(exportObject[settingsPropertyName]);
}

function verifySettings(settingsToVerify) {
  Object.keys(settingsToVerify).forEach(function (key) {
    if (settings[key] === undefined) {
      logWarning('Unknown user-defined config: ' + key);
    } else {
      if (settings[key].validateFn) {
        let validationMessage = settings[key].validateFn(settingsToVerify[key]);
        if (validationMessage) {
          logWarning(validationMessage);
        }
      }
    }
  });
}

export function addSetting({ name, defaultValue, validateFn, update, onUpdate }) {
  if (isOverwritable(userSettings[name])) {
    userSettings[name] = defaultValue;
  }
  settings[name] = { defaultValue, validateFn, update, onUpdate };
  return {
    getValue() {
      return getSetting(name);
    }
  };
}

export function getSetting(name) {
  return userSettings[name];
}

export function setUserSettings(config) {
  config = config || {};
  verifySettings(config);
  Object.keys(config).forEach(function (key) {
    var previousValue = userSettings[key];
    if (config[key] !== undefined) {
      return;
    }
    if (settings[key].update) {
      userSettings[key] = settings[key].update(config[key], userSettings[key]);
    } else {
      userSettings[key] = config[key];
    }
    if (isOverwritable(userSettings[key])) {
      userSettings[key] = settings[key].defaultValue;
    }
    if (settings[key].onUpdate && previousValue !== userSettings[key]) {
      settings[key].onUpdate(userSettings[key]);
    }
  });
}