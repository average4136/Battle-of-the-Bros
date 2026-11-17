import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { goTo, PAGES } from '../routes';
import { SUGGESTED_HANDICAPS } from '../sample-data';
import { startNextRound } from '../session';
import { gameById, loadState, saveState, usernameOf } from '../state';
import type { CustomHandicap, Handicap } from '../types';

renderChrome();
const state = loadState();
const root = appRoot();
const session = state.session;

if (!session || session.status !== 'setup') {
  mount(root, 
    h('p', {}, session ? 'This session has already started.' : 'No session set up yet.'),
    h('p', {}, h('a', { href: PAGES.setup }, 'Go to Session setup')),
  );
} else {
  // Narrowed copy: TypeScript can't tell `session` stays defined inside callbacks.
  const s = session;
  const sessionGameIds = [...s.upcomingGameIds, ...s.substitutePoolIds];
  const gameName = (id: string) => gameById(state, id)?.name ?? id;
  const isChosen = (hc: Handicap) => s.handicaps.some((c) => c.id === hc.id);

  function save(): void {
    saveState(state);
    location.reload();
  }

  // ---- Player stats, for judging fairness ------------------------------------
  const statsRows = s.playerIds.map((id) => {
    const stats = state.profiles[id]?.stats;
    const skills = Object.entries(stats?.gameSkills ?? {})
      .filter(([gid]) => sessionGameIds.includes(gid))
      .map(([gid, rating]) => `${gameName(gid)}: ${rating}`)
      .join('; ');
    return h('tr', {},
      h('td', {}, usernameOf(state, id)),
      h('td', {}, stats?.chessElo ?? '—'),
      h('td', {}, stats?.typingWpm ?? '—'),
      h('td', {}, skills || '—'),
    );
  });

  // ---- Suggestions -------------------------------------------------------------
  const suggestions = SUGGESTED_HANDICAPS.filter(
    (hc) => sessionGameIds.includes(hc.gameId) && s.playerIds.includes(hc.appliesTo),
  );
  const suggestionItems = suggestions.map((hc) =>
    h('li', {}, h('label', {},
      h('input', {
        type: 'checkbox',
        checked: isChosen(hc),
        onchange: (e: Event) => {
          const on = (e.target as HTMLInputElement).checked;
          s.handicaps = on ? [...s.handicaps, hc] : s.handicaps.filter((c) => c.id !== hc.id);
          saveState(state);
        },
      }),
      ` ${gameName(hc.gameId)}: ${hc.description}`,
    )),
  );

  // ---- Custom handicap form ----------------------------------------------------
  const gameSelect = h('select', {}, ...sessionGameIds.map((id) => h('option', { value: id }, gameName(id))));
  const playerSelect = h('select', {}, ...s.playerIds.map((id) => h('option', { value: id }, usernameOf(state, id))));
  const descInput = h('input', { required: true, size: 40, placeholder: 'e.g. plays with the monitor upside down' });
  const customForm = h('form', {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const custom: CustomHandicap = {
        id: `h-custom-${Date.now()}`,
        kind: 'custom',
        gameId: gameSelect.value,
        appliesTo: playerSelect.value,
        description: `${usernameOf(state, playerSelect.value)} ${descInput.value.trim()}`,
      };
      s.handicaps.push(custom);
      save();
    },
  },
    h('label', {}, 'Game: ', gameSelect), ' ',
    h('label', {}, 'Player: ', playerSelect), ' ',
    h('label', {}, 'Handicap: ', descInput), ' ',
    h('button', { type: 'submit' }, 'Add'),
  );

  const customItems = s.handicaps.filter((hc) => hc.kind === 'custom').map((hc) =>
    h('li', {}, `${gameName(hc.gameId)}: ${hc.description} `,
      h('button', { type: 'button', onclick: () => { s.handicaps = s.handicaps.filter((c) => c.id !== hc.id); save(); } }, 'Remove'),
    ),
  );

  mount(root, 
    h('h2', {}, 'Player stats (self-reported)'),
    h('table', { border: 1 },
      h('tr', {}, h('th', {}, 'Player'), h('th', {}, 'Chess Elo'), h('th', {}, 'WPM'), h('th', {}, 'Ratings for games in this session')),
      ...statsRows,
    ),
    h('h2', {}, 'Suggested handicaps'),
    placeholder('these suggestions are hardcoded examples. Later they will be generated from player stats.'),
    suggestionItems.length ? h('ul', {}, ...suggestionItems) : h('p', {}, 'No suggestions for these games and players.'),
    h('h2', {}, 'Add a custom handicap'),
    customForm,
    h('h2', {}, 'Custom handicaps'),
    customItems.length ? h('ul', {}, ...customItems) : h('p', {}, 'None yet.'),
    h('h2', {}, 'Ready'),
    h('p', {}, h('button', {
      type: 'button',
      onclick: () => {
        startNextRound(s);
        saveState(state);
        goTo('round');
      },
    }, 'Start the session →'), ' (handicaps are optional)'),
    h('p', {}, h('a', { href: PAGES.setup }, '← Back to Session setup (re-pick games)')),
  );
}
