// Shared bits every page shows: who's logged in, and a site map.
// The site map is for the prototype only: it lets you jump to any screen
// while testing. The real UI will have real navigation.

import { h } from './dom';
import { PAGE_LABELS, PAGES, goTo, type PageName } from './routes';
import { currentUser, loadState, resetState, saveState } from './state';

export function renderChrome(): void {
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
            state.currentUserId = undefined;
            saveState(state);
            goTo('home');
          },
        }, 'Log out')
      : h('a', { href: PAGES.login }, 'Log in'),
  );
  document.body.prepend(status, h('hr'));

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

  document.body.append(
    h('hr'),
    h('footer', {}, h('p', {}, 'Prototype site map:'), h('ul', {}, ...links), reset),
  );
}
