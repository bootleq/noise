'use strict';

const gSounds = {};
const gEvents = {};
let fxStartup = false;

async function init() {
  window.addEventListener('unload', destroy, {once: true});
  await loadConfig();
  if (fxStartup) {
    gEvents['runtime.startup'].forEach(e => play(e.soundId));
    fxStartup = false;
  }
  browser.storage.onChanged.addListener(onStorageChange);
  browser.runtime.onMessage.addListener(onMessage);
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
    if (msg.event.type === 'copy') {
      gEvents['window.copy'].forEach(e => play(e.soundId));
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

  browser.tabs.query({}).then(tabs => {
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, {type: 'bind'}).catch(error => {
        // FIXME: avoid send to tabs without receiver
        console.log(error);
      });
    });
  });
}

function removeListeners() {
  browser.downloads.onCreated.removeListener(onDownloadCreated);
  browser.downloads.onChanged.removeListener(onDownloadChanged);
  browser.runtime.onInstalled.removeListener(onNoiseInstalled);
  browser.runtime.onStartup.removeListener(onStartup);
  if (typeof browser.webNavigation === 'object') {
    ['onCommitted', 'onHistoryStateUpdated', 'onReferenceFragmentUpdated'].forEach(event => {
      browser.webNavigation[event].removeListener(onBackForward);
    });
  }

  browser.tabs.query({}).then(tab => {
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, {type: 'unbind'});
    });
  });
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

function toggleListener(host, listener, toggle) {
  if (toggle) {
    if (!host.hasListener(listener)) {
      host.addListener(listener);
    }
  } else {
    host.removeListener(listener);
  }
}

function play(soundId) {
  let sound = gSounds[soundId];
  if (sound) {
    sound.play();
  }
}

// Event Handlers {{{

function onStartup() {
  fxStartup = true;
}

function onNoiseInstalled(details) {
  let prev = details.previousVersion;
  if (prev && prev.match(/^1\..+/)) {
    browser.storage.local.set({"upgrade.legacy": prev});
    browser.tabs.create({
      active: false,
      url: '/pages/upgrade-legacy.html'
    });
  }
}

function onDownloadCreated(item) { // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/onCreated
  gEvents['download.new'].forEach(e => play(e.soundId));
}

function onDownloadChanged(delta) { // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/onChanged
  if (delta.state) {
    switch (delta.state.current) {
    case 'complete':
      gEvents['download.completed'].forEach(e => play(e.soundId));
      break;

    case 'interrupted':
      gEvents['download.interrupted'].forEach(e => play(e.soundId));
      break;
    }
  }
}

function onBackForward(details) { // webNavigation: onHistoryStateUpdated, onReferenceFragmentUpdated, onCommitted
  if (details.transitionQualifiers.includes('forward_back')) {
    gEvents['navigation.backForward'].forEach(e => play(e.soundId));
  }
}
// }}}

// Utils {{{
function hasAny(targets, array) {
  return array.some(a => targets.includes(a));
}
// }}}

window.addEventListener('DOMContentLoaded', init, {once: true});

browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onInstalled.addListener(onNoiseInstalled);
