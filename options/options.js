'use strict';

let gSounds = {};
let gEvents = {};
let gLoaded = [];
let gPermissions = [];

let $save   = document.querySelector('#save');
let $import = document.querySelector('#import');
let $export = document.querySelector('#export');

class Sounds { // {{{
  constructor(el) {
    this.$el   = el;
    this.$list = this.$el.querySelector('ul.list');
    this.tmpl  = this.$el.querySelector('template').content;

    this._$selected = null;
    this._observers = {};
    this.$addSound = this.$el.querySelector('.add_sound');

    this.$list.addEventListener('click', this.onSelect.bind(this));
    this.$addSound.addEventListener('click', () => this.addSound());
    this.load();
  }

  addObserver(topic, func) {
    if (!(topic in this._observers)) {
      this._observers[topic] = [];
    }
    this._observers[topic].push(func);
  }
  notifyObservers(topic, data) {
    if (topic in this._observers) {
      this._observers[topic].forEach((observer) => {
        observer(data);
      });
    }
  }

  async load() {
    browser.storage.local.get({sounds: []}).then(items => {
      for (let cfg of items['sounds']) {
        this.addSound(cfg);
      };
      gLoaded.push('sounds');
      this.notifyObservers('load');
    });
  }

  clear() {
    this.$list.querySelectorAll('ul > li:not(.add_sound)').forEach(node => {
      node.remove();
    });
    emptyObject(gSounds);
  }

  render($item) {
    let sound = gSounds[$item.dataset.soundId];
    let $name = $item.querySelector('.name span');
    $name.textContent = sound.name;
    shrinkFont($name);
  }

  onSelect(e) {
    let $li = e.target.closest('.list li');
    if ($li !== this.$addSound) {
      this.$selected = $li;
    }
  }

  set $selected(v) {
    if (this._$selected) {
      this._$selected.classList.remove('current');
    }
    this._$selected = v;
    if (this._$selected) {
      this._$selected.classList.add('current');
    }
    this.notifyObservers('select', v);
  }

  get $selected() {
    return this._$selected;
  }

  delete() {
    let sound = gSounds[this.$selected.dataset.soundId];
    delete gSounds[sound.id];
    this.$selected.remove();
    this.$selected = null;
  }

  accept() {
    this.render(this.$selected);
    this.$selected = null;
  }

  move(direction) {
    let el = this.$selected;
    if (direction === 'back') {
      if (el.previousElementSibling) {
        el.parentNode.insertBefore(el, el.previousElementSibling);
      } else {
        el.parentNode.insertBefore(el, this.$addSound);
      }
    } else {
      if (el.nextElementSibling && el.nextElementSibling != this.$addSound) {
        el.parentNode.insertBefore(el, el.nextElementSibling.nextElementSibling);
      } else {
        el.parentNode.insertBefore(el, el.parentNode.firstElementChild);
      }
    }
  }

  addSound(config) {
    let sound = new Sound(config);
    let tmpl  = document.importNode(this.tmpl, true);

    gSounds[sound.id] = sound;
    tmpl.querySelector('li').dataset.soundId     = sound.id;
    tmpl.querySelector('.name span').textContent = sound.name;
    this.$list.insertBefore(tmpl, this.$addSound);
    this.render(this.$addSound.previousElementSibling);
  }
}
// }}}

class SoundDetail { // {{{
  constructor(el) {
    this.$el           = el;
    this.$uploadBox    = this.$el.querySelector('.upload');
    this.$playerBox    = this.$el.querySelector('.player');
    this.$upload       = this.$el.querySelector('.upload label');
    this.$file         = this.$el.querySelector('input[type="file"]');
    this.$name         = this.$el.querySelector('input.name');
    this.$filename     = this.$el.querySelector('.filename');
    this.$audio        = this.$el.querySelector('audio');
    this.$change       = this.$el.querySelector('button.change');
    this.$cancelUpload = this.$el.querySelector('button.cancel_upload');
    this.$warning      = this.$el.querySelector('.player .warning');
    this.$ctrls        = this.$el.querySelector('.ctrls');
    this.$accept       = this.$el.querySelector('button.accept');

    this._observers = {};

    this._initialUpload();
    this.$change.addEventListener('click',       () => this.toggleUploadUI());
    this.$cancelUpload.addEventListener('click', () => this.toggleUploadUI());

    this.$name.addEventListener('input', this.validate.bind(this));
    this.$name.addEventListener('keydown', this.onKey.bind(this));
    this.$ctrls.addEventListener('click', this.onCtrl.bind(this));
  }

  attach($sound) {
    if (!$sound) {
      this.$el.disabled = true;
      return;
    }
    this.$el.disabled = false;
    this.$selected = $sound;

    let sound = gSounds[$sound.dataset.soundId];
    if (!sound.src) {
      sound.loadSrc().then(src => {
        sound.src = src;
        this.render();
      });
    } else {
      this.render();
    }
  }

  addObserver(topic, func) {
    if (!(topic in this._observers)) {
      this._observers[topic] = [];
    }
    this._observers[topic].push(func);
  }
  notifyObservers(topic, data) {
    if (topic in this._observers) {
      this._observers[topic].forEach((observer) => {
        observer(data);
      });
    }
  }

  toggleUploadUI(toggle) {
    if (toggle === undefined) {
      toggle = this.$uploadBox.classList.contains('hidden');
    }
    this.$cancelUpload.classList.toggle('hidden', !!!this.$audio.currentSrc);
    this.$uploadBox.classList.toggle('hidden', !!!toggle);
    this.$playerBox.classList.toggle('hidden',  !!toggle);
  }

  onDrag(e) {
    e.preventDefault();
    let $drop = e.target.closest('.droppable');

    switch (e.type) {
    case 'dragover':
      $drop.classList.add('dragover');
      break;
    default:
      $drop.classList.remove('dragover');
    }
  }

  onFile(e) {
    let file, msg;
    e.stopPropagation();
    e.preventDefault();

    if (e.type === 'drop') {
      this.$file.files = e.dataTransfer.files;
    }

    file = this.$file.files[0];
    this.$filename.textContent = file ? file.name : '';
    if (!this.$name.value.length && file) {
      this.$name.value = file.name;
    }

    if (this.$audio.canPlayType(file.type) === '') {
      msg = browser.i18n.getMessage('options_warning_unsupportedMedia', file.type);
      this.$warning.innerHTML = msg;
    } else {
      this.$warning.textContent = '';
    }

    fileToDataURL(file).then(src => {
      this.$audio.src = src;
      this.$cancelUpload.classList.remove('hidden');
      this.toggleUploadUI(false);
      setTimeout(this.validate.bind(this)); // currentSrc not updated immediately
    })
    .catch(e => {
      this.toggleUploadUI(true);
    });
  }

  onPlay(e) {
    this.$audio.currentTime = 0;
    this.$audio.play();
  }

  onKey(e) {
    switch (e.key) {
    case 'Enter':
      return this.accept();
    case 'Escape':
      return this.attach();
    }
  }

  onCtrl(e) {
    let $btn = e.target.closest('button');

    switch (true) {
      case $btn.matches('.accept'):
        this.accept();
        break;

      case $btn.matches('.cancel'):
        this.attach();
        break;

      case $btn.matches('.delete'):
        this.notifyObservers('delete');
        this.attach();
        break;

      case $btn.matches('.move-back'):
        this.notifyObservers('move', 'back');
        break;

      case $btn.matches('.move-next'):
        this.notifyObservers('move', 'next');
        break;
    }
  }

  accept() {
    let sound = gSounds[this.$selected.dataset.soundId];
    sound.name  = this.$name.value;
    sound.src   = this.$audio.src;
    sound.audio = null;
    this.notifyObservers('accept');
  }

  validate() {
    if (this.$name.value.length && this.$audio.currentSrc) {
      this.$accept.disabled = false;
      return;
    }
    this.$accept.disabled = true;
  }
  
  render() {
    if (this.$selected) {
      let sound = gSounds[this.$selected.dataset.soundId];
      this.$name.value = sound.name || '';
      this.$audio.src  = sound.src || '';
      this.toggleUploadUI(!sound.src);
      setTimeout(this.validate.bind(this)); // currentSrc not updated immediately
    } else {
      this.$name.value = '';
      this.$upload.classList.remove('hidden');
    }
    this.$filename.textContent = '';
  }

  _initialUpload() {
    preventDefaultDrag(window);

    let u = this.$upload;
    u.addEventListener('dragover', this.onDrag);
    u.addEventListener('dragleave', this.onDrag);
    u.addEventListener('drop', this.onDrag);
    u.addEventListener('drop', this.onFile.bind(this));
    u.addEventListener('change', this.onFile.bind(this));

    let p = this.$playerBox;
    p.addEventListener('dragover', this.onDrag);
    p.addEventListener('dragleave', this.onDrag);
    p.addEventListener('drop', this.onDrag);
    p.addEventListener('drop', this.onFile.bind(this));
  }
}
// }}}

class Events { // {{{
  constructor(el) {
    this.$el    = el;
    this.$list  = this.$el.querySelector('tbody');
    this.tmpl   = this.$el.querySelector('template').content;
    this.$menus = {
      types:  document.querySelector('#menus .types'),
      sounds: document.querySelector('#menus .sounds')
    };

    this._$selected = null;
    this._observers = {};
    this.$addEvent = this.$el.querySelector('button.add_event');

    this.editing = null;
    this._before = {};

    this.initMenus();
    this.$list.addEventListener('click', this.onSelect.bind(this));
    this.$addEvent.addEventListener('click', () => this.addEvent());
    this.$el.addEventListener('click', this.onOuterSelect.bind(this));
    this.load();
  }

  addObserver(topic, func) {
    if (!(topic in this._observers)) {
      this._observers[topic] = [];
    }
    this._observers[topic].push(func);
  }
  notifyObservers(topic, data) {
    if (topic in this._observers) {
      this._observers[topic].forEach((observer) => {
        observer(data);
      });
    }
  }

  async load() {
    browser.storage.local.get({events: []}).then(items => {
      for (let config of items['events']) {
        this.addEvent(config);
      };
      gLoaded.push('events');
      this.notifyObservers('load');
    });
  }

  clear() {
    this.$list.innerHTML = '';
    emptyObject(gEvents);
  }

  initMenus() {
    let html = Object.entries(EventSetting.Types).reduce((s, kv) => {
      let perms = EventSetting.t('permissions', kv[0]);
      let permProp = perms.length ? `data-permissions='${JSON.stringify(perms)}'` : '';
      return s + `<li data-value="${kv[0]}" ${permProp}>${kv[1].name}</li>`;
    }, '');
    this.$menus.types.innerHTML = html;
    this.updateEventMenu();
    this.$menus.types.addEventListener('click', this.onSelectType.bind(this));

    this.$menus.sounds.addEventListener('click', this.onSelectSound.bind(this));
  }

  updatePermissions() {
    this.updateEventMenu();
    this.$list.querySelectorAll('tr[data-permissions]').forEach($row => {
      let perms = JSON.parse($row.dataset.permissions);
      let missing = arrayDiff(perms, gPermissions).length;
      let $type = $row.querySelector('td.e-type');
      $row.classList.toggle('missing-permissions', missing);
      if (missing) {
        $type.title = browser.i18n.getMessage('options_title_warning_eventForbidden');
      } else {
        $type.removeAttribute('title');
      }
    });
  }

  updateEventMenu() {
    this.$menus.types.querySelectorAll('li[data-permissions]').forEach(el => {
      let perms = JSON.parse(el.dataset.permissions);
      el.classList.toggle('missing-permissions', arrayDiff(perms, gPermissions).length);
    });
  }

  updateSoundMenu() {
    this.$menus.sounds.innerHTML = '';
    Object.values(gSounds).forEach(s => {
      let $li = document.createElement('li');
      $li.dataset.value = s.id;
      $li.textContent = s.name;
      this.$menus.sounds.appendChild($li);
    });
  }

  render($row) {
    let data     = $row.dataset;
    let options  = JSON.parse(data.options);
    let sound    = gSounds[data.soundId];
    let $sound   = $row.querySelector('.e-sound');
    let $options = $row.querySelector('.e-options');

    $row.querySelector('.e-type').textContent = EventSetting.t('type', data.type);
    $options.classList.toggle('unavailable', Object.keys(options).length === 0);
    if (Object.keys(options).length === 0) {
      $options.textContent = ' - - ';
    }

    $sound.classList.toggle('not-set', !!!sound);
    $sound.textContent = sound ? sound.name : browser.i18n.getMessage('options_event_soundNotSet');
    $row.querySelector('button.play').disabled = !!!sound;
  }

  onSelect(e) {
    let $target = e.target;
    let $row    = $target.closest('tr');
    let sound   = gSounds[$row.dataset.soundId];
    let $cell;

    if ($target.matches('.e-toggle input')) {
      gEvents[$row.dataset.eventId].enabled = $target.checked;
    }

    if (this.editing) {
      switch (true) {
        case $target.matches('button.edit'):
          this.toggleEdit($row);
          break;

        case $target.matches('button.play'):
          if (sound) {
            sound.play();
          }
          break;

        case $target.matches('button.cancel'):
          this.cancelEdit($row);
          break;

        default:
          $cell = $target.closest('.current td');
          if ($cell) {
            this.toggleMenu($cell);
          }
          break;
      }
      return;
    }

    switch (true) {
    case $target.matches('button'):
      switch (true) {
        case $target.matches('.edit'):
          this.$selected = $row;
          this.toggleEdit($row);
          break;

        case $target.matches('.play'):
          if (sound) {
            sound.play();
          }
          break;

        case $target.matches('.move-up'):
          if ($row.previousElementSibling) {
            $row.parentNode.insertBefore($row, $row.previousElementSibling);
          } else {
            $row.parentNode.appendChild($row);
          }
          break;

        case $target.matches('.move-down'):
          if ($row.nextElementSibling) {
            if ($row.nextElementSibling.nextElementSibling) {
              $row.parentNode.insertBefore($row, $row.nextElementSibling.nextElementSibling);
            } else {
              $row.parentNode.appendChild($row);
            }
          } else {
            $row.parentNode.insertBefore($row, $row.parentNode.firstElementChild);
          }
          break;

        case $target.matches('.delete'):
          this.delete($row);
          break;
      }
      return;
    }

    this.$selected = $target.closest('tr');
  }

  onOuterSelect(e) {
    let $target = e.target;
    if (this.editing || $target.closest('#events tbody') || $target.tagName === 'BUTTON') {
      return;
    }
    this.$selected = null;
  }

  set $selected(v) {
    if (this._$selected) {
      this._$selected.classList.remove('current');
    }
    this._$selected = v;
    if (this._$selected) {
      this._$selected.classList.add('current');
    }
    this.notifyObservers('select', v);
  }

  get $selected() {
    return this._$selected;
  }

  delete($row) {
    delete gEvents[$row.dataset.eventId]
    $row.remove();
  }

  toggleEdit($row) {
    this.$list.classList.toggle('editing', !!!this.editing);

    if (this.editing) {
      let data = this.$selected.dataset;
      this.editing.type    = data.type;
      this.editing.options = JSON.parse(data.options);
      this.editing.soundId = data.soundId;
      this.editing = null;
      Object.values(this.$menus).forEach(el => el.style.display = 'none');
    } else {
      this.editing = gEvents[$row.dataset.eventId];
      this._before = JSON.stringify(this.editing);
    }
  }

  cancelEdit($row) {
    this.$list.classList.remove('editing');
    this.editing = null;
    let before = JSON.parse(this._before);
    let data = this.$selected.dataset;
    data.type = before.type;
    data.options = JSON.stringify(before.options);
    data.soundId = before.soundId;
    Object.values(this.$menus).forEach(el => el.style.display = 'none');
    this.render($row);
  }

  toggleMenu($cell) {
    let $menu;

    switch (true) {
    case $cell.classList.contains('e-type'):
      $menu = this.$menus.types;
      break;

    case $cell.classList.contains('e-sound'):
      this.updateSoundMenu();
      $menu = this.$menus.sounds;
      break;

    default:
      return;
    }

    if ($menu.style.display === 'block') {
      $menu.style.display = 'none';
    } else {
      posisitionTo($menu, $cell);
      $menu.style.display = 'block';
    }
  }

  addEvent(config) {
    let e = new EventSetting(config);
    gEvents[e.id] = e;

    let tmpl = document.importNode(this.tmpl, true);
    let data = tmpl.querySelector('tr').dataset;
    let perms = EventSetting.t('permissions', e.type);
    data.eventId = e.id;
    data.type    = e.type;
    data.options = JSON.stringify(e.options);
    data.soundId = e.soundId;
    if (perms.length) {
      data.permissions = JSON.stringify(perms);
    }

    tmpl.querySelector('.e-toggle input').checked = e.enabled;
    this.$list.appendChild(tmpl);
    this.render(this.$list.lastElementChild);
  }

  onSelectType(e) {
    let $li = e.target.closest('li');
    if ($li.classList.contains('missing-permissions')) {
      return this.notifyObservers('requestPermissions', JSON.parse($li.dataset.permissions));
    }

    let value = $li.dataset.value;
    this.$selected.dataset.type = value;
    this.$menus.types.style.display = 'none';
    if (this.editing.type !== value) {
      this.$selected.dataset.options = JSON.stringify({});
    }

    let perms = EventSetting.t('permissions', value);
    if (perms.length) {
      this.$selected.dataset.permissions = perms;
    } else if ('permissions' in this.$selected.dataset) {
      delete this.$selected.dataset.permissions;
    }

    this.render(this.$selected);
  }

  onSelectSound(e) {
    let $li = e.target.closest('li');
    let value = $li.dataset.value;
    this.$selected.dataset.soundId = value;
    this.$menus.sounds.style.display = 'none';
    this.render(this.$selected);
  }
}
// }}}

class Permissions { // {{{
  constructor(el) {
    this.$el = el;
    this._observers = {};
    this.bindCheckboxHandler();
    this.bindCloseBtnHandler();
  }

  addObserver(topic, func) {
    if (!(topic in this._observers)) {
      this._observers[topic] = [];
    }
    this._observers[topic].push(func);
  }
  notifyObservers(topic, data) {
    if (topic in this._observers) {
      this._observers[topic].forEach((observer) => {
        observer(data);
      });
    }
  }

  update() {
    this.$el.querySelectorAll('input[data-perm]').forEach($box => {
      $box.checked = gPermissions.includes($box.dataset.perm);
    });
    this.notifyObservers('update');
  }

  async request(names) {
    await browser.permissions.request({permissions: names}).then(yes => {
      if (yes) {
        gPermissions = Array.from(new Set([...gPermissions, ...names]));
        browser.runtime.sendMessage({type: 'listeners'});
        this.update();
      }
    });
  }

  async revoke(names) {
    browser.runtime.sendMessage({type: 'listeners', action: 'unbind'});
    await browser.permissions.remove({permissions: names}).then(yes => {
      if (yes) {
        gPermissions = arrayDiff(gPermissions, names);
        browser.runtime.sendMessage({type: 'listeners'});
        this.update();
      } else {
        browser.runtime.sendMessage({type: 'listeners'});
      }
    });
  }

  toggleDialog($btn) {
    if (this.$el.classList.contains('hidden')) {
      this.$el.style.visibility = 'hidden';
      this.$el.classList.remove('hidden');
      let btnRect = $btn.getBoundingClientRect();
      let boxRect = this.$el.getBoundingClientRect();
      this.$el.style.top = (btnRect.top - boxRect.height - 10) + 'px';
      this.$el.style.visibility = 'visible';
    } else {
      this.$el.classList.add('hidden');
    }
  }

  bindCheckboxHandler() {
    this.$el.addEventListener('click', e => {
      let $target = e.target;
      if ($target.tagName === 'INPUT') {
        e.preventDefault();
        if ($target.checked) {
          this.request([$target.dataset.perm]);
        } else {
          this.revoke([$target.dataset.perm]);
        }
      }
    });
  }

  bindCloseBtnHandler() {
    this.$el.querySelector('button').addEventListener('click', () => this.toggleDialog());
  }
}
// }}}

// {{{
async function currentConfig() {
  let config = {};

  config['sounds'] = Array.from(document.querySelectorAll('#sounds ul > li:not(.add_sound)')).reduce((list, $i) => {
    let sound = gSounds[$i.dataset.soundId];
    if (sound) {
      list.push(sound.toPersistedProps());
    }
    return list;
  }, []);

  config['events'] = Array.from(document.querySelectorAll('#events tbody tr')).reduce((list, $i) => {
    let event = gEvents[$i.dataset.eventId];
    if (event) {
      list.push(event.toPersistedProps());
    }
    return list;
  }, []);

  for (let i of Object.values(gSounds)) {
    if (!i.src) {
      i.src = await i.loadSrc();
    }
  }
  Object.values(gSounds).forEach(i => config[`src.${i.id}`] = i.src);
  return Promise.resolve(config);
}

async function save() {
  let config = await currentConfig();

  let deadKeys = await browser.storage.local.get().then(items => {
    return Object.keys(items).filter(k => k.startsWith('src.') && !Object.keys(gSounds).includes(k.substr(4)));
  });
  await browser.storage.local.remove(deadKeys);

  return browser.storage.local.set(config);
}

async function exportConfig() {
  let json = JSON.stringify(await currentConfig());
  let blob = new Blob([json], { type: "text/json;charset=utf-8" });

  return browser.downloads.download({
    url: URL.createObjectURL(blob),
    filename: 'noise-config.json',
    saveAs: true
  });
}

function onImportFile(e, callback) {
  let file = e.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = () => {
      try {
        let data = JSON.parse(reader.result);
        callback(data);
      } catch (e) {
        console.log('Fail parsing import file.', e);
        callback();
      }
    };
    reader.readAsText(file);
  }
}

function onLoad() {
  if (gLoaded.length === 2) {
    $save.disabled = false;
    $import.disabled = false;
    $export.disabled = false;
  }
}
// }}}

async function init() {
  document.title = browser.i18n.getMessage('optionPageTitle');
  translateDOM();

  gPermissions = await browser.permissions.getAll().then(result => result.permissions);

  let sounds      = new Sounds(document.querySelector('#sounds'));
  let soundDetail = new SoundDetail(document.querySelector('#sound_detail'));
  let events      = new Events(document.querySelector('#events'));
  let permissions = new Permissions(document.querySelector('#permissions'));

  let $importFile = document.querySelector('#import-file');
  let $saved      = document.querySelector('#main-ctrls .info');
  let $permsBtn   = document.querySelector('#review-permission');

  sounds.addObserver('select', soundDetail.attach.bind(soundDetail));

  soundDetail.render();
  soundDetail.addObserver('accept', sounds.accept.bind(sounds));
  soundDetail.addObserver('delete', sounds.delete.bind(sounds));
  soundDetail.addObserver('move',   sounds.move.bind(sounds));

  sounds.addObserver('load', onLoad);
  events.addObserver('load', onLoad);
  events.addObserver('load', permissions.update.bind(permissions));
  events.addObserver('requestPermissions', permissions.request.bind(permissions));
  permissions.addObserver('update', events.updatePermissions.bind(events))

  $save.addEventListener('click', () => {
    $save.disabled = true;
    $saved.className = 'info';

    save().then(() => {
      $save.disabled = false;
      $saved.classList.add('success');
    })
    .catch(e => {
      console.log('fail saving config', e);
      $saved.classList.add('fail');
      $save.disabled = false;
    });
  });

  $export.addEventListener('click', exportConfig);

  $import.addEventListener('click', () => $importFile.click());
  $importFile.addEventListener('change', (e) => {
    onImportFile(e, (newConfig) => {
      if (newConfig) {
        sounds.clear();
        events.clear();
        newConfig['sounds'].forEach((cfg) => {
          sounds.addSound(cfg);
          gSounds[cfg.id].src = newConfig[`src.${cfg.id}`];
        });
        newConfig['events'].forEach((cfg) => events.addEvent(cfg));
      } else {
        console.log('import fail');
      }
    });
  });

  $saved.addEventListener('click', () => $saved.className = 'info');

  $permsBtn.addEventListener('click', permissions.toggleDialog.bind(permissions, $permsBtn));

  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(() => {
        document.querySelectorAll('#menus ul').forEach(menu => menu.style.display = 'none');
        document.querySelector('#permissions').classList.add('hidden');
        resizeTimeout = null;
      }, 66);
    }
  });
}

window.addEventListener('DOMContentLoaded', init, {once: true});
