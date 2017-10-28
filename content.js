'use strict';

let bound = false;

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
  }
}

function onEvent(e) {
  browser.runtime.sendMessage({
    type: 'content.on',
    event: {
      type: e.type
    }
  });
}

function addListeners() {
  if (!bound) {
    window.addEventListener('copy', onEvent);
  }

  bound = true;
}

function removeListeners() {
  window.removeEventListener('copy', onEvent);
  bound = false;
}

addListeners();
browser.runtime.onMessage.addListener(onMessage);
