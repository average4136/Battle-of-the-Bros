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

// ---- Leaderboard: you and your friends, by current win streak ----------------
const circle = new Set([user.id, ...friendIds]);
const board = state.leaderboard
  .filter((e) => circle.has(e.userId))
  .sort((a, b) => b.currentWinStreak - a.currentWinStreak || b.bestWinStreak - a.bestWinStreak);
const boardRows = board.map((e, i) =>
  h('tr', {},
    h('td', {}, i + 1),
    h('td', {}, usernameOf(state, e.userId)),
    h('td', {}, e.currentWinStreak),
    h('td', {}, e.bestWinStreak),
    h('td', {}, `${e.sessionsWon}/${e.sessionsPlayed}`),
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
  h('h2', {}, 'Leaderboard (all games)'),
  boardRows.length
    ? h('table', { border: 1 },
        h('tr', {}, h('th', {}, '#'), h('th', {}, 'Player'), h('th', {}, 'Current streak'), h('th', {}, 'Best streak'), h('th', {}, 'Won/Played')),
        ...boardRows)
    : h('p', {}, 'Nothing to rank yet.'),
  h('h2', {}, 'Chat'),
  placeholder('friends-only chat will go here.'),
  h('p', {}, h('a', { href: PAGES.lobby }, 'Go to your lobby to play a friend →')),
);
