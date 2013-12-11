var EXPORTED_SYMBOLS = ["NoiseJSM"];

const {classes: Cc, interfaces: Ci, utils: Cu, manager: Cm} = Components;

prefObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic === 'nsPref:changed' && aData === 'extensions.noise.enabled') {
      NoiseJSM.enabled = NoiseJSM.prefs.getBoolPref("extensions.noise.enabled");
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


this.NoiseJSM = {
  player: null,
  enabled: false,

  init: function () {
    this.player = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    this.player.init();

    this.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    this.prefs2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
    this.prefs2.addObserver("extensions.noise.", prefObserver, false);

    this.mappings = this.loadRdf();

    this.enabled = this.prefs.getBoolPref("extensions.noise.enabled");
    this.base = this.getBase();
  },

  uninit: function () {
    this.prefs2.removeObserver("extensions.noise.", prefObserver);
  },

  toggle: function () {
    this.enabled = !this.enabled;
    this.prefs.setBoolPref("extensions.noise.enabled", this.enabled);
  },

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

  log: function (aMessage) {
    Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage("Noise: " + aMessage);
    Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "noise-log", aMessage);
  },

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
        version:     _getRdfPropertyValue(res, "version", RDF, dsource)
      });
    }
    return mappingsArray;
  }
  // }}} RDF functions
};

this.NoiseJSM.init();
