import { appRoot, h, mount, openNote } from '../dom';
import { renderChrome } from '../page-chrome';
import { goTo, PAGES } from '../routes';
import { formatSummary, scoreTable } from '../score-view';
import { reportWin, scratchTie, startNextRound } from '../session';
import { allGames, ensureLoggedIn, gameById, loadState, recordFinishedSession, saveState, usernameOf } from '../state';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
const root = appRoot();
const session = state.session;

if (!session || session.status === 'setup') {
  mount(root, h('p', {}, 'No session in progress. ', h('a', { href: PAGES.setup }, 'Go to Session setup')));
} else if (session.status === 'finished') {
  mount(root, h('p', {}, 'This session is over. ', h('a', { href: PAGES.results }, 'See results')));
} else {
  const s = session;
  // Normally Handicap setup or Between rounds has already started the round; this covers a direct visit.
  const round = startNextRound(s);
  saveState(state);

  if (!round) {
    mount(root, h('p', {}, 'No games left in the queue. ', h('a', { href: PAGES.results }, 'See results')));
  } else {
    const game = gameById(state, round.gameId);
    const handicaps = s.handicaps.filter((hc) => hc.gameId === round.gameId);
    const message = h('p', { role: 'status' });

    // ---- Report a winner -------------------------------------------------------
    const bestOf3Box = h('input', { type: 'checkbox', checked: round.bestOf3 });
    const winnerRadios = s.playerIds.map((id) => h('input', { type: 'radio', name: 'winner', value: id, required: true }));
    const reportForm = h('form', {
      onsubmit: (e: Event) => {
        e.preventDefault();
        const winner = winnerRadios.find((r) => r.checked)?.value;
        if (!winner) return;
        reportWin(s, winner, user.id, bestOf3Box.checked);
        if (s.status === 'finished') recordFinishedSession(state, s);
        saveState(state);
        goTo(s.status === 'finished' ? 'results' : 'between');
      },
    },
      h('p', {}, h('label', {}, bestOf3Box, ' We played this game as a best-of-3 (optional; report the overall winner)')),
      h('p', {}, 'Who won?'),
      ...s.playerIds.map((id, i) => h('p', {}, h('label', {}, winnerRadios[i], ' ', usernameOf(state, id)))),
      s.format.kind === 'fastest-total'
        ? openNote('in "fastest completion" mode, should players report a time here instead of (or as well as) a winner?')
        : null,
      h('button', { type: 'submit' }, 'Report result'),
    );

    // ---- Tie ------------------------------------------------------------------
    const tieButton = h('button', {
      type: 'button',
      onclick: () => {
        const substitute = scratchTie(s, allGames(state));
        if (!substitute) {
          message.textContent = 'No unused games left to substitute. Add more games, or report a winner.';
          return;
        }
        saveState(state);
        goTo('between');
      },
    }, 'Tie: scratch this round and substitute a different game');

    mount(root, 
      message,
      h('h2', {}, `Round ${round.number}: ${game?.name ?? round.gameId}`),
      h('p', {}, formatSummary(s)),
      game?.url
        ? h('p', {}, h('a', { href: game.url, target: '_blank', rel: 'noopener noreferrer' }, `Open ${game.name} in a new tab ↗`))
        : h('p', {}, 'No link for this game. Play it however you agreed.'),
      game?.isDaily ? h('p', {}, 'Daily game: it can only be played once a day, so a tie means substituting another game.') : null,
      h('h3', {}, 'Handicaps this round'),
      handicaps.length
        ? h('ul', {}, ...handicaps.map((hc) => h('li', {}, hc.description)))
        : h('p', {}, 'None.'),
      h('h3', {}, 'Score so far'),
      scoreTable(state, s),
      h('h3', {}, 'Report the result'),
      openNote("does one player's reported result need the other player's confirmation? Right now whoever reports it decides."),
      reportForm,
      h('h3', {}, 'Tie?'),
      h('p', {}, tieButton),
    );
  }
}
