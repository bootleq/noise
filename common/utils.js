'use strict';

import browser from "webextension-polyfill";

function emptyObject(obj) {
  Object.keys(obj).forEach(key => {
    delete obj[key];
  });
}

function newId() {
  return new Date().valueOf().toString();
}

async function browserInfo() {
  if (browser.runtime.hasOwnProperty('getBrowserInfo')) {
    return await browser.runtime.getBrowserInfo();
  }

  return {}; // return dummy object for chrome is enough
}

export { emptyObject, newId, browserInfo };
