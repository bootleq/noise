'use strict';

const gSounds = {};
const gEvents = {};

async function init() {
  window.addEventListener('unload', destroy, {once: true});
  await loadConfig();
  browser.storage.onChanged.addListener(onStorageChange);
  addListeners();
}

function destroy() {
  browser.storage.onChanged.removeListener(onStorageChange);
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
}

function removeListeners() {
  browser.downloads.onCreated.removeListener(onDownloadCreated);
  browser.downloads.onChanged.removeListener(onDownloadChanged);
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
