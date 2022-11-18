'use strict';

import browser from "webextension-polyfill";

let bound = false;
let port = browser.runtime.connect();

function onPortMessage(msg, port) {
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

globalThis.requestIdleCallback(() => {
  port = browser.runtime.connect();

  addListeners();
  port.onMessage.addListener(onPortMessage);
  port.onDisconnect.addListener((p) => { // stop when background script unload
    port = null;
    removeListeners();
  });
  window.addEventListener('unload', () => port.disconnect());
});
