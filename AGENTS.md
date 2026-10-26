# Agent guide

Instructions for AI coding agents (and a quick start for humans). Before
non-trivial changes, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), the
overview of how things are built and why, and the document it links to for
the part you are changing: the solver, share links, the interface, privacy,
or building and testing.

## Project in one paragraph

Ragnapax is a static, client-only web app (Svelte 5, TypeScript, Vite)
that plans fair point sharing between the four guilds of a Ragnarok group in
_Tokyo Debunkers_, a mobile game published by ZigZaGame Inc.
A mixed-integer model solved by HiGHS (WebAssembly, in a Web Worker) decides
who declares on which kingdom each day. Plans are shared as URL fragments.
Users are on ~5-year-old phones, mostly on Wi-Fi or 4G/5G, and the planner
must stay usable over 3G: keep downloads small and solves fast.

## Commands

```sh
npm install            # Node 26.12.1+ (engines in package.json)
npm run dev            # dev server
npm test               # unit tests, including real solves (under a minute)
npm run check          # svelte-check + TypeScript
npm run lint           # xo: lint and check formatting
npm run lint:fix       # apply xo fixes, formatting included
npm run lint:reuse     # every file's copyright and licence (REUSE); needs uv
npm run test:e2e       # Playwright on the production build (needs `npx playwright install chromium webkit`)
npm run bench          # solver timings and fairness; BENCH_STARTS=n for more openings
npm run size           # first-visit and solver sizes of the build in dist/, gzipped
npm run i18n:status    # translation progress; `-- <code>` lists missing messages
npm run build          # static site in dist/; needs SOURCE_URL outside GitHub Actions
```

Before finishing any change: `npm run lint && npm run check && npm test`
(the tests also check that every file has SPDX headers or is covered by
`REUSE.toml`; CI runs `npm run lint:reuse` as well).
Also run `npm run test:e2e` for UI or state changes, and `npm run bench` for
model, rules or map changes. Then check the docs for drift, as "Keeping the
docs true" below describes, and update them in the same commit.

## Where things go

| Change                          | Place                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| Game rules, scoring, validation | `src/domain/` (pure TS, no browser APIs)                           |
| Goals, options, priority order  | `src/domain/settings.ts`                                           |
| A map's kingdoms and roads      | `src/maps/<id>.ts`, listed in `src/maps/index.ts`                  |
| The weekly map rotation         | `ROTATION` in `src/maps/index.ts`                                  |
| How maps are drawn              | `src/ui/map-layout.ts` (geometry), `src/ui/MapCanvas.svelte`       |
| Optimisation model              | `src/solver/model.ts` (constraints) and `settings.ts` (priorities) |
| Share link format               | `src/share/link.ts`                                                |
| App state and actions           | `src/state/planner.svelte.ts`                                      |
| Components and styles           | `src/ui/`, tokens in `src/app.css`                                 |
| Interface text                  | `src/i18n/en.ts`; translations in `src/i18n/translations/`         |
| Wording of domain data          | `src/i18n/describe.ts` (names, broken rules, link problems)        |
| Caching and CSP                 | `src/service-worker.js`, plugins in `vite.config.ts`               |

Components talk only to `PlannerState`; never call storage, links or the solver
from a component.

## Invariants: do not break these

- **Share links keep working.** Never rename map or kingdom ids, or add or
  remove a kingdom: links place kingdoms by id (`GameMap.linkOrder`).
  Reordering a map file is harmless to links but changes solve times. New link
  parameters must be optional, with absence meaning the old behaviour; anything
  else needs a new `v` version (see "Share links" in docs/SHARING.md) and a
  major release, on a Tuesday, when no plan is in use (Ragnarok runs
  Wednesday to Monday).
- **Everything incoming is validated.** Plans from the solver, links and
  storage all pass through `simulate`. Do not add a path that skips it.
- **The rules engine and the model agree.** If you change a rule, change both
  `simulate` (`src/domain/plan.ts`) and `buildModel`, with tests.
- **Priorities stay strict.** Objectives are weighted so each outranks
  everything below it, and the tie-breakers (refinements, then `efforts`)
  stay under `TIE_BREAKER_BUDGET`. The early stop depends on that.
- **Client-only, nothing heavy up front.** No servers, analytics or
  third-party requests (the CSP forbids them), no CSS frameworks or icon
  fonts; load anything big lazily, as the solver is.
- **The privacy notice stays true.** EU players rely on it (GDPR). If you
  store something new on the device (keep keys under `ragnapax/`), add
  any request beyond the site itself, or change the host, update `privacy.*`
  in `src/i18n/en.ts` and "Privacy" in docs/PRIVACY.md. Never add cookies,
  tracking or third-party content: they would need a consent banner.
  In a fork meant to be published, or when changing where the site is
  deployed (CI, `SOURCE_URL`, another host), `OPERATOR` in
  `src/ui/PrivacyNotice.svelte` and `privacy.host*` must name the actual
  operator and host. Who the operator is is the human's decision: ask them,
  never guess or keep the original, and say so before you deploy or finish.
- **Exactly four guilds**, a fact of the game: use `GUILD_COUNT` / `GUILDS`
  from `src/domain/types.ts`, and never add code, data or docs for any other
  number.
- **Rules are fixed** constants in `src/domain/types.ts`, not map data:
  Wednesday to Monday (`DAY_NAMES`, `DAYS`), 3 declares per guild a day
  (`MAX_DECLARATIONS_PER_DAY`), 1, 2 and 3 points a day for a town, dorm and
  castle (`POINTS`), 4 starting towns per guild (`TOWNS_PER_GUILD`).
- **Colour is never the only cue.** Guilds have a colour and an outline
  pattern; new colours or tokens must pass `src/ui/accessibility.test.ts`
  (WCAG contrast in both themes and colour-blind separation).

## Conventions

<!-- REUSE-IgnoreStart -->
- Every file states its copyright and licence (AGPL-3.0-or-later) under the
  [REUSE specification](https://reuse.software): SPDX headers in the file's
  comment syntax (an `SPDX-FileCopyrightText` line per holder, then
  `SPDX-License-Identifier: AGPL-3.0-or-later`), or, for files that cannot
  hold a comment (JSON, `.nvmrc`) and the Markdown docs, a `path` glob in
  `REUSE.toml` (add one if none matches).
  Copyright belongs to the human you work for, never to an agent: their name
  (`git config user.name`) and the current year. Write both lines in a new
  file; in a changed one, add their line under the others if missing, or
  extend its years (`2026-2027 <name>`), and never touch anyone else's. Text
  quoting these tags, as this item does, goes between `REUSE-IgnoreStart` and
  `REUSE-IgnoreEnd` comments, or the tools read it as the file's licence.
<!-- REUSE-IgnoreEnd -->
- [xo](https://github.com/xojs/xo)'s rules and style (tabs, single quotes, no
  bracket spacing; no Prettier), with eslint-plugin-svelte for markup;
  `xo.config.js` says which rules are relaxed and why. TypeScript strict with
  `noUncheckedIndexedAccess`. Use `undefined`, not `null`, except where a
  browser API hands back `null`.
- Shipped code targets Baseline Widely Available and is not polyfilled: stay
  within the ES2023 library of the `tsconfig*.json` files (so no Iterator
  helpers). "Browser support" in docs/OPERATIONS.md says how to recheck it.
- Spacing is on a soft 8 px grid (4 px steps below 16 px), map drawing
  exempt; `src/ui/spacing.test.ts` checks it.
- Comments explain why, not what; match the existing density.
- Interface text is plain, friendly English in the game's terms: Ragnarok
  (also Ragna or Rag), group, guild, kingdom (any town, dorm or castle),
  town, dorm, castle (Darkwick Castle in full), Vacant (capitalised), declare
  (also a noun: "3 declares a day"). Code and docs say declaration
  instead of declare.
- Never write interface text in a component or in `src/domain/`: add a
  message to `src/i18n/en.ts`, with a comment saying where it appears, and
  call `t` (or `rich` for bold); the domain returns data and codes. Dorm
  names and short names are map data (`src/maps/kingdoms.ts`) and
  messages (`dorm.*`), kept in step by `describe.test.ts`. Do not write
  translations: people who speak the language do (docs/TRANSLATING.md).
- Keep the first visit small: aim for under 100 KB gzipped (`npm run size`;
  "Performance budget" in docs/OPERATIONS.md). It is a goal, not a limit:
  spend size on what players need, and say in the commit when a change adds
  noticeably to it.
- Check UI changes on a phone-sized viewport (about 412 × 914) in light and dark
  themes, and that nothing overflows at 300 px wide or overlaps on desktop.
- Commits are small and logically grouped, with a body explaining the why,
  and each passes its own tests.
- A change players can notice is a release: raise `version` in
  `package.json` (and `package-lock.json`) and add an entry for players to
  `CHANGELOG.md` in the same change. "Versioning" in docs/OPERATIONS.md says
  which number to raise; tests, docs and tooling are not releases.
- Update `docs/` in the same commit when behaviour they describe changes,
  putting new material in the document for that part of the app and keeping
  `docs/ARCHITECTURE.md` an overview.

## Keeping the docs true

Tests catch some drift, not all: lists, figures and descriptions of
behaviour have gone stale while every test passed. Before finishing a change:

1. Search the docs (`docs/`, `README.md`, `CONTRIBUTING.md`, this file),
   comments and `src/i18n/en.ts` for everything it touches (names of files,
   functions, messages, keys and settings, old names after a rename) and the
   behaviour and numbers around them.
2. Read what you find against the code as it now stands, especially lists
   that should be complete (repository layout, `PlannerState`'s actions, the
   components in docs/UI.md), figures, examples and player-facing claims.
3. Fix what no longer holds in the same commit; drift your change did not
   cause goes in a commit of its own. Prefer wording that cannot go stale
   when the exact number does not matter.
4. Where a doc promises something checkable (a path, a storage key, a
   request never made, a link that opens, a complete list), test it:
   `src/test/docs.test.ts` for the repository, `e2e/planner.spec.ts` for the
   running app. Such a test must fail when it finds nothing to check. Refer
   to sections by title, as in `"Privacy" in docs/PRIVACY.md`, which the
   tests follow.

Say in your summary what you checked and updated, or that the docs needed
nothing.

## Gotchas

- Svelte runes only work in `.svelte` and `.svelte.ts` files; tests using
  `$effect` must be `*.svelte.test.ts`.
- Unit tests resolve Svelte's browser build (see `vite.config.ts`); otherwise
  effects silently never run.
- Shipped code is type-checked without Node.js types, and the solver worker
  without DOM; tests, scripts and configs get Node.js. Which files go where is
  set by the `include` of each `tsconfig.*.json` ("Type checking" in
  docs/OPERATIONS.md); a file in a new place may need adding there.
- HiGHS cannot be interrupted from outside a running solve; cancelling
  terminates the worker.
- The service worker is generated at build time; `src/service-worker.js` is a
  template, not served directly. It only runs in production builds.
- The theme is applied by an inline script in `index.html` before first paint;
  keep it in step with `src/state/theme.svelte.ts`. The CSP allows it by hash,
  computed at build time, so do not add other inline scripts casually.
- On Windows, scripts that rewrite files must keep LF line endings
  (`.gitattributes` normalises them on commit, `xo --fix` on format).
