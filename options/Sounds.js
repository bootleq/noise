'use strict';

// import {emptyObject} from '../common/utils';

class Sounds {
  constructor(el) {
    this.$el   = el;
    this.$list = this.$el.querySelector('ul.list');
    this.tmpl  = this.$el.querySelector('template').content;

    this._$selected = null;
    this._observers = {};
    this.$addSound = this.$el.querySelector('.add_sound');

    this.$list.addEventListener('focus', this.onFocus.bind(this), {capture: true});
    this.$list.addEventListener('click', this.onSelect.bind(this));
    this.$list.addEventListener('keydown', this.onKey.bind(this));
    this.$addSound.addEventListener('click', () => this.$selected = this.addSound());
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
      this.notifyObservers('update');
    });
  }

  clear() {
    this.$selected = null;
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

  onFocus(e) {
    let $li = e.target.closest('.list li');
    if ($li !== this.$addSound) {
      this.$selected = $li;
    }
  }

  onSelect(e) {
    let $li = e.target.closest('.list li');
    if ($li !== this.$addSound) {
      this.$selected = $li;
    }
  }

  onKey(e) {
    switch (e.key) {
    case 'Escape':
      this._$selected = null;
      this.notifyObservers('select');
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
    this.notifyObservers('update');
  }

  accept() {
    this.render(this.$selected);
    this.$selected = null;
    this.notifyObservers('update');
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
    let $li = this.$addSound.previousElementSibling;
    this.render($li);
    return $li;
  }
}
