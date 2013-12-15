/*jslint bitwise: false, evil: true*/
/*global NoiseOverlay: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!NoiseOverlay) {
  var NoiseOverlay = {};
}
Components.utils.import("resource://noise/noise.jsm");

NoiseOverlay = {
  player: null,
  enabled: false,

  init: function () {
    Noise.patchWindow(window);
    this.player = Noise.player;
    this.prefs = Noise.prefs;
    this.enabled = Noise.enabled;
    Noise.addEventHandlers(window);
  },

  uninit: function () {
    Noise.undoPatchWindow(window);
    Noise.removeEventHandlers(window);
    this.player = null;
  },

  reset: function (newMappings) {
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    Noise.removeEventHandlers(window);
    Noise.addEventHandlers(window, newMappings);
  },

  toggle: function () {
    Noise.toggle();
  },

  play: function () {
    Noise.play.apply(Noise, arguments);
  },

  log: function (aMessage) {
    Noise.log(aMessage);
  }
};

window.addEventListener("load", function () {
  NoiseOverlay.init();
}, false);

window.addEventListener("unload", function () {
  NoiseOverlay.uninit();
}, false);
