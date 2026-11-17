# Foundation notes: pre-GUI clickable prototype

Branch: `foundation-scaffold` · Written 2026-11-16 while you were in class.

This is a plain, unstyled multi-page site you can click through on localhost.
It uses hardcoded sample data, has no backend and makes no network calls.
Its job is to let you feel the user flow before you design anything.

---

## 1. How to run it

Needs Node ≥ 20.19 (you have 20.19.2, so you're fine).

```sh
npm install          # once: installs Vite + TypeScript into node_modules/
npm run dev          # dev server → http://localhost:5173 (auto-reloads on save)
```

Other commands:

| Command | What it does |
|---|---|
| `npm run typecheck` | Type-check all TypeScript, no output files |
| `npm run build` | Type-check, then build the static site into `dist/` |
| `npm run preview` | Serve `dist/` at http://localhost:4173, i.e. what S3/CloudFront would serve |
| `npm run check-links` | After a build: check every internal link points at a real page |

**Suggested click-through:** Home → Sign up / Log in → "log in as sample user alex"
→ Host a new room → Set up the session → Randomize → Continue → tick a
handicap → Start → play a few rounds (try the Tie button) → Results →
Friends / Leaderboard (your record against sam has gone up).

Every page has a **site map** at the bottom so you can jump anywhere, plus a
**Reset prototype data** button that clears saved state.

---

## 2. What I built

### Stack: Vite + vanilla TypeScript, multi-page, no framework

I went with your default and didn't see anything clearly better for this
project. One choice inside that default is worth explaining:

**Multi-page app (MPA), not a single-page app (SPA).** Every screen is a real
`.html` file, and links are ordinary `<a href>` links. The alternative, an SPA,
is one HTML file where JavaScript swaps the content and fakes URL changes with
a "router". I chose MPA because:
- It's literally "plain pages joined by hyperlinks", which is what you asked for.
- There's no router to learn. A URL is a file you can open in the editor.
- S3/CloudFront serve it as-is. SPAs need an extra "send every unknown URL to
  index.html" rule.

The cost is that JavaScript memory is wiped on every page load, so state has
to be saved in `localStorage` (see §3). It's also the first thing likely to
change later; see §6, "Where the structure will need to change".

### Dependencies (both dev-only, nothing ships to the browser)

| Package | Why |
|---|---|
| `vite` | Dev server and production bundler (see §3) |
| `typescript` | Type checker. Vite strips types itself, so `tsc` only checks. (TypeScript 7 installed by default; it worked with no issues.) |

That's it: no runtime dependencies. For the end-to-end test I used
`puppeteer-core` (a library for driving Chrome) installed in a **temporary
folder outside the repo**. It's not a project dependency (see §6, "Later").

### File structure

```
index.html              Home page (Vite requires the entry page at the root)
pages/
  login.html            Sign up / Log in (fake)
  lobby.html            Room code, players, music + chat placeholders
  setup.html            Format, number of games, game selection, randomize
  handicaps.html        Player stats, suggested + custom handicaps
  round.html            Current game, link out, report winner, tie → substitute
  between.html          Score, last result, next game
  results.html          Winner, history, records, play again
  profile.html          Self-reported stats (Elo, WPM, per-game ratings)
  friends.html          Head-to-head records, win-streak leaderboard, chat placeholder
  games.html            Curated list + add/remove custom games
src/
  types.ts              ★ The whole data model in one file (UML-ready)
  sample-data.ts        Hardcoded players, games, handicaps, records
  state.ts              Loads/saves prototype state in localStorage; common lookups
  session.ts            Game rules: shuffle, rounds, ties, scoring, finishing (no DOM)
  room.ts               Host/join room (faked), room codes, simulated joins
  routes.ts             List of every page URL; goTo() for navigating from code
  dom.ts                h() element builder, mount(), [OPEN]/[Placeholder] notes
  page-chrome.ts        "Logged in as" bar + prototype site map on every page
  score-view.ts         Score table / round history shared by 3 pages
  pages/*.ts            One script per page; builds that page's content
scripts/check-links.mjs Offline dead-link checker for the build
vite.config.ts          Tells Vite to build every pages/*.html (auto-discovered)
tsconfig.json           Strict TypeScript settings, type-check only
legacy/                 Your original index.html, main.js, icon.png (moved, not deleted)
docs/FOUNDATION_NOTES.md  This file
```

**Moved, not deleted:** your original `index.html`, `main.js` and `icon.png`
are now in `legacy/`, because Vite needs the root `index.html` for the new
home page. The new home page replaces the old landing page's content. I
appended a "Development" section to `README.md` and left the rest as you wrote it.

### Where to start reading

1. `src/types.ts`: the nouns of the app.
2. `src/session.ts`: the rules. It's the most "real" logic here.
3. `src/pages/round.ts`: a typical page script, wired to the rules.

### How I verified it

- `npm run typecheck`: no errors.
- `npm run build`: succeeds, producing 11 HTML pages + JS in `dist/`.
- `npm run check-links`: 83 links checked, 0 broken (static hrefs + every route).
- Dev server starts; all 11 pages return HTTP 200.
- **Headless Chrome click-through** (33 checks), run against both the dev
  server and the production build: every page renders from empty state;
  login (including the error for an unknown user); hosting a room; randomize
  works and changes order; handicaps (suggested + custom); a tie scratches
  and substitutes; reporting wins until a best-of-3 finishes; the
  head-to-head record updates (8–5); profile edits survive reload;
  `javascript:` links rejected for custom games; HTML in a game name shows
  as text; the lobby caps at 4. **No console errors.**

**Not verified:** external game URLs (the checker is offline on purpose;
please click them yourself), Firefox (Chrome only), phone-width layout,
behavior with localStorage blocked (the code tolerates it but I didn't test it).

---

## 3. Web concepts explained

**npm, `package.json`, `node_modules/`, lockfile.** npm is the package manager
for JavaScript, like apt for a project. `package.json` lists dependencies
and named commands (`"scripts"`, which is what `npm run dev` runs). Packages
are installed into `node_modules/` (gitignored, recreated by `npm install`).
`package-lock.json` pins exact versions so everyone gets the same install.
Commit it.

**What Vite does.** Two jobs:
- *Dev server* (`npm run dev`): serves your files, and when the browser asks
  for a `.ts` file it converts it to JavaScript on the fly. Browsers can't run
  TypeScript. It also reloads the page when you save.
- *Build* (`npm run build`): bundles everything into plain static files in
  `dist/`: HTML, and JS files with names like `round-CHDPxLXb.js`. The random
  part is a hash of the contents, so a CDN can cache files forever: a changed
  file gets a new name. `dist/` is exactly what you'd upload to S3, with no
  server code.

**TypeScript vs JavaScript.** TypeScript is JavaScript plus type annotations.
The types are erased before running, so they cost nothing at runtime; they
only catch mistakes early. `tsc --noEmit` means "check, don't output".
`types.ts` uses a **discriminated union** (e.g. `Handicap` has a `kind` field
of `'head-start' | 'remove-pieces' | …`). Check `kind` and TypeScript knows
which fields exist.

**ES modules.** `import`/`export` let files share code. `<script type="module">`
tells the browser the script uses them. Your old `main.js` also leaned on
implicit globals (`games = ...` without `let`/`const`); modules forbid that.

**"Routing" here.** There's no router. The URL path *is* the file:
`/pages/lobby.html` serves `pages/lobby.html`. Links use absolute paths
(starting with `/`) so they mean the same thing from any page.
`src/routes.ts` lists the paths once, so TypeScript code can't typo a link.

**How state carries between pages.** Each link click loads a fresh page, so
every JS variable is lost. `localStorage` is a per-site key/value store in
the browser that survives reloads. `state.ts` stores one JSON object
under `botb-prototype-v1`. Each page calls `loadState()` on start, changes
it, and calls `saveState()` before navigating. Inspect it in the browser
devtools: Application (Chrome) or Storage (Firefox) → Local Storage.

**Building pages in code: `h()` and why not `innerHTML`.** Pages build
elements with `h('a', { href }, 'text')` (`src/dom.ts`). Building an HTML
string and assigning `innerHTML` would be shorter, but custom game names and
usernames are user-typed. Someone could name a game `<img src=x onerror=…>`
and run code in friends' browsers. This is **XSS (cross-site scripting)**.
`h()` inserts text as text. For the same reason, custom game links must be
`http(s)`: a `javascript:` link runs code when clicked.

**Forms and `preventDefault()`.** By default, submitting a form reloads the
page. Each `onsubmit` handler calls `e.preventDefault()` and handles the data
in JS instead. You still get built-in browser validation (`required`,
`type="email"`) for free.

**`target="_blank" rel="noopener noreferrer"`.** Opens game links in a new tab
and stops that tab from controlling or seeing ours. This is standard for
links to other sites.

**Dev vs preview.** `dev` transforms files live. `preview` serves the
finished `dist/`. If something works in dev but not preview, it's a build
problem.

---

## 4. Questions for me

### The open questions from your brief (stubbed, not decided)

Each appears on the relevant page as a bold **[OPEN: …]** note.

1. **Does one player's reported result need the other's confirmation?**
   Currently whoever reports decides (`RoundOutcome.confirmedBy` exists but is
   unused). *Round page.*
2. **How does "fastest completion of X games" work?** Same games, total time,
   live race? You can select it, but it plays like best-of without the early
   finish, and `timeSeconds` is unused. *Setup and Round pages.*
3. **How do 2v2 and 3–4 player sessions work?** Handicaps and scoring?
   Currently: one winner per game, most wins takes it, and the session isn't
   recorded in head-to-head or leaderboard stats. *Lobby and Results pages.*
4. **Record "did that handicap feel fair?" after rounds?** Not built.
   *Results page.*
5. **Real-time backend design** (WebSockets, polling, something else). Nothing
   real-time exists. *Between rounds page.* Some thoughts in §6.

### New questions that came up

6. **A tied session** (equal wins when games run out, e.g. 1–1 after a
   scratch with no substitutes, or in 3–4 player games): sudden-death game,
   or leave it a tie? Currently shows "It's a tie!" with an OPEN note.
7. **Custom game visibility:** private to the creator, shared with friends,
   or public? (In the prototype they're stored locally, so visible only to you.)
8. **Who can configure a session:** host only, or anyone in the room?
   Currently anyone.
9. **The curated game list** in `src/sample-data.ts` is my guess. Please
   review it. Note that NYT games may hit a paywall, and GeoGuessr needs an
   account/subscription.
10. **README** still says the project was "inspired by the old Ludwig bro vs bro
    videos". Your brief says not to use his name on the site. Keep that line
    in the README or not? I didn't touch it.

### Assumptions I made: confirm or reverse

| # | Assumption | Where |
|---|---|---|
| A1 | **Best of X = first to a majority** (2 of 3, 3 of 5) and ends early. | `session.ts` `winsNeeded` |
| A2 | **Ties don't count toward X**: a scratched round is replaced, so X decisive games are still possible. | `scratchTie` |
| A3 | **Tie substitute** comes from selected-but-unqueued games first, then any unused game, and is played **immediately next**. | `scratchTie` |
| A4 | **Best-of-3 within a game** is just a checkbox. Players report the overall winner of that game; the site doesn't track the sub-games. | Round page |
| A5 | Head-to-head counts **sessions won**, not individual games. | `HeadToHeadRecord` |
| A6 | The leaderboard ranks by **current win streak**, then best streak. | Friends page |
| A7 | A handicap's `appliesTo` is the **player being handicapped**. A head start for the weaker player is modeled as a handicap on the stronger one. | `types.ts` |
| A8 | **Profile stats are separate from Account** (different lifecycles). | `types.ts` |
| A9 | Spectators **don't count** toward the 4-player cap. | `Room` |
| A10 | You need **≥ 2 players** to start a session. | Lobby |
| A11 | Room codes are **4 characters**, without look-alike characters (0/O, 1/I/L). | `room.ts` |
| A12 | Log in with **username or email**. Usernames are 3–20 lowercase letters/digits/underscore. | Login page |
| A13 | "Play again" **keeps the same room and players** and goes to Session setup. | Results page |
| A14 | Nothing stops you replaying a daily game in a later session (the site can't know whether you've played today's Wordle). | — |
| A15 | Self-reported skill uses your three levels **plus "no opinion"** (the default). | Profile page |

---

## 5. Deferred: needs my input

These were skipped because they're your call or not safe to do unattended:

- **Opening a pull request.** I pushed the branch (see the summary) but didn't
  open a PR. That's outward-facing and you may want to look first.
- **Deleting `legacy/`.** Kept. Delete it once you've confirmed nothing in it
  is needed.
- **README Ludwig line.** See question 10.
- **Picking an auth provider** (e.g. AWS Cognito vs rolling your own). Has
  cost and security implications. Thoughts in §6.
- **Committing a test framework.** I didn't add end-to-end test tooling to the
  repo because it adds dependencies and assumes Chrome. Your call whether it's
  worth it now (I'd say later).
- **Finalizing the curated game list** (question 9).

---

## 6. Thoughts and suggested optimizations

### Do soon (cheap, high value, no new scope)

- **Answer the open questions before building more.** Questions 1–3 and 6
  change `types.ts` and `session.ts`. Everything else can wait.
- **Consider a smaller v1: 1v1 and best-of only.** 3–4 players, 2v2 and
  "fastest completion" each multiply the rules (scoring, handicaps, records).
  The data model already supports up to 4 `playerIds`, so leaving them for
  later doesn't paint you into a corner.
- **Consider "anyone can undo the last result" instead of confirmation.**
  Among friends, a visible "undo last round" button is much simpler than a
  confirm/dispute flow and fits "player-officiated". *(Suggestion only; this
  is open question 1.)*
- **A single-device mode is nearly free.** This prototype is already a
  working scorekeeper on one screen. Styled, it's usable at a real game night
  before any backend exists, and you'd get real feedback on the flow early.
- **Unit-test `session.ts` when the rules settle.** It's pure logic (no DOM),
  so it's the easiest code to test and where bugs would hide (ties,
  early finish). That needs one dev dependency (Vitest). Add it when you
  next change the rules.
- **Design on top of these pages.** Each page is a `<main>` with headings,
  lists and forms, so one stylesheet linked from every page can restyle
  everything. You won't need to touch the TS for most of it.

### Later (don't start these yet)

- **Backend, in this order:** accounts/auth → rooms and sessions API →
  real-time sync → profiles/records → friends.
- **Real-time options** (open question 5, for when you get there):
  - *Polling:* each client asks "anything new?" every 2–3 s. Dumb but
    reliable, trivial on Lambda + API Gateway, and fine for 4 players
    clicking buttons a few times a minute. Probably enough for v1.
  - *API Gateway WebSocket APIs:* true push, fits your AWS plan, but adds
    connection tracking in DynamoDB and more moving parts.
  - Since nobody is racing on this site (the games happen elsewhere), polling
    latency may be perfectly acceptable. Worth deciding with that in mind.
- **Auth:** AWS Cognito fits your stack and means you never store passwords.
  The cost is a learning curve. (Decision deferred; see §5.)
- **Handicap suggestions from stats**, then the "was it fair?" feedback loop.
- **Spectators, friends-only chat, lobby music, mobile polish.** Each is a
  feature on its own. Chat in particular brings moderation and real-time costs.
- **End-to-end tests** (Playwright) once the UI stops changing weekly.

### Where the structure will need to change with a real backend

- **`state.ts` becomes an API client.** Rooms, sessions, profiles and records
  move to DynamoDB. The browser keeps only an auth token, and page scripts
  call `fetch()` instead of `loadState()`.
- **`session.ts` moves server-side.** The server should decide results, so
  two players clicking at once can't both "win". It's DOM-free, so it can
  move into a Lambda almost as-is (Lambda runs Node/TypeScript).
- **IDs** like `s-${Date.now()}` become server-generated (UUIDs).
- **Multi-page vs live screens.** Lobby → Round → Between rounds will need
  live updates. With WebSockets, every page load drops the connection, so
  you might merge those three into one "room" page that swaps views. With
  polling, the MPA works fine. That's a reason to decide real-time before
  the UI build gets deep.
- **Head-to-head storage:** store each pair once with the two IDs in sorted
  order (DynamoDB key like `h2h#u-alex#u-sam`) so lookups don't need to
  check both orders, as `friends.ts` does now.

### Risks

- **Scope creep** is the main one, as you said. The doc's "Later" list is
  long on purpose, so it's written down and out of your head.
- **Link rot and paywalls** on third-party games. Keep links optional (they
  already are).
- **Saved state from older builds.** Bump the key in `state.ts` when the
  state shape changes, or use "Reset prototype data".

---

## 7. Suggested next steps

1. Click through the prototype (§1) and note anything that feels wrong in the flow.
2. Answer the open questions and assumptions in §4. I can update the model and rules next session.
3. Decide the v1 scope cut (1v1 best-of only?).
4. Start your UI design pass: one shared stylesheet over these pages.
5. Then: unit tests for `session.ts`, and pick the real-time approach before any backend work.
