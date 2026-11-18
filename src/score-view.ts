// Score and round-history views, shared by Round, Between rounds and Results.

import { h } from './dom';
import { scores, winsNeeded } from './session';
import { gameById, usernameOf, type PrototypeState } from './state';
import type { Round, Session } from './types';

export function scoreTable(state: PrototypeState, session: Session): HTMLElement {
  const tally = scores(session);
  return h('table', { border: 1 },
    h('tr', {}, h('th', {}, 'Player'), h('th', {}, 'Wins')),
    ...session.playerIds.map((id) => h('tr', {}, h('td', {}, usernameOf(state, id)), h('td', {}, tally.get(id) ?? 0))),
  );
}

export function formatSummary(session: Session): string {
  const { kind, gameCount } = session.format;
  return kind === 'best-of'
    ? `Best of ${gameCount}: first to ${winsNeeded(session.format)} wins.`
    : `Fastest completion of ${gameCount} games (coming later).`;
}

export function describeRound(state: PrototypeState, round: Round): string {
  const game = gameById(state, round.gameId)?.name ?? round.gameId;
  const o = round.outcome;
  if (!o) return `Round ${round.number}: ${game}, in progress${round.pendingReport ? ' (a result is waiting for confirmation)' : ''}`;
  const reported = `reported by ${usernameOf(state, o.reportedBy)}`
    + (o.confirmedBy ? `, confirmed by ${usernameOf(state, o.confirmedBy)}` : '');
  if (o.kind === 'tie-scratched') {
    const sub = gameById(state, o.substituteGameId)?.name ?? o.substituteGameId;
    return `Round ${round.number}: ${game}, tie, scratched (replaced by ${sub}), ${reported}`;
  }
  const bo3 = round.bestOf3 ? ' (played as best-of-3)' : '';
  return `Round ${round.number}: ${game}, won by ${usernameOf(state, o.winnerId)}${bo3}, ${reported}`;
}

export function roundHistory(state: PrototypeState, session: Session): HTMLElement {
  const done = session.rounds.filter((r) => r.outcome);
  return done.length
    ? h('ol', {}, ...done.map((r) => h('li', {}, describeRound(state, r))))
    : h('p', {}, 'No rounds played yet.');
}
