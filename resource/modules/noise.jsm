var EXPORTED_SYMBOLS = ["NoiseJSM"];

const {classes: Cc, interfaces: Ci, utils: Cu, manager: Cm} = Components;

this.NoiseJSM = {
  player: null,

  init: function () {
    this.player = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    this.player.init();
  },

  uninit: function () {
  }
};

this.NoiseJSM.init();
