(function(){
  
  const TYPE_SEPARATOR = 0;
  const TYPE_OBSERVER = 1;
  const TYPE_BROWSER = 2;
  const TYPE_WINDOW = 3;
  
  var
    ret = window.arguments[0],
    elemName,
    elemCmd,
    elemSe,
    seBackup = '',
    seBackupRel = '',
    elemUseRel,
    elemChangeBase,
    elemPickFromBase,
    elemTest,
    stringBundle = null,
    basePath = null;
  
  var NoiseEdit = {
  
    init: function()
    {
      elemName = document.getElementById("noiseName");
      elemCmd = document.getElementById("noiseCommand");
      gType = document.getElementById("noiseType");
      elemSe = document.getElementById("noiseFile");
      elemUseRel = document.getElementById("noiseUseRelative");
      elemChangeBase = document.getElementById("noiseChangeBase");
      elemOpenBase = document.getElementById("noiseOpenBase");
      elemTest = document.getElementById("noiseTest");
      elemPick = document.getElementById("noisePick");
      stringBundle = document.getElementById("noise-string-bundle");
      basePath = ret.base;
      
      if( ret.type == TYPE_SEPARATOR ) {
        elemName.value = ret.name;
        elemCmd.disabled = true;
        gType.disabled = true;
        elemSe.disabled = true;
        elemUseRel.disabled = true;
        elemTest.disabled = true;
        elemPick.disabled = true;
        document.getElementById("se-error").hidden = true;
      }
      else {
        elemName.value = ret.name=="" ? stringBundle.getString("item_unnamed") : ret.name;
        elemCmd.value = ret.cmd;
        gType.selectedIndex = ret.type-1;
        if(ret.se=="") {elemSe.value = "beep";}
        else {elemSe.value = ret.se; this.testSoundExist();}
      }
      
      if( elemSe.value!='beep' && ( elemSe.value.search(/:\\|^\//) == -1 ) ) { // relative path
        seBackupRel = elemSe.value;
        elemUseRel.click();
      }
    },
    
    accept: function()
    {
      if( ret.type != TYPE_SEPARATOR && !this.testSoundExist() ) {
        return false;
      }
      ret.name = elemName.value;
      ret.cmd = elemCmd.value;
      ret.type = ret.type== TYPE_SEPARATOR ? TYPE_SEPARATOR : gType.selectedIndex + 1;
      ret.se = elemSe.value;
      ret.accepted = true;
      ret.base = basePath;
      return true;
    },
    
    pickFile: function()
    {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      var base = basePath;
      if(elemUseRel.checked){ fp.displayDirectory = base; }
      fp.init(window, stringBundle.getString("edit_pickfile"), nsIFilePicker.modeOpen);
      fp.appendFilter(".wav","*.wav");
      var rv = fp.show();
      if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        var path = fp.file.path;
        
        if(elemUseRel.checked) { // relative path
          if(path.indexOf(base.path)!=0) {   // path out of base
            var newBase = fp.file.parent || fp.file;
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
            var confirmTxt = [
                              stringBundle.getString("edit_base_change_confirm"), '\n\n',
                              stringBundle.getString("edit_base_change_confirm_from"), ': ', base.path, '\n',
                              stringBundle.getString("edit_base_change_confirm_to"), ': ', newBase.path
                            ].join('');
            if( ! prompts.confirm(null, stringBundle.getString("edit_base_title"), confirmTxt) ) return;
            base = basePath = newBase;
          }
          path = path.replace(base.path,'').substr(1);
        }
        
        elemSe.value = seBackupRel = path;
        this.testSoundExist();
      }
    },
    
    testSoundExist: function()
    {
      if( elemSe.value=="" ) { elemTest.disabled = true; Noise.play('beep'); return false; }
      if( elemSe.value=='beep' ) { elemTest.disabled = false; document.getElementById("se-error").hidden = true; return true; }
      try {
        if(elemSe.value.indexOf("chrome")==0){ Noise.play(elemSe.value); }
        else if(Noise.getSound(elemSe.value, basePath)==null) {
          elemTest.disabled=true;
          elemSe.select();
          Noise.play('beep');
          document.getElementById("se-error").hidden = false;
          return false;
        }
        elemTest.disabled = false;
        document.getElementById("se-error").hidden = true;
        return true;
      } catch(e) {
        document.getElementById("se-error").hidden = false;
        elemTest.disabled = true;
        elemSe.focus();
        elemSe.select();
        Noise.play('beep');
        return false;
      }
    },
    
    testSound: function()
    {
      if(elemSe.value=='beep') Noise.player.beep();
      else {
        var path = elemSe.value;
        
        if( path.search(/:\\|^\//) == -1 ) {  // relative path
          if(basePath.path.indexOf('/')>=0) { path = path.replace('\\','/'); }
          else { path = path.replace('/','\\'); }
        }
        
        Noise.player.play( Noise.getSound(path, basePath) );
      }
    },
    
    
    toggleRelativePath: function()
    {
      if( elemUseRel.checked ) {
        elemChangeBase.disabled = elemOpenBase.disabled = false;
        seBackup = elemSe.value;
        
        if( seBackupRel=='' || seBackupRel==seBackup ) {
          if(elemSe.value.indexOf(basePath.path)==0)
          elemSe.value = seBackupRel = elemSe.value.replace(basePath.path,'').substr(1);
        }
        else elemSe.value = seBackupRel;
      }
      else {
        elemChangeBase.disabled = elemOpenBase.disabled = true;
        if( ( seBackup.search(/:\\|^\//) == -1 ) && seBackup!='beep' ) {
          elemSe.value = seBackup = basePath.path + ( basePath.path.indexOf('/')>=0 ? '/' : '\\' ) + seBackup;
        }
        else elemSe.value = seBackup;
      }
      this.testSoundExist();
    },
    changeBaseDir: function()
    {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.displayDirectory = basePath;
      fp.init(window, stringBundle.getString("edit_pickbase"), nsIFilePicker.modeGetFolder);
      var rv = fp.show();
      if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        basePath = fp.file;
      }
      this.testSoundExist();
    },
    openBaseDir: function()
    {
  		var dir = basePath;
  		try{
        dir.reveal();
  		} catch(ex) {
        var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
  		  var dirURI = ios.newFileURI( dir );
  		  var protocolService = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
      					.getService(Components.interfaces.nsIExternalProtocolService);
  			protocolService.loadUrl(dirURI);
  		}
  	}
  
  };
  
  Noise.NoiseEdit = NoiseEdit;
  window.addEventListener("load", function(){ Noise.NoiseEdit.init(); }, false);

})();
