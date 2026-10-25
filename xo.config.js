// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...svelte.configs.recommended,
	{
		rules: {
			// Vitest only runs *.test.ts, so importing shared helpers from
			// src/test/ is safe (the rule guards against the Node test runner).
			'node-test/no-import-test-files': 'off',
			// The `v` flag needs a newer target than tsconfig.json's ES2023.
			'require-unicode-regexp': ['error', {requireFlag: 'u'}],
			// Iterator helpers are not yet Baseline Widely Available (Firefox 131,
			// Safari 18.4), nor in tsconfig.json's ES2023 library, so spread instead.
			'unicorn/prefer-iterator-to-array': 'off',
			'unicorn/prefer-iterator-helpers': 'off',
			// Contradicts `unicorn/prefer-continue`, which asks for exactly these
			// guard clauses; we keep the guards.
			'unicorn/no-break-in-nested-loop': 'off',
		},
	},
	{
		files: ['src/**'],
		languageOptions: {globals: {...globals.browser, __SOURCE_URL__: 'readonly', __APP_VERSION__: 'readonly'}},
	},
	{
		files: ['src/service-worker.js'],
		languageOptions: {globals: globals.serviceworker},
	},
	{
		// The root tsconfig.json only lists the projects for each environment (app,
		// worker, Node). xo looks for a file in tsconfig.json's own `include`
		// and lints anything missing with generic settings, so hand TypeScript
		// files to the project service instead, which follows the references.
		files: ['**/*.ts'],
		languageOptions: {parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname}},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
	{
		files: ['**/*.svelte'],
		rules: {
			// Components are named like the tags that use them.
			'unicorn/filename-case': ['error', {case: 'pascalCase', checkDirectories: false}],
			// Svelte's own version knows that props and derived values stay `let`.
			'prefer-const': 'off',
			'svelte/prefer-const': 'error',
			// The style rules of xo stop at the script; these carry it into the markup.
			'svelte/indent': ['error', {indent: 'tab'}],
			'svelte/html-quotes': 'error',
			'svelte/html-closing-bracket-spacing': 'error',
			'svelte/mustache-spacing': 'error',
			'svelte/spaced-html-comment': 'error',
			'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
			'svelte/first-attribute-linebreak': 'error',
			'svelte/html-closing-bracket-new-line': 'error',
			// The core rule counts parameter names in function types as unused.
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{varsIgnorePattern: '^_', argsIgnorePattern: '^_'},
			],
			// `onclick={() => (open = true)}` is how Svelte markup sets state.
			'no-return-assign': 'off',
			// Components are written in TypeScript, so use xo's TypeScript JSDoc
			// settings: types live in the code, not in doc comments.
			'jsdoc/require-param': ['error', {ignoreWhenAllParamsMissing: true}],
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-property-type': 'off',
			'jsdoc/require-returns-type': 'off',
			'jsdoc/no-types': 'error',
		},
	},
	{
		// Translations are named by their BCP 47 locale code.
		files: ['src/i18n/translations/*.ts'],
		rules: {'unicorn/filename-case': 'off'},
	},
	{
		// Object keys here are kingdom ids from the game, and the colour
		// maths keeps the symbols of the paper it implements.
		files: ['src/maps/**', 'src/test/**', '**/*.test.ts'],
		rules: {'@typescript-eslint/naming-convention': 'off'},
	},
	{
		// Tests only read the project's own files, so slow regexes on hostile
		// input cannot happen there.
		files: ['**/*.test.ts', 'e2e/**'],
		rules: {
			'regexp/no-super-linear-move': 'off',
			'regexp/no-super-linear-backtracking': 'off',
		},
	},
	{
		// Open Graph previews would need an absolute URL for each deployment;
		// the theme colour and manifest are progressive enhancements.
		files: ['index.html'],
		rules: {
			'@html-eslint/require-open-graph-protocol': 'off',
			'@html-eslint/use-baseline': 'off',
		},
	},
];

export default xoConfig;
