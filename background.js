'use strict';

import browser from "webextension-polyfill";

import Sound from './common/sound';
import { EventSetting } from './common/event';
import { emptyObject } from './common/utils';

const gSounds = {};
const gEvents = {};
let ports = [];
let fxStartup = false;

async function init() {
  window.addEventListener('unload', destroy, {once: true});
  await loadConfig();
  if (fxStartup) {
    play('runtime.startup');
    fxStartup = false;
  }
  browser.storage.onChanged.addListener(onStorageChange);
  browser.runtime.onMessage.addListener(onMessage);
  tryReconnect();
  addListeners();
}

function destroy() {
  browser.storage.onChanged.removeListener(onStorageChange);
  browser.runtime.onMessage.removeListener(onMessage);
  removeListeners();
}

function onStorageChange(changes, _area) {
  if ('sounds' in changes) {
    resetSounds(changes.sounds.newValue);
  }

  if ('events' in changes) {
    resetEvents(changes.events.newValue);
    removeListeners();
    addListeners();
  }
}

function onMessage(msg, sender, respond) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'content.on':
    switch (msg.event.type) {
    case 'cut':
      play('window.cut');
      break;

    case 'copy':
      play('window.copy');
      break;
    }
    break;

  case 'listeners':
    if ('action' in msg) {
      if (msg.action === 'bind') {
        addListeners();
      } else {
        removeListeners();
      }
    } else {
      removeListeners();
      addListeners();
    }
  }
}

function onConnect(port) {
  ports.push(port);
  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener((p) => {
    if (p.error) {
      console.log('Disconnected due to error', p.error.message);
    }
    let index = ports.indexOf(p);
    if (index > -1) {
      ports.splice(index, 1);
    }
  });
}

function tryReconnect() {
  browser.tabs.query({windowType: 'normal'}).then(tabs => {
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, {type: 'reconnect'}).catch(error => {
        // FIXME: browser console will still report no-message-handler error
        // console.log('re-connect error', error);
      });
    });
  });
}

async function loadConfig() {
  return browser.storage.local.get(['sounds', 'events']).then(items => {
    if ('sounds' in items) {
      resetSounds(items.sounds);
    }
    if ('events' in items) {
      resetEvents(items.events);
    }
  }, error => {
    console.log(error);
  });
}

function addListeners() {
  let types = Object.keys(gEvents);
  toggleListener(browser.downloads.onCreated, onDownloadCreated, types.includes('download.new'));
  toggleListener(browser.downloads.onChanged, onDownloadChanged, hasAny(['download.completed', 'download.interrupted'], types));

  if (typeof browser.webNavigation === 'object') {
    ['onCommitted', 'onHistoryStateUpdated', 'onReferenceFragmentUpdated'].forEach(event => {
      toggleListener(browser.webNavigation[event], onBackForward, types.includes('navigation.backForward'));
    });
  }

  if (typeof browser.webRequest === 'object') {
    toggleListener(
      browser.webRequest.onCompleted,
      onRequestCompleted,
      types.includes('request.completed'),
      {
        urls: ['<all_urls>'],
        types: ['main_frame', 'sub_frame']
      }
    );
  }

  ports.forEach(p => p.postMessage({type: 'bind'}));
}

function removeListeners() {
  browser.downloads.onCreated.removeListener(onDownloadCreated);
  browser.downloads.onChanged.removeListener(onDownloadChanged);
  browser.runtime.onStartup.removeListener(onStartup);
  if (typeof browser.webNavigation === 'object') {
    ['onCommitted', 'onHistoryStateUpdated', 'onReferenceFragmentUpdated'].forEach(event => {
      browser.webNavigation[event].removeListener(onBackForward);
    });
  }
  if (typeof browser.webRequest === 'object') {
    browser.webRequest.onCompleted.removeListener(onRequestCompleted);
  }

  ports.forEach(p => p.postMessage({type: 'unbind'}));
}

function resetSounds(configs) {
  emptyObject(gSounds);
  configs.forEach(cfg => gSounds[cfg.id] = new Sound(cfg));
}

function resetEvents(configs) {
  emptyObject(gEvents);
  configs.forEach(cfg => {
    let type = cfg.type;

    if (!(type in gEvents)) {
      gEvents[type] = [];
    }
    if (cfg.enabled && gSounds[cfg.soundId]) {
      gEvents[type].push(new EventSetting(cfg));
    }
  });
}

function toggleListener(host, listener, toggle, ...args) {
  if (toggle) {
    if (!host.hasListener(listener)) {
      host.addListener(listener, ...args);
    }
  } else {
    host.removeListener(listener);
  }
}

function play(type, filter = () => true) {
  let events = gEvents[type] || [];

  events.filter(filter).forEach(e => {
    let sound = gSounds[e.soundId];
    if (sound) {
      sound.play();
    }
  });
}

// Event Handlers {{{

function onStartup() {
  fxStartup = true;
}

function onDownloadCreated(item) { // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/onCreated
  play('download.new');
}

function onDownloadChanged(delta) { // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/onChanged
  if (delta.state) {
    switch (delta.state.current) {
    case 'complete':
      play('download.completed');
      break;

    case 'interrupted':
      play('download.interrupted');
      break;
    }
  }

  if (delta.error) {
    let type = delta.error.current;
    if (type && !type.startsWith('USER_')) { // don't consider user action as error
      play('download.failure');
    }
  }
}

function onBackForward(details) { // webNavigation: onHistoryStateUpdated, onReferenceFragmentUpdated, onCommitted
  if (details.transitionQualifiers.includes('forward_back')) {
    play('navigation.backForward');
  }
}

function onRequestCompleted(details) {
  let code = (details.statusCode).toString();
  let filter = (event) => {
    if ('filter_statusCode' in event.options) {
      let pattern = event.options['filter_statusCode']['filter'];
      return code.match(pattern);
    }
    return true;
  };
  play('request.completed', filter);
}
// }}}

// Utils {{{
function hasAny(targets, array) {
  return array.some(a => targets.includes(a));
}
// }}}

window.addEventListener('DOMContentLoaded', init, {once: true});

browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onConnect.addListener(onConnect);
