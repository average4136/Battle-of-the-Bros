// Session rules: randomizing order, reporting results, ties, deciding a winner.
//
// These functions only take data in and change or return data. They don't
// touch the page or localStorage. That keeps the rules in one place, and
// when the backend arrives the same logic can move into a Lambda function
// almost unchanged (the server should be the one deciding results).

import { PLAYERS_PER_SESSION, type Game, type GameId, type Round, type Room, type Session, type SessionFormat, type UserId } from './types';

/**
 * Fisher–Yates shuffle: walk backwards, swap each item with a random earlier
 * one. Every order is equally likely, unlike the common
 * `sort(() => Math.random() - 0.5)` trick, which is biased.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * v1 rule: a session starts only with exactly PLAYERS_PER_SESSION (2) players.
 * Pages call this to decide whether to offer "start"; it lives here, with the
 * other rules, so there's one place to change when more players are allowed.
 */
export function hasRightPlayerCount(playerIds: readonly UserId[]): boolean {
  return playerIds.length === PLAYERS_PER_SESSION;
}

// ---- Setup: the Session options screen ---------------------------------------

/**
 * A new session in 'setup' status with default options: best of 3, every
 * game selected, no handicaps, one report is enough. If `previous` is given (from "Play again"),
 * its options are copied instead, so a rematch starts with the same settings.
 * The play order is never copied: it gets randomized again.
 */
export function createSession(room: Room, allGameIds: GameId[], previous?: Session): Session {
  return {
    id: `s-${Date.now()}`,
    roomCode: room.code,
    playerIds: [...room.playerIds],
    format: previous ? { ...previous.format } : { kind: 'best-of', gameCount: 3 },
    // Only keep previously selected games that still exist (a custom game may have been removed).
    selectedGameIds: previous ? previous.selectedGameIds.filter((id) => allGameIds.includes(id)) : [...allGameIds],
    bestOf3GameIds: previous ? [...previous.bestOf3GameIds] : [],
    handicaps: previous ? structuredClone(previous.handicaps) : [],
    requireTwoConfirmations: previous?.requireTwoConfirmations ?? false,
    upcomingGameIds: [],
    substitutePoolIds: [],
    rounds: [],
    status: 'setup',
  };
}

/** True once the host has pressed Randomize (or the session has started). */
export function isOrderRandomized(session: Session): boolean {
  return session.upcomingGameIds.length > 0;
}

/**
 * Throw away the randomized order. Called whenever the selection or the
 * number of games changes, so the preview can never show games that are no
 * longer selected.
 */
export function clearOrder(session: Session): void {
  session.upcomingGameIds = [];
  session.substitutePoolIds = [];
}

/** Shuffle the selected games. The first `gameCount` are queued; the rest become the tie-substitute pool. */
export function randomizeOrder(session: Session): void {
  const order = shuffle(session.selectedGameIds);
  session.upcomingGameIds = order.slice(0, session.format.gameCount);
  session.substitutePoolIds = order.slice(session.format.gameCount);
}

/**
 * Why the session can't start yet, as a message for the screen, or
 * undefined if it's ready. The page uses this to show the problem and
 * to disable the Start button.
 */
export function startProblem(session: Session): string | undefined {
  const { gameCount } = session.format;
  if (!hasRightPlayerCount(session.playerIds)) return 'A session needs exactly 2 players.';
  if (session.format.kind !== 'best-of') return 'Only "Best of X" is available for now.';
  if (!Number.isInteger(gameCount) || gameCount < 1) return 'Number of games must be at least 1.';
  if (session.selectedGameIds.length < gameCount) {
    return `Number of games is ${gameCount} but only ${session.selectedGameIds.length} game(s) are selected.`;
  }
  return undefined;
}

/**
 * Lock the options and start round 1. Returns a problem message instead if
 * the session isn't ready (see startProblem).
 */
export function startSession(session: Session): string | undefined {
  const problem = startProblem(session);
  if (problem) return problem;
  // Random order is the default: if nobody pressed Randomize, do it now.
  if (!isOrderRandomized(session)) randomizeOrder(session);
  // Drop options that point at games which ended up unselected.
  const selected = new Set(session.selectedGameIds);
  session.handicaps = session.handicaps.filter((hc) => selected.has(hc.gameId));
  session.bestOf3GameIds = session.bestOf3GameIds.filter((id) => selected.has(id));
  startNextRound(session);
  return undefined;
}

// ---- Play ---------------------------------------------------------------------

/** The round being played right now, if any. */
export function currentRound(session: Session): Round | undefined {
  const last = session.rounds[session.rounds.length - 1];
  return last && !last.outcome ? last : undefined;
}

/** Move the next queued game into a new round. Returns it, or undefined if the queue is empty. */
export function startNextRound(session: Session): Round | undefined {
  const existing = currentRound(session);
  if (existing) return existing;
  const gameId = session.upcomingGameIds.shift();
  if (!gameId) return undefined;
  const round: Round = { number: session.rounds.length + 1, gameId, bestOf3: session.bestOf3GameIds.includes(gameId) };
  session.rounds.push(round);
  session.status = 'in-progress';
  return round;
}

/** Wins per player. Scratched rounds count for nobody. */
export function scores(session: Session): Map<UserId, number> {
  const tally = new Map<UserId, number>(session.playerIds.map((id) => [id, 0]));
  for (const round of session.rounds) {
    if (round.outcome?.kind === 'win') {
      const id = round.outcome.winnerId;
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
  }
  return tally;
}

/** Wins needed to clinch a best-of session early, e.g. 3 in a best-of-5. */
export function winsNeeded(format: SessionFormat): number {
  return Math.floor(format.gameCount / 2) + 1;
}

/**
 * Finish the session if it's decided. Best-of ends early once someone
 * reaches a majority. Otherwise it ends when the queue runs out, and the
 * most wins takes it. Equal wins is a tied session: winnerId stays unset
 * and it stays a tie (decided: no sudden-death game). "fastest-total" isn't
 * built yet, so only best-of can be chosen.
 */
function finishIfDecided(session: Session): void {
  const tally = scores(session);
  const best = Math.max(...tally.values());
  const leaders = [...tally].filter(([, wins]) => wins === best).map(([id]) => id);

  const clinched = session.format.kind === 'best-of' && best >= winsNeeded(session.format);
  const outOfGames = session.upcomingGameIds.length === 0 && !currentRound(session);

  if (clinched || outOfGames) {
    session.status = 'finished';
    session.winnerId = leaders.length === 1 ? leaders[0] : undefined;
  }
}

// ---- Reporting results ------------------------------------------------------------
//
// Either player can report a result. What happens next depends on the
// session's "Require two confirmations" option:
//   - off (default): the report is final straight away.
//   - on: the report waits on the round as `pendingReport` until the other
//     player confirms it (then it's final) or rejects it (then it's deleted
//     and the round can be reported again; placeholder behavior).
// While a report is pending, no new report can be made for that round.

/** Report that `winnerId` won the current round. Ignored if a report is already pending. */
export function reportWin(session: Session, winnerId: UserId, reportedBy: UserId): void {
  const round = currentRound(session);
  if (!round || round.pendingReport) return;
  if (session.requireTwoConfirmations) {
    round.pendingReport = { kind: 'win', winnerId, reportedBy };
  } else {
    finalizeWin(session, round, winnerId, reportedBy);
  }
}

/**
 * Report a tie: the round gets scratched and a different game is played
 * immediately next (see finalizeTie). Returns false, changing nothing, if
 * there's no unused game left to substitute, or a report is already pending.
 */
export function reportTie(session: Session, allGames: Game[], reportedBy: UserId): boolean {
  const round = currentRound(session);
  if (!round || round.pendingReport) return false;
  const substitute = pickSubstitute(session, allGames);
  if (!substitute) return false;
  if (session.requireTwoConfirmations) {
    // Only check a substitute exists now; the actual one is picked on confirm.
    round.pendingReport = { kind: 'tie', reportedBy };
  } else {
    finalizeTie(session, round, substitute, reportedBy);
  }
  return true;
}

/** Only the player who didn't make the pending report may confirm or reject it. */
export function canRespondToReport(round: Round, userId: UserId): boolean {
  return round.pendingReport !== undefined && round.pendingReport.reportedBy !== userId;
}

/**
 * The other player confirms the pending report, making it final.
 * Returns false (nothing changes) if they aren't allowed to, or if a tie
 * can no longer find a substitute game.
 */
export function confirmReport(session: Session, allGames: Game[], confirmerId: UserId): boolean {
  const round = currentRound(session);
  if (!round || !canRespondToReport(round, confirmerId)) return false;
  const pending = round.pendingReport!;
  if (pending.kind === 'win') {
    round.pendingReport = undefined;
    finalizeWin(session, round, pending.winnerId, pending.reportedBy, confirmerId);
    return true;
  }
  const substitute = pickSubstitute(session, allGames);
  if (!substitute) return false;
  round.pendingReport = undefined;
  finalizeTie(session, round, substitute, pending.reportedBy, confirmerId);
  return true;
}

/**
 * PLACEHOLDER BEHAVIOR (open question): the other player rejects the pending
 * report. It's simply deleted, so either player can report the round again.
 * Nothing records that a rejection happened.
 */
export function rejectReport(session: Session, rejecterId: UserId): void {
  const round = currentRound(session);
  if (!round || !canRespondToReport(round, rejecterId)) return;
  round.pendingReport = undefined;
}

// ---- Making a result final (used by the functions above) ---------------------------

function finalizeWin(session: Session, round: Round, winnerId: UserId, reportedBy: UserId, confirmedBy?: UserId): void {
  round.outcome = { kind: 'win', winnerId, reportedBy, confirmedBy };
  round.playedAt = new Date().toISOString();
  finishIfDecided(session);
}

/**
 * Tie: scratch the round and put a different game at the front of the queue,
 * so it's played immediately next. Replaying the same game isn't an option
 * because daily games (Wordle) can't be replayed. A scratched round doesn't
 * count toward X.
 */
function finalizeTie(session: Session, round: Round, substitute: GameId, reportedBy: UserId, confirmedBy?: UserId): void {
  session.substitutePoolIds = session.substitutePoolIds.filter((id) => id !== substitute);
  session.upcomingGameIds.unshift(substitute);
  round.outcome = { kind: 'tie-scratched', substituteGameId: substitute, reportedBy, confirmedBy };
  round.playedAt = new Date().toISOString();
}

/**
 * Choose a substitute game for a tie, without changing anything. It comes
 * from the session's substitute pool first, then from any game not yet used
 * this session. Undefined if there's none left.
 */
function pickSubstitute(session: Session, allGames: Game[]): GameId | undefined {
  const used = new Set([...session.rounds.map((r) => r.gameId), ...session.upcomingGameIds]);
  const fromPool = session.substitutePoolIds.filter((id) => !used.has(id));
  const fromAll = allGames.map((g) => g.id).filter((id) => !used.has(id));
  return shuffle(fromPool)[0] ?? shuffle(fromAll)[0];
}
