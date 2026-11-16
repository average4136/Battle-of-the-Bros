// Session rules: randomizing order, reporting results, ties, deciding a winner.
//
// These functions only take data in and change or return data. They don't
// touch the page or localStorage. That keeps the rules in one place, and
// when the backend arrives the same logic can move into a Lambda function
// almost unchanged (the server should be the one deciding results).

import type { Game, GameId, Round, Room, Session, SessionFormat, UserId } from './types';

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
 * Build a session from an already-ordered list of selected games. The first
 * `format.gameCount` are queued; the rest become the pool ties draw from.
 */
export function createSession(room: Room, format: SessionFormat, orderedGameIds: GameId[]): Session {
  return {
    id: `s-${Date.now()}`,
    roomCode: room.code,
    playerIds: [...room.playerIds],
    format,
    upcomingGameIds: orderedGameIds.slice(0, format.gameCount),
    substitutePoolIds: orderedGameIds.slice(format.gameCount),
    handicaps: [],
    rounds: [],
    status: 'setup',
  };
}

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
  const round: Round = { number: session.rounds.length + 1, gameId, bestOf3: false };
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
 * most wins takes it. A tie for most wins leaves winnerId unset.
 * (Tie-breaks, 3–4 player scoring and "fastest-total" are all OPEN.)
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

export function reportWin(session: Session, winnerId: UserId, reportedBy: UserId, bestOf3: boolean): void {
  const round = currentRound(session);
  if (!round) return;
  round.bestOf3 = bestOf3;
  round.outcome = { kind: 'win', winnerId, reportedBy };
  round.playedAt = new Date().toISOString();
  finishIfDecided(session);
}

/**
 * Tie: scratch the round and put a different game at the front of the queue.
 * Replaying the same game isn't an option because daily games (Wordle) can't
 * be replayed. The substitute comes from the pool first, then from any game
 * not yet used this session. Returns the substitute, or undefined if none is left.
 */
export function scratchTie(session: Session, allGames: Game[]): GameId | undefined {
  const round = currentRound(session);
  if (!round) return undefined;

  const used = new Set([...session.rounds.map((r) => r.gameId), ...session.upcomingGameIds]);
  const fromPool = session.substitutePoolIds.filter((id) => !used.has(id));
  const fromAll = allGames.map((g) => g.id).filter((id) => !used.has(id));
  const substitute = shuffle(fromPool)[0] ?? shuffle(fromAll)[0];
  if (!substitute) return undefined;

  session.substitutePoolIds = session.substitutePoolIds.filter((id) => id !== substitute);
  session.upcomingGameIds.unshift(substitute);
  round.outcome = { kind: 'tie-scratched', substituteGameId: substitute };
  round.playedAt = new Date().toISOString();
  return substitute;
}
