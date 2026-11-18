// =============================================================================
// Battle of the Bros: core data model
// =============================================================================
// Every shared type lives in this one file, so it can be read top to bottom
// like a class diagram. Sections run from "who" (accounts, profiles) to
// "what" (games, handicaps) to "a match being played" (room, session, rounds).
//
// Conventions:
//   - IDs are plain strings, with aliases (UserId, GameId...) so a signature
//     like (winner: UserId) says what it means.
//   - "kind" fields make discriminated unions: TypeScript checks you handle
//     each variant. In UML these map to an abstract parent with subclasses.
//   - Fields marked OPEN depend on decisions not made yet. See
//     docs/FOUNDATION_NOTES.md, "Questions for me".
// =============================================================================

export type UserId = string;
export type GameId = string;
export type RoomCode = string;
export type SessionId = string;
/** ISO-8601 timestamp, e.g. "2026-11-16T14:03:00Z". Strings survive JSON/DynamoDB unchanged. */
export type Timestamp = string;

// -----------------------------------------------------------------------------
// 1. Accounts and profiles
// -----------------------------------------------------------------------------

/**
 * A login identity. Deliberately minimal (username, email, password).
 * There is no password field: passwords never belong in frontend data. The
 * real backend will store only a salted hash, or hand auth off to a service.
 */
export interface Account {
  id: UserId;
  username: string;
  email: string;
}

/** How a player rates themselves at one game. Used to suggest handicaps. */
export type SkillRating = 'really-good' | 'pretty-good' | 'really-bad';

/**
 * Self-reported fairness stats. All optional because players fill in only
 * what they know. Kept apart from Account because they change often and
 * have nothing to do with logging in.
 */
export interface FairnessStats {
  chessElo?: number;
  typingWpm?: number;
  /** Games the player has rated. A game missing here means "average / no opinion". */
  gameSkills: Partial<Record<GameId, SkillRating>>;
}

export interface Profile {
  userId: UserId;
  stats: FairnessStats;
}

// -----------------------------------------------------------------------------
// 2. Games
// -----------------------------------------------------------------------------

/**
 * A minigame. The site never hosts games: it only names them and
 * (optionally) links out to them.
 */
export interface Game {
  id: GameId;
  name: string;
  /** Link to play it. Optional: some games ("arm wrestling") have no URL. */
  url?: string;
  /**
   * Daily games (Wordle) can be played only once per day, so a tie can't be
   * replayed. This is why ties scratch the round and substitute a new game.
   */
  isDaily: boolean;
  source: 'curated' | 'custom';
  /** Who added it. Only set for custom games. */
  addedBy?: UserId;
}

// -----------------------------------------------------------------------------
// 3. Handicaps
// -----------------------------------------------------------------------------
// A handicap always applies to one player in one game. The variants below are
// the decided types, plus "custom" for anything else players invent.

interface HandicapBase {
  id: string;
  gameId: GameId;
  /** The player who is handicapped (the stronger player, usually). */
  appliesTo: UserId;
  /** Human-readable summary shown on screen, e.g. "Alex starts 1 min later". */
  description: string;
}

/** The other player gets a head start, e.g. +60 s in Tetris. */
export interface HeadStartHandicap extends HandicapBase {
  kind: 'head-start';
  seconds: number;
}

/** The handicapped player plays without some pieces, e.g. chess with no queen. */
export interface RemovePiecesHandicap extends HandicapBase {
  kind: 'remove-pieces';
  pieces: string[];
}

/** Uneven clocks, e.g. 30 s vs 5 min in chess. */
export interface TimeRatioHandicap extends HandicapBase {
  kind: 'time-ratio';
  handicappedSeconds: number;
  opponentSeconds: number;
}

/** Free-text handicap that players make up. */
export interface CustomHandicap extends HandicapBase {
  kind: 'custom';
}

export type Handicap =
  | HeadStartHandicap
  | RemovePiecesHandicap
  | TimeRatioHandicap
  | CustomHandicap;

// -----------------------------------------------------------------------------
// 4. Rooms (who is here)
// -----------------------------------------------------------------------------

/**
 * v1 is 1v1 only: a session needs exactly this many players.
 * The data model below still uses arrays (playerIds: UserId[]) rather than
 * fixed "player1/player2" fields, so supporting more players later means
 * changing this number and the rules in session.ts, not every type.
 */
export const PLAYERS_PER_SESSION = 2;

/** A room holds exactly the players for one session, so the caps match. */
export const MAX_PLAYERS_PER_ROOM = PLAYERS_PER_SESSION;

/**
 * An online room friends join with a short code. A room outlives a single
 * session: the same pair can play several sessions in a row.
 */
export interface Room {
  code: RoomCode;
  hostId: UserId;
  /** 1 to MAX_PLAYERS_PER_ROOM players. */
  playerIds: UserId[];
  /** Not used in v1 (no spectators). Kept so adding them later doesn't change the shape. */
  spectatorIds: UserId[];
}

// -----------------------------------------------------------------------------
// 5. Sessions, rounds and results (a match being played)
// -----------------------------------------------------------------------------

/**
 * How a session is won. The host chooses this on the Session options screen.
 *  - best-of: first to win a majority of `gameCount` games; ends early once
 *    someone has it (best of 3 ends at 2 wins).
 *  - fastest-total: "coming later". Shown on the options screen but can't be
 *    selected yet; the rules aren't decided. Kept in the type so adding it
 *    later doesn't change the shape of saved data.
 */
export interface SessionFormat {
  kind: 'best-of' | 'fastest-total';
  gameCount: number;
}

/**
 * What happened in one round. A union because a tie isn't "a result with no
 * winner". It has its own consequence: the round is thrown out and replaced.
 */
export type RoundOutcome =
  | {
      kind: 'win';
      winnerId: UserId;
      reportedBy: UserId;
      /** OPEN: does an opponent need to confirm a reported result? */
      confirmedBy?: UserId;
      /** OPEN: only meaningful once "fastest-total" is defined. */
      timeSeconds?: number;
    }
  | {
      kind: 'tie-scratched';
      /** The game swapped in to replace this round. */
      substituteGameId: GameId;
    };

/** One game played (or scratched) within a session. */
export interface Round {
  /** Position in play order, starting at 1. Scratched rounds keep their number. */
  number: number;
  gameId: GameId;
  /**
   * Played as a best-of-3 (copied from Session.bestOf3GameIds when the round
   * starts). Just a label: players report the overall winner, and the site
   * doesn't track the three sub-games.
   */
  bestOf3: boolean;
  /** Undefined while the round is in progress. */
  outcome?: RoundOutcome;
  playedAt?: Timestamp;
}

export type SessionStatus = 'setup' | 'in-progress' | 'finished';

/**
 * One competition: a format, a randomized queue of games, handicaps, and
 * the rounds played so far.
 *
 * While status is 'setup', the host edits the options below on the Session
 * options screen (the other player sees them read-only). Once the session
 * starts, the options are locked.
 */
export interface Session {
  id: SessionId;
  roomCode: RoomCode;
  playerIds: UserId[];

  // ---- Options (decided on the Session options screen) ----
  format: SessionFormat;
  /** Games the host ticked, in game-list order. The play order is decided by randomizing. */
  selectedGameIds: GameId[];
  /** Selected games to be played as a best-of-3 within the game. */
  bestOf3GameIds: GameId[];
  handicaps: Handicap[];

  // ---- Play order (filled in by "Randomize", or automatically at start) ----
  /** Games still to be played, in order. The front is the next game. Empty in setup = not randomized yet. */
  upcomingGameIds: GameId[];
  /** Selected games not in the queue. Ties draw substitutes from here. */
  substitutePoolIds: GameId[];

  // ---- Play ----
  /** Rounds played so far, including scratched ones, in order. */
  rounds: Round[];
  status: SessionStatus;
  winnerId?: UserId;
}

// -----------------------------------------------------------------------------
// 6. History and social
// -----------------------------------------------------------------------------

/** Lifetime record between two friends, stored once per pair. */
export interface HeadToHeadRecord {
  playerA: UserId;
  playerB: UserId;
  sessionsWonByA: number;
  sessionsWonByB: number;
}

/** Leaderboard stats. These span all games, not one game. */
export interface LeaderboardEntry {
  userId: UserId;
  currentWinStreak: number;
  bestWinStreak: number;
  sessionsPlayed: number;
  sessionsWon: number;
}

export interface Friendship {
  userA: UserId;
  userB: UserId;
}

/** Friends-only chat. Only a placeholder for now; nothing sends these yet. */
export interface ChatMessage {
  from: UserId;
  /** Room code for in-lobby chat, or a friend's id for direct messages. */
  to: RoomCode | UserId;
  text: string;
  sentAt: Timestamp;
}
