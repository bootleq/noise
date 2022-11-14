'use strict';

import { newId } from './utils';

class Sound {
  constructor(config) {
    this.id   = config ? config.id   : newId();
    this.name = config ? config.name : '';
  }

  toPersistedProps() {
    let obj = {
      id:   this.id,
      name: this.name,
    }
    return obj;
  }

  async loadSrc() {
    if (this.src) {
      return Promise.resolve(this.src);
    }

    let id = `src.${this.id}`;
    return browser.storage.local.get(id).then(items => {
      if (id in items) {
        return items[id];
      }
      return '';
    });
  }

  async loadAudio() {
    if (this.audio) {
      return Promise.resolve(this.audio);
    }
    this.audio = new Audio();
    this.audio.preload = true;
    return this.loadSrc().then(src => {
      this.audio.src = src;
    });
  }

  play() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.loadAudio().then(() => {
        this.audio.play();
      })
      .catch(e => {
        console.log('fail playing sound', e);
      });
    }
  }
}

export default Sound;
