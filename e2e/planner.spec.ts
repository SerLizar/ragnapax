// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page} from '@playwright/test';

/**
The release, as package.json numbers it and the footer shows it.
*/
const {version} = JSON.parse(readFileSync('package.json', 'utf8')) as {version: string};

/**
Four towns per guild, in the order each guild's towns are tapped.
*/
const OPENING = ['A', 'E', 'F', 'B', 'C', 'D', 'G', 'J', 'M', 'N', 'R', 'P', 'K', 'H', 'L', 'O'];

/**
A Wednesday in a week of The Floating City, the map these tests plan on:
without a link, the planner opens on the map of the week. Only the date is
fixed; timers run.
*/
const FLOATING_CITY_WEEK = new Date(2026, 10, 4, 12);

test.beforeEach(async ({page}) => {
	await page.clock.setFixedTime(FLOATING_CITY_WEEK);
});

/**
The summary of the fairest plan for `OPENING` under the default goal.
*/
const FAIR_SHARE = 'Every guild gets the same holdings: 25 town-days, 10 dorm-days and 1 castle-day.';

const town = (page: Page, id: string) =>
	page.getByRole('button', {name: new RegExp(`^Town ${id},`, 'u')});

/**
A first tap, which is when the planner stores its offline copy.
*/
async function useOnce(page: Page) {
	await page.getByRole('heading', {name: 'Ragnapax'}).click();
}

async function setUp(page: Page) {
	await page.goto('/');
	await page.getByRole('textbox', {name: 'Name of guild 1'}).fill('Nightowls');
	// The selected guild moves on by itself once it has its four towns.
	for (const id of OPENING) {
		// eslint-disable-next-line no-await-in-loop -- taps must happen in order
		await town(page, id).click();
	}

	await expect(page.getByText('All set. Town Q starts Vacant.')).toBeVisible();
}

async function setUpAndPlan(page: Page) {
	await setUp(page);
	await page.getByRole('button', {name: 'Find a fair plan'}).click();
	// The towns are locked until the best plan is confirmed: a tap would put
	// the plans still to come out of date.
	await expect(page.getByText('Starting towns are locked until the best plan is confirmed.')).toBeVisible();
	await expect(town(page, 'A')).toHaveCount(0);
	await expect(page.getByText(FAIR_SHARE)).toBeVisible({timeout: 60_000});
	// Put away once planning is done, so a stray tap cannot change it.
	await expect(page.getByText('Your plan is ready.')).toBeVisible({timeout: 60_000});
	await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeHidden();
}

test('plans a fair share from a fresh setup', async ({page}) => {
	await setUpAndPlan(page);
	await expect(page.getByText('Fairest', {exact: true})).toBeVisible();

	// Step through the war and focus on one guild's declares.
	await page.getByRole('tab', {name: 'Thursday'}).click();
	const owls = page.getByRole('button', {name: 'Nightowls', exact: true});
	await owls.click();
	await expect(owls).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', {name: 'Copy declares for Nightowls'})).toBeVisible();
	// Pressed again, it shows every guild.
	await owls.click();
	await expect(page.getByRole('button', {name: 'All guilds'})).toHaveAttribute('aria-pressed', 'true');

	// Nothing could beat it, which the planner says before planning again.
	await page.getByRole('button', {name: 'Edit setup'}).click();
	const again = page.getByRole('button', {name: 'Plan again'});
	await expect(again).toHaveAccessibleDescription(/already the fairest plan possible/u);
	await again.click();
	// Once the plan is confirmed the fairest, even while declares are still
	// being trimmed, a tap changes the setup and keeps that plan.
	await town(page, 'A').click({timeout: 60_000});
	await expect(page.getByText('The setup changed after this plan was made')).toBeVisible();
	await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeVisible();
});

test('opens on the map every group plays this week', async ({page}) => {
	await page.clock.setFixedTime(new Date(2026, 9, 28, 12));
	await page.goto('/');
	await expect(page.getByRole('combobox', {name: 'Map'})).toHaveValue('sea-of-poseidon');
});

test('picks a guild from a tap anywhere on its pill', async ({page}) => {
	await page.goto('/');
	const second = page.getByRole('button', {name: 'Assign towns to Guild 2'});
	const third = page.getByRole('button', {name: 'Assign towns to Guild 3'});
	// Taps where a player would, by position: the count and the pill's edge.
	const count = await page.getByText('0/4').nth(1).boundingBox();
	await page.mouse.click(count!.x + (count!.width / 2), count!.y + (count!.height / 2));
	await expect(second).toHaveAttribute('aria-pressed', 'true');
	const name = await page.getByRole('textbox', {name: 'Name of guild 3'}).boundingBox();
	await page.mouse.click(name!.x + name!.width + 2, name!.y + 1);
	await expect(third).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('textbox', {name: 'Name of guild 3'})).not.toBeFocused();
});

test('moves around the map with arrow keys, one stop on the Tab key', async ({page}) => {
	await page.goto('/');
	await page.getByRole('textbox', {name: 'Name of guild 4'}).focus();
	await page.keyboard.press('Tab');
	await expect(town(page, 'A')).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(town(page, 'B')).toBeFocused();
	await page.keyboard.press('ArrowDown');
	// Held down, the key repeats; the town changes hands only once.
	await page.keyboard.down('Enter');
	await page.keyboard.down('Enter');
	await page.keyboard.up('Enter');
	await expect(page.getByRole('button', {name: 'Town L, Guild 4'})).toBeFocused();
	// Tab leaves the map rather than visiting every town.
	await page.keyboard.press('Tab');
	await expect(page.getByRole('radio', {name: 'Equal resources', exact: true})).toBeFocused();
});

/**
WCAG 2.2 A and AA problems axe finds on the page as it is, as readable lines.
*/
async function accessibilityProblems(page: Page) {
	const {violations} = await new AxeBuilder({page})
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	return violations.map(v => `${v.id}: ${v.help} (${v.nodes.map(n => n.target.join(' ')).join(', ')})`);
}

for (const theme of ['light', 'dark'] as const) {
	test(`passes automated accessibility checks in the ${theme} theme`, async ({page}) => {
		await page.emulateMedia({colorScheme: theme});
		await setUp(page);
		await page.getByText('Privacy', {exact: true}).click();
		await page.getByText('How plans are ranked').click();
		expect(await accessibilityProblems(page)).toEqual([]);

		await page.getByRole('button', {name: 'Find a fair plan'}).click();
		await expect(page.getByText('Your plan is ready.')).toBeVisible({timeout: 60_000});
		await page.getByRole('tab', {name: 'Thursday'}).click();
		await page.getByRole('button', {name: 'Nightowls', exact: true}).click();
		await page.getByRole('button', {name: 'Record Wednesday'}).click();
		expect(await accessibilityProblems(page)).toEqual([]);
	});
}

test('changes theme with arrow keys, as a radio group', async ({page}) => {
	await page.goto('/');
	await page.getByRole('radio', {name: 'Match device theme'}).focus();
	await page.keyboard.press('ArrowRight');
	const light = page.getByRole('radio', {name: 'Light theme'});
	await expect(light).toBeChecked();
	await expect(light).toBeFocused();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	// Only the chosen theme is a stop on the Tab key.
	await expect(page.getByRole('radio', {name: 'Dark theme'})).toHaveAttribute('tabindex', '-1');
});

test('keeps keyboard focus in place through planning', async ({page}) => {
	await setUp(page);
	await page.getByRole('button', {name: 'Find a fair plan'}).focus();
	await page.keyboard.press('Enter');
	// The button gives way to the progress, then to the plan.
	await expect(page.getByRole('button', {name: /^(?:Cancel|Use this plan)$/u})).toBeFocused();
	await expect(page.getByRole('heading', {name: /^Plan /u})).toBeFocused({timeout: 60_000});
	await expect(page.getByRole('status').filter({hasText: 'Plan ready.'})).toContainText(
		'The fairest plan possible',
	);

	await page.getByRole('button', {name: 'Edit setup'}).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeFocused();
});

test('plans the rest of the week from a day as it was played', async ({page}) => {
	await setUpAndPlan(page);
	await page.getByRole('button', {name: 'Record Wednesday'}).click();
	// The day starts as planned; save it as it is.
	await page.getByRole('button', {name: 'Save Wednesday'}).click();
	await expect(page.getByText('Played: Wednesday.')).toBeVisible();
	await expect(page.getByText('The setup changed after this plan was made')).toBeVisible();
	await expect(page.getByRole('button', {name: 'Copy as text'})).toBeDisabled();
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(page.getByText('Starting towns are locked')).toBeVisible();

	await page.getByRole('button', {name: 'Plan the rest of the week'}).click();
	await expect(page.getByText('Planned from the end of Wednesday')).toBeVisible({timeout: 60_000});
	await expect(page.getByText(FAIR_SHARE)).toBeVisible();

	// Still there after a refresh, and undone by removing the day.
	await page.reload();
	await expect(page.getByText('Played: Wednesday.')).toBeVisible();
	await page.getByRole('button', {name: 'Remove Wednesday'}).click();
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(page.getByText('Starting towns are locked')).toBeHidden();
});

test('records the days that went to plan in one go', async ({page}) => {
	// On a Saturday, Friday is the last day over.
	await page.clock.setFixedTime(new Date(2026, 10, 7, 12));
	await setUpAndPlan(page);
	await expect(page.getByRole('combobox', {name: 'Went to plan up to'})).toHaveValue('3');
	await page.getByRole('button', {name: 'Save up to Friday as planned'}).click();
	await expect(page.getByText('Played: Wednesday, Thursday, and Friday.')).toBeVisible();
	// Only the day that went wrong is left to record by hand.
	await expect(page.getByRole('button', {name: 'Record Saturday'})).toBeVisible();
	await expect(page.getByRole('combobox', {name: 'Went to plan up to'})).toHaveValue('4');
});

test('keeps your own plan after a refresh', async ({page}) => {
	await setUpAndPlan(page);
	await page.reload();
	await expect(page.getByText(FAIR_SHARE)).toBeVisible();
	// How good it was known to be only matters while planning.
	await expect(page.getByText('Your saved plan, checked against Ragnarok')).toBeVisible();
	await expect(page.getByText('Someone shared this plan with you')).toBeHidden();
	await expect(page.getByText('Your plan is ready.')).toBeVisible();
});

test('opens a plan someone shared', async ({page, context}) => {
	await setUpAndPlan(page);
	// Catch what the share sheet would get; WebKit has no clipboard to read.
	await page.evaluate(() => {
		Object.defineProperty(navigator, 'share', {
			async value({url}: ShareData) {
				Object.defineProperty(navigator, 'sharedUrl', {value: url});
			},
		});
	});
	await page.getByRole('button', {name: 'Share plan'}).click();
	const link = await page.evaluate(() => (navigator as {sharedUrl?: string}).sharedUrl ?? '');
	expect(link).toContain('#v=1&m=floating-city');
	expect(link).toMatch(/&s=1$/u);

	const friend = await context.browser()!.newPage();
	await friend.goto(link);
	await expect(friend.getByText('Someone shared this plan with you')).toBeVisible();
	await expect(friend.getByText(FAIR_SHARE)).toBeVisible();
	await expect(friend.getByRole('button', {name: 'Nightowls', exact: true})).toBeVisible();
	// Still someone else's plan after a refresh.
	await friend.reload();
	await expect(friend.getByText('Someone shared this plan with you')).toBeVisible();
});

test('opening someone else\'s plan keeps your own', async ({page}) => {
	await setUpAndPlan(page);
	const own = page.url();
	await page.goto(own.replace('g=Nightowls', 'g=Foxes') + '&s=1');
	await expect(page.getByText('Someone shared this plan with you')).toBeVisible();
	await expect(page.getByRole('button', {name: 'Foxes', exact: true})).toBeVisible();

	// Opening the planner without a link brings back your own plan.
	await page.goto('/');
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(page.getByRole('textbox', {name: 'Name of guild 1'})).toHaveValue('Nightowls');
	await expect(page.getByText('Your saved plan, checked against Ragnarok')).toBeVisible();
});

test('a shared plan becomes yours once you change it', async ({page}) => {
	await setUpAndPlan(page);
	await page.goto(page.url().replace('g=Nightowls', 'g=Foxes') + '&s=1');
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(page).toHaveURL(/&s=1$/u);
	await page.getByRole('textbox', {name: 'Name of guild 1'}).fill('Wolves');
	await expect(page).not.toHaveURL(/&s=/u);

	await page.goto('/');
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(page.getByRole('textbox', {name: 'Name of guild 1'})).toHaveValue('Wolves');
});

test('remembers settings, including using every kingdom', async ({page}) => {
	await page.goto('/');
	// Each option is named by its title and described by the rest.
	await expect(page.getByRole('radio', {name: 'Equal resources', exact: true})).toHaveAccessibleDescription(
		/^Every guild holds towns, dorms and the castle/u,
	);
	await expect(page.getByRole('radio', {name: 'Equal resources', exact: true})).toBeChecked();
	await expect(page.getByRole('switch', {name: 'Use every kingdom', exact: true})).not.toBeChecked();
	await page.getByRole('radio', {name: 'Equal points', exact: true}).check();
	await page.getByRole('switch', {name: 'Use every kingdom', exact: true}).check();
	await page.reload();
	await expect(page.getByRole('radio', {name: 'Equal points', exact: true})).toBeChecked();
	await expect(page.getByRole('switch', {name: 'Use every kingdom', exact: true})).toBeChecked();
});

test('leaves a guild sitting out alone, and never lets every guild sit out', async ({page}) => {
	await setUp(page);
	await page.getByText('Advanced options').click();
	const sitsOut = (name: string) => page.getByRole('group', {name: 'Guilds sitting out'}).getByRole('switch', {name, exact: true});
	await sitsOut('Guild 4').check();
	await page.getByRole('button', {name: 'Find a fair plan'}).click();
	await expect(page.getByText('Your plan is ready.')).toBeVisible({timeout: 60_000});
	await expect(page.getByRole('rowheader', {name: 'Guild 4 Sitting out'})).toBeVisible();
	expect(new URL(page.url()).hash).toContain('i=4');

	// Kept after a refresh, with the options open to show it.
	await page.reload();
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(sitsOut('Guild 4')).toBeChecked();
	await sitsOut('Nightowls').check();
	await sitsOut('Guild 2').check();
	await expect(sitsOut('Guild 3')).toBeDisabled();
	await expect(page.getByText('At least one guild must play.')).toBeVisible();
});

test('can rank plans by the days with declares, and remembers it', async ({page}) => {
	await page.goto('/');
	await page.getByText('Advanced options').click();
	const fewerDays = page.getByRole('switch', {name: 'Declare on fewer days', exact: true});
	await expect(fewerDays).toHaveAccessibleDescription(/^Each guild declares on as few days as possible/u);
	await fewerDays.check();
	await page.getByText('How plans are ranked').click();
	await expect(page.getByRole('listitem').filter({hasText: /^Fewest (?:days with )?declares/u})).toHaveText([
		'Fewest days with declares, per guild',
		'Fewest declares',
	]);
	await expect(page).toHaveURL(/&d=1&/u);

	// Kept after a refresh, with the options open to show it.
	await page.reload();
	await expect(fewerDays).toBeVisible();
	await expect(fewerDays).toBeChecked();
});

test('plans holdings set by hand, in place of the goal, and warns of totals the map cannot hold', async ({page}) => {
	await setUp(page);
	await page.getByText('Advanced options').click();
	const byHand = page.getByRole('switch', {name: 'Set holdings by hand', exact: true});
	await expect(byHand).toHaveAccessibleDescription(/^Choose how many days each guild holds/u);
	await byHand.check();
	await expect(page.getByRole('radio', {name: 'Equal resources'})).toBeDisabled();
	await expect(page.getByRole('switch', {name: 'Use every kingdom'})).toBeDisabled();
	await expect(page).toHaveURL(/&k=25\.10\.1-25\.10\.1-25\.10\.1-25\.10\.1&/u);

	// Seven castle-days in a six-day week.
	const castle = page.getByRole('spinbutton', {name: 'Castle-days for Nightowls'});
	await expect(castle).toHaveValue('1');
	await castle.fill('4');
	await expect(page.getByRole('alert')).toHaveText(/Castle-days add up to 7, but the map only has 6 in a week\./u);
	await expect(castle).toHaveAttribute('aria-invalid', 'true');
	await page.getByRole('button', {name: 'Reset'}).click();
	await expect(castle).toHaveValue('1');
	await expect(page.getByRole('alert')).toBeHidden();

	await page.getByText('How plans are ranked').click();
	await expect(page.getByRole('listitem').filter({hasText: /closest to those set/u})).toHaveText([
		'Castle-days closest to those set for each guild',
		'Dorm-days closest to those set for each guild',
		'Town-days closest to those set for each guild',
	]);
	await page.getByRole('button', {name: 'Find a fair plan'}).click();
	await expect(page.getByText('Every guild gets the holdings set for it.')).toBeVisible({timeout: 60_000});
	await expect(page.getByText('Best', {exact: true})).toBeVisible({timeout: 60_000});

	// Kept after a refresh, with the options open to show it.
	await page.reload();
	await page.getByRole('button', {name: 'Edit setup'}).click();
	await expect(byHand).toBeChecked();
	await expect(castle).toHaveValue('1');
});

test('sets starting towns from lists, remembered on this device but not in links', async ({page}) => {
	await page.goto('/');
	await page.getByText('Advanced options').click();
	const lists = page.getByRole('switch', {name: 'Set starting towns from lists', exact: true});
	await expect(lists).toHaveAccessibleDescription(/^Choose each town's guild from a list/u);
	const before = page.url();
	await lists.check();
	await expect(page).toHaveURL(before);

	// Only towns are listed, each with its guild to choose, instead of the map.
	await expect(town(page, 'A')).toHaveCount(0);
	const towns = page.getByRole('list', {name: 'Towns of The Floating City'});
	await expect(towns.getByRole('combobox')).toHaveCount(17);
	await expect(towns.getByRole('combobox', {name: 'Vagastrom'})).toHaveCount(0);
	await page.getByRole('textbox', {name: 'Name of guild 1'}).fill('Nightowls');
	await expect(towns.getByRole('combobox', {name: 'Town A'})).toHaveValue('');
	for (const [i, id] of OPENING.entries()) {
		// eslint-disable-next-line no-await-in-loop -- one list at a time
		await towns.getByRole('combobox', {name: `Town ${id}`}).selectOption({index: 1 + Math.floor(i / 4)});
	}

	await expect(page.getByText('All set. Town Q starts Vacant.')).toBeVisible();
	await expect(towns.getByRole('combobox', {name: 'Town A'})).toHaveValue('0');

	// Kept after a refresh, without opening the options by itself.
	await page.reload();
	await expect(lists).toBeHidden();
	await expect(towns.getByRole('combobox', {name: 'Town R'})).toHaveValue('2');
	await towns.getByRole('combobox', {name: 'Town R'}).selectOption('Vacant');
	await expect(page.getByText('16 of 16 towns assigned.')).toHaveCount(0);
	await expect(page.getByText('15 of 16 towns assigned.')).toBeVisible();

	// Off again, the map is back.
	await page.getByText('Advanced options').click();
	await lists.uncheck();
	await expect(town(page, 'A')).toBeVisible();
	await expect(towns).toHaveCount(0);
});

test('deletes everything saved from the privacy notice', async ({page}) => {
	await page.goto('/');
	await page.getByRole('textbox', {name: 'Name of guild 1'}).fill('Wolves');
	await page.getByRole('radio', {name: 'Dark theme'}).click();
	await page.getByText('Privacy', {exact: true}).click();
	await expect(page.getByText('No account, cookies, ads, analytics or tracking.')).toBeVisible();

	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	page.once('dialog', async dialog => dialog.accept());
	await page.getByRole('button', {name: 'Delete saved data'}).click();
	await expect(page).not.toHaveURL(/Wolves/u);
	await expect(page.getByRole('textbox', {name: 'Name of guild 1'})).toHaveValue('');
	await expect(page.getByRole('radio', {name: 'Match device theme'})).toBeChecked();
	// The fresh page saves its blank setup again, but nothing from before.
	expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/Wolves|theme/u);
	// The offline copy went too, and stays gone until the planner is used again.
	expect(await page.evaluate(async () => globalThis.caches.has('ragnapax'))).toBe(false);
	expect(await page.evaluate(async () => navigator.serviceWorker.getRegistration())).toBeUndefined();
});

test('lists the licences of the code it includes', async ({page, request}) => {
	await page.goto('/');
	const href = await page.getByRole('link', {name: 'Third-party licences'}).getAttribute('href');
	const response = await request.get(new URL(href!, page.url()).href);
	const text = await response.text();
	expect(text).toContain('highs');
	expect(text).toContain('svelte');
	expect(text).toContain('MIT License');
	expect(text).toContain(`Ragnapax ${version} is free software`);
});

test('says which release it is', async ({page}) => {
	await page.goto('/');
	await expect(page.getByRole('contentinfo')).toContainText(`Version ${version}.`);
});

test('explains a broken link instead of failing', async ({page}) => {
	await page.goto('/#v=1&m=atlantis');
	await expect(page.getByRole('alert')).toContainText('map the planner does not know');
});

test('warns about a plan that attacks a guild sitting out, and still shows it', async ({page}) => {
	// Bears take Town A from Owls, who sit out, on Thursday.
	await page.goto('/#v=1&m=floating-city&o=r&i=1&g=Owls&g=Bears&g=Cats&g=Dogs&t=11112222333344440&p=...-.0..-...-...-...-...');
	await expect(page.getByRole('status').filter({hasText: 'which sits out'})).toContainText(
		'Thursday: Bears declares on Town A, held by Owls, which sits out. Guilds sitting out may defend their kingdoms when attacked.',
	);
	await expect(page.getByRole('table')).toBeVisible();
});

test('says how far apart the scores are in an uneven plan', async ({page}) => {
	// Guild 1 takes Dionysia on Wednesday and nobody else declares all week.
	await page.goto('/#v=1&m=floating-city&o=p&t=11221124244334303&p=h...-...-...-...-...-...&s=1');
	await expect(page.getByText('Guilds score between 24 and 36 points.')).toBeVisible();
});

test('lists the whole week\'s declares, as the plan copied as text does', async ({page}) => {
	// Dogs sit out.
	await page.goto('/#v=1&m=floating-city&o=r&i=4&g=Owls&g=Bears&g=Cats&g=Dogs&t=11221124244334303&p=nh.ij.fm.-..l.-.c.k.-..o.-6.ko..-io...&s=1');
	const card = page.getByRole('region', {name: 'Plan'});
	await card.getByRole('button', {name: 'Whole week'}).click();
	await expect(card.getByRole('tablist', {name: 'Day'})).toBeHidden();
	const days = card.getByRole('heading', {level: 3});
	await expect(days).toHaveText(['Wednesday Today', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday']);
	const wednesday = card.getByRole('listitem').filter({has: page.getByRole('heading', {name: 'Wednesday'})});
	await expect(wednesday.getByRole('listitem').filter({hasText: 'Owls'})).toHaveText(/^\s*Owls\s+Vagastrom\s+Dionysia\s*$/u);
	await expect(wednesday).not.toContainText('Dogs');

	// The guild picked applies here too.
	await card.getByRole('group', {name: 'Show declares for'}).getByRole('button', {name: 'Cats'}).click();
	await expect(wednesday.getByRole('listitem').filter({hasText: 'Owls'})).toHaveCount(0);
	await expect(wednesday).toContainText('Town Q');

	await card.getByRole('button', {name: 'Day by day'}).click();
	await expect(card.getByRole('tablist', {name: 'Day'})).toBeVisible();
});

test('keeps every guild button inside the plan card on narrow screens', async ({page}) => {
	// The longest names allowed, in wide characters, and the default ones.
	const names = ['龍龍龍龍龍龍龍龍龍', 'WWWWWWWWW', '🦊🦊🦊🦊🦊🦊🦊🦊🦊', '']
		.map(name => `&g=${encodeURIComponent(name)}`)
		.join('');
	await page.goto(`/#v=1&m=floating-city&o=p${names}&t=11221124244334303&p=h...-...-...-...-...-...&s=1`);
	const card = page.getByRole('region', {name: 'Plan'});
	const chips = card.getByRole('group', {name: 'Show declares for'}).getByRole('button');
	await expect(chips).toHaveCount(5);
	for (const width of [300, 412, 500, 600]) {
		// eslint-disable-next-line no-await-in-loop -- one viewport at a time
		await page.setViewportSize({width, height: 914});
		// eslint-disable-next-line no-await-in-loop
		const outside = await card.evaluate(element => {
			const bounds = element.getBoundingClientRect();
			return [...element.querySelectorAll(':scope [aria-label="Show declares for"] button')]
				.map(chip => chip.getBoundingClientRect())
				.filter(chip => chip.left < bounds.left || chip.right > bounds.right).length;
		});
		expect(outside, `at ${width} px`).toBe(0);
	}
});

test('switches between light and dark themes and remembers the choice', async ({page}) => {
	await page.emulateMedia({colorScheme: 'light'});
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await page.getByRole('radio', {name: 'Dark theme'}).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	// Applied by the start-up script, before the app itself has loaded.
	await page.route('**/assets/index-*.js', async route => route.abort());
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.unroute('**/assets/index-*.js');

	await page.reload();
	await page.getByRole('radio', {name: 'Match device theme'}).click();
	await page.emulateMedia({colorScheme: 'dark'});
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.emulateMedia({colorScheme: 'light'});
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('stores its offline copy only once used', async ({page}) => {
	await page.goto('/');
	await page.waitForLoadState('load');
	await page.waitForTimeout(500);
	expect(await page.evaluate(async () => navigator.serviceWorker.getRegistration())).toBeUndefined();
	await useOnce(page);
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	expect(await page.evaluate(async () => globalThis.caches.has('ragnapax'))).toBe(true);
});

test('asks for a reload once a new version takes over', async ({page}) => {
	await page.goto('/');
	await useOnce(page);
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	// Loaded under the service worker, as on any visit after the first.
	await page.reload();
	// No new version can be deployed mid-test, so play the browser's part.
	await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
	const banner = page.getByRole('status').filter({hasText: 'A new version'});
	await expect(banner).toBeVisible();
	await banner.getByRole('button', {name: 'Reload'}).click();
	await expect(banner).toBeHidden();
	await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeVisible();
});

test('opens at once from the cache when the network hangs', async ({
	page,
	context,
	browserName,
}) => {
	// Playwright can only hold back a service worker's own requests in Chromium.
	test.skip(browserName !== 'chromium', 'needs Chromium request routing');
	await page.goto('/');
	await useOnce(page);
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	// A weak signal: the request for the page never gets an answer.
	await context.route(
		url => url.pathname === '/',
		() => undefined,
	);
	await page.reload();
	await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeVisible({timeout: 5000});
});

test('runs under the content security policy without violations', async ({page}) => {
	const violations: string[] = [];
	page.on('console', message => {
		if (/content security policy/iu.test(message.text())) {
			violations.push(message.text());
		}
	});
	await setUpAndPlan(page);
	// Without a policy there would be nothing to violate.
	await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
		'content',
		/script-src 'self' 'wasm-unsafe-eval' 'sha256-/u,
	);
	expect(violations).toEqual([]);
});

// What "Privacy" in docs/PRIVACY.md and the privacy notice promise.
test('keeps to its own site, with no cookies, storing only its own keys', async ({page, context}) => {
	const elsewhere: string[] = [];
	context.on('request', request => {
		const {origin, protocol} = new URL(request.url());
		if (origin !== 'http://localhost:4173' && /^https?:$/u.test(protocol)) {
			elsewhere.push(request.url());
		}
	});
	await setUpAndPlan(page);
	await page.getByRole('radio', {name: 'Dark theme'}).click();

	expect(elsewhere).toEqual([]);
	expect(await context.cookies()).toEqual([]);
	const keys = await page.evaluate(() => Object.keys(localStorage));
	expect(keys.length).toBeGreaterThan(0);
	expect(keys.filter(key => !key.startsWith('ragnapax/'))).toEqual([]);
});

test.describe('on a phone set to French', () => {
	test.use({locale: 'fr-FR'});

	test('stays in English until the French translation is finished', async ({page}) => {
		await page.goto('/');
		await expect(page.getByRole('heading', {name: 'Starting towns'})).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		// Only finished languages are offered, and so far that is English alone.
		await expect(page.getByRole('combobox', {name: 'Language'})).toHaveCount(0);
	});
});
