import { exportObject } from './shared';
import { logWarning } from './logging';
var settingsPropertyName = 'timewebConfig';
var userSettings: { [key: string]: any } = {};
var settings: { [key: string]: SettingsType<any> } = {};

function isOverwritable(obj: any) {
  return obj === undefined || obj === null;
}

export function importGlobalSettings() {
  setUserSettings(exportObject[settingsPropertyName]);
}

function verifySettings(settingsToVerify: { [key: string]: unknown }) {
  Object.keys(settingsToVerify).forEach(function (key) {
    if (settings[key] === undefined) {
      logWarning('Unknown user-defined config: ' + key);
    } else {
      if (settings[key].validateFn) {
        let validationMessage = settings[key].validateFn!(settingsToVerify[key]);
        if (validationMessage) {
          logWarning(validationMessage);
        }
      }
    }
  });
}

export interface SettingsType<Type> {
  name: string;
  defaultValue: Type;
  update?(newValue: Type, oldValue: Type): Type;
  validateFn?(toValidate: any): string | undefined | null;
  onUpdate?(newValue: Type): unknown;
}
export function addSetting<Type>({ name, defaultValue, validateFn, update, onUpdate }: SettingsType<Type>) {
  if (isOverwritable(userSettings[name])) {
    userSettings[name] = defaultValue;
  }
  settings[name] = { name, defaultValue, validateFn, update, onUpdate };
  return {
    getValue(): Type {
      return getSetting(name);
    }
  };
}

export function getSetting(name: string) {
  return userSettings[name];
}

export function setUserSettings(config: { [key: string]: any } = {}) {
  verifySettings(config);
  Object.keys(config).forEach(function (key) {
    var previousValue = userSettings[key];
    if (config[key] === undefined) {
      return;
    }
    if (settings[key].update) {
      userSettings[key] = settings[key].update!(config[key], userSettings[key]);
    } else {
      userSettings[key] = config[key];
    }
    if (isOverwritable(userSettings[key])) {
      userSettings[key] = settings[key].defaultValue;
    }
    if (settings[key].onUpdate && previousValue !== userSettings[key]) {
      settings[key].onUpdate!(userSettings[key]);
    }
  });
}