import { appRoot, h, mount, openNote, placeholder } from '../dom';
import { renderChrome } from '../page-chrome';
import { addSamplePlayer, hostRoom } from '../room';
import { goTo, PAGES } from '../routes';
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
  h('p', {}, 'Share this code with your friends so they can join from the Home page.'),
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
  }, 'Simulate a friend joining'), canAdd ? '' : ' (room is full)'),
  room.playerIds.length > 2 ? openNote('how do 2v2 and 3–4 player sessions work? For now everyone plays everyone and the most wins takes it.') : null,
  h('p', {}, `Spectators: ${room.spectatorIds.length}`),
  placeholder('spectators can watch a room; there is no spectator page yet.'),
  h('h2', {}, 'Lobby music'),
  placeholder('lobby music will play here.'),
  h('h2', {}, 'Chat'),
  placeholder('friends-only room chat will go here.'),
  h('h2', {}, 'Ready?'),
  room.playerIds.length < 2
    ? h('p', {}, 'You need at least 2 players to start.')
    : h('p', {}, h('a', { href: PAGES.setup }, 'Set up the session →')),
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
