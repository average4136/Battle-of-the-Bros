import { appRoot, h, mount } from '../dom';
import { renderChrome } from '../page-chrome';
import { hostRoom, joinRoom } from '../room';
import { goTo, PAGES } from '../routes';
import { currentUser, loadState, saveState } from '../state';

renderChrome();
const state = loadState();
const user = currentUser(state);
const root = appRoot();

if (!user) {
  mount(root, h('p', {}, 'Log in to host or join a room. ', h('a', { href: PAGES.login }, 'Go to Sign up / Log in')));
} else {
  const hostButton = h('button', {
    type: 'button',
    onclick: () => {
      hostRoom(state, user.id);
      saveState(state);
      goTo('lobby');
    },
  }, 'Host a new room');

  const codeInput = h('input', { name: 'code', required: true, minlength: 4, maxlength: 4, size: 6, placeholder: 'ABCD' });
  const joinForm = h(
    'form',
    {
      onsubmit: (e: Event) => {
        // Stop the browser's default form submit (which reloads the page) and handle it in JS.
        e.preventDefault();
        joinRoom(state, codeInput.value, user.id);
        saveState(state);
        goTo('lobby');
      },
    },
    h('label', {}, 'Room code: ', codeInput),
    ' ',
    h('button', { type: 'submit' }, 'Join room'),
  );

  mount(root, 
    h('h2', {}, 'Play'),
    h('p', {}, hostButton),
    joinForm,
    state.room ? h('p', {}, `You're already in room ${state.room.code}. `, h('a', { href: PAGES.lobby }, 'Back to lobby')) : null,
  );
}
