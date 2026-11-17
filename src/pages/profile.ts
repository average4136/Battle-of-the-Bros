import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { allGames, ensureLoggedIn, loadState, saveState } from '../state';
import type { GameId, SkillRating } from '../types';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
const profile = (state.profiles[user.id] ??= { userId: user.id, stats: { gameSkills: {} } });
saveState(state);

const root = appRoot();
const message = h('p', { role: 'status' });

const eloInput = h('input', { type: 'number', min: 100, max: 3500, value: profile.stats.chessElo ?? '' });
const wpmInput = h('input', { type: 'number', min: 1, max: 300, value: profile.stats.typingWpm ?? '' });

const RATINGS: { value: SkillRating | ''; label: string }[] = [
  { value: '', label: 'No opinion' },
  { value: 'really-good', label: 'Really good' },
  { value: 'pretty-good', label: 'Pretty good' },
  { value: 'really-bad', label: 'Really bad' },
];

const skillSelects = new Map<GameId, HTMLSelectElement>();
const skillRows = allGames(state).map((game) => {
  const current = profile.stats.gameSkills[game.id] ?? '';
  const select = h('select', {}, ...RATINGS.map((r) => h('option', { value: r.value, selected: r.value === current }, r.label)));
  skillSelects.set(game.id, select);
  return h('tr', {}, h('td', {}, game.name), h('td', {}, select));
});

/** Empty input → undefined, so "not filled in" isn't saved as 0. */
function optionalNumber(input: HTMLInputElement): number | undefined {
  return input.value === '' ? undefined : Number(input.value);
}

const form = h('form', {
  onsubmit: (e: Event) => {
    e.preventDefault();
    profile.stats.chessElo = optionalNumber(eloInput);
    profile.stats.typingWpm = optionalNumber(wpmInput);
    profile.stats.gameSkills = {};
    for (const [gameId, select] of skillSelects) {
      if (select.value) profile.stats.gameSkills[gameId] = select.value as SkillRating;
    }
    saveState(state);
    message.textContent = 'Saved.';
  },
},
  h('h2', {}, 'Fairness stats'),
  h('p', {}, h('label', {}, 'Chess Elo: ', eloInput)),
  h('p', {}, h('label', {}, 'Typing speed (WPM): ', wpmInput)),
  h('h3', {}, 'How good are you at...'),
  h('table', { border: 1 }, h('tr', {}, h('th', {}, 'Game'), h('th', {}, 'Rating')), ...skillRows),
  h('p', {}, h('button', { type: 'submit' }, 'Save profile')),
);

mount(root, 
  h('h2', {}, 'Account'),
  h('p', {}, `Username: ${user.username}`),
  h('p', {}, `Email: ${user.email}`),
  placeholder('changing email or password will go here once real accounts exist.'),
  form,
  message,
);
