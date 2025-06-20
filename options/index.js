'use strict';

import browser from "webextension-polyfill";

import Sounds from './Sounds';
import SoundDetail from './SoundDetail';
import Events from './Events';
import Permissions from './Permissions';
import { translateDOM, posisitionTo } from './utils.js';
import { browserInfo, newId } from '../common/utils';

import './options.scss';

const store = {
  Sounds: {},
  Events: {},
  Loaded: [],
  Permissions: []
};

const $save   = document.querySelector('#save');
const $import = document.querySelector('#import');
const $export = document.querySelector('#export');
const $importMenu = document.querySelector('#import-menu');

// {{{
function currentSoundsConfig() {
  return Array.from(document.querySelectorAll('#sounds ul > li:not(.add_sound)')).reduce((list, $i) => {
    let sound = store.Sounds[$i.dataset.soundId];
    if (sound) {
      list.push(sound.toPersistedProps());
    }
    return list;
  }, []);
}

function currentEventsConfig() {
  return Array.from(document.querySelectorAll('#events tbody tr')).reduce((list, $i) => {
    let event = store.Events[$i.dataset.eventId];
    if (event) {
      list.push(event.toPersistedProps());
    }
    return list;
  }, []);
}

async function currentConfig() {
  let config = {};

  config['sounds'] = currentSoundsConfig();
  config['events'] = currentEventsConfig();

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

function rewriteDuplicatedIds(config) {
  let oldIds;

  oldIds = currentSoundsConfig().map(i => i['id']);
  config['sounds'].forEach((cfg) => {
    const id = cfg['id'];
    if (oldIds.includes(id)) {
      const nId = newId();
      cfg['id'] = nId;

      config['events'].filter(e => e['soundId'] === id).forEach(e => {
        e['soundId'] = nId;
      });

      if (config[`src.${id}`]) {
        config[`src.${nId}`] = config[`src.${id}`];
        delete config[`src.${id}`];
      }
    }
  });

  oldIds = currentEventsConfig().map(i => i['id']);
  config['events'].forEach((cfg) => {
    const id = cfg['id'];
    if (oldIds.includes(id)) {
      const nId = newId();
      cfg['id'] = nId;
    }
  });

  return config;
}

async function onImportFile(e) {
  const json = await e.target.files[0]?.text();
  const config = JSON.parse(json);
  if (['sounds', 'events'].every(k => Object.keys(config).includes(k))) {
    return JSON.parse(json);
  }
  throw new Error(browser.i18n.getMessage('options_error_importFailFileIncomplete'));
}

function toggleImportMenu(force) {
  if (!$importMenu.classList.contains('show' || force === true)) {
    posisitionTo($importMenu, $import, 'top');
  }
  $importMenu.classList.toggle('show', force);
}


function onLoad() {
  if (store.Loaded.length === 2) {
    $save.disabled = false;
    $import.disabled = false;
    $export.disabled = false;
  }
}
// }}}

async function init() {
  document.title = browser.i18n.getMessage('optionPageTitle');
  translateDOM();

  const browserName = (await browserInfo())?.name?.toLowerCase() || '';
  if (browserName) {
    document.body.classList.add(browserName);
  }

  store.Permissions = await browser.permissions.getAll().then(result => result.permissions);

  let sounds      = new Sounds(document.querySelector('#sounds'), store);
  let soundDetail = new SoundDetail(document.querySelector('#sound_detail'), store);
  let events      = new Events(document.querySelector('#events'), store, browserName);
  let permissions = new Permissions(document.querySelector('#permissions'), store);

  let importMode = 'append';

  let $importFile = document.querySelector('#import-file');
  let $info       = document.querySelector('#main-ctrls .info');
  let $infoText   = $info.querySelector('strong');
  let $infoClose  = $info.querySelector('.dismiss');
  let $permsBtn   = document.querySelector('#review-permission');

  function hideFloatMenus() {
    events.toggleOptionMenu.bind(events)(null, false);
    permissions.toggleDialog.bind(permissions)($permsBtn, false);
    toggleImportMenu(false);
  }

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
  permissions.addObserver('update', events.updateAvailability.bind(events))

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

  $import.addEventListener('click', () => toggleImportMenu());
  $export.addEventListener('click', exportConfig);

  $importMenu.addEventListener('click', (e) => {
    const mode = e.target.closest('li')?.dataset.mode;
    if (['append', 'overwrite'].includes(mode)) {
      importMode = mode;
      hideFloatMenus();
      $importFile.click();
    }
  });

  $importFile.addEventListener('change', (e) => {
    onImportFile(e).then((newConfig) => {
      if (importMode === 'overwrite') {
        sounds.clear();
        events.clear();
      } else {
        newConfig = rewriteDuplicatedIds(newConfig);
      }

      newConfig['sounds'].forEach((cfg) => {
        sounds.addSound(cfg);
        store.Sounds[cfg.id].src = newConfig[`src.${cfg.id}`];
      });
      newConfig['events'].forEach((cfg) => events.addEvent(cfg));
      events.updateAvailability();
      events.updateBrowserCompatibility();
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

  document.body.addEventListener('click', e => {
    if (e.target.tagName === 'BODY') {
      hideFloatMenus();
    }
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(() => {
        hideFloatMenus();
        resizeTimeout = null;
      }, 100);
    }
  });
}

window.addEventListener('DOMContentLoaded', init, {once: true});
