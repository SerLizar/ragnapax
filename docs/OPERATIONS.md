# Building, testing and running

How the planner is cached for offline use, kept secure and small, which
browsers it supports, how it is tested, how it is built and published, and
how releases are numbered.
Part of the architecture docs; [ARCHITECTURE.md](ARCHITECTURE.md) is the
overview.

## Offline and caching

`dist/sw.js` is generated at build time by the `ragna-service-worker` plugin
in `vite.config.ts` from `src/service-worker.js`, with the build's file list
embedded. `main.ts` registers it on the player's first tap or key press, not
on page load: storage on the device must serve something the player asked
for (see [Privacy](PRIVACY.md)), and someone who only glances at the page has
not. Pages it already serves register it at once, to stay up to date. The
first tap usually fetches the solver too, before the worker is running, so on
activation the worker copies any solver or translation file the browser's
HTTP cache already holds (`cache: 'only-if-cached'`, never the network).

- **App shell** (HTML, JS, CSS, SVG icon, manifest) is cached on install, so
  repeat visits load instantly and work offline. Install fetches it past the
  HTTP cache, which may still hold the previous version's page.
- **Solver** files (worker script and wasm), **translations**,
  `licenses.txt` and the **PNG icons**, matched by `LAZY` in the config, are
  cached the first time they are fetched, never up front, and kept across
  deploys while their content-hashed names are unchanged. The response
  reaches the page while it is still downloading, and is cached alongside,
  so the solver's WebAssembly compiles as it streams in rather than after
  the whole of it has arrived. Only browsers fetch the PNG icons, and only
  when they need one (to install the app, add it to a home screen, or show a
  favicon without SVG support), so most phones never download them; they
  barely compress (see "Icons" in docs/UI.md).
- **The page** (the app's address, with or without `index.html`) comes from
  the cache even when online, and from the network only if the cache is
  empty. Asking the network first meant a weak signal, where requests hang
  rather than fail, left the page blank for as long as the request hung, with
  a working copy in the cache.
- On activation, any cached file not in the current build is deleted, so old
  builds never pile up on a phone.

**New versions.** Serving the page from the cache means a visit shows the
version installed last time; the browser checks for a new service worker on
every visit and installs it in the background. A new build's service worker
takes over open pages at once and deletes the old build's files, so a page loaded from the old build can no
longer fetch the solver or a translation it has not used yet. `UpdateState`
(`src/state/update.svelte.ts`) notices the takeover (`controllerchange`,
ignoring the first one on a first visit, when nothing is out of date) and
shows a banner asking the player to reload. A tab can stay open all week
without the browser checking for updates, so it also asks for a check
whenever the page comes back into view and whenever the solver fails to
download.

The service worker is only registered in production builds.

## Security

The app has no server and no secrets; the risk is malicious share links.

- Links are parsed strictly and every plan is replayed by the rules engine
  before display.
- Svelte escapes all text; guild names from links are only ever text. They
  lose control characters and the invisible marks that reverse text
  direction, which could disguise a name (`cleanGuildName`).
- Plans copied as text escape what Discord reads as formatting or mentions
  in guild names (`forChat` in `src/share/text.ts`), so a guild called
  `@everyone` cannot ping a server when the plan is pasted.
- Production pages carry a Content Security Policy (`ragna-content-security-policy`
  plugin): only the site's own scripts, `wasm-unsafe-eval` for compiling
  the solver, no third-party connections, no objects, no base or form
  targets. Inline scripts in `index.html` (only the theme start-up script) are
  allowed by their SHA-256 hash, computed at build time, so editing them needs
  no manual policy change.
- No third-party requests at all: fonts are system fonts and the solver is
  self-hosted.

## Performance budget

Measured in October 2026. `npm run build && npm run size` gives the first
visit's and the solver's figures for the current build, and CI puts them in
each run's summary; this table is only there to give their scale:

| Asset           | Gzipped                   | When          |
| --------------- | ------------------------- | ------------- |
| HTML + JS + CSS | ~52 KB (1.2 + 46.3 + 4.9) | First visit   |
| Solver worker   | ~35 KB                    | First map tap |
| HiGHS wasm      | ~1.2 MB                   | First map tap |
| PNG icons       | ~28 KB, all five together | When a browser asks for one: installing, adding to a home screen, a favicon without SVG support |

The interface tells players the solver's size before it downloads
(`solve.download`); `npm run size` fails if that figure is more than 0.1 MB
off the build.

Solving on a desktop, every map, from `npm run bench`: the first plan in a
fraction of a second, every priority proven in a second or two, and the
solve finished a few seconds later, almost all of it polishing (see "Early
stop" in docs/SOLVER.md). Phones are typically 3–5× slower; the early stop scales
the polishing time with the device, and users see a plan as soon as the first
one is found.

**The aim: a first visit under 100 KB gzipped.** It is a goal, not a hard
limit. Most players are on Wi-Fi or 4G/5G, where the first visit's size hardly
matters; the target exists so the planner stays reasonable on 3G. There, at
about 1.6 Mbps (Lighthouse's mobile throttling), every 10 KB costs about 50 ms,
while the connection's own round trips (page, then scripts and styles) cost a
second or more whatever the size. Under 100 KB, the download stays around half
a second of that wait, and parsing the script on an old phone, which grows
with it, stays short too. So:

- Spend size on what every player needs, such as accessibility, not on
  conveniences.
- Anything large, or needed only by some players, loads lazily, as the solver,
  translations and licences do. Weigh what a lazy load costs, too: the plan
  view could load lazily, but then everyone opening a shared link would wait
  for an extra request before seeing the plan.
- Say in the commit message when a change adds noticeably to the first visit.

## Browser support

The app targets **Baseline Widely Available**: web features that have worked
in every major browser for at least 30 months. When last checked, in October
2026, that meant Chrome and Edge 123, Firefox 125 and Safari 17.4, which is
`build.target` in `vite.config.ts`. For the players:

- **iPhone:** Safari and every in-app browser use the engine of the installed
  iOS version. iOS 17.4 runs on the iPhone XS and XR (2018) and later.
- **Android:** Chrome and the Android System WebView update through the Play
  Store whatever the Android version, so every phone that still gets Chrome
  updates is covered, in-app browsers such as Discord's included.

Nothing is polyfilled. The build rewrites newer syntax for the target but
leaves APIs alone, so `lib` and `target` in the `tsconfig*.json` files (ES2023) keep out
APIs the target lacks, such as iterator helpers (Firefox 131, Safari 18.4).

**Recheck the baseline from time to time.** It moves every month, as each
browser release turns 30 months old. Twice a year, and whenever Vite has a
major release, run:

```sh
npx browserslist@latest "baseline widely available"
```

and note the oldest version listed for chrome, edge, firefox and safari. If
they have moved:

1. Update `build.target` in `vite.config.ts`, and the date in its comment.
2. Raise `target` and `lib` in `tsconfig.json`, and `lib` in each
   `tsconfig.*.json` (see [Type checking](#type-checking)), to the newest
   ECMAScript edition the new versions fully support.
3. Remove workarounds the new versions make unnecessary (search the code,
   `xo.config.js` and AGENTS.md for the old versions and the features
   they lacked).
4. Update the versions in this section, then run the end-to-end tests and
   check the [performance budget](#performance-budget).

A new target never affects share links, so it can ship on any day. Avoid
Vite's own `'baseline-widely-available'` target: it is a snapshot taken for
each Vite major release, already older than the real baseline when released.

## Testing

| Layer         | Tool                                        | What                                                                                                                     | Command            |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Domain        | Vitest                                      | Map validation, rules engine, scoring, priorities                                                                        | `npm test`         |
| Solver        | Vitest + real HiGHS                         | Plans are legal and fair for both goals; filling the map adds points in guild order, spread across guilds; replanning; the model allows exactly the random weeks the rules engine allows | `npm test`         |
| Share         | Vitest                                      | Link round trips, rejection of damaged or cheating links, text export                                                    | `npm test`         |
| Languages     | Vitest                                      | Every translation against English; wording of rules and names; plurals; language choice; map layout in every language    | `npm test`         |
| Accessibility | Vitest                                      | Contrast of every text and map pairing in both themes; guild colours under colour-vision deficiencies; distinct outlines | `npm test`         |
| Accessibility | Playwright + axe-core, both themes          | WCAG 2.2 A and AA rules on the setup, the plan and a day being recorded; keyboard focus, map and theme keys              | `npm run test:e2e` |
| State         | Vitest + happy-dom, Svelte browser build    | Restore, received links, address bar, staleness, reactive saving, failed solves, recorded days, noticing new versions    | `npm test`         |
| End to end    | Playwright, Pixel 5 and iPhone 13 viewports | Plan, replan from a day played, refresh, shared links, settings, broken link, update banner, unfinished languages; the CSP is in place, no request leaves the site, no cookies | `npm run test:e2e` |
| Icons         | Vitest + resvg                              | PNG icons drawn from the SVG: opaque where they must be, maskable artwork inside the safe zone, linked from the page and the manifest | `npm test`         |
| Docs          | Vitest                                      | The docs' checkable promises, from the files they name to the storage keys, and every file's SPDX headers (`src/test/docs.test.ts`) | `npm test`         |
| Performance   | Vitest, seeded random openings              | Solve times and fairness for every map and setting                                                                       | `npm run bench`    |

Unit tests run Svelte's browser build (`resolve.conditions` under Vitest in
`vite.config.ts`) so that `$effect` runs as in the app.

Run `npm run bench` after any change to the model, the rules or a map, and
compare times and splits with the figures above.

### Type checking

Each part of the code is type-checked against the environment it runs in,
so shipped code cannot lean on an API it will not have. `tsconfig.json`
holds the shared compiler options and lists one project per environment:

| Project                | Files                                                                    | Types                                 |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `tsconfig.app.json`    | The app in `src/`, without tests or the solver worker                    | DOM and `vite/client`; no Node.js     |
| `tsconfig.worker.json` | `src/solver/worker.ts` and what it imports                               | WebWorker and `vite/client`; no DOM   |
| `tsconfig.node.json`   | Unit tests (`*.test.ts`, `src/test/`), `e2e/`, `bench/`, `scripts/`, root `*.config.ts` | Node.js, plus DOM for happy-dom tests |

Code shared by the app and the worker (the domain, maps and solver model) is
checked under both. `src/service-worker.js` declares its own types with
`// @ts-check` and `/// <reference lib="webworker" />`. `npm run check` runs
`svelte-check` on the app project, which covers the `.svelte` files, and
`tsc` on the other two. Editors and xo follow the references from
`tsconfig.json` to the project that includes each file; xo is told to use
TypeScript's project service for this in `xo.config.js`. A new file outside
these globs is not type-checked: widen the matching project's `include`.

## Build, CI and deployment

- `npm run build` writes a static site to `dist/` with relative URLs
  (`base: "./"`), so it works from any path on any static host.
- The build targets Baseline Widely Available (see
  [Browser support](#browser-support)).
- `.github/workflows/ci.yml` runs on every push and pull request, in three
  jobs side by side, and deploys `main` to GitHub Pages once all pass
  (enable Pages with **GitHub Actions** as the source):
  - lint, type-check, unit tests, and `npm audit --omit=dev`, which fails
    on any advisory in what ships (tooling advisories wait for updates);
  - `npm run lint:reuse`, every file's copyright and licence;
  - the build, its first-visit and solver sizes in the job summary
    (`npm run size`: a warning past the aim, a failure if the solver's size
    told to players is out of date), and the end-to-end tests on that same build,
    which is the one deployed. When they fail, the Playwright report with
    a trace of each failed test is kept for a week.

  A newer push to a pull request cancels its running checks; on `main`,
  runs queue, so a deploy is never cut short. Every job has a time limit.
  Actions are pinned to commit SHAs, with the release in a comment, and
  Playwright's browsers are cached by the lockfile's hash.
- Dependabot (`.github/dependabot.yml`) proposes updates monthly: development
  tools' minor and patch releases together, GitHub Actions together, and
  major releases, HiGHS and xo one at a time (the config says why). Run `npm run bench` before merging
  a HiGHS update, as it can change solve times. Security fixes for known
  vulnerabilities need **Dependabot security updates** turned on in the
  repository's settings.
- The footer links to the source code (the AGPL asks hosted versions to offer
  it). The URL comes from the GitHub Actions environment, or `SOURCE_URL` when
  building elsewhere; a build without either fails, so no copy goes out
  without its source offer (or the privacy notice its contact link). The
  end-to-end tests' build, never published, uses a `.invalid` address.
- The build writes `licenses.txt`, linked from the footer, with the licence of
  every third-party package that has code in the bundles (the app's and the
  solver worker's): MIT and similar licences ask every copy to carry them. The
  `ragna-licenses` plugin finds the packages itself, so a new dependency is
  listed without anyone remembering to; it fails the build if one has no
  licence file. The dev server bundles nothing, so it answers the link with a
  note pointing to a build instead.

## Versioning

Releases are numbered with [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
`MAJOR.MINOR.PATCH`, in `version` in `package.json`. The planner has no API,
so the numbers describe what players notice:

- **Major**: links or saved setups made with the previous release no longer
  open, such as a new link `v` (see "Share links" in
  [SHARING.md](SHARING.md#share-links)). Ship it on a Tuesday, when no plan
  is in use.
- **Minor**: something new players can do or see, such as a feature, a map, a
  goal or option, a finished translation, or an optional link parameter.
- **Patch**: a fix or improvement to what is already there, such as a bug
  fix, wording, layout, speed, or an update to a dependency that ships.

Changes players cannot notice (tests, docs, tooling, refactoring) are not
releases. `main` is deployed on every push, so a change that is a release
raises the version and adds its entry under a new heading in
[CHANGELOG.md](../CHANGELOG.md) in the same pull request, written for
players; Dependabot's updates get theirs in a follow-up. Once it is on
`main`, tag that commit `vMAJOR.MINOR.PATCH` (`git tag -a v1.2.3 -m 1.2.3`)
and push the tag. The footer and `licenses.txt` show the version, so a
player reporting a problem can say which release they have.
