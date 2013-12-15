/*jslint es5: true*/
/*global NoiseOverlay: true, Components: false */
(function () {
  const {classes: Cc, interfaces: Ci, utils: Cu, manager: Cm} = Components;
  const RDF = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);
  const TYPE_SEPARATOR = 0;
  Cu.import("resource://gre/modules/Services.jsm");

  var
    ret = window.arguments[0],
    currentVersion,
    treeData = [],
    treeView,
    stringBundle,
    elemDescription = '',
    NoiseEventsGuide,
    CustomTreeView = function () {};

  NoiseEventsGuide = {

    init: function () {
      currentVersion = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).getCharPref("extensions.noise.version");

      elemDescription = document.getElementById("event-description");
      this.eventsTree = document.getElementById("eventsTree");
      treeData = Noise.loadRdf(Noise.getRdfFile('default')).filter(function (row) {
        if (row.type <= TYPE_SEPARATOR) {
          return false;
        } else if (row.expired && (Services.vc.compare(Services.appinfo.platformVersion, parseInt(row.expired, 10)) >= 0)) {
          return false;
        }
        return true;
      });
      treeData.forEach(function (row) {
        row.enable = false;
      });
      treeView = new CustomTreeView();
      this.eventsTree.view = treeView;
    },

    accept: function () {
      ret.pickedTree = treeData.filter(function (row) {
        return row.enable;
      });
      return true;
    },

    handleTreeEvent: function (event) {
      var idx;
      if (event.type === "select") {
        idx = this.eventsTree.currentIndex;
        if (idx < 0) {
          return;
        }
        elemDescription.textContent = treeData[idx].description;
      }
      if (event.type === "keypress") {
        idx = this.eventsTree.currentIndex;
        if (idx < 0) {
          return;
        }
        switch (event.which) {
        case event.DOM_VK_RETURN:
        case event.DOM_VK_SPACE:
          treeData[idx].enable = treeData[idx].enable === false;
          treeView.update();
          break;
        default:
          return;
        }
        event.preventDefault();
      }
    }

  };

  CustomTreeView.prototype = {
    update: function () {
      this._treeBoxObject.invalidate();
    },
    isContainer: function (row) {
      return false;
    },
    isSeparator: function (row) {
      return false;
    },
    isSorted: function () {
      return false;
    },
    isEditable: function (row, col) {
      return (col.id === 'treecol-enabled');
    },
    getCellText: function (row, col) {
      switch (col.id) {
      case 'treecol-name':
        return treeData[row].name;
      case 'treecol-version':
        return treeData[row].version;
      }
      return '';
    },
    getCellValue: function (row, col) {
      if (col.id === 'treecol-enabled') {
        return treeData[row].enable;
      }
      return false;
    },
    getLevel: function (row) {
      return 0;
    },
    getImageSrc: function (row, col) {
      return null;
    },
    getParentIndex: function (row) {
      return -1;
    },
    hasNextSibling: function (row, afterIndex) {
      return false;
    },
    getRowProperties: function (row, props) {},
    getCellProperties: function (row, col, properties) {
      if (col.id === 'treecol-version' && this.getCellText(row, col) === currentVersion) {
        if (properties) {
          properties.AppendElement(this.ATOM.getAtom("current-version"));
        } else {
          return "current-version";
        }
      }
      if (col.id === 'treecol-enabled') {
        if (properties) {
          properties.AppendElement(this.ATOM.getAtom("checkbox-hover-guide"));
        } else {
          return "checkbox-hover-guide";
        }
      }
    },
    getColumnProperties: function (colid, col, props) {},
    setCellText: function (row, col, value) {
      switch (col.id) {
      case 'treecol-name':
        treeData[row].name = value;
        break;
      case 'treecol-version':
        treeData[row].version = value;
        break;
      }
    },
    setCellValue: function (row, col, value) {
      treeData[row].enable = value;
      this._treeBoxObject.invalidateCell(row, col);
    },
    setTree: function (treebox) {
      this._treeBoxObject = treebox;
    },
    cycleHeader: function (col) {},
    cycleCell: function (row, col) {},
    performAction: function (action) {},
    performActionOnRow: function (action, row) {},
    performActionOnCell: function (action, row, col) {},

    _atom: null,
    _treeBoxObject: null,
    get ATOM() {
      if (! this._atom) {
        this._atom = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);
      }
      return this._atom;
    },
    get rowCount() {
      return treeData.length;
    }
  };

  NoiseOverlay.NoiseEventsGuide = NoiseEventsGuide;
  window.addEventListener("load", function () {
    NoiseOverlay.NoiseEventsGuide.init();
  }, false);

}());
