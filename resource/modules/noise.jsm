var EXPORTED_SYMBOLS = ["Noise"];

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");

prefObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic === 'nsPref:changed' && aData === 'extensions.noise.enabled') {
      Noise.enabled = Noise.prefs.getBoolPref("extensions.noise.enabled");
    }
  }
};

_getRdfPropertyValue = function (aRes, aProp, aRDF, aDsource) {
  aProp = aRDF.GetResource("http://www.bootleq.com/noise-mappings#" + aProp);
  try {
    var target = aDsource.GetTarget(aRes, aProp, true);
    return target ? target.QueryInterface(Ci.nsIRDFLiteral).Value : null;
  } catch (ex) {
    return null;
  }
};


this.Noise = {
  player: null,
  enabled: false,

  init: function () {
    this.player = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    this.player.init();

    this.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    this.prefs2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    this.prefs2.addObserver("extensions.noise.", prefObserver, false);
    this.observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

    this.observers = [];
    this.listeners = [];
    this.mappings = this.loadRdf();

    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.base = this.getBase();
    this.addGlobalEventHandlers();
  },

  uninit: function () {
    this.removeGlobalEventHandlers();
    this.observers = null;
    this.listeners = null;
    this.mappings = null;
    this.prefs2.removeObserver("extensions.noise.", prefObserver);
  },

  toggle: function () {
    this.enabled = !this.enabled;
    this.prefs.setBoolPref("extensions.noise.enabled", this.enabled);
  },

  patchWindow: function (win) {
    var windowType = this.getWindowType(win);

    if (['navigator:browser', 'navigator:view-source'].indexOf(windowType) > -1) {
      this.patchFindBar(win);
    }

    if (windowType === 'navigator:browser') {
      this.patchToggleSidebar(win);
      this.addProgressListeners(win);
    }
  },

  // NOTE: this can not revert all patches
  undoPatchWindow: function (win) {
    var windowType = this.getWindowType(win);
    if (['navigator:browser', 'navigator:view-source'].indexOf(windowType) > -1) {
      this.undoPatchFindBar(win);
    }
    if (windowType === 'navigator:browser') {
      this.removeProgressListeners(win);
    }
  },

  notifyObservers: function (aSubject, aTopic, aData) {
    this.observerService.notifyObservers.apply(null, arguments);
  },

  addObserver: function (aObserver, aTopic, aOwnsWeak) {
    this.observerService.addObserver.apply(null, arguments);
  },

  removeObserver: function (aObserver, aTopic) {
    this.observerService.removeObserver.apply(null, arguments);
  },

  play: function (url, base, force) {
    var
      base  = arguments.length > 1 ? arguments[1] : this.base,
      force = arguments.length > 2 ? arguments[2] : false;

    if (force || this.enabled) {
      if (url === 'beep') {
        this.player.beep();
      } else if (url.indexOf(':') > 2) {
        if (url.indexOf('event:') === 0) {
          this.player.playEventSound(this.player[url.substr(6)]);
        } else if (url.indexOf('sys:') === 0) {
          this.player.playSystemSound(url.substr(4));
        }
      } else {
        this.player.play(this.getSound(url, base));
      }
    }
  },

  getWindowType: function (win) {
    return win.document.documentElement.getAttribute('windowtype');
  },

  wrap: function () {
    Noise.log('wrapping methods not available');
  },

  unwrap: function () {
    this.wrap();
  },

  O: function () {
    return this.unwrap.apply(this, arguments);
  },


  // Apply set event observers / listeners {{{
  addGlobalEventHandlers: function (newMappings) {
    var mappings = newMappings || this.mappings;
    mappings.filter(function (i) {
      return i.enable && i.cmd !== '' && parseInt(i.type, 10) === 1;
    }).forEach(function (i) {
      // split i.cmd from cmd&filter into cmd, filter
      var
        cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&')),
        filter = i.cmd.indexOf('&') < 0 ? false : i.cmd.substr(i.cmd.indexOf('&') + 1),
        filtertFx = function () {
          return true;
        };

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
      this.addObserver(this.observers[i.urn], cmd, false);
    }, this);
  },

  removeGlobalEventHandlers: function () {
    this.mappings.filter(function (i) {
      return i.enable && i.cmd !== '' && parseInt(i.type, 10) === 1;
    }).forEach(function (i) {
      if (typeof this.observers[i.urn] === "undefined" || !this.observers[i.urn]) {
        return;
      }
      var cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&'));
      this.removeObserver(this.observers[i.urn], cmd);
      this.observers[i.urn].observe = null;
      this.observers[i.urn] = null;
    }, this);
  },

  addEventHandlers: function (win, newMappings) {
    var mappings = newMappings || this.mappings;
    mappings.filter(function (i) {
      return i.enable && i.cmd !== '';
    }).forEach(function (i) {
      // split i.cmd from cmd&filter into cmd, filter
      var
        cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&')),
        filter = i.cmd.indexOf('&') < 0 ? false : i.cmd.substr(i.cmd.indexOf('&') + 1),
        filtertFx = function () {
          return true;
        };

      switch (parseInt(i.type, 10)) {
      case 0:
      case 1:
        return;
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
        if ('gBrowser' in win) {
          win.gBrowser.addEventListener(cmd, this.listeners[i.urn], false);
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
        win.addEventListener(cmd, this.listeners[i.urn], false);
        break;
      }
    }, this);
  },

  removeEventHandlers: function (win) {
    this.mappings.filter(function (i) {
      return i.enable && i.cmd !== '';
    }).forEach(function (i) {
      var cmd = i.cmd.indexOf('&') < 0 ? i.cmd : i.cmd.substr(0, i.cmd.indexOf('&'));
      switch (parseInt(i.type, 10)) {
      case 0:
      case 1:
        return;
        break;
      case 2:
        if ('gBrowser' in win) {
          win.gBrowser.removeEventListener(cmd, this.listeners[i.urn], false);
        }
        break;
      case 3:
        win.removeEventListener(cmd, this.listeners[i.urn], false);
        break;
      }
    }, this);
  },
  // }}} Apply set event observers / listeners


  // Noise-specified events implementation {{{
  patchFindBar: function (win) {
    var findbar;
    if ('_findBar' in win) {
      findbar = win._findBar;
    } else if ('gFindBar' in win) {
      findbar = win.gFindBar;
    } else {
      findbar = win.document.getElementById('FindToolbar');
    }

    if (findbar && '_updateStatusUI' in findbar) {
      // overwrite _updateStatusUI, see chrome/tookit/content/global/content/bindings/findbar.xml
      // notify with topic "noise-TypeAheadFind.FIND_WRAPPED"
      let (_updateStatusUIWithoutNoise = findbar._updateStatusUI) {
        findbar._updateStatusUI = function _updateStatusUIWithNoise(res, aFindPrevious) {
          if (res === findbar.nsITypeAheadFind.FIND_WRAPPED) {
            Noise.notifyObservers(null, "noise-TypeAheadFind.FIND_WRAPPED", aFindPrevious);
          }
          return _updateStatusUIWithoutNoise.apply(findbar, arguments);
        };
      };
    }
    win.addEventListener("TabFindInitialized", this.onTabFindInitialized, false);
  },

  undoPatchFindBar: function (win) {
    win.removeEventListener("TabFindInitialized", this.onTabFindInitialized);
  },

  onTabFindInitialized: function (event) {
    Noise.patchFindBar(event.target);
  },

  patchToggleSidebar: function (win) {
    // overwrite "toggleSidebar", see chrome/browser/content/browser/browser.js
    // notify with topic "noise-toggleSidebar"
    if ('toggleSidebar' in win) {
      let (_toggleSidebarWithoutNoise = win.toggleSidebar) {
        win.toggleSidebar = function _toggleSidebarWithNoise(commandID, forceOpen) {
          try {
            Noise.notifyObservers(null, "noise-toggleSidebar", commandID);
          } catch (e) {
            dump('Noise: ' + e);
          }
          return _toggleSidebarWithoutNoise.apply(win, arguments);
        };
      };
    }
  },

  addProgressListeners: function (win) {
    // notify with topic "noise-WebProgress-start", "noise-WebProgress-stop", "noise-WebProgress-locationChange"
    if ('gBrowser' in win) {
      var gBrowser = win.gBrowser;
      gBrowser.addProgressListener(this.progressListeners.gBrowser);

      if ('tabContainer' in gBrowser) {
        gBrowser.tabContainer.addEventListener("TabOpen", this.onTabOpen, false);
        gBrowser.tabContainer.addEventListener("TabClose", this.onTabClose, false);
      }
    }
  },

  removeProgressListeners: function (win) {
    if ('gBrowser' in win) {
      var gBrowser = win.gBrowser;
      gBrowser.removeProgressListener(this.progressListeners.gBrowser);
    }
  },

  onTabOpen: function (event) {
    event.target.linkedBrowser.webProgress.addProgressListener(
      Noise.progressListeners.browser,
      Ci.nsIWebProgress.NOTIFY_STATE_NETWORK
    );
  },

  onTabClose: function (event) {
    event.target.linkedBrowser.removeProgressListener(
      Noise.progressListeners.browser
    );
  },

  progressListeners: {
    browser: {
      onStateChange: function (aProg, aReq, aState, aStatus) {
        if (aState & Ci.nsIWebProgressListener.STATE_STOP) {
          Noise.notifyObservers(aReq, "noise-WebProgress-stop", aStatus);
        }
      },
      onProgressChange: function (aProg, aReq, aCurSelf, aMaxSelf, aCurTotal, aMaxTotal) {},
      onLocationChange: function (aProg, aReq, aLocation) {},
      onSecurityChange: function (aProg, aReq, aState) {},
      onStatusChange: function (aProg, aReq, aStatus, aMsg) {},
      onLinkIconAvailable: function (aProg, aReq) {},
      QueryInterface: function (id) {
        if (id.equals(Ci.nsIWebProgressListener) ||
            id.equals(Ci.nsISupportsWeakReference) ||
            id.equals(Ci.nsISupports)) {
          return this;
        }
        throw Cr.NS_NOINTERFACE;
      }
    },
    gBrowser: {
      onStateChange: function (aProg, aReq, aState, aStatus) {
        if (aState & Ci.nsIWebProgressListener.STATE_START &&
            aState & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT) {
          Noise.notifyObservers(aReq, "noise-WebProgress-start", aStatus);
        }
      },
      onProgressChange: function (aProg, aReq, aCurSelf, aMaxSelf, aCurTotal, aMaxTotal) {},
      onLocationChange: function (aProg, aReq, aLocation) {
        Noise.notifyObservers(
          aLocation,
          "noise-WebProgress-locationChange",
          aLocation ? aLocation.spec : null
       );
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
  },
  /// }}} Noise-specified events implementation


  // file/directory operations {{{
  getBase: function () {
    var
      file = null,
      defaultFile;
    try {
      file = this.prefs.getComplexValue("extensions.noise.base", Ci.nsILocalFile);
      if (file.isDirectory()) {
        return file;
      }
    } catch (e) {}

    // use default base path
    defaultFile = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    defaultFile.append("noise");
    if (!defaultFile.exists() || !defaultFile.isDirectory()) {
      defaultFile.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
    }
    this.prefs.setComplexValue("extensions.noise.base", Ci.nsILocalFile, defaultFile);
    return defaultFile;
  },

  setBase: function (file) {
    this.prefs.setComplexValue("extensions.noise.base", Ci.nsILocalFile, file);
    this.base = file;
  },

  getSound: function (url, base) {
    if (url === 'beep' || url.indexOf(':') > 2) {
      return url;
    }

    var
      ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
      file = null;

    if (url.search(/:\\|^\//) === -1) {  // relative path
      if (base.path.indexOf('/') >= 0) {
        url = '/' + url.replace('\\', '/');
      } else {
        url = '\\' + url.replace('/', '\\');
      }
      url = base.path + url;
    }

    try { // absolute path
      file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      file.initWithPath(url);
      if (!file.exists()) {
        return null;
      }
      return ios.newFileURI(file);
    } catch (e) { // chrome url
      try {
        if (url === "") {
          return null;
        }
        return ios.newURI(url, null, null); // currently, without existence testing
      } catch (e2) {
        dump("\nNoise:" + e2);
        return null;
      }
    }
  },
  // }}} file/directory operations


  // RDF functions {{{
  getRdfFile: function (type) {
    var
      profD = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile),
      rdfFile = profD.clone(),
      defaultFile;

    rdfFile.append("noise-mappings.rdf");
    if (!rdfFile.exists() || type === 'default') {
      defaultFile = profD.clone();
      defaultFile.append("extensions");
      defaultFile.append("noise@bootleq");
      defaultFile.append("defaults");
      defaultFile.append("noise-mappings.rdf");
      if (type === 'default') {
        return defaultFile;
      }
      if (defaultFile.exists()) {
        defaultFile.copyTo(profD, null);
      }
    }
    if (rdfFile.exists() && !rdfFile.isWritable()) {
      if (rdfFile.permissions === 256) {
        rdfFile.permissions = 384;  // 384 for ubuntu readable/writable
      }
    }
    return rdfFile;
  },

  initRdf: function (rdfFile) {
    const RDFC = Cc['@mozilla.org/rdf/container;1'].createInstance(Ci.nsIRDFContainer);
    const RDFCUtils = Cc['@mozilla.org/rdf/container-utils;1'].getService(Ci.nsIRDFContainerUtils);
    const RDF = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);
    var fileURI, dsource, rootnode;

    if (!rdfFile) {
      rdfFile = this.getRdfFile();
    }

    fileURI = Cc['@mozilla.org/network/protocol;1?name=file']
                .getService(Ci.nsIFileProtocolHandler)
                .getURLSpecFromFile(rdfFile);
    dsource = RDF.GetDataSourceBlocking(fileURI);
    rootnode = RDF.GetResource("urn:mappings:root");
    try {
      RDFC.Init(dsource, rootnode);
    } catch (e) {
      RDFCUtils.MakeSeq(dsource, rootnode);
      RDFC.Init(dsource, rootnode);
    }
    return [RDFC, RDFCUtils, RDF, dsource];
  },

  loadRdf: function (rdfFile) {
    var
      initRdf       = this.initRdf(rdfFile),
      RDFC          = initRdf[0],
      RDFCUtils     = initRdf[1],
      RDF           = initRdf[2],
      dsource       = initRdf[3],
      resEnum       = RDFC.GetElements(),
      res,
      mappingsArray = [];
    while (resEnum.hasMoreElements()) {
      res = resEnum.getNext().QueryInterface(Ci.nsIRDFResource);
      mappingsArray.push({
        urn:         res.Value,
        type:        _getRdfPropertyValue(res, "type", RDF, dsource),
        name:        _getRdfPropertyValue(res, "name", RDF, dsource),
        cmd:         _getRdfPropertyValue(res, "cmd", RDF, dsource),
        se:          _getRdfPropertyValue(res, "se", RDF, dsource),
        enable:      _getRdfPropertyValue(res, "enable", RDF, dsource) === 'true',
        description: _getRdfPropertyValue(res, "description", RDF, dsource),
        version:     _getRdfPropertyValue(res, "version", RDF, dsource),
        expired:     _getRdfPropertyValue(res, "expired", RDF, dsource)
      });
    }
    return mappingsArray;
  }
  // }}} RDF functions
};


// 'dl' (download) related topics for Firefox 26 up {{{
if (Services.vc.compare(Services.appinfo.platformVersion, "26.0a") >= 0) {
  Cu.import("resource://gre/modules/Downloads.jsm");

  this.Noise.dlView = {
    onDownloadAdded: function (dl) {
      Noise.notifyObservers(dl, "noise-dl.add", null);
    },
    onDownloadChanged: function (dl) {
      var
        type = 'stop',
        data = 'stopped';
      if (!dl.stopped) {
        return;
      }
      if (dl.succeeded) {
        data = 'succeeded';
      } else if (dl.canceled) {
        data = 'canceled';
      } else if (dl.error) {
        type = 'error';
        data = dl.error.result;
      }
      Noise.notifyObservers(dl, "noise-dl." + type, data);
    },
    onDownloadRemoved: function (dl) {
      Noise.notifyObservers(dl, "noise-dl.remove", null);
    }
  };

  this.Noise.observeDownloads = function () {
    Downloads.getList(Downloads.PUBLIC).then(
      function onFulfill (list) {
        list.addView(Noise.dlView);
      }
    ).then(null, Components.utils.reportError);
  };

  this.Noise.observeDownloads();
};
// }}} 'dl' (download) related topics for Firefox 26 up


// data wrap/unwrap {{{
if (typeof JSON === 'object' && Array.isArray) {
  Noise.wrap = function (obj, props) {
    if (Array.isArray(obj)) {
      obj = obj.reduce(function (hash, value, index) {
        hash[index.toString()] = value;
        return hash;
      }, {});
    }
    if (!props) {
      props = Object.keys(obj);
    }
    return JSON.stringify(
      props.reduce(function (hash, prop) {
        hash[prop] = obj[prop];
        return hash;
      }, {})
    );
  };

  Noise.unwrap = function (json) {
    return JSON.parse(json);
  };
}
// }}} data wrap/unwrap


// logging utility {{{
const consoleJSM = Cu.import("resource://gre/modules/devtools/Console.jsm", {});
if (consoleJSM.console) {
  Noise.console = consoleJSM.console;
  Noise.log = function () {
    this.console.log.apply(this, arguments);
    this.notifyObservers(null, "noise-log", this.wrap(arguments));
  };
} else {
  Noise.log = function (aMessage) {
    Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage("Noise: " + aMessage);
    this.notifyObservers(null, "noise-log", aMessage);
  };
}
// }}} logging utility

this.Noise.init();
