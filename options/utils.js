'use strict';

import browser from "webextension-polyfill";

function preventDefaultDrag(el) {
  function noop(e) {
    e.preventDefault();
  }
  el.ondragover = noop;
  el.ondragend = noop;
  el.ondrop = noop;
}

async function fileToDataURL(blob) {
  if (blob) {
    return await readAsDataURL(blob);
  } else {
    return Promise.resolve('');
  }
}

async function readAsDataURL(blob) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function posisitionTo($src, $target, placement) {
  const rect = $target.getBoundingClientRect();
  let left, top, srcRect, srcDisplay;

  switch (placement) {
  case 'top':
    if ($src.offsetHeight === 0) {
      // force display to measure dimension
      srcDisplay = $src.style.display;
      $src.style.visibility = 'hidden';
      $src.style.display = 'block';
      srcRect = $src.getBoundingClientRect();
      $src.style.display = srcDisplay;
      $src.style.visibility = null;
    } else {
      srcRect = $src.getBoundingClientRect();
    }

    left = rect.left + window.scrollX;
    top  = rect.top + window.scrollY - srcRect.height;
    break;
  default:
    left = rect.left + window.scrollX;
    top  = rect.top + window.scrollY + rect.height;
  }

  $src.style.left = `${left}px`;
  $src.style.top  = `${top}px`;
}

function shrinkFont(el) {
  let container = el.parentElement;
  let minSize   = 8;
  let size;

  el.style.fontSize = '';

  while (el.offsetHeight > container.offsetHeight) {
    size = parseInt(window.getComputedStyle(el).fontSize, 10);
    if (Number.isNaN(size) || size < minSize) {
      return false;
    }
    size -= 1;
    el.style.fontSize = `${size}px`;
    if (size !== parseInt(window.getComputedStyle(el).fontSize, 10)) { // size not applyed, give up
      return false;
    }
  }
}

function translateDOM() {
  let templates = Array.from(document.querySelectorAll('template')).map(tmpl => tmpl.content);
  [document].concat(templates).forEach((node) => {
    node.querySelectorAll('[data-i18n]').forEach(el => {
      el.firstChild.textContent = browser.i18n.getMessage(`options${el.getAttribute('data-i18n')}`);
    });
    node.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = browser.i18n.getMessage(`options_title${el.getAttribute('data-i18n-title')}`);
    });
  });
}

function arrayDiff(a1, a2) {
  let s2 = new Set(a2);
  return [...a1].filter(item => !s2.has(item));
}

export { arrayDiff, fileToDataURL, posisitionTo, preventDefaultDrag, shrinkFont, translateDOM };
