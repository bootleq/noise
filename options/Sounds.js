'use strict';

import browser from "webextension-polyfill";

import Sound from '../common/sound';
import { emptyObject } from '../common/utils';
import { shrinkFont } from './utils';
import throttle from 'just-throttle';

class Sounds {
  constructor(el, parentStore) {
    this.store = parentStore;
    this.instantPlay = false;

    this.$el   = el;
    this.$list = this.$el.querySelector('ul.list');
    this.tmpl  = this.$el.querySelector('template').content;

    this._$selected = null;
    this._observers = {};
    this.$togglePickPlay = document.querySelector('#instant-play-toggle input[type="checkbox"]');
    this.$addSound = this.$el.querySelector('.add_sound');

    this.$dragging = null;
    this.$list.addEventListener('focus', this.onFocus.bind(this), {capture: true});
    this.$list.addEventListener('click', this.onSelect.bind(this));
    this.$list.addEventListener('keydown', this.onKey.bind(this));
    this.$list.addEventListener('dragstart', this.onDragStart.bind(this));
    this.$list.addEventListener('dragover', throttle(this.onDragOver.bind(this)), 900);
    this.$list.addEventListener('drop', this.onDrop.bind(this));
    this.$list.addEventListener('dragend', this.onDragEnd.bind(this));
    this.$addSound.addEventListener('click', this.newSound.bind(this));
    this.$togglePickPlay.addEventListener('change', (e) => this.instantPlay = e.target.checked);
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
      this.store.Loaded.push('sounds');
      this.notifyObservers('load');
      this.notifyObservers('update');
    });
  }

  clear() {
    this.$selected = null;
    this.$list.querySelectorAll('ul > li:not(.add_sound)').forEach(node => {
      node.remove();
    });
    emptyObject(this.store.Sounds);
  }

  render($item) {
    let sound = this.store.Sounds[$item.dataset.soundId];
    let $name = $item.querySelector('.name span');
    $name.textContent = sound.name;
    shrinkFont($name);
  }

  onFocus(e) {
    let $li = e.target.closest('.list li');

    if (!this.instantPlay && $li !== this.$addSound) {
      this.$selected = $li;
    }
  }

  onSelect(e) {
    let $li = e.target.closest('.list li');

    if (!$li) { // click outside of sounds
      this.$selected = null;
      return;
    }

    if ($li !== this.$addSound) {
      this.$selected = $li;

      if (this.instantPlay) {
        this.notifyObservers('testPlay');
      }
    }
  }

  onKey(e) {
    switch (e.key) {
    case 'Escape':
      this._$selected = null;
      this.notifyObservers('select');
    }
  }

  onDragStart(e) {
    const $li = e.target;
    if ($li.tagName === 'LI' && !$li.classList.contains('add_sound')) {
      this.$dragging = $li;
    }
  }

  onDragEnd(e) {
    this.$dragging = null;
    this.$list.querySelectorAll('.drag-before, .drag-after').forEach((otherLi) => {
      otherLi.classList.remove('drag-before', 'drag-after');
    });
  }

  findDropee(el) {
    if (!this.$dragging) return;

    const tagName = el.tagName;
    let $li = tagName === 'LI' ? el : (
      ['LABEL', 'SPAN'].includes(tagName) ? el.closest('li[draggable]') : null
    );

    if ($li?.draggable && !$li.classList.contains('add_sound') && $li !== this.$dragging) {
      return $li;
    }
  }

  findDropSide(el, clientX) {
    const boundingBox = el.getBoundingClientRect();
    const offset = boundingBox.x + boundingBox.width / 2;
    return clientX < offset;
  }

  onDragOver(e) {
    e.preventDefault();
    const $li = this.findDropee(e.target);
    if (!$li) return;

    this.$list.querySelectorAll('.drag-before, .drag-after').forEach((otherLi) => {
      otherLi.classList.remove('drag-before', 'drag-after');
    });

    if (this.findDropSide($li, e.clientX)) {
      $li.classList.add('drag-before');
    } else {
      $li.classList.add('drag-after');
    }
  }

  onDrop(e) {
    e.preventDefault();
    const $li = this.findDropee(e.target);
    if (!$li) return;

    if (this.findDropSide($li, e.clientX)) {
      this.$dragging.parentNode.insertBefore(this.$dragging, $li);
    } else {
      this.$dragging.parentNode.insertBefore(this.$dragging, $li.nextElementSibling);
    }
  }

  set $selected(v) {
    this.$list.querySelectorAll('li.current').forEach(el => el.classList.remove('current'));
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
    let sound = this.store.Sounds[this.$selected.dataset.soundId];
    delete this.store.Sounds[sound.id];
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

  newSound() {
    this.$selected = this.addSound();
    this.notifyObservers('new');
  }

  addSound(config) {
    let sound = new Sound(config);
    let tmpl  = document.importNode(this.tmpl, true);

    this.store.Sounds[sound.id] = sound;
    tmpl.querySelector('li').dataset.soundId     = sound.id;
    tmpl.querySelector('.name span').textContent = sound.name;
    this.$list.insertBefore(tmpl, this.$addSound);
    let $li = this.$addSound.previousElementSibling;
    this.render($li);
    return $li;
  }
}

export default Sounds;
