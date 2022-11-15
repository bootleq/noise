'use strict';

import browser from "webextension-polyfill";

import Sounds from './Sounds';
import SoundDetail from './SoundDetail';
import Events from './Events';
import Permissions from './Permissions';
import { translateDOM } from './utils.js';
import { browserInfo } from '../common/utils';

import './options.scss';

const store = {
  Sounds: {},
  Events: {},
  Loaded: [],
  Permissions: []
};

let $save   = document.querySelector('#save');
let $import = document.querySelector('#import');
let $export = document.querySelector('#export');

// {{{
async function currentConfig() {
  let config = {};

  config['sounds'] = Array.from(document.querySelectorAll('#sounds ul > li:not(.add_sound)')).reduce((list, $i) => {
    let sound = store.Sounds[$i.dataset.soundId];
    if (sound) {
      list.push(sound.toPersistedProps());
    }
    return list;
  }, []);

  config['events'] = Array.from(document.querySelectorAll('#events tbody tr')).reduce((list, $i) => {
    let event = store.Events[$i.dataset.eventId];
    if (event) {
      list.push(event.toPersistedProps());
    }
    return list;
  }, []);

  for (let i of Object.values(store.Sounds)) {
    if (!i.src) {
      i.src = await i.loadSrc();
    }
  }
  Object.values(store.Sounds).forEach(i => config[`src.${i.id}`] = i.src);
  return Promise.resolve(config);
}

async function save() {
  let config = await currentConfig();

  let deadKeys = await browser.storage.local.get().then(items => {
    return Object.keys(items).filter(k => k.startsWith('src.') && !Object.keys(store.Sounds).includes(k.substr(4)));
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

async function onImportFile(e) {
  const json = await e.target.files[0]?.text();
  const config = JSON.parse(json);
  if (['sounds', 'events'].every(k => Object.keys(config).includes(k))) {
    return JSON.parse(json);
  }
  throw new Error(browser.i18n.getMessage('options_error_importFailFileIncomplete'));
}

function onLoad() {
  if (store.Loaded.length === 2) {
    $save.disabled = false;
    $import.disabled = false;
    $export.disabled = false;
  }
}

function applyBodyClass() {
  browserInfo().then(info => {
    if (info.name) {
      document.body.classList.add(info.name.toLowerCase());
    }
  });
}
// }}}

async function init() {
  document.title = browser.i18n.getMessage('optionPageTitle');
  translateDOM();
  applyBodyClass();

  store.Permissions = await browser.permissions.getAll().then(result => result.permissions);

  let sounds      = new Sounds(document.querySelector('#sounds'), store);
  let soundDetail = new SoundDetail(document.querySelector('#sound_detail'), store);
  let events      = new Events(document.querySelector('#events'), store);
  let permissions = new Permissions(document.querySelector('#permissions'), store);

  let $importFile = document.querySelector('#import-file');
  let $info       = document.querySelector('#main-ctrls .info');
  let $infoText   = $info.querySelector('strong');
  let $infoClose  = $info.querySelector('.dismiss');
  let $permsBtn   = document.querySelector('#review-permission');

  sounds.addObserver('select', soundDetail.attach.bind(soundDetail));
  sounds.addObserver('update', events.updateSoundMenu.bind(events));

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
    $info.className = 'info';

    save().then(() => {
      $save.disabled = false;
      $infoText.textContent = browser.i18n.getMessage('options_info_saveSuccess');
      $info.classList.add('success');
    })
    .catch(e => {
      $infoText.textContent = browser.i18n.getMessage('options_info_saveFail');
      $info.classList.add('fail');
      $save.disabled = false;
    });
  });

  $export.addEventListener('click', exportConfig);

  $import.addEventListener('click', () => $importFile.click());
  $importFile.addEventListener('change', (e) => {
    onImportFile(e).then((newConfig) => {
      sounds.clear();
      events.clear();
      newConfig['sounds'].forEach((cfg) => {
        sounds.addSound(cfg);
        store.Sounds[cfg.id].src = newConfig[`src.${cfg.id}`];
      });
      newConfig['events'].forEach((cfg) => events.addEvent(cfg));
      events.updatePermissions();
      events.updateSoundMenu();
    })
    .catch(e => {
      const prefix = browser.i18n.getMessage('options_error_importFail');
      $infoText.textContent = `${prefix}${e.message}`;
      $info.classList.add('fail');
    });
  });

  $infoClose.addEventListener('click', () => $info.className = 'info');

  $permsBtn.addEventListener('click', permissions.toggleDialog.bind(permissions, $permsBtn));

  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(() => {
        document.querySelector('#permissions').classList.add('hidden');
        resizeTimeout = null;
      }, 66);
    }
  });

  browser.storage.local.get({'upgrade.legacy': false}).then(result => {
    if (result['upgrade.legacy']) {
      let btn = document.querySelector('#legacy-upgrade-info');
      btn.classList.remove('hidden');
      btn.addEventListener('click', () => {
        let lang = browser.i18n.getUILanguage();
        if (!['zh-TW'].includes(lang)) {
          lang = 'en';
        }
        browser.tabs.create({url: `/pages/${lang}/upgrade-legacy.html`});
      });
    }
  });
}

window.addEventListener('DOMContentLoaded', init, {once: true});
