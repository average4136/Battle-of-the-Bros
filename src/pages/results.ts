import { appRoot, h, mount, openNote } from '../dom';
import { renderChrome } from '../page-chrome';
import { goTo, PAGES } from '../routes';
import { roundHistory, scoreTable } from '../score-view';
import { loadState, saveState, usernameOf } from '../state';

renderChrome();
const state = loadState();
const root = appRoot();
const session = state.session;

if (!session || session.status !== 'finished') {
  mount(root, 
    h('p', {}, 'No finished session to show. '),
    h('p', {}, session ? h('a', { href: PAGES.round }, 'Back to the current round') : h('a', { href: PAGES.lobby }, 'Go to the lobby')),
  );
} else {
  const s = session;
  mount(root, 
    // A tied session stays a tie: there's no sudden-death game (decided).
    h('h2', {}, s.winnerId ? `${usernameOf(state, s.winnerId)} wins!` : "It's a tie!"),
    scoreTable(state, s),
    h('h2', {}, 'Rounds'),
    roundHistory(state, s),
    h('h2', {}, 'Handicaps used'),
    s.handicaps.length ? h('ul', {}, ...s.handicaps.map((hc) => h('li', {}, hc.description))) : h('p', {}, 'None.'),
    h('h2', {}, 'Records'),
    h('p', {}, 'Head-to-head record and leaderboard updated. ', h('a', { href: PAGES.friends }, 'See Friends / Leaderboard')),
    openNote('should we ask "did the handicaps feel fair?" here to tune future suggestions?'),
    h('h2', {}, 'What next?'),
    h('p', {}, h('button', {
      type: 'button',
      onclick: () => {
        // Same room and players; just a new session.
        state.session = undefined;
        saveState(state);
        goTo('setup');
      },
    }, 'Play again with the same room')),
    h('p', {}, h('a', { href: PAGES.lobby }, 'Back to the lobby'), ' · ', h('a', { href: PAGES.home }, 'Home')),
  );
}
