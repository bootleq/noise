'use strict';

import Sound from './common/sound';

const sounds = {};

chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message) {
  if (message.target !== 'noise-offscreen') {
    return;
  }

  switch (message.type) {
    case 'noise-play':
      handlePlay(message.data);
      break;
    default:
      console.warn(`Unexpected message type: '${message.type}'.`);
  }
}

async function handlePlay(data) {
  const { id, src } = data;

  let sound = sounds[id];

  if (!sound) {
    sound = new Sound({id: id, src: src});
    sound.src = src; // must provide src beforehand to avoid loadSrc from browser.storage (offscreen doc can't access it)
  }
  sounds[id] = sound;
  sound.play();
}
