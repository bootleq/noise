/*jslint bitwise: false, evil: true*/
/*global Noise: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!Noise) {
  var Noise = {};
}
Components.utils.import("resource://noise/noise.jsm");

Noise = {
  obsSvc: null,
  player: null,
  mappings: [],
  observers: [],
  listeners: [],
  enabled: false,

  init: function () {
    this.player = NoiseJSM.player;
    this.mappings = NoiseJSM.loadRdf();
    this.obsSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    this.prefs = NoiseJSM.prefs;
    this.enabled = NoiseJSM.enabled;

    this.addNotifiers();
    this.addObservers();
  },

  uninit: function () {
    this.player = null;
    this.removeProgressListener();
    this.removeNotifiers();
    this.removeObservers();
    this.mappings = null;
    this.observers = null;
    this.listeners = null;
  },

  reset: function () {
    this.removeProgressListener();
    this.removeNotifiers();
    this.removeObservers();
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.mappings = [];
    this.observers = [];
    this.listeners = [];
    this.mappings = NoiseJSM.loadRdf();
    this.addProgressListener();
    this.addObservers();
  },

  toggle: function () {
    NoiseJSM.toggle();
  },

  /* start of overwrite code {{{ */

  addNotifiers: function () {
    var windowType = this._getWindowType();

    if (['navigator:browser', 'navigator:view-source'].indexOf(windowType) > -1) {
      // overwrite _updateStatusUI, see chrome/tookit/content/global/content/bindings/findbar.xml
      // notify with topic "noise-TypeAheadFind.FIND_WRAPPED"
      if (!('gFindBar' in window)) {
        window.gFindBar = document.getElementById('FindToolbar');
      }
      this.patchFindBar(window.gFindBar);
      window.addEventListener("TabFindInitialized", this.onTabFindInitialized, false);
    }

    if (windowType !== 'navigator:browser') {
      return;
    }

    // overwrite "toggleSidebar", see chrome/browser/content/browser/browser.js
    // notify with topic "noise-toggleSidebar"
    if ('toggleSidebar' in window) {
      let (_toggleSidebarWithoutNoise = window.toggleSidebar) {
        window.toggleSidebar = function _toggleSidebarWithNoise(commandID, forceOpen) {
          try {
            Noise.obsSvc.notifyObservers(null, "noise-toggleSidebar", commandID);
          } catch (e) {
            dump('Noise: ' + e);
          }
          return _toggleSidebarWithoutNoise.apply(window, arguments);
        };
      };
    }

    // notify with topic "noise-WebProgress-start", "noise-WebProgress-stop", "noise-WebProgress-locationChange"
    if ('tabContainer' in gBrowser) {
      gBrowser.tabContainer.addEventListener("TabOpen", this.onTabOpen, false);
      gBrowser.tabContainer.addEventListener("TabClose", this.onTabClose, false);
    }
    this.addProgressListener();
  },

  addProgressListener: function () {
    if ('gBrowser' in window) {
      gBrowser.addProgressListener(this.progListener);
    }
  },

  removeProgressListener: function () {
    if (this._getWindowType() === 'navigator:browser') {
      gBrowser.removeProgressListener(this.progListener);
    }
  },

  onTabFindInitialized: function (event) {
    Noise.patchFindBar(event.target._findBar);
  },

  onTabOpen: function (event) {
    event.target.linkedBrowser.webProgress.addProgressListener(Noise.progListener2, Components.interfaces.nsIWebProgress.NOTIFY_STATE_NETWORK);
  },

  onTabClose: function (event) {
    event.target.linkedBrowser.removeProgressListener(Noise.progListener2);
  },

  progListener: {
    obsSvc: Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
    nsiWPL: Components.interfaces.nsIWebProgressListener,
    onStateChange: function (aProg, aReq, aState, aStatus) {
      if (aState & this.nsiWPL.STATE_START && aState & this.nsiWPL.STATE_IS_DOCUMENT) {
        this.obsSvc.notifyObservers(aReq, "noise-WebProgress-start", aStatus);
      }
    },
    onProgressChange: function (aProg, aReq, aCurSelf, aMaxSelf, aCurTotal, aMaxTotal) {},
    onLocationChange: function (aProg, aReq, aLocation) {
      this.obsSvc.notifyObservers(aLocation, "noise-WebProgress-locationChange", aLocation ? aLocation.spec : null);
    },
    onSecurityChange: function (aProg, aReq, aState) {},
    onStatusChange: function (aProg, aReq, aStatus, aMsg) {},
    onLinkIconAvailable: function (aProg, aReq) {},
    QueryInterface: function (id) {
      if (id.equals(Components.interfaces.nsIWebProgressListener) ||
          id.equals(Components.interfaces.nsISupportsWeakReference) ||
          id.equals(Components.interfaces.nsISupports)) {
        return this;
      }
      throw Components.results.NS_NOINTERFACE;
    }
  },

  progListener2: {
    obsSvc: Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
    nsiWPL: Components.interfaces.nsIWebProgressListener,
    onStateChange: function (aProg, aReq, aState, aStatus) {
      if (aState & this.nsiWPL.STATE_STOP && aState & this.nsiWPL.STATE_IS_NETWORK) {
        this.obsSvc.notifyObservers(aReq, "noise-WebProgress-stop", aStatus);
      }
    },
    onProgressChange: function (aProg, aReq, aCurSelf, aMaxSelf, aCurTotal, aMaxTotal) {},
    onLocationChange: function (aProg, aReq, aLocation) {},
    onSecurityChange: function (aProg, aReq, aState) {},
    onStatusChange: function (aProg, aReq, aStatus, aMsg) {},
    onLinkIconAvailable: function (aProg, aReq) {},
    QueryInterface: function (id) {
      if (id.equals(Components.interfaces.nsIWebProgressListener) ||
          id.equals(Components.interfaces.nsISupportsWeakReference) ||
          id.equals(Components.interfaces.nsISupports)) {
        return this;
      }
      throw Components.results.NS_NOINTERFACE;
    }
  },

  patchFindBar: function (findbar) {
    if (findbar && '_updateStatusUI' in findbar) {
      let (_updateStatusUIWithoutNoise = findbar._updateStatusUI) {
        findbar._updateStatusUI = function _updateStatusUIWithNoise(res, aFindPrevious) {
          if (res === findbar.nsITypeAheadFind.FIND_WRAPPED) {
            Noise.obsSvc.notifyObservers(null, "noise-TypeAheadFind.FIND_WRAPPED", aFindPrevious);
          }
          return _updateStatusUIWithoutNoise.apply(findbar, arguments);
        };
      };
    }
  },

  /* }}} end of overwrite code */

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
        this.obsSvc.addObserver(this.observers[i.urn], cmd, false);
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
        this.obsSvc.removeObserver(this.observers[i.urn], cmd);
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

  removeNotifiers: function () {
    if (['navigator:browser', 'navigator:view-source'].indexOf(this._getWindowType()) > -1) {
      window.removeEventListener("TabFindInitialized", this.onTabFindInitialized);
    }
  },

  play: function () {
    NoiseJSM.play.apply(NoiseJSM, arguments);
  },

  log: function (aMessage) {
    NoiseJSM.log(aMessage);
  },

  _getWindowType: function () {
    return document.documentElement.getAttribute('windowtype');
  }

};

window.addEventListener("load", function () {
  Noise.init();
}, false);

window.addEventListener("unload", function () {
  Noise.uninit();
}, false);
