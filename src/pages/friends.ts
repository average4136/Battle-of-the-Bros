import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { PAGES } from '../routes';
import { SAMPLE_FRIENDSHIPS } from '../sample-data';
import { ensureLoggedIn, loadState, saveState, usernameOf } from '../state';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
saveState(state);
const root = appRoot();

const friendIds = SAMPLE_FRIENDSHIPS.flatMap((f) =>
  f.userA === user.id ? [f.userB] : f.userB === user.id ? [f.userA] : [],
);

// ---- Head-to-head: your record against each friend ---------------------------
const h2hRows = friendIds.map((friendId) => {
  const rec = state.headToHead.find(
    (r) => (r.playerA === user.id && r.playerB === friendId) || (r.playerA === friendId && r.playerB === user.id),
  );
  // Records are stored once per pair, so flip them if you're stored as "B".
  const mine = !rec ? 0 : rec.playerA === user.id ? rec.sessionsWonByA : rec.sessionsWonByB;
  const theirs = !rec ? 0 : rec.playerA === user.id ? rec.sessionsWonByB : rec.sessionsWonByA;
  return h('tr', {}, h('td', {}, usernameOf(state, friendId)), h('td', {}, mine), h('td', {}, theirs));
});

// ---- Leaderboard: you and your friends, by total session wins ---------------
// Ties on wins go to whoever needed fewer sessions to get them (better win
// rate). That tie-break is an assumption; see docs/UPDATE_2026-11-18.md.
const circle = new Set([user.id, ...friendIds]);
const board = state.leaderboard
  .filter((e) => circle.has(e.userId))
  .sort((a, b) => b.sessionsWon - a.sessionsWon || a.sessionsPlayed - b.sessionsPlayed);
const boardRows = board.map((e, i) =>
  h('tr', {},
    h('td', {}, i + 1),
    h('td', {}, usernameOf(state, e.userId)),
    h('td', {}, e.sessionsWon),
    h('td', {}, e.sessionsPlayed),
    h('td', {}, e.currentWinStreak),
  ),
);

mount(root, 
  h('h2', {}, 'Head-to-head'),
  friendIds.length
    ? h('table', { border: 1 },
        h('tr', {}, h('th', {}, 'Friend'), h('th', {}, 'Your session wins'), h('th', {}, 'Their session wins')),
        ...h2hRows)
    : h('p', {}, 'No friends yet.'),
  placeholder('add friends by username here.'),
  h('h2', {}, 'Leaderboard (total session wins, all games)'),
  boardRows.length
    ? h('table', { border: 1 },
        h('tr', {}, h('th', {}, '#'), h('th', {}, 'Player'), h('th', {}, 'Total wins'), h('th', {}, 'Sessions played'), h('th', {}, 'Current streak')),
        ...boardRows)
    : h('p', {}, 'Nothing to rank yet.'),
  h('h2', {}, 'Chat'),
  placeholder('friends-only chat will go here.'),
  h('p', {}, h('a', { href: PAGES.lobby }, 'Go to your lobby to play a friend →')),
);
