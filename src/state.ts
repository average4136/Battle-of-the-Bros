// Prototype state that carries between pages.
//
// Why localStorage: each screen is a separate HTML page, so clicking a link
// is a full page load and wipes every JavaScript variable. localStorage is a
// small key/value store in the browser that survives page loads (and browser
// restarts), so each page reads the state on load and writes it after a change.
//
// With a real backend, most of this moves server-side (rooms, sessions,
// records) and the browser keeps only a login token and perhaps a cache.

import {
  DEFAULT_USER_ID,
  SAMPLE_ACCOUNTS,
  SAMPLE_HEAD_TO_HEAD,
  SAMPLE_LEADERBOARD,
  SAMPLE_PROFILES,
  CURATED_GAMES,
} from './sample-data';
import type {
  Account,
  Game,
  GameId,
  HeadToHeadRecord,
  LeaderboardEntry,
  Profile,
  Room,
  Session,
  UserId,
} from './types';

export interface PrototypeState {
  currentUserId?: UserId;
  accounts: Account[];
  profiles: Record<UserId, Profile>;
  customGames: Game[];
  headToHead: HeadToHeadRecord[];
  leaderboard: LeaderboardEntry[];
  room?: Room;
  session?: Session;
}

// Bump the version suffix whenever PrototypeState changes shape, so old saved
// data from an earlier build is ignored instead of crashing the page.
// v2 (2026-11-18): Session gained selectedGameIds, bestOf3GameIds and
// requireTwoConfirmations; Round gained pendingReport.
const STORAGE_KEY = 'botb-prototype-v2';

function freshState(): PrototypeState {
  // structuredClone stops edits to the state from changing the sample constants.
  return structuredClone({
    accounts: SAMPLE_ACCOUNTS,
    profiles: Object.fromEntries(SAMPLE_PROFILES.map((p) => [p.userId, p])),
    customGames: [],
    headToHead: SAMPLE_HEAD_TO_HEAD,
    leaderboard: SAMPLE_LEADERBOARD,
  });
}

export function loadState(): PrototypeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PrototypeState;
  } catch {
    // Corrupt JSON or storage blocked (private window): start fresh.
  }
  return freshState();
}

export function saveState(state: PrototypeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked. The prototype still works on this page; it just won't carry over.
  }
}

export function resetState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

// ---- Small lookups used by many pages ---------------------------------------

export function allGames(state: PrototypeState): Game[] {
  return [...CURATED_GAMES, ...state.customGames];
}

export function gameById(state: PrototypeState, id: GameId): Game | undefined {
  return allGames(state).find((g) => g.id === id);
}

export function usernameOf(state: PrototypeState, id: UserId): string {
  return state.accounts.find((a) => a.id === id)?.username ?? id;
}

export function currentUser(state: PrototypeState): Account | undefined {
  return state.accounts.find((a) => a.id === state.currentUserId);
}

/** Log in as the sample user if nobody is logged in. Keeps deep links usable while testing. */
export function ensureLoggedIn(state: PrototypeState): Account {
  if (!currentUser(state)) state.currentUserId = DEFAULT_USER_ID;
  return currentUser(state)!;
}

/**
 * Update the head-to-head record and leaderboard once a session finishes.
 * A tied session (no winnerId) counts as played for both, but as a win for nobody.
 */
export function recordFinishedSession(state: PrototypeState, session: Session): void {
  // Sessions are always 1v1 in v1 (session.ts enforces it); this guard just
  // keeps the destructuring below safe if that ever changes.
  if (session.playerIds.length !== 2) return;
  const [p1, p2] = session.playerIds;
  const winner = session.winnerId;

  let record = state.headToHead.find(
    (r) => (r.playerA === p1 && r.playerB === p2) || (r.playerA === p2 && r.playerB === p1),
  );
  if (!record) {
    record = { playerA: p1, playerB: p2, sessionsWonByA: 0, sessionsWonByB: 0 };
    state.headToHead.push(record);
  }
  if (winner === record.playerA) record.sessionsWonByA++;
  if (winner === record.playerB) record.sessionsWonByB++;

  for (const id of session.playerIds) {
    let entry = state.leaderboard.find((e) => e.userId === id);
    if (!entry) {
      entry = { userId: id, currentWinStreak: 0, bestWinStreak: 0, sessionsPlayed: 0, sessionsWon: 0 };
      state.leaderboard.push(entry);
    }
    entry.sessionsPlayed++;
    if (id === winner) {
      entry.sessionsWon++;
      entry.currentWinStreak++;
      entry.bestWinStreak = Math.max(entry.bestWinStreak, entry.currentWinStreak);
    } else if (winner) {
      entry.currentWinStreak = 0;
    }
  }
}
