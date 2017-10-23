'use strict';

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

function newId() {
  return new Date().valueOf().toString();
}

function posisitionTo($src, $target) {
  let rect = $target.getBoundingClientRect();
  $src.style.left = (rect.left + window.scrollX) + 'px';
  $src.style.top  = (rect.top + window.scrollY + rect.height) + 'px';
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
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.firstChild.textContent = browser.i18n.getMessage(`options${el.getAttribute('data-i18n')}`);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = browser.i18n.getMessage(`options.title${el.getAttribute('data-i18n-title')}`);
  });
}
