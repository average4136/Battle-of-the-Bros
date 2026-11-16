import { appRoot, h, mount } from '../dom';
import { renderChrome } from '../page-chrome';
import { goTo } from '../routes';
import { DEFAULT_USER_ID } from '../sample-data';
import { loadState, saveState } from '../state';

// Fake auth: nothing is checked and the password is never read or stored.
// Real auth (hashing, sessions/tokens, email verification) is backend work
// and should probably use a managed service; see the notes doc.

renderChrome();
const state = loadState();
const root = appRoot();
const message = h('p', { role: 'status' });

function logInAs(userId: string): void {
  state.currentUserId = userId;
  saveState(state);
  goTo('home');
}

// ---- Log in -----------------------------------------------------------------
const loginName = h('input', { name: 'username', required: true, autocomplete: 'username' });
const loginForm = h(
  'form',
  {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const typed = loginName.value.trim().toLowerCase();
      const account = state.accounts.find((a) => a.username === typed || a.email.toLowerCase() === typed);
      if (account) logInAs(account.id);
      else message.textContent = `No account "${typed}". Sample users: ${state.accounts.map((a) => a.username).join(', ')}.`;
    },
  },
  h('p', {}, h('label', {}, 'Username or email: ', loginName)),
  // The password box exists so the flow feels real. Its value is ignored.
  h('p', {}, h('label', {}, 'Password: ', h('input', { type: 'password', autocomplete: 'current-password' }))),
  h('button', { type: 'submit' }, 'Log in'),
);

// ---- Sign up ----------------------------------------------------------------
const signupName = h('input', { name: 'username', required: true, pattern: '[a-z0-9_]{3,20}', title: '3–20 lowercase letters, digits or _' });
const signupEmail = h('input', { name: 'email', type: 'email', required: true });
const signupForm = h(
  'form',
  {
    onsubmit: (e: Event) => {
      e.preventDefault();
      const username = signupName.value.trim();
      if (state.accounts.some((a) => a.username === username)) {
        message.textContent = `Username "${username}" is taken.`;
        return;
      }
      const id = `u-${username}`;
      state.accounts.push({ id, username, email: signupEmail.value.trim() });
      state.profiles[id] = { userId: id, stats: { gameSkills: {} } };
      logInAs(id);
    },
  },
  h('p', {}, h('label', {}, 'Username: ', signupName)),
  h('p', {}, h('label', {}, 'Email: ', signupEmail)),
  h('p', {}, h('label', {}, 'Password: ', h('input', { type: 'password', autocomplete: 'new-password' }))),
  h('button', { type: 'submit' }, 'Sign up'),
);

mount(root, 
  message,
  h('h2', {}, 'Log in'),
  loginForm,
  h('p', {}, h('button', { type: 'button', onclick: () => logInAs(DEFAULT_USER_ID) }, 'Shortcut: log in as sample user "alex"')),
  h('h2', {}, 'Sign up'),
  signupForm,
);
