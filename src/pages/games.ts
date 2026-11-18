import { appRoot, h, mount } from '../dom';
import { renderChrome } from '../page-chrome';
import { PAGES } from '../routes';
import { CURATED_GAMES } from '../sample-data';
import { ensureLoggedIn, loadState, saveState, usernameOf } from '../state';
import type { Game } from '../types';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
saveState(state);
const root = appRoot();
const message = h('p', { role: 'status' });

function gameItem(game: Game, removable: boolean): HTMLElement {
  return h('li', {},
    game.url ? h('a', { href: game.url, target: '_blank', rel: 'noopener noreferrer' }, game.name) : game.name,
    game.isDaily ? ' (daily)' : '',
    game.addedBy ? `, added by ${usernameOf(state, game.addedBy)}` : '',
    removable
      ? h('button', {
          type: 'button',
          onclick: () => {
            state.customGames = state.customGames.filter((g) => g.id !== game.id);
            saveState(state);
            location.reload();
          },
        }, 'Remove')
      : null,
  );
}

/**
 * Accept only http(s) links. A user-supplied "javascript:..." URL in an
 * <a href> would run code when clicked, so other schemes are rejected.
 */
function safeUrl(raw: string): string | undefined | null {
  if (!raw.trim()) return undefined; // no link is fine
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const nameInput = h('input', { required: true, maxlength: 60 });
const urlInput = h('input', { type: 'url', size: 40, placeholder: 'https://… (optional)' });
const dailyBox = h('input', { type: 'checkbox' });

const form = h('form', {
  onsubmit: (e: Event) => {
    e.preventDefault();
    const url = safeUrl(urlInput.value);
    if (url === null) {
      message.textContent = 'Links must start with http:// or https://';
      return;
    }
    state.customGames.push({
      id: `g-custom-${Date.now()}`,
      name: nameInput.value.trim(),
      url,
      isDaily: dailyBox.checked,
      source: 'custom',
      addedBy: user.id,
    });
    saveState(state);
    location.reload();
  },
},
  h('p', {}, h('label', {}, 'Name: ', nameInput)),
  h('p', {}, h('label', {}, 'Link: ', urlInput)),
  h('p', {}, h('label', {}, dailyBox, ' Daily game (can only be played once a day)')),
  h('button', { type: 'submit' }, 'Add game'),
);

mount(root, 
  h('h2', {}, 'Curated games'),
  h('ul', {}, ...CURATED_GAMES.map((g) => gameItem(g, false))),
  h('h2', {}, 'Custom games'),
  state.customGames.length
    ? h('ul', {}, ...state.customGames.map((g) => gameItem(g, g.addedBy === user.id)))
    : h('p', {}, 'None yet.'),
  h('h2', {}, 'Add a custom game'),
  message,
  form,
  h('p', {}, h('a', { href: PAGES.options }, 'Use these in a session →')),
);
