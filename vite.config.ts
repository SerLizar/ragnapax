// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import process from 'node:process';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import type {Plugin, Rolldown} from 'vite';
import {defineConfig} from 'vitest/config';
import {
	generateIcons,
	iconLinks,
	withManifestIcons,
	type GeneratedIcon,
} from './scripts/icons.ts';

// GitHub Actions knows the repository; other builds set SOURCE_URL.
const {SOURCE_URL, GITHUB_SERVER_URL, GITHUB_REPOSITORY} = process.env;
const sourceUrl =
	SOURCE_URL
	?? ((GITHUB_REPOSITORY ?? '') === '' ? '' : `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}`);

// The release, shown in the footer so a player reporting a problem can say
// which one they have: the service worker may serve an older one for a visit.
const {version: release} = JSON.parse(readFileSync('package.json', 'utf8')) as {version: string};

/**
Stops a build that does not know where its source code is. The AGPL asks a
hosted copy to offer its source, and the privacy notice's contact link
points there too, so a build without it must not be published.
*/
function requireSourceUrl(): Plugin {
	return {
		name: 'ragna-require-source-url',
		apply: 'build',
		buildStart() {
			if (sourceUrl === '') {
				this.error(
					'Set SOURCE_URL to the repository this build comes from, e.g. '
					+ 'SOURCE_URL=https://github.com/<owner>/<repo> npm run build. The footer '
					+ 'offers the source code there (as the AGPL asks) and the privacy notice links '
					+ 'to it for contact. Builds on GitHub Actions know it already.',
				);
			}
		},
	};
}

/**
Files fetched only when needed: the solver worker and its WebAssembly, once
someone starts planning, each translation, once someone picks it, the
licences, once someone opens them, and the PNG icons, which only browsers
fetch, when they need them (to install the app, add it to a home screen, or
show a favicon without SVG support). Most visits never fetch any of the
icons' 30 KB, which barely compress, so caching them up front would
make every old phone on 3G download them on install for nothing.
Everything else in the build is the app shell, cached up front.
*/
const LAZY =
	/(?:^|\/)(?:worker-[^/]+\.js|[^/]+\.wasm|language-[^/]+\.js|licenses\.txt|(?:apple-touch-)?icon-[^/]+\.png)$/u;

/**
Draws the PNG icons from `public/icon.svg` and links them from the page and
the web app manifest, in the build and on the dev server alike, so the SVG
is the only icon anyone maintains and nothing generated is committed. See
"Icons" in docs/UI.md.
*/
function icons(): Plugin {
	const svgFile = 'public/icon.svg';
	const manifestFile = 'manifest.webmanifest';
	let drawn: {svg: string; icons: GeneratedIcon[]} | undefined;
	// Drawn again when the SVG changes while the dev server runs.
	const current = (): GeneratedIcon[] => {
		const svg = readFileSync(svgFile, 'utf8');
		if (drawn?.svg !== svg) {
			drawn = {svg, icons: generateIcons(svg)};
		}

		return drawn.icons;
	};

	const publicManifest = () => readFileSync(join('public', manifestFile), 'utf8');

	let outDir = 'dist';
	return {
		name: 'ragna-icons',
		configResolved(config) {
			outDir = config.build.outDir;
		},
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				const path = new URL(request.url ?? '/', 'http://localhost').pathname.slice(1);
				const icon = current().find(({fileName}) => fileName === path);
				if (icon === undefined && path !== manifestFile) {
					next();
					return;
				}

				response.setHeader('Content-Type', icon ? 'image/png' : 'application/manifest+json');
				response.end(icon?.png ?? withManifestIcons(publicManifest(), current()));
			});
		},
		transformIndexHtml(html) {
			// Before the SVG favicon: browsers that can use it should pick it.
			const svgIcon = /<link\s[^>]*"image\/svg\+xml"[^>]*>/u;
			if (!svgIcon.test(html)) {
				throw new Error('index.html has no SVG favicon <link> to put the PNG icons before.');
			}

			return html.replace(svgIcon, tag => `${iconLinks(current())}\n\t\t${tag}`);
		},
		generateBundle() {
			for (const {fileName, png} of current()) {
				this.emitFile({type: 'asset', fileName, source: png});
			}
		},
		// Vite has copied public/ by now; add the PNG icons to its manifest.
		writeBundle() {
			const file = join(outDir, manifestFile);
			writeFileSync(file, withManifestIcons(readFileSync(file, 'utf8'), current()));
		},
	};
}

/**
Writes `sw.js` from `src/service-worker.js`, filling in the list of files
in this build so the worker can cache them and prune leftovers from old
builds. See docs/OPERATIONS.md, "Offline and caching".
*/
function serviceWorker(): Plugin {
	let outDir = 'dist';
	return {
		name: 'ragna-service-worker',
		apply: 'build',
		configResolved(config) {
			outDir = config.build.outDir;
		},
		closeBundle() {
			const walk = (dir: string): string[] =>
				readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
					entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
				);
			const files = walk(outDir)
				.map(file => relative(outDir, file).replaceAll('\\', '/'))
				.filter(file => file !== 'sw.js')
				.toSorted();
			const manifest = {
				version: createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12),
				shell: ['./', ...files.filter(f => !LAZY.test(f) && f !== 'index.html')],
				lazy: files.filter(f => LAZY.test(f)),
			};
			const template = readFileSync('src/service-worker.js', 'utf8');
			writeFileSync(
				join(outDir, 'sw.js'),
				template.replace('globalThis.__MANIFEST__', () => JSON.stringify(manifest)),
			);
		},
	};
}

/**
Third-party packages with code in this build, from the app's bundle and the
solver worker's, which Vite bundles separately and first.
*/
const bundled = new Set<string>();

/**
The package a bundled module comes from; undefined for the app's own code.
*/
function packageOf(id: string): string | undefined {
	// Helpers Vite adds to the bundle, such as its preload helper.
	if (id.startsWith('\0vite/')) {
		return 'vite';
	}

	const path = id.replaceAll('\\', '/');
	const at = path.lastIndexOf('/node_modules/');
	if (at === -1) {
		return undefined;
	}

	const [first, second] = path.slice(at + '/node_modules/'.length).split('/', 2);
	return first!.startsWith('@') ? `${first}/${second}` : first;
}

/**
Notes which packages `bundle` has code from.
*/
function note(bundle: Rolldown.OutputBundle): void {
	for (const chunk of Object.values(bundle)) {
		if (chunk.type !== 'chunk') {
			continue;
		}

		for (const [id, module] of Object.entries(chunk.modules)) {
			const name = packageOf(id);
			if (name !== undefined && module.renderedLength > 0) {
				bundled.add(name);
			}
		}
	}
}

/**
A package's licence, as `licenses.txt` lists it.
*/
function licenceOf(name: string): string {
	const directory = join('node_modules', name);
	const {version, license} = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
		version: string;
		license: string;
	};
	const file = readdirSync(directory).find(entry => /^licen[cs]e(?:\.|$)/iu.test(entry));
	if (file === undefined) {
		throw new Error(`${name} has no licence file to include in licenses.txt`);
	}

	// Vite's file goes on to list what Vite itself bundles; none of it ships here.
	const text = readFileSync(join(directory, file), 'utf8')
		.split(/^#+ licenses of bundled dependencies/imu, 1)[0]!
		.trim();
	return [`${name} ${version} (${license})`, '-'.repeat(72), '', text, ''].join('\n');
}

/**
Writes `licenses.txt`: the licence of every third-party package with code in
the build, which licences such as MIT ask every copy to carry. The footer
links to it. Fails the build if a package has no licence file.
*/
function licenses(): Plugin {
	return {
		name: 'ragna-licenses',
		// The dev server bundles nothing, so it cannot tell which packages a
		// build carries; without this, its fallback would answer the footer's
		// link with the planner itself.
		configureServer(server) {
			server.middlewares.use('/licenses.txt', (_, response) => {
				response.setHeader('Content-Type', 'text/plain; charset=utf-8');
				response.end([
					'The dev server cannot list the third-party licences: the build',
					'writes them, from the packages it bundles. To see them, run',
					'`npm run build` and then `npx vite preview`.',
					'',
				].join('\n'));
			});
		},
		generateBundle(_, bundle) {
			note(bundle);
			this.emitFile({
				type: 'asset',
				fileName: 'licenses.txt',
				source: [
					`Ragnapax ${release} is free software under the GNU Affero General Public License,`,
					`version 3 or later. Its source code: ${sourceUrl}`,
					'',
					'It includes the following third-party software.',
					'',
					...[...bundled].toSorted().map(name => `${'='.repeat(72)}\n${licenceOf(name)}`),
				].join('\n'),
			});
		},
	};
}

/**
A strict Content Security Policy for production. Share links carry text from
strangers, so the page only ever runs its own code: bundled scripts, plus
inline scripts in index.html allowed by their exact hash (the theme script
that runs before first paint). `wasm-unsafe-eval` allows compiling the
solver; nothing else is evaluated.
*/
function contentSecurityPolicy(): Plugin {
	return {
		name: 'ragna-content-security-policy',
		apply: 'build',
		transformIndexHtml: {
			order: 'post',
			handler(html) {
				// Any spelling of the tags, with or without attributes, so an inline
				// script never goes unhashed and silently blocked; those with a src
				// are files, which 'self' already covers.
				const inline = [...html.matchAll(/<script\b(?<attributes>[^>]*)>(?<code>[\s\S]*?)<\/script\b[^>]*>/giu)]
					.filter(({groups}) => !/(?:^|\s)src\s*=/iu.test(groups!.attributes!))
					.map(({groups}) => `'sha256-${createHash('sha256').update(groups!.code!).digest('base64')}'`);
				const policy = [
					'default-src \'self\'',
					['script-src \'self\' \'wasm-unsafe-eval\'', ...inline].join(' '),
					'worker-src \'self\'',
					'style-src \'self\' \'unsafe-inline\'',
					'img-src \'self\' data:',
					'connect-src \'self\'',
					'object-src \'none\'',
					'base-uri \'none\'',
					'form-action \'none\'',
				].join('; ');
				// Right after the charset, so the policy covers every script after it.
				// Formatting may write the tag either way; a page without the policy
				// must never ship, so a missing tag stops the build.
				const charset = /<meta charset="utf-8"\s*\/?>/iu;
				if (!charset.test(html)) {
					throw new Error('index.html has no <meta charset="utf-8"> to put the CSP after.');
				}

				return html.replace(
					charset,
					tag => `${tag}
		<meta http-equiv="Content-Security-Policy" content="${policy}">`,
				);
			},
		},
	};
}

export default defineConfig({
	// Relative asset URLs so the build works from any static host sub-path.
	base: './',
	plugins: [
		requireSourceUrl(),
		svelte(),
		icons(),
		licenses(),
		serviceWorker(),
		contentSecurityPolicy(),
	],
	/* eslint-disable @typescript-eslint/naming-convention -- build-time constants */
	define: {
		__SOURCE_URL__: JSON.stringify(sourceUrl),
		__APP_VERSION__: JSON.stringify(release),
	},
	/* eslint-enable @typescript-eslint/naming-convention */
	build: {
		// Baseline Widely Available, checked October 2026. It moves every month,
		// so recheck it from time to time (see "Browser support" in
		// docs/OPERATIONS.md) and keep tsconfig.json's `lib` in step.
		target: ['es2023', 'chrome123', 'edge123', 'firefox125', 'safari17.4', 'ios17.4'],
		rolldownOptions: {
			output: {
				// Named so the service worker caches translations lazily, like the solver.
				chunkFileNames: ({facadeModuleId}) =>
					facadeModuleId?.includes('/i18n/translations/')
						? 'assets/language-[name]-[hash].js'
						: 'assets/[name]-[hash].js',
			},
		},
	},
	// Module workers, as `PlannerClient` creates them; every browser in the
	// target runs them. One file: HiGHS's only dynamic import is for Node.
	worker: {
		format: 'es',
		plugins: () => [
			{
				name: 'ragna-note-packages',
				generateBundle(_, bundle) {
					note(bundle);
				},
			},
		],
		rolldownOptions: {output: {codeSplitting: false}},
	},
	// Tests run Svelte's browser build so effects work, as in the app.
	resolve: process.env.VITEST === undefined ? undefined : {conditions: ['browser']},
	test: {
		include: ['src/**/*.test.ts'],
		testTimeout: 120_000,
	},
});
