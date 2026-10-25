// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The size of a first visit to the build in dist/, gzipped: the page and the
// scripts and styles it loads, as "Performance budget" in docs/OPERATIONS.md
// measures it. The aim is under 100 KB; going over is a warning, not a
// failure, as the aim is a goal rather than a rule.
//
// Then the solver, downloaded on the first tap on the map: its worker and
// its WebAssembly. Players are told its size before it downloads
// (`solve.download` in src/i18n/en.ts), so a figure more than 0.1 MB off
// the build fails; within that, "~" covers it.
//
//   npm run build && npm run size
//
// On GitHub Actions the tables go to the job's summary as well, and going
// over the aim shows as a warning on the run.
//
// Runs on Node's own TypeScript support (Node 26 or newer).

import {appendFileSync, readdirSync, readFileSync} from 'node:fs';
import process from 'node:process';
import {gzipSync} from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const page = readFileSync(new URL('index.html', dist));
const loaded = [...page.toString().matchAll(/(?:src|href)="\.\/(?<file>assets\/[^"]+\.(?:js|css))"/gu)].map(
	({groups}) => groups!.file!,
);
if (loaded.length === 0) {
	throw new Error('dist/index.html loads no scripts or styles: is dist/ a build?');
}

const solver = readdirSync(new URL('assets/', dist))
	.filter(name => /^worker-.+\.js$|\.wasm$/u.test(name))
	.map(name => `assets/${name}`);
if (solver.length !== 2) {
	throw new Error(`Expected the solver's worker and WebAssembly in dist/assets/, found ${solver.length} files.`);
}

const AIM_KB = 100;
const kb = (bytes: Uint8Array) => gzipSync(bytes, {level: 9}).length / 1000;
const sizeOf = (file: string) => kb(readFileSync(new URL(file, dist)));
const files = [
	{file: 'index.html', size: kb(page)},
	...loaded.map(file => ({file, size: sizeOf(file)})),
];
const total = files.reduce((sum, {size}) => sum + size, 0);
const solverFiles = solver.map(file => ({file, size: sizeOf(file)}));
const solverMb = solverFiles.reduce((sum, {size}) => sum + size, 0) / 1000;

const tables = [
	[
		'| First visit, gzipped | KB |',
		'| --- | ---: |',
		...files.map(({file, size}) => `| \`${file}\` | ${size.toFixed(1)} |`),
		`| **Total** (aim: under ${AIM_KB}) | **${total.toFixed(1)}** |`,
	],
	[
		'| Solver, gzipped | KB |',
		'| --- | ---: |',
		...solverFiles.map(({file, size}) => `| \`${file}\` | ${size.toFixed(1)} |`),
		`| **Total** | **${(solverMb * 1000).toFixed(1)}** |`,
	],
].map(rows => rows.join('\n')).join('\n\n');
console.log(tables);

const summary = process.env.GITHUB_STEP_SUMMARY ?? '';
if (summary !== '') {
	appendFileSync(summary, `${tables}\n`);
}

if (total > AIM_KB) {
	const message = `The first visit is ${total.toFixed(1)} KB gzipped, over the ${AIM_KB} KB aim.`;
	console.log(process.env.GITHUB_ACTIONS === 'true' ? `::warning::${message}` : message);
}

const english = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');
const told = /'solve\.download':\s*'[^']*?~(?<mb>\d+(?:\.\d+)?)\s*MB/u.exec(english)?.groups?.mb;
if (told === undefined) {
	throw new Error('Cannot find the solver\'s size in `solve.download` in src/i18n/en.ts.');
}

if (Math.abs(Number(told) - solverMb) > 0.1) {
	console.error(
		`The solver is ${solverMb.toFixed(2)} MB gzipped, but \`solve.download\` in src/i18n/en.ts tells players ~${told} MB.`
		+ ' Update the message (and "Performance budget" in docs/OPERATIONS.md).',
	);
	process.exitCode = 1;
}
