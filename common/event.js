'use strict';

import browser from "webextension-polyfill";

import { newId } from './utils';

let scope = 'event_types_name_';

const Types = {
  'runtime.startup': {
    name: browser.i18n.getMessage(`${scope}runtimeStartup`)
  },
  'download.new': {
    name: browser.i18n.getMessage(`${scope}downloadNew`)
  },
  'download.completed': {
    name: browser.i18n.getMessage(`${scope}downloadCompleted`)
  },
  'download.failure': {
    name: browser.i18n.getMessage(`${scope}downloadFailure`)
  },
  'download.interrupted': {
    name: browser.i18n.getMessage(`${scope}downloadInterrupted`)
  },
  'navigation.backForward': {
    name: browser.i18n.getMessage(`${scope}navigationBackForward`),
    permissions: ['webNavigation']
  },
  'request.completed': {
    name: browser.i18n.getMessage(`${scope}requestCompleted`),
    permissions: ['webRequest'],
    slots: [
      {
        name: 'filter_statusCode'
      }
    ]
  },
  'window.cut': {
    name: browser.i18n.getMessage(`${scope}windowCut`),
    forContent: true
  },
  'window.copy': {
    name: browser.i18n.getMessage(`${scope}windowCopy`),
    forContent: true
  }
};

class EventSetting {
  constructor(config) {
    this.id      = config ? config.id      : newId();
    this.name    = config ? config.name    : '';
    this.type    = config ? config.type    : null;
    this.options = config ? config.options : {};
    this.soundId = config ? config.soundId : null;
    this.enabled = config ? config.enabled : false;
  }

  static get Types() {
    return Types;
  }

  toPersistedProps() {
    let obj = {
      id:      this.id,
      name:    this.name || '',
      type:    this.type,
      options: this.options,
      soundId: this.soundId,
      enabled: this.enabled
    }
    return obj;
  }

  static getTypeDef(type, prop) {
    let def = this.Types[type];

    switch (prop) {
    case 'forContent':
      return Boolean(def?.forContent);

    case 'name':
      return def ? def.name : '';

    case 'permissions':
      return (def && 'permissions' in def) ? def.permissions : [];

    case 'slots':
      return (def && 'slots' in def) ? def.slots : [];
    }
  }
}

export { EventSetting, Types };
