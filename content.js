'use strict';

import browser from "webextension-polyfill";
import { hasAny } from './common/utils';

let port = browser.runtime.connect();

function onPortMessage(msg, port) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'bind':
    removeListeners();
    addListeners(msg.events);
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

function onFullscreenChange(e) {
  let type = '';

  if (document.fullscreenElement) {
    type = 'enter-fullscreen';
  } else {
    type = 'leave-fullscreen';
  }
  onEvent({ type });
}

function toggleListener(target, eventName, handler, toggle) {
  if (toggle) {
    target.addEventListener(eventName, handler);
  } else {
    target.removeEventListener(eventName, handler);
  }
}

function addListeners(events) {
  const types = Object.keys(events);

  toggleListener(window, 'copy', onEvent, types.includes('window.copy'));
  toggleListener(window, 'cut',  onEvent, types.includes('window.cut'));
  toggleListener(window, 'paste', onEvent, types.includes('window.paste'));
  toggleListener(window, 'compositionstart', onEvent, types.includes('window.compositionstart'));
  toggleListener(document, 'fullscreenchange', onFullscreenChange, hasAny(['doc.fullscreenEnter', 'doc.fullscreenLeave'], types));
}

function removeListeners() {
  window.removeEventListener('copy', onEvent);
  window.removeEventListener('cut', onEvent);
  window.removeEventListener('paste', onEvent);
  window.removeEventListener('compositionstart', onEvent);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
}

globalThis.requestIdleCallback(() => {
  port = browser.runtime.connect();
  port.postMessage({type: 'ready'});

  port.onMessage.addListener(onPortMessage);
  port.onDisconnect.addListener((p) => { // stop when background script unload
    port = null;
    removeListeners();
  });
  window.addEventListener('unload', () => {
    if (port) {
      port.disconnect();
    }
  });
});
