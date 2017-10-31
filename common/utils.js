'use strict';

function emptyObject(obj) {
  Object.keys(obj).forEach(key => {
    delete obj[key];
  });
}
