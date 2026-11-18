import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { goTo, PAGES } from '../routes';
import { formatSummary, scoreTable } from '../score-view';
import { canRespondToReport, confirmReport, rejectReport, reportTie, reportWin, startNextRound } from '../session';
import { allGames, ensureLoggedIn, gameById, loadState, recordFinishedSession, saveState, usernameOf } from '../state';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
const root = appRoot();
const session = state.session;

if (!session || session.status === 'setup') {
  mount(root, h('p', {}, 'No session in progress. ', h('a', { href: PAGES.options }, 'Go to Session options')));
} else if (session.status === 'finished') {
  mount(root, h('p', {}, 'This session is over. ', h('a', { href: PAGES.results }, 'See results')));
} else {
  const s = session;
  // Normally Session options ("Start") or Between rounds has already started the round; this covers a direct visit.
  const round = startNextRound(s);
  saveState(state);

  if (!round) {
    mount(root, h('p', {}, 'No games left in the queue. ', h('a', { href: PAGES.results }, 'See results')));
  } else {
    const game = gameById(state, round.gameId);
    const handicaps = s.handicaps.filter((hc) => hc.gameId === round.gameId);
    const message = h('p', { role: 'status' });

    const other = s.playerIds.find((id) => id !== user.id);
    const otherName = other ? usernameOf(state, other) : 'the other player';

    /**
     * After any report/confirm/reject, save and move on. If the round now
     * has a final outcome, go to Between rounds (or Results if that decided
     * the session). If a report is still pending, reload to show it.
     */
    // An arrow function (not a `function` declaration) so TypeScript still
    // knows `round` is defined in here: declarations are "hoisted" (usable
    // before the line they're on), so TS can't assume the check above ran.
    const afterChange = (): void => {
      if (s.status === 'finished') recordFinishedSession(state, s);
      saveState(state);
      if (!round.outcome) location.reload();
      else goTo(s.status === 'finished' ? 'results' : 'between');
    };

    // ---- Report a winner -------------------------------------------------------
    const winnerRadios = s.playerIds.map((id) => h('input', { type: 'radio', name: 'winner', value: id, required: true }));
    const reportForm = h('form', {
      onsubmit: (e: Event) => {
        e.preventDefault();
        const winner = winnerRadios.find((r) => r.checked)?.value;
        if (!winner) return;
        reportWin(s, winner, user.id);
        afterChange();
      },
    },
      h('p', {}, 'Who won?'),
      ...s.playerIds.map((id, i) => h('p', {}, h('label', {}, winnerRadios[i], ' ', usernameOf(state, id)))),
      h('button', { type: 'submit' }, 'Report result'),
    );

    // ---- Tie ------------------------------------------------------------------
    const tieButton = h('button', {
      type: 'button',
      onclick: () => {
        if (!reportTie(s, allGames(state), user.id)) {
          message.textContent = 'No unused games left to substitute. Add more games, or report a winner.';
          return;
        }
        afterChange();
      },
    }, 'Tie: scratch this round and substitute a different game');

    // ---- What the "Report" part of the page shows ---------------------------------
    // Three cases: a report is pending and it's yours (wait), a report is
    // pending and it's the other player's (confirm or reject), or nothing is
    // pending (report the result or a tie).
    let reportSection: (HTMLElement | null)[];
    const pending = round.pendingReport;
    if (pending) {
      const what = pending.kind === 'win'
        ? `${usernameOf(state, pending.winnerId)} won`
        : 'a tie (scratch this round and substitute a different game)';
      const summary = h('p', {}, h('strong', {}, 'Pending: '), `${usernameOf(state, pending.reportedBy)} reported ${what}.`);

      reportSection = canRespondToReport(round, user.id)
        ? [
            summary,
            h('p', {},
              h('button', {
                type: 'button',
                onclick: () => {
                  if (!confirmReport(s, allGames(state), user.id)) {
                    message.textContent = 'Could not confirm: no unused games left to substitute for the tie. Reject it and report a winner instead.';
                    return;
                  }
                  afterChange();
                },
              }, 'Confirm'),
              ' ',
              h('button', {
                type: 'button',
                onclick: () => {
                  rejectReport(s, user.id);
                  afterChange();
                },
              }, 'Reject'),
            ),
            placeholder('rejecting just clears the report so the round can be reported again. This behavior is not final.'),
          ]
        : [summary, h('p', {}, `Waiting for ${otherName} to confirm or reject it.`)];
    } else {
      reportSection = [
        s.requireTwoConfirmations
          ? h('p', {}, `This session requires two confirmations: your report will wait for ${otherName} to confirm it.`)
          : null,
        reportForm,
        h('h3', {}, 'Tie?'),
        h('p', {}, tieButton),
      ];
    }

    mount(root, 
      message,
      h('h2', {}, `Round ${round.number}: ${game?.name ?? round.gameId}`),
      h('p', {}, formatSummary(s)),
      game?.url
        ? h('p', {}, h('a', { href: game.url, target: '_blank', rel: 'noopener noreferrer' }, `Open ${game.name} in a new tab ↗`))
        : h('p', {}, 'No link for this game. Play it however you agreed.'),
      round.bestOf3 ? h('p', {}, h('strong', {}, 'Play this game as a best-of-3'), ' (chosen in Session options), then report the overall winner.') : null,
      game?.isDaily ? h('p', {}, 'Daily game: it can only be played once a day, so a tie means substituting another game.') : null,
      h('h3', {}, 'Handicaps this round'),
      handicaps.length
        ? h('ul', {}, ...handicaps.map((hc) => h('li', {}, hc.description)))
        : h('p', {}, 'None.'),
      h('h3', {}, 'Score so far'),
      scoreTable(state, s),
      h('h3', {}, 'Report the result'),
      ...reportSection,
    );
  }
}
