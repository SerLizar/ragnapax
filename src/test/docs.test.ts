// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

// The docs make promises about the code: where things are, what the app
// stores, how files start. Each promise that can be checked cheaply is
// checked here, so the docs cannot drift from the code unnoticed. Promises
// about the running app (no third-party requests, no cookies) are checked in
// e2e/planner.spec.ts.

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, matchesGlob} from 'node:path';
import {describe, expect, it} from 'vitest';
import {decodeShareLink} from '../share/link.ts';

const root = join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
// The repository's files, new ones included before they are committed.
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
	cwd: root,
	encoding: 'utf8',
})
	.split('\n')
	.filter(file => file !== '' && existsSync(join(root, file)));
const docs = tracked.filter(file => file.endsWith('.md'));

/**
GitHub's anchor for each heading in a Markdown file.
*/
function anchorsOf(file: string): Set<string> {
	const anchors = new Set<string>();
	const counts = new Map<string, number>();
	// Lines starting with # in code blocks are not headings.
	const text = read(file).replaceAll(/```[\s\S]*?```/gu, '');
	for (const {groups} of text.matchAll(/^#+\s+(?<heading>.+)$/gmu)) {
		const slug = groups!.heading!
			.toLowerCase()
			.replaceAll(/[^\s\p{Letter}\p{Number}-]/gu, '')
			.replaceAll(/\s/gu, '-');
		const seen = counts.get(slug) ?? 0;
		anchors.add(seen === 0 ? slug : `${slug}-${seen}`);
		counts.set(slug, seen + 1);
	}

	return anchors;
}

const headingsOf = (file: string) =>
	new Set(
		[...read(file).matchAll(/^#+\s+(?<heading>.+)$/gmu)].map(({groups}) => groups!.heading!),
	);

describe('the docs', () => {
	it.each(docs)('%s names only files that exist', file => {
		const paths = read(file).matchAll(
			/(?<![\w\-./])(?<path>(?:src|e2e|docs|scripts|bench|public|\.github)\/[\w\-./]*\w)/gu,
		);
		const missing = [...paths]
			.map(({groups}) => groups!.path!)
			.filter(path => !existsSync(join(root, path)));
		expect(missing).toEqual([]);
	});

	it.each(docs)('%s links only to files and sections that exist', file => {
		const broken: string[] = [];
		for (const {groups} of read(file).matchAll(/\]\((?<target>[^\s)]+)\)/gu)) {
			const target = groups!.target!;
			if (/^[a-z]+:/u.test(target)) {
				continue; // Another site
			}

			const [path, anchor] = target.split('#', 2);
			const linked = path === '' ? file : join(dirname(file), path!).replaceAll('\\', '/');
			const isMissing = !existsSync(join(root, linked))
				|| (anchor !== undefined && linked.endsWith('.md') && !anchorsOf(linked).has(anchor));
			if (isMissing) {
				broken.push(target);
			}
		}

		expect(broken).toEqual([]);
	});

	// Comments send readers to a section by its title, as in `"Privacy" in
	// docs/PRIVACY.md`; renaming or moving the section strands them.
	it('has every section that the code refers to', () => {
		const gap = String.raw`[\s#*/]+`;
		const referrals = new RegExp(
			[
				String.raw`"(?<title>[^\n"]+)"${gap}in${gap}(?<doc>docs/[\w-]+\.md)`,
				String.raw`(?<doc2>docs/[\w-]+\.md),${gap}"(?<title2>[^\n"]+)"`,
			].join('|'),
			'gu',
		);
		const missing: string[] = [];
		let found = 0;
		const texts = tracked.filter(f => /\.(?:ts|js|svelte|html|css|ya?ml|md)$/u.test(f));
		for (const file of texts) {
			for (const {groups} of read(file).matchAll(referrals)) {
				found++;
				const title = groups!.title ?? groups!.title2!;
				const doc = groups!.doc ?? groups!.doc2!;
				if (!existsSync(join(root, doc)) || !headingsOf(doc).has(title)) {
					missing.push(`${file}: "${title}" in ${doc}`);
				}
			}
		}

		// A pattern that matched nothing would pass without checking anything.
		expect(found).toBeGreaterThan(0);
		expect(missing).toEqual([]);
	});
});

describe('"Repository layout" and "Application state" in docs/ARCHITECTURE.md', () => {
	const architecture = read('docs/ARCHITECTURE.md');
	const layout = /## Repository layout\s+```text\n(?<block>[\s\S]*?)```/u.exec(architecture)?.groups?.block ?? '';

	// The folders listed file by file: a file added there should be too.
	const listed = tracked.filter(file =>
		/^src\/(?:domain|solver)\/[^/]+\.ts$/u.test(file) && !file.endsWith('.test.ts'));

	it('finds the layout and the files it lists', () => {
		expect(layout).not.toBe('');
		expect(listed.length).toBeGreaterThan(0);
	});

	it.each(listed)('lists %s', file => {
		expect(layout).toMatch(new RegExp(String.raw`^\s+${file.split('/').at(-1)!.replaceAll('.', String.raw`\.`)}\s`, 'mu'));
	});

	const actions = /^- \*\*Actions:\*\*(?<list>[\s\S]*?)\.\n/mu.exec(architecture)?.groups?.list ?? '';
	const methods = [...read('src/state/planner.svelte.ts').matchAll(/^\t(?:async )?(?<name>[a-z]\w*)\(/gmu)]
		.map(({groups}) => groups!.name!)
		.filter(name => name !== 'constructor');

	it('finds the actions and PlannerState\'s methods', () => {
		expect(actions).not.toBe('');
		expect(methods.length).toBeGreaterThan(0);
	});

	it.each(methods)('lists PlannerState.%s among the actions', name => {
		expect(actions).toContain(`\`${name}\``);
	});
});

describe('example share links in the docs', () => {
	// Whole links only: a fragment cut short with "…" is an illustration.
	const examples = docs.flatMap(file =>
		[...read(file).matchAll(/`(?<link>#v=[^`…]+)`/gu)].map(({groups}) => [file, groups!.link!] as const),
	);

	it('finds some', () => {
		expect(examples.length).toBeGreaterThan(0);
	});

	it.each(examples)('%s: %s opens', (_, link) => {
		expect(decodeShareLink(link)).toBeDefined();
	});
});

describe('the conventions in AGENTS.md: every file\'s copyright and licence (REUSE)', () => {
	// The same check as `npm run lint:reuse`, for anyone without Python: a
	// file starts with SPDX headers, or REUSE.toml covers it. The licence
	// texts themselves are exempt.
	// REUSE-IgnoreStart
	const copyright = /SPDX-FileCopyrightText: \d{4} \S/u;
	const licence = /SPDX-License-Identifier: AGPL-3\.0-or-later/u;
	// REUSE-IgnoreEnd
	const toml = read('REUSE.toml');
	const globs = [...toml.matchAll(/^path = \[(?<list>[^\]]*)\]/gmu)].flatMap(({groups}) =>
		[...groups!.list!.matchAll(/"(?<glob>[^"]+)"/gu)].map(match => match.groups!.glob!));
	const isCovered = (file: string) => globs.some(glob => matchesGlob(file, glob));
	const files = tracked.filter(file => file !== 'LICENSE' && !file.startsWith('LICENSES/'));

	it('reads the paths REUSE.toml covers, all under the project\'s licence', () => {
		expect(globs.length).toBeGreaterThan(0);
		expect(toml).toMatch(/^SPDX-FileCopyrightText = "\d{4} \S/mu);
		expect(toml).toMatch(/^SPDX-License-Identifier = "AGPL-3\.0-or-later"$/mu);
		expect(existsSync(join(root, 'LICENSES/AGPL-3.0-or-later.txt'))).toBe(true);
	});

	it.each(files)('%s starts with SPDX headers or is covered by REUSE.toml', file => {
		if (isCovered(file)) {
			return;
		}

		const head = read(file).split('\n').slice(0, 6).join('\n');
		expect(head).toMatch(copyright);
		expect(head).toMatch(licence);
	});

	it.each(globs)('REUSE.toml path %s matches a file', glob => {
		// A stale glob would quietly cover a file added later under the wrong name.
		expect(files.some(file => matchesGlob(file, glob))).toBe(true);
	});
});

describe('saved data, as "Saved data" in docs/SHARING.md describes it', () => {
	const sharing = read('docs/SHARING.md');
	const keys = new Set(
		tracked
			.filter(file => file.startsWith('src/') && !file.includes('.test.'))
			.flatMap(file => [...read(file).matchAll(/'(?<key>ragnapax\/[\w-]+)'/gu)])
			.map(({groups}) => groups!.key!),
	);

	it('finds the keys the app stores', () => {
		expect(keys.size).toBeGreaterThan(0);
	});

	it.each([...keys])('documents the storage key %s', key => {
		expect(sharing).toContain(`\`${key}\``);
	});

	it('names the offline cache the same in the service worker and storage', () => {
		const inWorker = /const CACHE = '(?<name>[^']+)'/u.exec(read('src/service-worker.js'));
		const inStorage = /const OFFLINE_CACHE = '(?<name>[^']+)'/u.exec(read('src/state/storage.ts'));
		expect(inWorker?.groups?.name).toBeDefined();
		expect(inStorage?.groups?.name).toBe(inWorker?.groups?.name);
	});
});

describe('the theme script in index.html, kept in step with theme.svelte.ts', () => {
	const page = read('index.html');
	const theme = read('src/state/theme.svelte.ts');

	it('reads the same storage key', () => {
		const key = /const KEY = '(?<key>[^']+)'/u.exec(theme)?.groups?.key;
		expect(key).toBeDefined();
		expect(page).toContain(`localStorage.getItem('${key}')`);
	});

	it('sets the same browser colours', () => {
		const chrome = /const CHROME[^=]*=\s*\{light: '(?<light>#\w+)', dark: '(?<dark>#\w+)'\}/u.exec(theme);
		expect(chrome).not.toBeNull();
		expect(page).toContain(`content="${chrome!.groups!.light}" name="theme-color"`);
		expect(page).toContain(`.content = '${chrome!.groups!.dark}'`);
	});

	it('starts an installed app in the light theme\'s colours', () => {
		const light = /const CHROME[^=]*=\s*\{light: '(?<light>#\w+)'/u.exec(theme)?.groups?.light;
		expect(light).toBeDefined();
		const manifest = JSON.parse(read('public/manifest.webmanifest')) as Record<string, unknown>;
		expect(manifest.theme_color).toBe(light);
		expect(manifest.background_color).toBe(light);
	});
});

type Tsconfig = {
	compilerOptions?: {lib?: string[]; types?: string[]};
	references?: Array<{path: string}>;
};

const tsconfig = (file: string) => JSON.parse(read(file)) as Tsconfig;
const projects = (tsconfig('tsconfig.json').references ?? []).map(({path}) => path.replace(/^\.\//u, ''));

describe('"Browser support"', () => {
	it('builds for the same ECMAScript version that type-checking allows', () => {
		const target = /target: \['es(?<year>\d{4})'/u.exec(read('vite.config.ts'))?.groups?.year;
		expect(target).toBeDefined();
		expect(projects.length).toBeGreaterThan(0);
		const files = ['tsconfig.json', ...projects];
		const libs = files.map(file => {
			const lib = tsconfig(file).compilerOptions?.lib ?? [];
			return `${file}: ${lib.find(entry => /^es\d{4}$/iu.test(entry))?.slice(2) ?? 'none'}`;
		});
		expect(libs).toEqual(files.map(file => `${file}: ${target!}`));
	});
});

describe('"Type checking" in docs/OPERATIONS.md', () => {
	const operations = read('docs/OPERATIONS.md');

	it('describes every project, and npm run check checks each', () => {
		expect(projects.length).toBeGreaterThan(0);
		const {check} = (JSON.parse(read('package.json')) as {scripts: {check: string}}).scripts;
		for (const project of projects) {
			expect(operations).toContain(`| \`${project}\``);
			expect(check).toContain(project);
		}
	});

	it('keeps Node.js types out of shipped code, and DOM out of the solver worker', () => {
		const app = tsconfig('tsconfig.app.json').compilerOptions!;
		const worker = tsconfig('tsconfig.worker.json').compilerOptions!;
		expect(app.types).not.toContain('node');
		expect(worker.types).not.toContain('node');
		expect(worker.lib!.map(lib => lib.toLowerCase())).not.toContain('dom');
		expect(tsconfig('tsconfig.json').compilerOptions!.types).toEqual([]);
	});
});

describe('the Node.js version', () => {
	const minimum = /"node": ">=(?<version>[\d.]+)"/u.exec(read('package.json'))?.groups?.version;
	const stated = docs.flatMap(file =>
		[...read(file).matchAll(/Node(?:\.js)?(?:\]\([^)]*\))? (?<version>\d+(?:\.\d+)*)(?:\+| or newer)/gu)]
			.map(({groups}) => `${file}: ${groups!.version!}`),
	);

	it('is what package.json requires, wherever the docs state it', () => {
		expect(minimum).toBeDefined();
		expect(stated.length).toBeGreaterThan(0);
		expect(stated.filter(entry => !entry.endsWith(`: ${minimum}`))).toEqual([]);
	});

	// CI installs the newest release of the .nvmrc line, never one below it.
	it('is in the release line .nvmrc names', () => {
		expect(minimum?.split('.', 1)[0]).toBe(read('.nvmrc').trim());
	});
});
