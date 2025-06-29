'use strict';

import browser from "webextension-polyfill";

import { testAudioSrc } from '../common/utils';
import { fileToDataURL, preventDefaultDrag } from './utils.js';

const confirmMsg = browser.i18n.getMessage('options_prompt_areYouSure');

class SoundDetail {
  constructor(el, parentStore) {
    this.store = parentStore;

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
    this.$desc         = this.$el.querySelector('.desc textarea');
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

    let sound = this.store.Sounds[$sound.dataset.soundId];
    if (!sound.src) {
      sound.loadSrc().then(src => {
        sound.src = src;
        this.render();
      });
    } else {
      this.render();
    }
  }

  testPlay() {
    if (this.$audio.src) {
      this.onPlay();
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
      msg = browser.i18n.getMessage('options_warning_unsupportedMedia');
      this.$warning.textContent = msg;
      let $code = document.createElement('code');
      $code.textContent = file.type;
      this.$warning.appendChild($code);
    } else {
      this.$warning.textContent = '';
    }

    fileToDataURL(file).then(src => {
      this.testAndSetSrc(src).then(() => {
        this.$cancelUpload.classList.remove('hidden');
        this.toggleUploadUI(false);
        this.validate();
      });
    })
    .catch(e => {
      this.toggleUploadUI(true);
    });
  }

  onPlay(e) {
    this.$audio.currentTime = 0;
    setTimeout(() => {
      this.$audio.play();
    }, 200);
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
    if (!$btn) {
      return;
    }

    switch (true) {
      case $btn.matches('.accept'):
        this.accept();
        break;

      case $btn.matches('.cancel'):
        this.attach();
        break;

      case $btn.matches('.delete'):
        if (e.ctrlKey || globalThis.confirm(confirmMsg)) {
          this.notifyObservers('delete');
          this.attach();
        }
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
    let sound = this.store.Sounds[this.$selected.dataset.soundId];
    sound.name  = this.$name.value;
    sound.desc  = this.$desc.value;
    sound.src   = this.$audio.src;
    sound.audio = null;
    this.notifyObservers('accept');
  }

  validate() {
    if (this.$name.value.length && this.$audio.src) {
      this.$accept.disabled = false;
      return;
    }
    this.$accept.disabled = true;
  }

  async testAndSetSrc(src) {
    await testAudioSrc(src).then(() => {
      this.$audio.src = src;
      this.$playerBox.classList.toggle('error', false);
      this.$warning.textContent = '';
    }).catch(() => {
      this.$audio.removeAttribute('src');
      this.$playerBox.classList.toggle('error', true);
      const msg = browser.i18n.getMessage('options_warning_loadError');
      this.$warning.textContent = msg;
    });
  }

  async render() {
    if (this.$selected) {
      let sound = this.store.Sounds[this.$selected.dataset.soundId];
      this.$name.value = sound.name || '';
      this.$desc.value = sound.desc || '';

      await this.testAndSetSrc(sound.src);

      this.toggleUploadUI(!sound.src);
      this.validate();
    } else {
      this.$name.value = '';
      this.$desc.value = '';
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

export default SoundDetail;
