// Every page in the site, in one place. Code that navigates uses these names
// (goTo('lobby')) instead of typing URLs, so a typo is a TypeScript error
// rather than a dead link. Static <a href> links in the .html files can't use
// this map; `npm run check-links` checks those.
//
// Paths are absolute ("/pages/...") so they work the same from any page.
// That assumes the site is served from the domain root, which holds for both
// the Vite dev server and a CloudFront distribution.

export const PAGES = {
  home: '/',
  login: '/pages/login.html',
  lobby: '/pages/lobby.html',
  options: '/pages/options.html',
  round: '/pages/round.html',
  between: '/pages/between.html',
  results: '/pages/results.html',
  profile: '/pages/profile.html',
  friends: '/pages/friends.html',
  games: '/pages/games.html',
} as const;

export type PageName = keyof typeof PAGES;

/** Human-readable labels for the site map. */
export const PAGE_LABELS: Record<PageName, string> = {
  home: 'Home',
  login: 'Sign up / Log in',
  lobby: 'Lobby',
  options: 'Session options',
  round: 'Round',
  between: 'Between rounds',
  results: 'Results',
  profile: 'Profile',
  friends: 'Friends / Leaderboard',
  games: 'Game list',
};

export function goTo(page: PageName): void {
  window.location.href = PAGES[page];
}
