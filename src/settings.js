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

export function addSetting({ name, defaultValue, validateFn, onUpdate }) {
  if (isOverwritable(userSettings[name])) {
    userSettings[name] = defaultValue;
  }
  settings[name] = { defaultValue, validateFn, onUpdate };
}

export function getSetting(name) {
  return userSettings[name];
}

export function setUserSettings(config) {
  config = config || {};
  verifySettings(config);
  var previousSettings = userSettings;
  userSettings = Object.assign({}, userSettings, config);
  Object.keys(settings).forEach(function (key) {
    if (isOverwritable(userSettings[key])) {
      userSettings[key] = settings[key].defaultValue;
    }
    if (settings[key].onUpdate && userSettings[key] !== previousSettings[key]) {
      settings[key].onUpdate(userSettings[key]);
    }
  });
}