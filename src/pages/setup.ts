import { appRoot, h, mount, openNote } from '../dom';
import { renderChrome } from '../page-chrome';
import { hostRoom } from '../room';
import { goTo, PAGES } from '../routes';
import { hasRightPlayerCount } from '../session';
import { createSession, shuffle } from '../session';
import { allGames, ensureLoggedIn, gameById, loadState, saveState } from '../state';
import type { GameId, SessionFormat } from '../types';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
const room = state.room ?? hostRoom(state, user.id);
saveState(state);

const root = appRoot();
const games = allGames(state);
const message = h('p', { role: 'status' });

// ---- Format -----------------------------------------------------------------
const bestOfRadio = h('input', { type: 'radio', name: 'format', value: 'best-of', checked: true });
const fastestRadio = h('input', { type: 'radio', name: 'format', value: 'fastest-total' });
const countInput = h('input', { type: 'number', min: 1, max: games.length, value: 3, size: 4 });

// ---- Game selection -----------------------------------------------------------
const checkboxes = new Map<GameId, HTMLInputElement>();
const gameItems = games.map((game) => {
  const box = h('input', { type: 'checkbox', checked: true, onchange: () => clearOrder() });
  checkboxes.set(game.id, box);
  const tags = [game.isDaily ? 'daily' : '', game.source === 'custom' ? 'custom' : ''].filter(Boolean).join(', ');
  return h('li', {}, h('label', {}, box, ' ', game.name, tags ? ` (${tags})` : ''));
});

// ---- Randomized order ---------------------------------------------------------
// `order` holds the shuffled selection. Changing the selection clears it, so
// the preview can never show games that are no longer selected.
let order: GameId[] = [];
const orderPreview = h('div');

function selectedIds(): GameId[] {
  return games.filter((g) => checkboxes.get(g.id)!.checked).map((g) => g.id);
}

function clearOrder(): void {
  order = [];
  orderPreview.replaceChildren(h('p', {}, 'Not randomized yet.'));
}

function renderOrder(): void {
  const count = Number(countInput.value);
  const name = (id: GameId) => gameById(state, id)?.name ?? id;
  orderPreview.replaceChildren(
    h('p', {}, 'Play order:'),
    h('ol', {}, ...order.slice(0, count).map((id) => h('li', {}, name(id)))),
    h('p', {}, 'Substitutes (drawn from if a round ties):'),
    order.length > count
      ? h('ul', {}, ...order.slice(count).map((id) => h('li', {}, name(id))))
      : h('p', {}, 'None. Ties will pull from any other game in the list.'),
  );
}

const randomizeButton = h('button', {
  type: 'button',
  onclick: () => {
    order = shuffle(selectedIds());
    renderOrder();
  },
}, 'Randomize order');
countInput.addEventListener('input', () => order.length && renderOrder());

const continueButton = h('button', {
  type: 'button',
  onclick: () => {
    const count = Number(countInput.value);
    const selected = selectedIds();
    if (!hasRightPlayerCount(room.playerIds)) {
      message.textContent = 'A session needs exactly 2 players. Go back to the lobby.';
      return;
    }
    if (!Number.isInteger(count) || count < 1) {
      message.textContent = 'Number of games must be at least 1.';
      return;
    }
    if (selected.length < count) {
      message.textContent = `You picked ${count} games but only selected ${selected.length}.`;
      return;
    }
    // If nobody pressed Randomize, randomize now: random order is the default.
    if (order.length === 0) order = shuffle(selected);
    const format: SessionFormat = { kind: fastestRadio.checked ? 'fastest-total' : 'best-of', gameCount: count };
    state.session = createSession(room, format, order);
    saveState(state);
    goTo('handicaps');
  },
}, 'Continue to handicaps →');

clearOrder();
mount(root, 
  message,
  h('h2', {}, 'Format'),
  h('p', {}, h('label', {}, bestOfRadio, ' Best of X games (first to a majority wins)')),
  h('p', {}, h('label', {}, fastestRadio, ' Fastest overall completion of X games')),
  openNote('how exactly does "fastest completion" work: same games, total time, a live race? Choosing it currently plays like best-of, with no early finish.'),
  h('p', {}, h('label', {}, 'Number of games (X): ', countInput)),
  h('p', {}, 'Best-of-3 within a single game is chosen per round, on the Round screen.'),
  h('h2', {}, 'Games'),
  h('p', {}, 'Select more games than X so ties have substitutes. ', h('a', { href: PAGES.games }, 'Add a custom game')),
  h('ul', {}, ...gameItems),
  h('h2', {}, 'Order'),
  h('p', {}, randomizeButton),
  orderPreview,
  h('p', {}, continueButton),
);
