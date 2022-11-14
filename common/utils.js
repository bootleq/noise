'use strict';

function emptyObject(obj) {
  Object.keys(obj).forEach(key => {
    delete obj[key];
  });
}

function newId() {
  return new Date().valueOf().toString();
}

export { emptyObject, newId };
