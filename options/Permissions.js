'use strict';

import { arrayDiff } from './utils';

class Permissions {
  constructor(el, parentStore) {
    this.store = parentStore;

    this.$el = el;
    this._observers = {};
    this.bindCheckboxHandler();
    this.bindCloseBtnHandler();
    this.$el.addEventListener('keydown', this.onKey.bind(this));
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

  onKey(e) {
    switch (e.key) {
      case 'Escape':
        this.$el.classList.add('hidden');
        break;
    }
  }

  update() {
    this.$el.querySelectorAll('input[data-perm]').forEach($box => {
      $box.checked = this.store.Permissions.includes($box.dataset.perm);
    });
    this.notifyObservers('update');
  }

  async request(names) {
    await browser.permissions.request({permissions: names}).then(yes => {
      if (yes) {
        this.store.Permissions = Array.from(new Set([...this.store.Permissions, ...names]));
        browser.runtime.sendMessage({type: 'listeners'});
        this.update();
      }
    });
  }

  async revoke(names) {
    browser.runtime.sendMessage({type: 'listeners', action: 'unbind'});
    await browser.permissions.remove({permissions: names}).then(yes => {
      if (yes) {
        this.store.Permissions = arrayDiff(this.store.Permissions, names);
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
      this.$el.style.top = (btnRect.top - boxRect.height - 10 + window.scrollY) + 'px';
      this.$el.style.visibility = 'visible';
      this.$el.querySelector('label').focus();
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

export default Permissions;
