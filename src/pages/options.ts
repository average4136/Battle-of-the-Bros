// Session options: ONE screen where everything is decided before a session
// starts: format, number of games, which games, play order, best-of-3s,
// handicaps, and how results are confirmed. It replaces the old "Session
// setup" and "Handicap setup" pages.
//
// Only the host can change anything. The other player sees the same screen
// read-only: every control is still drawn, but disabled.
//
// How this page updates: every change is saved to state straight away (in
// the real app, that's what lets the other player see it), and then render()
// rebuilds the whole page from the saved state. This "change the data, then
// redraw everything from the data" pattern means the screen can never
// disagree with what's saved. It's also the core idea behind UI frameworks
// like React, done by hand here.

import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { hostRoom } from '../room';
import { goTo, PAGES } from '../routes';
import { SUGGESTED_HANDICAPS } from '../sample-data';
import { clearOrder, createSession, isOrderRandomized, randomizeOrder, startProblem, startSession, winsNeeded } from '../session';
import { allGames, ensureLoggedIn, gameById, loadState, saveState, usernameOf } from '../state';
import type { CustomHandicap, GameId, Handicap, Session } from '../types';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
const room = state.room ?? hostRoom(state, user.id);
const isHost = user.id === room.hostId;
const games = allGames(state);
const root = appRoot();
const gameName = (id: GameId) => gameById(state, id)?.name ?? id;

// The host opening this page starts a new session in 'setup'. If the last
// session has finished ("Play again"), its options are carried over.
// The other player never creates one: they wait for the host.
if (isHost && (!state.session || state.session.status === 'finished')) {
  state.session = createSession(room, games.map((g) => g.id), state.session);
}
saveState(state);

const session = state.session;
if (!session || session.status === 'finished') {
  mount(root,
    h('p', {}, `Waiting for the host (${usernameOf(state, room.hostId)}) to open the session options.`),
    h('p', {}, h('a', { href: PAGES.lobby }, '← Back to the lobby')),
  );
} else if (session.status === 'in-progress') {
  mount(root,
    h('p', {}, 'This session has already started, so its options are locked.'),
    h('p', {}, h('a', { href: PAGES.round }, 'Go to the current round →')),
  );
} else {
  render(session);
}

/**
 * Apply a change, save it, and redraw. Every control on the page goes
 * through this, so nothing can change without being saved.
 */
function update(s: Session, change: () => void): void {
  change();
  saveState(state);
  render(s);
}

/** Rebuild the whole page from the session. Called once on load and after every change. */
function render(s: Session): void {
  // `disabled: readOnly` on every control is what makes the screen read-only
  // for the other player. Buttons that only make sense for the host are
  // left out entirely instead.
  const readOnly = !isHost;
  root.replaceChildren();
  mount(root,
    whoSection(),
    formatSection(s, readOnly),
    gamesSection(s, readOnly),
    orderSection(s, readOnly),
    handicapsSection(s, readOnly),
    reportingSection(s, readOnly),
    startSection(s),
  );
}

// ---- Who's playing, and who can edit ---------------------------------------------

function whoSection(): HTMLElement {
  return h('section', {},
    h('p', {}, h('strong', {}, isHost
      ? "You're the host: you decide everything on this screen."
      : `Only the host (${usernameOf(state, room.hostId)}) can change these options. You're seeing them read-only.`)),
    h('h2', {}, 'Players'),
    h('ol', {}, ...room.playerIds.map((id) =>
      h('li', {}, usernameOf(state, id), id === room.hostId ? ' (host)' : '', id === user.id ? ' (you)' : ''),
    )),
  );
}

// ---- Format and number of games -----------------------------------------------

function formatSection(s: Session, readOnly: boolean): HTMLElement {
  // A <select> with a disabled <option> is greyed out and unselectable using
  // only the browser's default look, which is why it's a dropdown and not radios.
  const formatSelect = h('select', { disabled: readOnly },
    h('option', { value: 'best-of', selected: true }, 'Best of X games'),
    h('option', { value: 'fastest-total', disabled: true }, 'Fastest completion of X games (coming later)'),
  );

  const countInput = h('input', {
    type: 'number', min: 1, max: s.selectedGameIds.length, value: s.format.gameCount, size: 4, disabled: readOnly,
    // 'change' fires when the value is committed (Enter, leaving the box, or
    // the arrow buttons), not on every keystroke, so typing "10" doesn't
    // redraw the page after the "1".
    onchange: (e: Event) => update(s, () => {
      s.format.gameCount = Number((e.target as HTMLInputElement).value);
      clearOrder(s);
    }),
  });

  const count = s.format.gameCount;
  return h('section', {},
    h('h2', {}, 'Format'),
    h('p', {}, h('label', {}, 'Format: ', formatSelect)),
    h('p', {}, h('label', {}, 'Number of games (X): ', countInput)),
    Number.isInteger(count) && count >= 1
      ? h('p', {}, `Best of ${count}: the first to ${winsNeeded(s.format)} wins takes the session, and it ends early once someone gets there.`)
      : null,
    count % 2 === 0 ? h('p', {}, 'Even number of games: the session can end in a tie (and stays a tie).') : null,
    h('p', {}, 'A tied round is scratched and doesn\'t count toward X: a substitute game is played immediately next.'),
  );
}

// ---- Which games, and which are best-of-3 --------------------------------------

function gamesSection(s: Session, readOnly: boolean): HTMLElement {
  const rows = games.map((game) => {
    const selected = s.selectedGameIds.includes(game.id);
    const bo3 = s.bestOf3GameIds.includes(game.id);

    const selectBox = h('input', {
      type: 'checkbox', checked: selected, disabled: readOnly,
      onchange: () => update(s, () => {
        // Keep selectedGameIds in game-list order, so it reads the same as the screen.
        const want = new Set(s.selectedGameIds);
        if (selected) want.delete(game.id);
        else want.add(game.id);
        s.selectedGameIds = games.map((g) => g.id).filter((id) => want.has(id));
        clearOrder(s);
      }),
    });

    // A daily game (Wordle) can only be played once a day, so it can't be a best-of-3.
    const bo3Box = h('input', {
      type: 'checkbox', checked: bo3 && !game.isDaily, disabled: readOnly || !selected || game.isDaily,
      onchange: () => update(s, () => {
        s.bestOf3GameIds = bo3 ? s.bestOf3GameIds.filter((id) => id !== game.id) : [...s.bestOf3GameIds, game.id];
      }),
    });

    const tags = [game.isDaily ? 'daily' : '', game.source === 'custom' ? 'custom' : ''].filter(Boolean).join(', ');
    return h('tr', {},
      h('td', {}, h('label', {}, selectBox, ' ', game.name, tags ? ` (${tags})` : '')),
      h('td', {}, h('label', {}, bo3Box, game.isDaily ? ' (daily: no)' : ' best-of-3')),
    );
  });

  return h('section', {},
    h('h2', {}, 'Games'),
    h('p', {}, `${s.selectedGameIds.length} selected. Select more than X so tied rounds have substitutes. `,
      h('a', { href: PAGES.games }, 'Add a custom game')),
    h('table', { border: 1 },
      h('tr', {}, h('th', {}, 'Play this game?'), h('th', {}, 'Play it as a best-of-3?')),
      ...rows,
    ),
    h('p', {}, 'Best-of-3 just means you play that game three times and report the overall winner. The site doesn\'t track the three sub-games.'),
  );
}

// ---- Randomized play order ------------------------------------------------------

function orderSection(s: Session, readOnly: boolean): HTMLElement {
  const preview = isOrderRandomized(s)
    ? [
        h('p', {}, 'Play order:'),
        h('ol', {}, ...s.upcomingGameIds.map((id) => h('li', {}, gameName(id)))),
        h('p', {}, 'Substitutes (drawn from if a round ties):'),
        s.substitutePoolIds.length
          ? h('ul', {}, ...s.substitutePoolIds.map((id) => h('li', {}, gameName(id))))
          : h('p', {}, 'None. Ties will pull from any other game in the list.'),
      ]
    : [h('p', {}, 'Not randomized yet. The order is randomized automatically when the session starts.')];

  return h('section', {},
    h('h2', {}, 'Play order'),
    readOnly
      ? null
      : h('p', {}, h('button', {
          type: 'button',
          disabled: s.selectedGameIds.length < s.format.gameCount || s.format.gameCount < 1,
          onclick: () => update(s, () => randomizeOrder(s)),
        }, isOrderRandomized(s) ? 'Randomize again' : 'Randomize order')),
    ...preview,
  );
}

// ---- Handicaps (formerly the Handicap setup page) -------------------------------

function handicapsSection(s: Session, readOnly: boolean): HTMLElement {
  const isChosen = (hc: Handicap) => s.handicaps.some((c) => c.id === hc.id);
  // Only show handicaps for games that are currently selected. Ones for
  // unselected games stay saved (in case the game is re-ticked) and are
  // dropped when the session starts.
  const forSelectedGame = (hc: Handicap) => s.selectedGameIds.includes(hc.gameId);

  // Player stats, for judging what's fair.
  const statsRows = s.playerIds.map((id) => {
    const stats = state.profiles[id]?.stats;
    const skills = Object.entries(stats?.gameSkills ?? {})
      .filter(([gid]) => s.selectedGameIds.includes(gid))
      .map(([gid, rating]) => `${gameName(gid)}: ${rating}`)
      .join('; ');
    return h('tr', {},
      h('td', {}, usernameOf(state, id)),
      h('td', {}, stats?.chessElo ?? '—'),
      h('td', {}, stats?.typingWpm ?? '—'),
      h('td', {}, skills || '—'),
    );
  });

  // Suggested handicaps: tick to use.
  const suggestions = SUGGESTED_HANDICAPS.filter((hc) => forSelectedGame(hc) && s.playerIds.includes(hc.appliesTo));
  const suggestionItems = suggestions.map((hc) =>
    h('li', {}, h('label', {},
      h('input', {
        type: 'checkbox', checked: isChosen(hc), disabled: readOnly,
        onchange: () => update(s, () => {
          s.handicaps = isChosen(hc) ? s.handicaps.filter((c) => c.id !== hc.id) : [...s.handicaps, structuredClone(hc)];
        }),
      }),
      ` ${gameName(hc.gameId)}: ${hc.description}`,
    )),
  );

  // Custom handicaps: the list, plus a form to add one (host only).
  const customs = s.handicaps.filter((hc) => hc.kind === 'custom' && forSelectedGame(hc));
  const customItems = customs.map((hc) =>
    h('li', {}, `${gameName(hc.gameId)}: ${hc.description} `,
      readOnly
        ? null
        : h('button', {
            type: 'button',
            onclick: () => update(s, () => { s.handicaps = s.handicaps.filter((c) => c.id !== hc.id); }),
          }, 'Remove'),
    ),
  );

  return h('section', {},
    h('h2', {}, 'Handicaps'),
    h('p', {}, 'Even out skill gaps: head starts, removed pieces, uneven clocks, or anything custom. Optional.'),
    h('h3', {}, 'Player stats (self-reported)'),
    h('table', { border: 1 },
      h('tr', {}, h('th', {}, 'Player'), h('th', {}, 'Chess Elo'), h('th', {}, 'WPM'), h('th', {}, 'Ratings for selected games')),
      ...statsRows,
    ),
    h('h3', {}, 'Suggested handicaps'),
    placeholder('these suggestions are hardcoded examples. Later they will be generated from player stats.'),
    suggestionItems.length ? h('ul', {}, ...suggestionItems) : h('p', {}, 'No suggestions for these games and players.'),
    h('h3', {}, 'Custom handicaps'),
    customItems.length ? h('ul', {}, ...customItems) : h('p', {}, 'None yet.'),
    readOnly || s.selectedGameIds.length === 0 ? null : customHandicapForm(s),
  );
}

function customHandicapForm(s: Session): HTMLElement {
  const gameSelect = h('select', {}, ...s.selectedGameIds.map((id) => h('option', { value: id }, gameName(id))));
  const playerSelect = h('select', {}, ...s.playerIds.map((id) => h('option', { value: id }, usernameOf(state, id))));
  const descInput = h('input', { required: true, size: 40, placeholder: 'e.g. plays with the monitor upside down' });
  return h('form', {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const custom: CustomHandicap = {
        id: `h-custom-${Date.now()}`,
        kind: 'custom',
        gameId: gameSelect.value,
        appliesTo: playerSelect.value,
        description: `${usernameOf(state, playerSelect.value)} ${descInput.value.trim()}`,
      };
      update(s, () => s.handicaps.push(custom));
    },
  },
    h('label', {}, 'Game: ', gameSelect), ' ',
    h('label', {}, 'Player: ', playerSelect), ' ',
    h('label', {}, 'Handicap: ', descInput), ' ',
    h('button', { type: 'submit' }, 'Add custom handicap'),
  );
}

// ---- Result reporting -------------------------------------------------------------

function reportingSection(s: Session, readOnly: boolean): HTMLElement {
  const box = h('input', {
    type: 'checkbox', checked: s.requireTwoConfirmations, disabled: readOnly,
    onchange: () => update(s, () => { s.requireTwoConfirmations = !s.requireTwoConfirmations; }),
  });
  return h('section', {},
    h('h2', {}, 'Result reporting'),
    h('p', {}, h('label', {}, box, ' Require two confirmations')),
    h('p', {}, s.requireTwoConfirmations
      ? 'On: when one player reports a result, it waits until the other player confirms it. The other player can also reject it, which clears the report so it can be reported again.'
      : 'Off (default): one player reporting a result is enough.'),
  );
}

// ---- Start ----------------------------------------------------------------------

function startSection(s: Session): HTMLElement {
  const problem = startProblem(s);
  if (!isHost) {
    return h('section', {},
      h('h2', {}, 'Ready?'),
      h('p', {}, `Waiting for the host (${usernameOf(state, room.hostId)}) to start the session.`),
      h('p', {}, h('a', { href: PAGES.round }, 'Go to the round (once the host has started) →')),
    );
  }
  return h('section', {},
    h('h2', {}, 'Ready?'),
    problem ? h('p', { role: 'status' }, h('strong', {}, problem)) : null,
    h('p', {}, h('button', {
      type: 'button',
      disabled: Boolean(problem),
      onclick: () => {
        if (startSession(s)) return; // a problem; the message is already on screen
        saveState(state);
        goTo('round');
      },
    }, 'Start the session →')),
  );
}
