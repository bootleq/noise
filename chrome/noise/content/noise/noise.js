/*jslint bitwise: false, evil: true*/
/*global Noise: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!Noise) {
  var Noise = {};
}

Noise = {

  obsSvc: null,
  player: null,
  mappings: [],
  observers: [],
  listeners: [],
  enabled: false,

  init: function () {
    this.player = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
    this.player.init();
    this.mappings = this.loadRdf();
    this.obsSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    this.prefs2 = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.base = this.getBase();

    this.addNotifiers();
    this.addObservers();

    this.prefs2.addObserver("extensions.noise.", this.prefObserver, false);
  },

  prefObserver: {
    observe: function (aSubject, aTopic, aData) {
      if (aTopic === 'nsPref:changed' && aData === 'extensions.noise.enabled') {
        Noise.enabled = Noise.prefs.getBoolPref("extensions.noise.enabled");
      }
    }
  },

  uninit: function () {
    this.player = null;
    this.removeProgressListener();
    this.removeObservers();
    this.mappings = null;
    this.observers = null;
    this.listeners = null;
    this.prefs2.removeObserver("extensions.noise.", this.prefObserver);
  },

  reset: function () {
    this.removeProgressListener();
    this.removeObservers();
    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.mappings = [];
    this.observers = [];
    this.listeners = [];
    this.mappings = this.loadRdf();
    this.addProgressListener();
    this.addObservers();
  },

  toggle: function () {
    this.enabled = !this.enabled;
    this.prefs.setBoolPref("extensions.noise.enabled", this.enabled);
  },

/* start of overwrite code {{{ */

  addNotifiers: function () {

    if (!('toggleSidebar' in window)) {
      return;
    }

    // overwrite "toggleSidebar", see chrome/browser/content/browser/browser.js
    // notify with topic "noise-toggleSidebar"
    if ('toggleSidebar' in window) {
      Noise.toggleSidebarWithoutNoise = window.toggleSidebar;
      Noise.toggleSidebarWithNoise = function (commandID, forceOpen) {
        var obsSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        obsSvc.notifyObservers(null, "noise-toggleSidebar", commandID);
        return Noise.toggleSidebarWithoutNoise.call(window, commandID, forceOpen);
      };
      window.toggleSidebar = Noise.toggleSidebarWithNoise;
    }

    // overwrite _updateStatusUI, see chrome/tookit/content/global/content/bindings/findbar.xml
    // notify with topic "noise-TypeAheadFind.FIND_WRAPPED"
    if (!('gFindBar' in window)) {
      gFindBar = document.getElementById('FindToolbar');
    }
    if (gFindBar && '_updateStatusUI' in gFindBar) {
      gFindBar._updateStatusUIWithoutNoise = gFindBar._updateStatusUI;
      gFindBar._updateStatusUIWithNoise = function (res, aFindPrevious) {
        if (res === gFindBar.nsITypeAheadFind.FIND_WRAPPED) {
          var obsSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
          obsSvc.notifyObservers(null, "noise-TypeAheadFind.FIND_WRAPPED", aFindPrevious);
        }
        return gFindBar._updateStatusUIWithoutNoise.call(gFindBar, res, aFindPrevious);
      };
      gFindBar._updateStatusUI = gFindBar._updateStatusUIWithNoise;
    }

    // notify with topic "noise-WebProgress-start", "noise-WebProgress-stop", "noise-WebProgress-locationChange"
    if ('tabContainer' in gBrowser) {
      gBrowser.tabContainer.addEventListener("TabOpen", this.onTabOpen, false);
      gBrowser.tabContainer.removeEventListener("TabClose", this.onTabClose, false);
    }
    this.addProgressListener();

  },
  addProgressListener: function () {
    if ('gBrowser' in window) {
      gBrowser.addProgressListener(this.progListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    }
  },
  removeProgressListener: function () {
    if ('gBrowser' in window) {
      gBrowser.removeProgressListener(this.progListener);
    }
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

/* }}} end of overwrite code */


  addObservers: function () {
    this.mappings.forEach(function (i) {
      if (! i.enable || i.cmd === '') {
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
        if (typeof this.observers[i.urn] === "undefined" || ! this.observers[i.urn]) {
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

  getSound: function (url, base) {
    if (url === 'beep' || url.indexOf(':') > 2) {
      return url;
    }

    var
      ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
      file = null;

    if (url.search(/:\\|^\//) === -1) {  // relative path
      if (base.path.indexOf('/') >= 0) {
        url = '/' + url.replace('\\', '/');
      }
      else {
        url = '\\' + url.replace('/', '\\');
      }
      url = base.path + url;
    }

    try {   // absolute path
      file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(url);
      if (! file.exists()) {
        return null;
      }
      return ios.newFileURI(file);
    } catch (e) {  // chrome url
      try {
        if (url === "") {
          return null;
        }
        return ios.newURI(url, null, null);   // currently, without existence testing
      } catch (e2) {
        dump("\nNoise:" + e2);
        return null;
      }
    }
  },

  play: function (url) {
    var
      base  = arguments.length > 1 ? arguments[1] : this.base,
      force = arguments.length > 2 ? arguments[2] : false;

    if (force || Noise.enabled) {
      if (url === 'beep') {
        Noise.player.beep();
      } else if (url.indexOf(':') > 2) {
        if (url.indexOf('event:') === 0) {
          Noise.player.playEventSound(Noise.player[url.substr(6)]);
        } else if (url.indexOf('sys:') === 0) {
          Noise.player.playSystemSound(url.substr(4));
        }
      } else {
        Noise.player.play(Noise.getSound(url, base));
      }
    }
  },

  log: function (aMessage) {
    Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("Noise: " + aMessage);
    Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).notifyObservers(null, "noise-log", aMessage);
  },

  getRdfFile: function (type) {
    var
      profD = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile),
      rdfFile = profD.clone(),
      defaultFile;

    rdfFile.append("noise-mappings.rdf");
    if (! rdfFile.exists() || type === 'default') {
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

    if (rdfFile.exists() && ! rdfFile.isWritable()) {
      if (rdfFile.permissions === 256) {
        rdfFile.permissions = 384;   // 384 for ubuntu readable/writable
      }
    }

    return rdfFile;
  },

  initRdf: function (rdfFile) {
    const RDFC = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
    const RDFCUtils = Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils);
    const RDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService);
    var
      fileURI,
      dsource,
      rootnode;
    if (!rdfFile) {
      rdfFile = this.getRdfFile();
    }

    fileURI = Components.classes['@mozilla.org/network/protocol;1?name=file']
                .getService(Components.interfaces.nsIFileProtocolHandler).getURLSpecFromFile(rdfFile);
    dsource = RDF.GetDataSourceBlocking(fileURI);
    rootnode = RDF.GetResource("urn:mappings:root");
    try {
      RDFC.Init(dsource, rootnode);
    } catch (e) {
      RDFCUtils.MakeSeq(dsource, rootnode);
      RDFC.Init(dsource, rootnode);
    }
    return [ RDFC, RDFCUtils, RDF, dsource ];
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
      res = resEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
      mappingsArray.push({
        urn:         res.Value,
        type:        this._getRdfPropertyValue(res, "type", RDF, dsource),
        name:        this._getRdfPropertyValue(res, "name", RDF, dsource),
        cmd:         this._getRdfPropertyValue(res, "cmd", RDF, dsource),
        se:          this._getRdfPropertyValue(res, "se", RDF, dsource),
        enable:      this._getRdfPropertyValue(res, "enable", RDF, dsource) === 'true',
        description: this._getRdfPropertyValue(res, "description", RDF, dsource),
        version:     this._getRdfPropertyValue(res, "version", RDF, dsource)
      });
    }
    return mappingsArray;
  },

  _getRdfPropertyValue: function (aRes, aProp, aRDF, aDsource) {
    aProp = aRDF.GetResource("http://www.bootleq.com/noise-mappings#" + aProp);
    try {
      var target = aDsource.GetTarget(aRes, aProp, true);
      return target ? target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value : null;
    }
    catch (ex) {
      return null;
    }
  },

  getRdfArray: function ()
  {
    return this.mappings;
  },

  getBase: function ()
  {
    var
      file = null,
      defaultFile;
    try {
      file = this.prefs.getComplexValue("extensions.noise.base", Components.interfaces.nsILocalFile);
      if (file.isDirectory()) {
        return file;
      }
    } catch (e) {}

    // use default base path
    defaultFile = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    defaultFile.append("noise");
    if (! defaultFile.exists() || ! defaultFile.isDirectory()) {
      defaultFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
    }
    this.prefs.setComplexValue("extensions.noise.base", Components.interfaces.nsILocalFile, defaultFile);
    return defaultFile;
  },
  setBase: function (file) {
    this.prefs.setComplexValue("extensions.noise.base", Components.interfaces.nsILocalFile, file);
    this.base = file;
  }

};

window.addEventListener("load", function () {
  Noise.init();
}, false);
window.addEventListener("unload", function () {
  Noise.uninit();
}, false);
