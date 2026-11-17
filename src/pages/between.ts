import { appRoot, h, mount, openNote } from '../dom';
import { renderChrome } from '../page-chrome';
import { PAGES } from '../routes';
import { describeRound, formatSummary, roundHistory, scoreTable } from '../score-view';
import { gameById, loadState } from '../state';

renderChrome();
const state = loadState();
const root = appRoot();
const session = state.session;

if (!session || session.status === 'setup') {
  mount(root, h('p', {}, 'No session in progress. ', h('a', { href: PAGES.setup }, 'Go to Session setup')));
} else if (session.status === 'finished') {
  mount(root, h('p', {}, 'This session is over. ', h('a', { href: PAGES.results }, 'See results')));
} else {
  const last = [...session.rounds].reverse().find((r) => r.outcome);
  const nextId = session.upcomingGameIds[0];

  mount(root, 
    last ? h('p', {}, h('strong', {}, 'Last round: '), describeRound(state, last)) : null,
    h('h2', {}, 'Score'),
    h('p', {}, formatSummary(session)),
    scoreTable(state, session),
    h('h2', {}, 'Next game'),
    nextId
      ? h('p', {}, `${gameById(state, nextId)?.name ?? nextId} (${session.upcomingGameIds.length} game(s) left in the queue)`)
      : h('p', {}, 'Queue is empty.'),
    h('p', {}, h('a', { href: PAGES.round }, 'Start next round →')),
    h('h2', {}, 'Rounds so far'),
    roundHistory(state, session),
    openNote('real-time backend design: in the real app every player sees this screen update live. WebSockets, polling, or something else?'),
  );
}
