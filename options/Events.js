'use strict';

// import EventSetting from '../common/event';
// import {arrayDiff, emptyObject} from '../common/utils';
// import {posisitionTo} from './utils';

class Events {
  constructor(el) {
    this.$el    = el;
    this.$list  = this.$el.querySelector('tbody');
    this.tmpl   = this.$el.querySelector('template').content;
    this.$menus = {
      types:   document.querySelector('#menus .types'),
      sounds:  document.querySelector('#menus .sounds'),
      options: document.querySelector('#menus .options')
    };

    this._$selected = null;
    this._observers = {};
    this.$addEvent = this.$el.querySelector('button.add_event');

    this.editing = null;
    this._before = '{}';

    this.initMenus();
    this.$list.addEventListener('keydown', this.onKey.bind(this));
    this.$list.addEventListener('input', this.onInput.bind(this));
    this.$list.addEventListener('change', this.onChange.bind(this));
    this.$list.addEventListener('click', this.onSelect.bind(this));
    this.$addEvent.addEventListener('click', () => {
      let $row = this.addEvent();
      if (!this.editing) {
        this.$menus.options.style.display = 'none';
        this.$selected = $row;
        this.toggleEdit($row);
      }
    });
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
    if (this.editing) {
      let $row = this.$list.querySelector('tr.current');
      this.cancelEdit($row);
    }
    this.$list.innerHTML = '';
    emptyObject(gEvents);
  }

  initMenus() {
    Object.entries(EventSetting.Types).forEach(([key, value]) => {
      let $opt = document.createElement('option');
      let perms = EventSetting.getTypeDef(key, 'permissions');
      $opt.value = key;
      $opt.textContent = value.name;
      if (perms.length) {
        $opt.dataset.permissions = JSON.stringify(perms);
      }
      this.$menus.types.appendChild($opt);
    });
    this.updateTypeMenu();
    this.updateSoundMenu();

    this.$menus.options.addEventListener('click', this.onUpdateOptions.bind(this));
  }

  updatePermissions() {
    this.updateTypeMenu();
    this.$list.querySelectorAll('tr[data-permissions]').forEach($row => {
      let perms = JSON.parse($row.dataset.permissions || '[]');
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

  updateTypeMenu() {
    const $options = this.$menus.types.querySelectorAll('option[data-permissions]');
    const $editing = this.$selected && this.$selected.querySelector('select.types');

    $options.forEach(el => {
      let perms = JSON.parse(el.dataset.permissions || '[]');
      const missing = arrayDiff(perms, gPermissions).length;
      el.disabled = missing;
    });

    if ($editing) {
      $options.forEach(el => {
        const $match = $editing.querySelector(`option[value='${el.value}']`);
        if ($match) {
          $match.disabled = el.disabled;
        }
      });
    }
  }

  updateSoundMenu() {
    const $sounds = this.$menus.sounds;

    $sounds.innerHTML = "<option value=''></option>";
    Object.values(gSounds).forEach(s => {
      let $opt = document.createElement('option');
      $opt.value = s.id;
      $opt.textContent = s.name;
      this.$menus.sounds.appendChild($opt);
    });

    this.updateEditingSounds();
  }

  updateEditingSounds() {
    if (!this.$selected) {
      return;
    }

    const $editing = this.$selected.querySelector('td.e-sound');
    const $editingSelected = $editing && $editing.querySelector('option:checked');
    const soundId = this.editing ? this.editing.soundId : ($editingSelected && $editingSelected.value);
    const $soundSelect = this.$menus.sounds.cloneNode(true);

    if (soundId) {
      let $opt = $soundSelect.querySelector(`option[value='${soundId}']`);
      if ($opt) {
        $opt.selected = true;
      }
    }
    $editing.innerHTML = '';
    $editing.appendChild($soundSelect);
  }

  updateOptionsMenu(type, options) {
    let $menu = this.$menus.options;
    let $form = $menu.querySelector('.form');
    let $desc = $menu.querySelector('.desc');
    let props = type in options ? options[type] : {};

    $menu.dataset.type = type;
    $form.innerHTML = '';
    let tmpl  = document.querySelector(`#options_form_templates template.${type}`).content;
    tmpl = document.importNode(tmpl, true);
    tmpl.querySelectorAll('input[data-prop]').forEach($input => {
      let prop = $input.dataset.prop;
      $input.value = prop in props ? props[prop] : '';
    });
    $form.appendChild(tmpl);
    $desc.innerHTML = browser.i18n.getMessage(`event_slots_desc_${type}`);
  }

  render($row) {
    let data     = $row.dataset;
    let options  = JSON.parse(data.options);
    let sound    = gSounds[data.soundId];
    let $name    = $row.querySelector('.e-name');
    let type     = EventSetting.getTypeDef(data.type, 'name');
    let $type    = $row.querySelector('.e-type');
    let $sound   = $row.querySelector('.e-sound');

    if (!(this.editing && $row.classList.contains('current'))) {
      if (data.name) {
        $name.textContent = data.name;
      } else {
        $name.textContent = browser.i18n.getMessage('options_event_nameNotSet');
      }

      $type.textContent = type || browser.i18n.getMessage('options_event_typeNotSet');
      $sound.textContent = sound ? sound.name : browser.i18n.getMessage('options_event_soundNotSet');
    }

    this.updateOptionSlot($row, data.type);

    $name.classList.toggle('not-set', !!!data.name);

    $type.classList.toggle('not-set', !!!type);

    $sound.classList.toggle('not-set', !!!sound);
    $row.querySelector('button.play').disabled = !!!sound;
  }

  onKey(e) {
    if (!this.editing) {
      return;
    }

    let $row = e.target.closest('tr');
    switch (e.key) {
      case 'Escape':
        this.cancelEdit($row);
        break;

      case 'Enter':
        this.toggleEdit($row);
        break;
    }
  }

  onInput(e) {
    let $cell = e.target.closest('td');
    if ($cell.matches('.e-name')) {
      let $input = $cell.querySelector('input');
      $cell.classList.toggle('not-set', $input.value.length === 0);
    }
  }

  onChange(e) {
    const $target = e.target;
    if ($target.matches('td.e-type select.types')) {
      const $row = $target.closest('tr');
      this.updateOptionSlot($row, $target.value);
    }
  }

  onSelect(e) {
    let $target = e.target;
    let $button = $target.closest('button');
    let $row    = $target.closest('tr');
    let sound   = gSounds[$row.dataset.soundId];
    let $cell;

    if ($target.matches('.e-toggle input')) {
      gEvents[$row.dataset.eventId].enabled = $target.checked;
    }

    if (this.editing) {
      switch (true) {
        case $button && $button.matches('button.edit'):
          this.toggleEdit($row);
          break;

        case $button && $button.matches('button.play'):
          if (sound) {
            sound.play();
          }
          break;

        case $button && $button.matches('button.cancel'):
          this.cancelEdit($row);
          break;

        default:
          $cell = $target.closest('.current td');
          if ($cell) {
            switch (true) {
              case $cell.matches('.e-name'):
                $cell.querySelector('input').focus();
                break;

              case $cell.matches('.e-options') && $target.tagName === 'BUTTON':
                this.toggleOptionMenu($target);
                break;
            }
          }
          break;
      }
      return;
    }

    if ($button) {
      switch (true) {
        case $button.matches('.edit'):
          this.$selected = $row;
          this.toggleEdit($row);
          break;

        case $button.matches('.play'):
          if (sound) {
            sound.play();
          }
          break;

        case $button.matches('td.e-options button'):
          this.$selected = $row;
          this.toggleOptionMenu($button);
          break;

        case $button.matches('.move-up'):
          if ($row.previousElementSibling) {
            $row.parentNode.insertBefore($row, $row.previousElementSibling);
          } else {
            $row.parentNode.appendChild($row);
          }
          break;

        case $button.matches('.move-down'):
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

        case $button.matches('.delete'):
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
    let $name = $row.querySelector('.e-name');
    let $type = $row.querySelector('.e-type');
    let $sound = $row.querySelector('.e-sound');
    this.$list.classList.toggle('editing', !!!this.editing);

    if (this.editing) {
      this.acceptType();
      this.acceptSound();

      let data = this.$selected.dataset;
      let name = $name.querySelector('input').value;
      this.editing.name    = name;
      this.editing.type    = data.type;
      this.editing.options = JSON.parse(data.options);
      this.editing.soundId = data.soundId;
      this.editing = null;
      $name.textContent = name || browser.i18n.getMessage('options_event_nameNotSet');
      $name.classList.toggle('not-set', !!!name);
      $type.textContent = data.typeText || browser.i18n.getMessage('options_event_typeNotSet');
      $sound.textContent = data.soundText || browser.i18n.getMessage('options_event_soundNotSet');
      this.render(this.$selected);

      this.$menus.options.style.display = 'none';
    } else {
      this.editing = gEvents[$row.dataset.eventId];
      this._before = JSON.stringify(this.editing);

      let $typeSelect = this.$menus.types.cloneNode(true);
      if (this.editing.type) {
        let $opt = $typeSelect.querySelector(`option[value='${this.editing.type}']`);
        if ($opt) {
          $opt.selected = true;
        }
      }
      $type.innerHTML = '';
      $type.appendChild($typeSelect);

      this.updateEditingSounds();

      let $input = document.createElement('input');
      $input.type = 'text';
      $input.placeholder = browser.i18n.getMessage('options_event_nameNotSet');
      $input.value = this.editing.name || '';
      $name.innerHTML = '';
      $name.appendChild($input);
      $input.focus();
    }
  }

  cancelEdit($row) {
    this.$list.classList.remove('editing');
    this.editing = null;
    let before = JSON.parse(this._before);
    let data = this.$selected.dataset;
    data.name = before.name;
    data.type = before.type;
    data.options = JSON.stringify(before.options);
    data.soundId = before.soundId;
    $row.querySelector('.e-name').textContent = data.name;
    this.render($row);
  }

  toggleOptionMenu($btn) {
    const $menu = this.$menus.options;

    if ($menu.style.display === 'block') {
      $menu.style.display = 'none';
    } else {
      const name = $btn.dataset.name;
      const opts = JSON.parse($btn.closest('tr').dataset.options);
      this.updateOptionsMenu(name, opts);
      posisitionTo($menu, $btn);
      $menu.style.display = 'block';
      $menu.querySelector('[data-autofocus]').focus();
    }
  }

  addEvent(config) {
    let e = new EventSetting(config);
    gEvents[e.id] = e;

    let tmpl = document.importNode(this.tmpl, true);
    let data = tmpl.querySelector('tr').dataset;
    let perms = EventSetting.getTypeDef(e.type, 'permissions');
    data.eventId = e.id;
    data.name    = e.name || '';
    data.type    = e.type;
    data.options = JSON.stringify(e.options);
    data.soundId = e.soundId;
    if (perms.length) {
      data.permissions = JSON.stringify(perms);
    }

    tmpl.querySelector('.e-toggle input').checked = e.enabled;
    this.$list.appendChild(tmpl);
    let $row = this.$list.lastElementChild;
    this.render($row);
    return $row;
  }

  acceptType() {
    const $opt = this.$selected.querySelector('select.types option:checked');
    if (!$opt) {
      return;
    }

    const value = $opt.value;

    this.$selected.dataset.type = value;
    this.$selected.dataset.typeText = $opt.textContent;

    if (this.editing.type !== value) {
      this.$selected.dataset.options = JSON.stringify({});
    }

    let perms = EventSetting.getTypeDef(value, 'permissions');
    if (perms.length) {
      this.$selected.dataset.permissions = JSON.stringify(perms);
    } else if ('permissions' in this.$selected.dataset) {
      delete this.$selected.dataset.permissions;
    }
  }
 
  acceptSound() {
    const $opt = this.$selected.querySelector('select.sounds option:checked');
    if ($opt) {
      this.$selected.dataset.soundId = $opt.value;
      this.$selected.dataset.soundText = $opt.textContent;
    }
  }

  updateOptionSlot($row, type) {
    if (!$row) {
      return;
    }

    const $options = $row.querySelector('.e-options');
    const options = JSON.parse($row.dataset.options);
    const optionType = type || $options.dataset.optionType;
    const slots = EventSetting.getTypeDef(optionType, 'slots');

    $options.classList.toggle('unavailable', Object.keys(slots).length === 0);
    $options.dataset.optionType = optionType;

    if (Object.keys(slots).length === 0) {
      $options.textContent = ' - - ';
    } else {
      $options.innerHTML = '';

      Object.values(slots).forEach(slot => {
        let $slot = document.createElement('button');
        let name = browser.i18n.getMessage(`event_slots_name_${slot.name}`);
        $slot.dataset.name = slot.name;
        $slot.title        = name;
        $slot.textContent  = name;
        $slot.classList.toggle('enabled', Object.keys(options).includes(slot.name));
        $options.appendChild($slot);
      });
    }
  }

  onUpdateOptions(e) {
    const $target = e.target;

    if ($target.tagName === 'BUTTON') {
      let $menu   = this.$menus.options;
      let type    = $menu.dataset.type;
      let $row    = this.$selected;
      let options = JSON.parse($row.dataset.options);

      switch (true) {
        case $target.matches('.accept'):
          $menu.querySelectorAll('.form [data-prop]').forEach($input => {
            if (!(type in options)) {
              options[type] = {};
            }
            options[type][$input.dataset.prop] = $input.value;
          });

          $row.dataset.options = JSON.stringify(options);
          break;

        case $target.matches('.clear'):
          delete options[type];
          $row.dataset.options = JSON.stringify(options);
          break;
      }
      gEvents[$row.dataset.eventId].options = options;
      this.updateOptionSlot($row);
      $row.querySelector('td.e-options button').focus();
      this.toggleOptionMenu($target);
    }
  }
}
