// Shared bits every page shows: who's logged in, and a site map.
// The site map is for the prototype only: it lets you jump to any screen
// while testing. The real UI will have real navigation.
//
// Normally these sit at the top and bottom of the page. A page can pass
// { devPanel: true } to tuck them behind a small "dev" button instead
// (the title page does, so they don't cover the artwork).

import { h } from './dom';
import { PAGE_LABELS, PAGES, goTo, type PageName } from './routes';
import { currentUser, loadState, resetState, saveState } from './state';
import { viewAsControl } from './view-as.js'; // view-as: prototype only, delete with src/view-as.js
import { devPanel } from './dev-panel.js';

export function renderChrome(options: { devPanel?: boolean } = {}): void {
  const state = loadState();
  const user = currentUser(state);

  const status = h(
    'p',
    {},
    user ? `Logged in as ${user.username}. ` : 'Not logged in. ',
    user
      ? h('button', {
          type: 'button',
          onclick: () => {
            // Re-load instead of saving `state`: the page may have saved
            // changes since it was loaded, and the old copy would undo them.
            const fresh = loadState();
            fresh.currentUserId = undefined;
            saveState(fresh);
            goTo('home');
          },
        }, 'Log out')
      : h('a', { href: PAGES.login }, 'Log in'),
  );

  const links = (Object.keys(PAGES) as PageName[]).map((name) =>
    h('li', {}, h('a', { href: PAGES[name] }, PAGE_LABELS[name])),
  );
  const reset = h('button', {
    type: 'button',
    onclick: () => {
      resetState();
      goTo('home');
    },
  }, 'Reset prototype data');

  const footer = h('footer', {},
    h('p', {}, 'Prototype site map:'), h('ul', {}, ...links), reset,
    viewAsControl(state), // view-as: prototype only, delete with src/view-as.js
  );

  if (options.devPanel) {
    document.body.append(devPanel(status, footer));
  } else {
    document.body.prepend(status, h('hr'));
    document.body.append(h('hr'), footer);
  }
}
