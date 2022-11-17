'use strict';

import browser from "webextension-polyfill";
import Sound from './common/sound';
import { emptyObject } from './common/utils';

let bound = false;
let port = browser.runtime.connect();

// For service worker to play audio
const sounds = {};

function play(soundProps) {
  const { id, src } = soundProps;
  let sound = sounds[id];

  if (!sound) {
    sound = new Sound(soundProps);
  }
  sounds[id] = sound;
  sound.play();
}


function onMessage(msg, sender, respond) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'bind':
    addListeners();
    break;

  case 'unbind':
    removeListeners();
    break;

  case 'reconnect':
    if (port) {
      return;
    }
    port = browser.runtime.connect();
    addListeners();
    break;

  case 'play-sound':
    play(msg['sound']);
    break;
  }
}

function onEvent(e) {
  port.postMessage({
    type: 'content.on',
    event: {
      type: e.type
    }
  });
}

function addListeners() {
  if (!bound) {
    window.addEventListener('copy', onEvent);
    window.addEventListener('cut', onEvent);
  }
  bound = true;
}

function removeListeners() {
  window.removeEventListener('copy', onEvent);
  window.removeEventListener('cut', onEvent);
  bound = false;
}

addListeners();
port.onMessage.addListener(onMessage);
port.onDisconnect.addListener((p) => { // stop when background script unload
  port = null;
  emptyObject(sounds);
  removeListeners();
});
browser.runtime.onMessage.addListener(onMessage);

window.addEventListener('unload', () => port.disconnect());
