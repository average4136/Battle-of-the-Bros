// PROTOTYPE ONLY: a small "dev" button that shows/hides the prototype tools
// (login status, site map, Reset, View as) in a pop-up panel.
//
// Used on the title page so the tools don't sit on top of the artwork.
// Other pages still show the tools in the open. page-chrome.ts decides which.
// Whether the panel is open is remembered in localStorage.

import { h } from './dom';

const STORAGE_KEY = 'botb-dev-panel-open';

function loadOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage blocked (e.g. private window): start closed
  }
}

/** @param {boolean} open */
function saveOpen(open) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // Storage blocked: it just won't be remembered.
  }
}

/**
 * Wrap the given elements in a panel behind a "dev" toggle button.
 *
 * @param {...Node} children  what goes in the panel
 * @returns {HTMLElement}
 */
export function devPanel(...children) {
  const panel = h('div', { id: 'dev-panel', class: 'dev-panel' }, ...children);
  const toggle = h('button', { type: 'button', class: 'dev-toggle', 'aria-controls': 'dev-panel' }, 'dev');

  /** @param {boolean} open */
  function show(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => {
    const open = panel.hidden; // hidden now = about to open
    show(open);
    saveOpen(open);
  });

  show(loadOpen());
  return h('div', { class: 'dev-tools' }, panel, toggle);
}
