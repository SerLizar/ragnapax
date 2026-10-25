// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// How far each translation has got, and what is left to translate:
//
//   npm run i18n:status          every language, with the share done
//   npm run i18n:status -- fr    French's missing messages, in English
//
// Runs on Node's own TypeScript support (Node 26 or newer).

import {readdirSync} from 'node:fs';
import process from 'node:process';
import en from '../src/i18n/en.ts';
import {LOCALES} from '../src/i18n/locales.ts';

type Catalogue = Record<string, unknown>;

const dir = new URL('../src/i18n/translations/', import.meta.url);
const english: Catalogue = en;
const keys = Object.keys(english);

const files = readdirSync(dir).filter(f => f.endsWith('.ts'));
const modules = await Promise.all(
	files.map(async file => import(new URL(file, dir).href) as Promise<{default: Catalogue}>),
);
const catalogues = new Map(files.map((file, i) => [file.slice(0, -3), modules[i]!.default]));
const hasMessage = (catalogue: Catalogue, key: string) => Object.hasOwn(catalogue, key);

const wanted = process.argv[2];
const catalogue = wanted === undefined ? undefined : catalogues.get(wanted);
if (wanted === undefined) {
	for (const {code, english: name, ready} of LOCALES) {
		const translation = catalogues.get(code);
		if (!translation) {
			continue;
		}

		const done = keys.filter(key => hasMessage(translation, key)).length;
		const percent = Math.floor((100 * done) / keys.length);
		const state = ready ? 'ready' : 'not offered yet';
		console.log(
			`${code.padEnd(8)} ${name.padEnd(20)} ${String(done).padStart(3)}/${keys.length} ${String(percent).padStart(3)}%  ${state}`,
		);
	}
} else if (catalogue === undefined) {
	console.error(`No translation "${wanted}". Codes: ${[...catalogues.keys()].join(', ')}.`);
	process.exitCode = 1;
} else {
	const missing = keys.filter(key => !hasMessage(catalogue, key));
	console.log(`${missing.length} of ${keys.length} messages still in English:\n`);
	for (const key of missing) {
		console.log(`  "${key}": ${JSON.stringify(english[key])},`);
	}
}
