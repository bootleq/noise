'use strict';

import browser from "webextension-polyfill";

import Sound from './common/sound';
import { EventSetting } from './common/event';
import { emptyObject, getSenderMuted } from './common/utils';

const gSounds = {};
const gEvents = {};
const contentEvents = {}; // cache events specific to content script, example: {'window.cut': [{options: ...}] }

let ports = [];
let hasStarted = false;

async function postToOffscreenDoc(type, data) {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Audio playback',
    });
  }

  chrome.runtime.sendMessage({
    type: type,
    target: 'noise-offscreen',
    data: data,
  });
}

async function init() {
  await loadConfig();
  if (hasStarted) {
    play('runtime.startup');
  }
  browser.storage.onChanged.addListener(onStorageChange);
  browser.runtime.onMessage.addListener(onMessage);
  addListeners();
}

function destroy() {
  browser.storage.onChanged.removeListener(onStorageChange);
  browser.runtime.onMessage.removeListener(onMessage);
  removeListeners();
  broadcast({type: 'unbind'});
}

function onStorageChange(changes, _area) {
  if ('sounds' in changes) {
    resetSounds(changes.sounds.newValue);
  }

  if ('events' in changes) {
    resetEvents(changes.events.newValue);
    removeListeners();
    addListeners();
    broadcast({type: 'bind', events: contentEvents});
  }
}

function onMessage(msg, sender, respond) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'listeners':
    if ('action' in msg) {
      if (msg.action === 'bind') {
        addListeners();
        broadcast({type: 'bind', events: contentEvents});
      } else {
        removeListeners();
        broadcast({type: 'unbind'});
      }
    } else {
      removeListeners();
      addListeners();
      broadcast({type: 'bind', events: contentEvents});
    }
  }
}

function broadcast(...args) {
  ports.forEach(port => port.postMessage(...args));
}

async function onPortMessage(msg, port) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'content.on':
    if (await getSenderMuted(port.sender) === true) {
      return;
    }
    switch (msg.event.type) {
    case 'cut':
      play('window.cut');
      break;

    case 'copy':
      play('window.copy');
      break;
    }
    break;
  case 'ready':
    port.postMessage({type: 'bind', events: contentEvents});
    break;
  }
}

function onConnect(port) {
  ports.push(port);
  port.onMessage.addListener(onPortMessage);
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

  toggleListener(browser.tabs.onCreated, onTabCreated, types.includes('tabs.created'));
  toggleListener(browser.tabs.onRemoved, onTabRemoved, types.includes('tabs.removed'));
  toggleListener(browser.tabs.onAttached, onTabAttached, types.includes('tabs.attached'));

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
}

function removeListeners() {
  browser.downloads.onCreated.removeListener(onDownloadCreated);
  browser.downloads.onChanged.removeListener(onDownloadChanged);
  browser.tabs.onCreated.removeListener(onTabCreated);
  browser.tabs.onRemoved.removeListener(onTabRemoved);
  browser.tabs.onAttached.removeListener(onTabAttached);
  browser.runtime.onStartup.removeListener(onStartup);
  if (typeof browser.webNavigation === 'object') {
    ['onCommitted', 'onHistoryStateUpdated', 'onReferenceFragmentUpdated'].forEach(event => {
      browser.webNavigation[event].removeListener(onBackForward);
    });
  }
  if (typeof browser.webRequest === 'object') {
    browser.webRequest.onCompleted.removeListener(onRequestCompleted);
  }
}

function resetSounds(configs) {
  emptyObject(gSounds);
  configs.forEach(cfg => gSounds[cfg.id] = new Sound(cfg));
}

function resetEvents(configs) {
  emptyObject(gEvents);
  emptyObject(contentEvents);

  configs.forEach(cfg => {
    let type = cfg.type;

    if (!(type in gEvents)) {
      gEvents[type] = [];
    }
    if (cfg.enabled && gSounds[cfg.soundId]) {
      const e = new EventSetting(cfg);
      gEvents[type].push(e);

      if (EventSetting.getTypeDef(type, 'forContent')) {
        if (!(type in contentEvents)) {
          contentEvents[type] = [];
        }
        contentEvents[type].push({options: e.options});
      }
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
      sound.loadSrc().then(src => {
        postToOffscreenDoc(
          'noise-play',
          {
            id:  sound.id,
            src: src
          }
        );
      });
    }
  });
}

// Event Handlers {{{

function onStartup() {
  hasStarted = true;
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

function onTabCreated(tab) {
  play('tabs.created');
}

function onTabRemoved(tab) {
  play('tabs.removed');
}

function onTabAttached(tab) {
  play('tabs.attached');
}

function onBackForward(details) { // webNavigation: onHistoryStateUpdated, onReferenceFragmentUpdated, onCommitted
  if (details.transitionQualifiers.includes('forward_back') && details.tabId > -1) {
    browser.tabs.get(details.tabId).then(tab => {
      if (tab.mutedInfo.muted !== true) {
        play('navigation.backForward');
      }
    });
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

init();
browser.runtime.onSuspend.addListener(destroy);

browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onConnect.addListener(onConnect);
