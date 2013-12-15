/*jslint bitwise: false, evil: true*/
/*global Noise: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!Noise) {
  var Noise = {};
}
Components.utils.import("resource://noise/noise.jsm");

Noise = {
  player: null,
  enabled: false,

  init: function () {
    NoiseJSM.patchWindow(window);
    this.player = NoiseJSM.player;
    this.prefs = NoiseJSM.prefs;
    this.enabled = NoiseJSM.enabled;
    NoiseJSM.addEventHandlers(window);
  },

  uninit: function () {
    NoiseJSM.undoPatchWindow(window);
    NoiseJSM.removeEventHandlers(window);
    this.player = null;
  },

  reset: function (newMappings) {
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    NoiseJSM.removeEventHandlers(window);
    NoiseJSM.addEventHandlers(window, newMappings);
  },

  toggle: function () {
    NoiseJSM.toggle();
  },

  play: function () {
    NoiseJSM.play.apply(NoiseJSM, arguments);
  },

  log: function (aMessage) {
    NoiseJSM.log(aMessage);
  }
};

window.addEventListener("load", function () {
  Noise.init();
}, false);

window.addEventListener("unload", function () {
  Noise.uninit();
}, false);
