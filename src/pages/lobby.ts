import { appRoot, h, mount, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { addSamplePlayer, hostRoom } from '../room';
import { goTo, PAGES } from '../routes';
import { hasRightPlayerCount } from '../session';
import { ensureLoggedIn, loadState, saveState, usernameOf } from '../state';
import { MAX_PLAYERS_PER_ROOM } from '../types';

renderChrome();
const state = loadState();
const user = ensureLoggedIn(state);
// Opening the lobby directly (no room yet) hosts one, so the page always has something to show.
const room = state.room ?? hostRoom(state, user.id);
saveState(state);

const root = appRoot();
const playerList = h(
  'ol',
  {},
  ...room.playerIds.map((id) =>
    h('li', {}, usernameOf(state, id), id === room.hostId ? ' (host)' : '', id === user.id ? ' (you)' : ''),
  ),
);

const canAdd = room.playerIds.length < MAX_PLAYERS_PER_ROOM;

mount(root, 
  h('h2', {}, `Room code: ${room.code}`),
  h('p', {}, 'Share this code with your opponent so they can join from the Home page.'),
  h('h2', {}, `Players (${room.playerIds.length}/${MAX_PLAYERS_PER_ROOM})`),
  playerList,
  h('p', {}, h('button', {
    type: 'button',
    disabled: !canAdd,
    onclick: () => {
      addSamplePlayer(state, room);
      saveState(state);
      location.reload();
    },
  }, 'Simulate your opponent joining'), canAdd ? '' : ' (room is full)'),
  h('h2', {}, 'Lobby music'),
  placeholder('lobby music will play here.'),
  h('h2', {}, 'Chat'),
  placeholder('friends-only room chat will go here.'),
  h('h2', {}, 'Ready?'),
  !hasRightPlayerCount(room.playerIds)
    ? h('p', {}, 'You need exactly 2 players to start (v1 is 1v1 only).')
    : h('p', {}, h('a', { href: PAGES.options }, 'Session options →')),
  h('p', {}, h('button', {
    type: 'button',
    onclick: () => {
      state.room = undefined;
      state.session = undefined;
      saveState(state);
      goTo('home');
    },
  }, 'Leave room')),
);
