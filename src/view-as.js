// =============================================================================
// PROTOTYPE ONLY: the "View as" switch.
// =============================================================================
// Delete this file, and the two lines marked "view-as" in page-chrome.ts, once
// a real backend exists. Nothing else depends on it.
//
// Why it exists: in the real app the host and the other player each use
// their own browser, logged in as themselves. This prototype runs in one
// browser, so to test "only the host can change options" and "the other
// player confirms a result" you need to be both players. This switch
// changes which room member the browser is logged in as (state.currentUserId)
// and reloads the page. Every page then behaves exactly as it would for that
// player, using the same "am I the host?" checks the real app will use.
//
// This is plain JavaScript (not TypeScript) on purpose: it's small,
// self-contained and throwaway. The comments starting with /** ... */ and
// containing @param are "JSDoc". They're optional, but TypeScript reads them,
// so page-chrome.ts still gets type-checked when it calls this function.
// =============================================================================

import { h } from './dom';
import { loadState, saveState, usernameOf } from './state';

/**
 * Build the "View as" control: one button per room member.
 *
 * @param {import('./state').PrototypeState} state  the loaded prototype state
 * @returns {HTMLElement}
 */
export function viewAsControl(state) {
  const room = state.room;
  const box = h('p', {}, h('strong', {}, 'PROTOTYPE ONLY: View as: '));

  if (!room) {
    box.append('(join or host a room first)');
    return box;
  }

  for (const id of room.playerIds) {
    const role = id === room.hostId ? 'host' : 'other player';
    const label = `${role} (${usernameOf(state, id)})`;

    if (id === state.currentUserId) {
      // The player you're viewing as is plain text, not a button.
      box.append(h('strong', {}, `[${label}]`), ' ');
      continue;
    }

    const button = h('button', {
      type: 'button',
      onclick: () => {
        // Load the state again rather than saving `state`: this page may have
        // saved changes since `state` was loaded, and saving the old copy
        // would undo them.
        const fresh = loadState();
        fresh.currentUserId = id;
        saveState(fresh);
        // Reload so the page script runs again as the new player.
        location.reload();
      },
    }, label);
    box.append(button, ' ');
  }

  return box;
}
