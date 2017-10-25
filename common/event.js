'use strict';

let scope = 'event_types_name_';

const Types = {
  'download.new': {
    name: browser.i18n.getMessage(`${scope}downloadNew`)
  },
  'download.completed': {
    name: browser.i18n.getMessage(`${scope}downloadCompleted`)
  },
  'download.interrupted': {
    name: browser.i18n.getMessage(`${scope}downloadInterrupted`)
  },
  'navigation.backForward': {
    name: browser.i18n.getMessage(`${scope}navigationBackForward`),
    permissions: ['webNavigation']
  }
};

class EventSetting {
  constructor(config) {
    this.id      = config ? config.id      : newId();
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
    case 'name':
      return def ? def.name : '';

    case 'permissions':
      return (def && 'permissions' in def) ? def.permissions : [];

    case 'options':
      return (def && 'options' in def) ? def.options : null;
    }
  }
}
