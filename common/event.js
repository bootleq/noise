'use strict';

let scope = 'event.types.name.';

const Types = {
  'download.new': {
    name: browser.i18n.getMessage(`${scope}download.new`)
  },
  'download.completed': {
    name: browser.i18n.getMessage(`${scope}download.completed`)
  },
  'download.interrupted': {
    name: browser.i18n.getMessage(`${scope}download.interrupted`)
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

  static t(prop, key) {
    let setting;

    switch (prop) {
    case 'type':
      setting = this.Types[key];
      return setting ? setting.name : '';
    case 'options':
      setting = this.Types[key];
      return setting ? setting.name : 'No options for this type';
    }
  }
}
