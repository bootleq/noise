/*jslint bitwise: false, evil: true*/
/*global Noise: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!Noise) {
  var Noise = {};
}
Components.utils.import("resource://noise/noise.jsm");

Noise = {
  player: null,
  mappings: [],
  observers: [],
  listeners: [],
  enabled: false,

  init: function () {
    NoiseJSM.patchWindow(window);
    this.player = NoiseJSM.player;
    this.mappings = NoiseJSM.loadRdf();
    this.prefs = NoiseJSM.prefs;
    this.enabled = NoiseJSM.enabled;
    this.addObservers();
  },

  uninit: function () {
    NoiseJSM.undoPatchWindow(window);
    this.player = null;
    this.removeObservers();
    this.mappings = null;
    this.observers = null;
    this.listeners = null;
  },

  reset: function () {
    this.removeObservers();
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.mappings = [];
    this.observers = [];
    this.listeners = [];
    this.mappings = NoiseJSM.loadRdf();
    this.addObservers();
  },

  toggle: function () {
    NoiseJSM.toggle();
  },

  addObservers: function () {
    this.mappings.forEach(function (i) {
      if (!i.enable || i.cmd === '') {
        return;
      }

      // split i.cmd from cmd&filter into cmd, filter
      var
        cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&')),
        filter = i.cmd.indexOf('&') < 0 ? false : i.cmd.substr(i.cmd.indexOf('&') + 1),
        filtertFx = function () {
          return true;
        };

      switch (parseInt(i.type, 10)) {
      case 0:
        return;
      case 1:
        if (filter) {
          filtertFx = new Function('subject, data', 'return ' + filter + ';');
        }
        this.observers[i.urn] = {
          observe: function (subject, topic, data) {
            try {
              if (filtertFx(subject, data)) {
                Noise.play(i.se);
              }
            } catch (e) {
              dump('Noise: ' + e);
            }
          }
        };
        NoiseJSM.addObserver(this.observers[i.urn], cmd, false);
        break;
      case 2:
        if (filter) {
          filtertFx = new Function('event', 'return ' + filter + ';');
        }
        this.listeners[i.urn] = function (event) {
          try {
            if (filtertFx(event)) {
              Noise.play(i.se);
            }
          } catch (e) {
            dump('Noise: ' + e);
          }
        };
        if (typeof gBrowser !== "undefined") {
          gBrowser.addEventListener(cmd, this.listeners[i.urn], false);
        }
        break;
      case 3:
        if (filter) {
          filtertFx = new Function('event', 'return ' + filter + ';');
        }
        this.listeners[i.urn] = function (event) {
          try {
            if (filtertFx(event)) {
              Noise.play(i.se);
            }
          } catch (e) {
            dump('Noise: ' + e);
          }
        };
        window.addEventListener(cmd, this.listeners[i.urn], false);
        break;
      }
    }, this);
  },

  removeObservers: function () {
    this.mappings.forEach(function (i) {
      if (!i.enable || i.cmd === '') {
        return;
      }
      var cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&'));
      switch (parseInt(i.type, 10)) {
      case 0:
        return;
      case 1:
        if (typeof this.observers[i.urn] === "undefined" || !this.observers[i.urn]) {
          return;
        }
        NoiseJSM.removeObserver(this.observers[i.urn], cmd);
        this.observers[i.urn].observe = null;
        this.observers[i.urn] = null;
        break;
      case 2:
        if (typeof gBrowser !== "undefined") {
          gBrowser.removeEventListener(cmd, this.listeners[i.urn], false);
        }
        break;
      case 3:
        window.removeEventListener(cmd, this.listeners[i.urn], false);
        break;
      }
    }, this);
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
