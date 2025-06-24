'use strict';

import browser from "webextension-polyfill";

import Sound from './common/sound';
import { EventSetting } from './common/event';
import { emptyObject, hasAny, getSenderMuted } from './common/utils';

const gSounds = {};
const gEvents = {};
const contentEvents = {}; // cache events specific to content script, example: {'window.cut': [{options: ...}] }

let ports = [];
let hasStarted = false;

async function init() {
  window.addEventListener('unload', destroy, {once: true});
  await loadConfig();
  if (hasStarted) {
    play('runtime.startup');
    hasStarted = false;
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

  const eType = msg.event?.type;

  switch (msg.type) {
  case 'content.on':
    if (await getSenderMuted(port.sender) === true) {
      return;
    }
    switch (eType) {
      case 'cut':
      case 'copy':
      case 'paste':
        play(`window.${eType}`);
        break;

      case 'compositionstart':
        play('window.compositionstart');
        break;

      case 'enter-fullscreen':
        play('doc.fullscreenEnter');
        break;
      case 'leave-fullscreen':
        play('doc.fullscreenLeave');
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
  toggleListener(
    browser.tabs.onUpdated,
    onTabUpdated,
    hasAny(['tabs.attention', 'tabs.pinned', 'tabs.unpinned', 'tabs.group-in', 'tabs.group-out'], types),
    {
      urls: ['<all_urls>'],
      properties: ['attention', 'pinned', 'groupId']
    }
  );

  toggleListener(browser.windows.onCreated, onWindowCreated, hasAny(['windows.created', 'windows.created-private'], types));
  toggleListener(browser.windows.onRemoved, onWindowRemoved, types.includes('windows.removed'));

  if (typeof browser.tabGroups === 'object') {
    toggleListener(browser.tabGroups.onCreated, onTabGroupCreated, types.includes('tabGroups.created'));
    toggleListener(browser.tabGroups.onRemoved, onTabGroupRemoved, types.includes('tabGroups.removed'));
    toggleListener(browser.tabGroups.onMoved, onTabGroupMoved, types.includes('tabGroups.moved'));
    toggleListener(browser.tabGroups.onUpdated, onTabGroupUpdated, types.includes('tabGroups.updated'));
  }

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
  browser.tabs.onUpdated.removeListener(onTabUpdated);
  browser.windows.onCreated.removeListener(onWindowCreated);
  browser.windows.onRemoved.removeListener(onWindowRemoved);

  if (typeof browser.tabGroups === 'object') {
    browser.tabGroups.onCreated.removeListener(onTabGroupCreated);
    browser.tabGroups.onRemoved.removeListener(onTabGroupRemoved);
    browser.tabGroups.onMoved.removeListener(onTabGroupMoved);
    browser.tabGroups.onUpdated.removeListener(onTabGroupUpdated);
  }

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

    if (cfg.enabled && gSounds[cfg.soundId]) {
      const e = new EventSetting(cfg);

      if (!(type in gEvents)) gEvents[type] = [];
      gEvents[type].push(e);

      if (EventSetting.getTypeDef(type, 'forContent')) {
        if (!(type in contentEvents)) contentEvents[type] = [];
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
      sound.play();
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

function onTabRemoved(tabId, info) {
  let filter = (event) => {
    if ('ignoreWinClose' in event.options) {
      if (event.options['ignoreWinClose']['ignore'] === 'ignore' && info.isWindowClosing) {
        return false;
      }
    }
    return true;
  };
  play('tabs.removed', filter);
}

function onTabAttached(tab) {
  play('tabs.attached');
}

function onTabUpdated(tabId, changeInfo, tabInfo) {
  const keys = Object.keys(changeInfo);

  if (keys.includes('attention') && changeInfo['attention']) {
    play('tabs.attention');
  }

  if (keys.includes('pinned')) {
    if (changeInfo['pinned']) {
      play('tabs.pinned');
    } else {
      play('tabs.unpinned');
    }
  }

  if (keys.includes('groupId')) {
    if (changeInfo['groupId'] === -1) {
      play('tabs.group-out');
    } else {
      play('tabs.group-in');
    }
  }
}

function onTabGroupCreated(group) {
  play('tabGroups.created');
}
function onTabGroupRemoved(group) {
  play('tabGroups.removed');
}
function onTabGroupMoved(group) {
  play('tabGroups.moved');
}
function onTabGroupUpdated(group) {
  play('tabGroups.updated');
}

function onWindowCreated(win) {
  if (win.incognito) {
    play('windows.created-private');
  } else {
    play('windows.created');
  }
}

function onWindowRemoved(winId) {
  play('windows.removed');
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

window.addEventListener('DOMContentLoaded', init, {once: true});

browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onConnect.addListener(onConnect);
