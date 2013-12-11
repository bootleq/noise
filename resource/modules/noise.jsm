var EXPORTED_SYMBOLS = ["NoiseJSM"];

const {classes: Cc, interfaces: Ci, utils: Cu, manager: Cm} = Components;

prefObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic === 'nsPref:changed' && aData === 'extensions.noise.enabled') {
      NoiseJSM.enabled = NoiseJSM.prefs.getBoolPref("extensions.noise.enabled");
    }
  }
};


this.NoiseJSM = {
  player: null,
  enabled: false,

  init: function () {
    this.player = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    this.player.init();

    this.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    this.prefs2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    this.prefs2.addObserver("extensions.noise.", prefObserver, false);

    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
  },

  uninit: function () {
    this.prefs2.removeObserver("extensions.noise.", prefObserver);
  },

  toggle: function () {
    this.enabled = !this.enabled;
    this.prefs.setBoolPref("extensions.noise.enabled", this.enabled);
  }
};

this.NoiseJSM.init();
