// Hardcoded sample data so the prototype feels real without a backend.
// When the backend exists, these values come from API calls instead, and
// this file shrinks to test fixtures.

import type {
  Account,
  Friendship,
  Game,
  Handicap,
  HeadToHeadRecord,
  LeaderboardEntry,
  Profile,
} from './types';

export const SAMPLE_ACCOUNTS: Account[] = [
  { id: 'u-alex', username: 'alex', email: 'alex@example.com' },
  { id: 'u-sam', username: 'sam', email: 'sam@example.com' },
  { id: 'u-jordan', username: 'jordan', email: 'jordan@example.com' },
  { id: 'u-riley', username: 'riley', email: 'riley@example.com' },
];

/** The account "Log in as sample user" uses. */
export const DEFAULT_USER_ID = 'u-alex';

// URLs are links out only. Games are never embedded. Check them before launch.
export const CURATED_GAMES: Game[] = [
  { id: 'g-typeracer', name: 'TypeRacer', url: 'https://play.typeracer.com/', isDaily: false, source: 'curated' },
  { id: 'g-monkeytype', name: 'Monkeytype (typing test)', url: 'https://monkeytype.com/', isDaily: false, source: 'curated' },
  { id: 'g-wordle', name: 'Wordle', url: 'https://www.nytimes.com/games/wordle/index.html', isDaily: true, source: 'curated' },
  { id: 'g-connections', name: 'Connections', url: 'https://www.nytimes.com/games/connections', isDaily: true, source: 'curated' },
  { id: 'g-chess', name: 'Chess (Lichess)', url: 'https://lichess.org/', isDaily: false, source: 'curated' },
  { id: 'g-tetris', name: 'Tetris', url: 'https://tetris.com/play-tetris', isDaily: false, source: 'curated' },
  { id: 'g-wikirace', name: 'Wikipedia speedrun', url: 'https://www.thewikigame.com/', isDaily: false, source: 'curated' },
  { id: 'g-reaction', name: 'Reaction time test', url: 'https://humanbenchmark.com/tests/reactiontime', isDaily: false, source: 'curated' },
  { id: 'g-geoguessr', name: 'GeoGuessr', url: 'https://www.geoguessr.com/', isDaily: false, source: 'curated' },
];

export const SAMPLE_PROFILES: Profile[] = [
  {
    userId: 'u-alex',
    stats: {
      chessElo: 1450,
      typingWpm: 95,
      gameSkills: { 'g-chess': 'really-good', 'g-typeracer': 'pretty-good', 'g-tetris': 'really-bad' },
    },
  },
  {
    userId: 'u-sam',
    stats: {
      chessElo: 900,
      typingWpm: 70,
      gameSkills: { 'g-tetris': 'really-good', 'g-wordle': 'pretty-good', 'g-chess': 'really-bad' },
    },
  },
  { userId: 'u-jordan', stats: { typingWpm: 110, gameSkills: { 'g-typeracer': 'really-good' } } },
  { userId: 'u-riley', stats: { gameSkills: {} } },
];

/**
 * Hardcoded handicap ideas. Later the site will generate these from
 * profile stats (Alex's 1450 vs Sam's 900 Elo suggests Alex loses the queen).
 * For now the Session options screen just shows the ones that fit the session.
 */
export const SUGGESTED_HANDICAPS: Handicap[] = [
  {
    id: 'h-chess-queen',
    kind: 'remove-pieces',
    gameId: 'g-chess',
    appliesTo: 'u-alex',
    pieces: ['queen'],
    description: 'alex plays without a queen (Elo 1450 vs 900)',
  },
  {
    id: 'h-chess-clock',
    kind: 'time-ratio',
    gameId: 'g-chess',
    appliesTo: 'u-alex',
    handicappedSeconds: 60,
    opponentSeconds: 300,
    description: 'alex gets 1 min on the clock, sam gets 5 min',
  },
  {
    id: 'h-tetris-headstart',
    kind: 'head-start',
    gameId: 'g-tetris',
    appliesTo: 'u-sam',
    seconds: 60,
    description: 'alex gets a 1 min head start (sam rates Tetris "really good")',
  },
  {
    id: 'h-typeracer-headstart',
    kind: 'head-start',
    gameId: 'g-typeracer',
    appliesTo: 'u-alex',
    seconds: 5,
    description: 'sam starts typing 5 s before alex (95 vs 70 WPM)',
  },
];

export const SAMPLE_FRIENDSHIPS: Friendship[] = [
  { userA: 'u-alex', userB: 'u-sam' },
  { userA: 'u-alex', userB: 'u-jordan' },
  { userA: 'u-alex', userB: 'u-riley' },
];

export const SAMPLE_HEAD_TO_HEAD: HeadToHeadRecord[] = [
  { playerA: 'u-alex', playerB: 'u-sam', sessionsWonByA: 7, sessionsWonByB: 5 },
  { playerA: 'u-alex', playerB: 'u-jordan', sessionsWonByA: 2, sessionsWonByB: 4 },
  { playerA: 'u-alex', playerB: 'u-riley', sessionsWonByA: 1, sessionsWonByB: 0 },
];

export const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  { userId: 'u-alex', currentWinStreak: 2, bestWinStreak: 4, sessionsPlayed: 19, sessionsWon: 10 },
  { userId: 'u-sam', currentWinStreak: 0, bestWinStreak: 3, sessionsPlayed: 12, sessionsWon: 5 },
  { userId: 'u-jordan', currentWinStreak: 3, bestWinStreak: 3, sessionsPlayed: 6, sessionsWon: 4 },
  { userId: 'u-riley', currentWinStreak: 0, bestWinStreak: 1, sessionsPlayed: 1, sessionsWon: 0 },
];
