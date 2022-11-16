'use strict';

import browser from "webextension-polyfill";
import { nanoid } from "nanoid";

function emptyObject(obj) {
  Object.keys(obj).forEach(key => {
    delete obj[key];
  });
}

function newId() {
  return nanoid(14);
}

function testAudioSrc(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('canplaythrough', resolve);
    audio.addEventListener('error', reject);
    audio.src = src;
  })
}

async function browserInfo() {
  if (browser.runtime.hasOwnProperty('getBrowserInfo')) {
    return await browser.runtime.getBrowserInfo();
  }

  return {}; // return dummy object for chrome is enough
}

export { emptyObject, newId, testAudioSrc, browserInfo };
