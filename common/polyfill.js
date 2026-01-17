'use strict';

if (typeof Object.groupBy !== 'function') {
  Object.groupBy = function groupBy(array, callbackFn, thisArg) {
    var result = Object.create(null);

    for (var i = 0; i < array.length; i++) {
      if (i in array) {
        var item = array[i];
        var key = callbackFn.call(thisArg, item, i, array);

        if (!(key in result)) {
          result[key] = [];
        }
        result[key].push(item);
      }
    }

    return result;
  };
}
