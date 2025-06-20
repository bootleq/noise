'use strict';

import browser from "webextension-polyfill";
import { nanoid } from "nanoid";

function emptyObject(obj) {
  Object.keys(obj).forEach(key => {
    delete obj[key];
  });
}

function hasAny(targets, array) {
  return array.some(a => targets.includes(a));
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

// For Port.onMessage to check whether the sender tab has muted.
// Return promise filled with boolean.
function getSenderMuted(sender) {
  let senderTabId = sender?.tab.id // tab info from sender can stale, need to get again by id
  let tab;

  if (senderTabId) {
    return browser.tabs.get(senderTabId).then(tab => tab?.mutedInfo.muted === true);
  }
  return Promise.resolve(false);
}

async function browserInfo() {
  if (browser.runtime.hasOwnProperty('getBrowserInfo')) {
    return await browser.runtime.getBrowserInfo();
  }

  return {}; // return dummy object for chrome is enough
}

export { emptyObject, hasAny, newId, testAudioSrc, getSenderMuted, browserInfo };
