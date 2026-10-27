# Ragnapax

[![Site](https://img.shields.io/website?url=https%3A%2F%2Fserlizar.github.io%2Fragnapax%2F&label=site&up_message=online&down_message=offline)](https://serlizar.github.io/ragnapax/)
[![CI](https://github.com/SerLizar/ragnapax/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SerLizar/ragnapax/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](LICENSE)
[![REUSE compliant](https://img.shields.io/badge/REUSE-compliant-green)](https://reuse.software)
[![TypeScript](https://img.shields.io/github/package-json/dependency-version/SerLizar/ragnapax/dev/typescript?logo=typescript&logoColor=white&color=3178c6)](https://www.typescriptlang.org)
[![Svelte](https://img.shields.io/github/package-json/dependency-version/SerLizar/ragnapax/dev/svelte?logo=svelte&logoColor=white&color=ff3e00)](https://svelte.dev)
[![Node.js](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FSerLizar%2Fragnapax%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&logo=nodedotjs&logoColor=white&color=5fa04e)](package.json)
[![XO code style](https://shields.io/badge/code_style-5ed9c7?logo=xo&labelColor=gray&logoSize=auto)](https://github.com/xojs/xo)

Plan fair **point sharing** for Ragnarok in _Tokyo Debunkers_. Tap the towns
each of the four guilds in your group starts with, choose a goal, and the
planner works out who declares on what each day so every guild ends up with
the same reward. One person plans for the group and shares the result as a
link (or pastes it into chat); everyone else just opens it.

Ragnarok (officially _Game Of Claws: Ragnarok_, often just Ragna or Rag) runs
from Wednesday to Monday. Every group plays the same map that week, and the
game hands out starting towns at random, so each group plans its own week.
Starting towns appear early on Wednesday; plan before declares open at 11:00
server time.

Everything runs on the player's phone: there is no server, no account and
nothing is uploaded.

## Features

- **Tap-to-assign map editor.** Pick a guild, tap its towns; the selection
  moves to the next guild once one is complete, and any leftover town is
  Vacant automatically. Used to spreadsheets? An advanced option lists the
  towns instead, each with its guild to pick.
- **Two goals.** _Equal resources_, the default (the same number of town-,
  dorm- and castle-days for every guild), or _equal points_ (towns, dorms
  and the castle are worth 1, 2 and 3 points a day, on every map, with the
  castle and dorms shared out too).
- **Use every kingdom.** Optionally hold as much of the map as possible on
  every day, even if totals then differ slightly. Extras are shared out as
  evenly as possible, with the most going to the first guild (once days
  are recorded as played, wherever they still fit). Another switch can hand
  the castle's extra days to the last guild instead, while the first guild
  still gets the most points.
- **Guilds sitting out.** Under "Advanced options", mark any guild the game
  put in your group that doesn't play Ragnarok: it makes no declares, nobody
  declares on its kingdoms, and the others share the points between
  themselves. Another advanced switch has each guild declare on as few days
  as possible, so players log in less often, even if that takes more declares.
- **Provably fair plans in seconds.** An exact optimiser
  ([HiGHS](https://highs.dev/)) runs in the browser, shows better plans as it
  finds them, and says whether the result is proven fairest. "How plans are
  ranked" shows exactly what it optimises.
- **Day-by-day replay.** The map at the end of every day, Wednesday to Monday,
  with captures highlighted, each guild's declares and running point totals. Focus on
  one guild to see only its declares, or switch to "Whole week" for every
  day's declares in one list.
- **Replan mid-week.** If a day doesn't go to plan, record what happened and
  plan the rest of the week from there, still fair over the whole week, then
  share the new plan with the group.
- **Ready for every language the game offers.** English for now; Japanese,
  French, German, Italian, Spanish, Korean and Chinese (simplified and
  traditional) are set up for players to translate. The planner follows the
  device's language once a translation is finished.
- **Light and dark themes.** Match the device or choose one; remembered on the
  device and applied before the page draws, so it never flashes.
- **Share anywhere.** Compact links, checked against Ragnarok's rules when opened,
  plus plain-text export for game or Discord chat.
- **Built for older phones, usable on slow networks.** A first visit well under
  100 KB; the solver, over a megabyte, downloads only once someone starts
  planning, then stays cached and works offline.
- **Private by design.** No account, cookies, analytics or tracking, so no
  consent banner. A privacy notice in the footer covers the GDPR and can delete
  everything saved on the device.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how everything works and why,
  in overview, linking to a document for each part of the app.
- [AGENTS.md](AGENTS.md): commands, invariants and conventions; the quick start
  for AI agents and a handy checklist for people.
- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute and the licence terms.
- [docs/TRANSLATING.md](docs/TRANSLATING.md): how to translate the planner into
  your language.
- [CHANGELOG.md](CHANGELOG.md): what changed in each release.

## Development

Requires [Node.js](https://nodejs.org/) 26.12.1 or newer.

```sh
npm install
npm run dev         # dev server with hot reload
npm test            # unit tests, including real solves
npm run check       # type-check TypeScript and Svelte
npm run lint        # xo (lint and formatting)
npm run lint:reuse  # every file's copyright and licence (REUSE; needs uv)
npm run test:e2e    # end-to-end tests (run `npx playwright install chromium webkit` once)
npm run bench       # solver timings and fairness
npm run i18n:status # how far each translation has got
npm run build       # production build in dist/
npm run size        # first-visit and solver sizes of that build, gzipped
```

Built with Svelte 5, TypeScript, Vite and HiGHS (WebAssembly), tested with
Vitest and Playwright. See the [technology stack](docs/ARCHITECTURE.md#technology-stack)
for the reasoning.

## Deployment

The site is static: `npm run build` writes everything to `dist/`, which can be
served from any path on any static host. Pushes to `main` are tested and
published to GitHub Pages by [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
once Pages is enabled with **GitHub Actions** as its source. The footer links to
the source code using the repository the build ran in. Building anywhere else,
set `SOURCE_URL` to your repository's address; the build fails without it, since
the AGPL asks a hosted copy to offer its source:

```sh
SOURCE_URL=https://github.com/<owner>/<repo> npm run build
```

> [!IMPORTANT]
> **Publishing your own copy, or somewhere other than GitHub Pages? Update
> the privacy notice first.** It names who runs and hosts the site, which EU
> visitors are entitled to have right (GDPR, Art. 13); a fork published as it
> is would tell visitors that SerLizar runs it. Set `OPERATOR` in
> [`src/ui/PrivacyNotice.svelte`](src/ui/PrivacyNotice.svelte) to your name,
> and the `privacy.*` messages in [`src/i18n/en.ts`](src/i18n/en.ts) to your
> host and anything else your copy changes. [Privacy](docs/PRIVACY.md) lists
> exactly what to change.

## License

[GNU Affero General Public License v3.0 or later](LICENSE). This is a fan-made
tool, not affiliated with or endorsed by ZigZaGame Inc., the publisher of
_Tokyo Debunkers_.
