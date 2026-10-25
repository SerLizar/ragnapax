# Contributing

Thanks for your interest in improving this project! Contributions of all sizes are welcome: bug reports, ideas, fixes and new features.

## Ways to contribute

- **Report a bug or suggest a feature:** open an issue describing what happened (or what you'd like), and steps to reproduce if it's a bug.
- **Send a change:** fork the repository, make your change on a branch, and open a pull request.
- **Share your fork:** if you've built improvements in your own copy, please consider sending them upstream so everyone benefits. If you publish your copy, update its privacy notice first (see [Deployment](README.md#deployment)).
- **Translate:** if you play Tokyo Debunkers in Japanese, French, German, Italian, Spanish, Korean or Chinese, help the planner speak your language. See [Translations](#translations).

## Development setup

See the [README](README.md#development) for setup, and read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before larger changes: it is the overview,
and links to a document for each part of the app, which explain how the planner, share
links and caching work. [docs/SOLVER.md](docs/SOLVER.md#how-to-extend) has step-by-step
guides for adding a map or a plan setting. [AGENTS.md](AGENTS.md) lists the invariants every change must keep.

Before opening a pull request, run:

```sh
npm run lint && npm run check && npm test && npm run test:e2e
```

If you have [uv](https://docs.astral.sh/uv/), `npm run lint:reuse` checks every file's copyright and licence as CI does.

For changes to the solver model, rules or maps, also run `npm run bench` and mention the
timings in the pull request. The same checks run automatically on every pull request.

## Pull request guidelines

1. Keep each pull request focused on one change.
2. Describe what the change does and why.
3. Add or update tests for changes to rules, scoring, the solver or share links.
4. Test your change in a browser before submitting, ideally on a phone-sized screen.
5. Match the existing code style; `npm run lint:fix` applies it for you.
6. Share links must keep working. If the link format has to change, bump its version in
   `src/share/link.ts` rather than breaking old links silently.
7. Update the documents in `docs/` in the same pull request when you change behaviour they describe;
   [Keeping the docs true](AGENTS.md#keeping-the-docs-true) says how to check them for drift.

## Translations

The planner is set up for every language the game offers; [docs/TRANSLATING.md](docs/TRANSLATING.md) explains how to translate it. Translations must be written and reviewed by people who speak the language fluently, using the game's own terms: machine translation and AI-generated text are not accepted, not even as a draft.

If you change interface text, change only `src/i18n/en.ts`; leave the translation files to translators.

## Licensing of contributions

This project is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).

By submitting a contribution, you agree that it is licensed under the same terms. Every file says who holds its copyright and under which licence, following the [REUSE specification](https://reuse.software). New source files should start with an SPDX header, for example:

<!-- REUSE-IgnoreStart -->
```ts
// SPDX-FileCopyrightText: 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
```
<!-- REUSE-IgnoreEnd -->

Svelte, HTML and SVG files use the same lines as `<!-- ... -->` comments, CSS as `/* ... */` comments, and YAML and dotfiles as `#` comments. When you change a file, add your own `SPDX-FileCopyrightText` line under the others, or, if you already have one from an earlier year, extend its years (`2026-2027 Your Name`). Files that cannot hold comments, such as JSON, and the Markdown docs are covered by [`REUSE.toml`](REUSE.toml) instead; if you add one that none of its `path` globs match, add it there.

`npm test` checks that every file is covered. The official checker runs in CI; to run it yourself, install [uv](https://docs.astral.sh/uv/) and run `npm run lint:reuse`, which fetches the pinned checker on first use. The licence text itself is in [LICENSE](LICENSE) and, as REUSE expects, in `LICENSES/`.

If you run a modified version of this project as a hosted website, the AGPL requires you to offer its source code to your users. Sending your changes upstream is the easiest way to keep them shared.

## Game content

Only original code and content may be contributed. Do not submit _Tokyo Debunkers_ assets (images, logos, ripped data files) or other material you don't have the right to share; the game belongs to ZigZaGame Inc., and this project is not affiliated with it. Map definitions describe a map in our own words: ids, roads and coordinates that follow the in-game layout. Positions need not match the game exactly: what matters is that every kingdom sits on the same side of its neighbours as in the game, so players recognise it without doubt. The app stretches the layout to fill the screen, and the tests check that no markers overlap.
