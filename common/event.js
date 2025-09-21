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
  },
  'window.paste': {
    name: browser.i18n.getMessage(`${scope}windowPaste`),
    forContent: true
  },
  'window.compositionstart': {
    name: browser.i18n.getMessage(`${scope}windowCompositionStart`),
    forContent: true
  },
  'doc.fullscreenEnter': {
    name: browser.i18n.getMessage(`${scope}docFullscreenEnter`),
    forContent: true
  },
  'doc.fullscreenLeave': {
    name: browser.i18n.getMessage(`${scope}docFullscreenLeave`),
    forContent: true
  },
  'hr.tabs': {},
  'tabs.created': {
    name: browser.i18n.getMessage(`${scope}tabsCreated`)
  },
  'tabs.removed': {
    name: browser.i18n.getMessage(`${scope}tabsRemoved`),
    slots: [
      {
        name: 'ignoreWinClose'
      }
    ]
  },
  'tabs.attached': {
    name: browser.i18n.getMessage(`${scope}tabsAttached`)
  },
  'tabs.pinned': {
    name: browser.i18n.getMessage(`${scope}tabsPinned`)
  },
  'tabs.unpinned': {
    name: browser.i18n.getMessage(`${scope}tabsUnpinned`)
  },
  'tabs.attention': {
    name: browser.i18n.getMessage(`${scope}tabsAttention`),
    browsers: ['firefox']
  },
  'hr.tabGroups': {},
  'tabGroups.created': {
    name: browser.i18n.getMessage(`${scope}tabGroupsCreated`),
    permissions: ['tabGroups']
  },
  'tabGroups.updated': {
    name: browser.i18n.getMessage(`${scope}tabGroupsUpdated`),
    permissions: ['tabGroups']
  },
  'tabGroups.moved': {
    name: browser.i18n.getMessage(`${scope}tabGroupsMoved`),
    permissions: ['tabGroups']
  },
  'tabs.group-in': {
    name: browser.i18n.getMessage(`${scope}tabsGroupIn`)
  },
  'tabs.group-out': {
    name: browser.i18n.getMessage(`${scope}tabsGroupOut`)
  },
  'tabGroups.removed': {
    name: browser.i18n.getMessage(`${scope}tabGroupsRemoved`),
    permissions: ['tabGroups']
  },
  'hr.windows': {},
  'windows.created': {
    name: browser.i18n.getMessage(`${scope}windowsCreated`)
  },
  'windows.created-private': {
    name: browser.i18n.getMessage(`${scope}windowsCreatedIncognito`)
  },
  'windows.removed': {
    name: browser.i18n.getMessage(`${scope}windowsRemoved`)
  },
};

const eventState = new WeakMap();

class EventSetting {
  constructor(config) {
    this.id       = config ? config.id        : newId();
    this.name     = config ? config.name      : '';
    this.type     = config ? config.type      : null;
    this.options  = config ? config.options   : {};
    this.soundIds = config ? config.soundIds  : [];
    this.shuffle  = config ? !!config.shuffle : false;
    this.enabled  = config ? config.enabled   : false;
  }

  static get Types() {
    return Types;
  }

  toPersistedProps() {
    let obj = {
      id:       this.id,
      name:     this.name || '',
      type:     this.type,
      options:  this.options,
      soundIds: this.soundIds,
      shuffle:  this.shuffle,
      enabled:  this.enabled
    }
    return obj;
  }

  nextSoundId() {
    if (this.soundIds.length <= 1) {
      return this.soundIds[0];
    }

    let idx = 0;
    if (this.shuffle) {
      idx = Math.floor(Math.random() * this.soundIds.length);
    } else {
      idx = eventState.get(this)?.lastIdx || 0;
      const nextIdx = (idx + 1) % this.soundIds.length;
      eventState.set(this, { lastIdx: nextIdx});
    }
    return this.soundIds[idx];
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

    case 'browsers':
      return (def && 'browsers' in def) ? def.browsers : [];

    case 'slots':
      return (def && 'slots' in def) ? def.slots : [];
    }
  }
}

export { EventSetting, Types };
