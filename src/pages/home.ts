// Title page: the art is static in index.html; this file adds the buttons,
// which change depending on whether you're logged in.

import '../styles/base.css';
import '../styles/home.css';
import { appRoot, h, mount } from '../dom';
import { fitStage } from '../fit-stage.js';
import { renderChrome } from '../page-chrome';
import { hostRoom, joinRoom } from '../room';
import { goTo, PAGES } from '../routes';
import { currentUser, loadState, saveState } from '../state';

renderChrome({ devPanel: true });
fitStage(1280, 890);

const state = loadState();
const user = currentUser(state);

// 1. PLAY: host a new room and go to the lobby.
const playButton = h('button', {
  type: 'button',
  class: 'sketch-button play-button',
  onclick: () => {
    if (!user) return goTo('login');
    hostRoom(state, user.id);
    saveState(state);
    goTo('lobby');
  },
}, 'PLAY');

// 2. Logged out: "login / signup". Logged in: your username, linking to your profile.
const loginButton = h(
  'a',
  { class: 'sketch-button login-button', href: user ? PAGES.profile : PAGES.login },
  h('span', {}, user ? user.username : 'login / signup'),
);

// 3. join room: type a 4-letter code, press go (or Enter).
// When logged in, the browser's own check (required + 4 characters) shows an
// error message for a short code. Logged out, any click just goes to login.
const codeInput = h('input', {
  id: 'room-code',
  name: 'code',
  required: !!user,
  minlength: 4,
  maxlength: 4,
  placeholder: 'ABCD',
  autocomplete: 'off',
  autocapitalize: 'characters',
  spellcheck: 'false',
});
const joinForm = h(
  'form',
  {
    class: 'sketch-button join-box',
    onsubmit: (e: Event) => {
      // Stop the browser's default form submit (which reloads the page) and handle it in JS.
      e.preventDefault();
      if (!user) return goTo('login');
      joinRoom(state, codeInput.value, user.id);
      saveState(state);
      goTo('lobby');
    },
  },
  h('label', { for: 'room-code' }, 'join room'),
  codeInput,
  h('button', { type: 'submit', class: 'go-button' }, 'go'),
);

// Only if you're already in a room.
const backLink = state.room
  ? h('a', { class: 'back-to-room', href: PAGES.lobby }, `back to room ${state.room.code}`)
  : null;

mount(appRoot(), playButton, loginButton, joinForm, backLink);
