// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {Catalogue} from './format.ts';

/**
Every message in the interface, in English: the source text for every
translation. Comments say where a message appears and what its
placeholders hold. docs/TRANSLATING.md explains the format:

- `{name}` is filled in by the app; keep it, anywhere in the sentence.
- `**text**` is shown in bold.
- `{ one: …, other: … }` has one text per plural form, chosen by `{count}`.
*/
export default {
	// Page header and footer.
	'app.tagline': 'Ragnarok point sharing for Tokyo Debunkers',
	'header.map': 'Map',
	// Read out for the language picker.
	'header.language': 'Language',
	'footer.licence': 'Free software under the AGPL-3.0 or later.',
	// {link} is "footer.sourceLink", linking to the code.
	'footer.source': '{link}.',
	'footer.sourceLink': 'Source code',
	// {link} is "footer.licencesLink", linking to the licences of the code the
	// planner includes from others.
	'footer.licences': '{link}.',
	'footer.licencesLink': 'Third-party licences',
	'footer.disclaimer': 'A fan-made tool for Tokyo Debunkers, not affiliated with ZigZaGame Inc.',
	// {version} is the planner's release number, such as "1.0.0".
	'footer.version': 'Version {version}.',

	// The privacy notice, opened from the footer. It must stay true: see
	// "Privacy" in docs/PRIVACY.md before changing what the app stores or
	// where it is hosted. Messages sharing a paragraph are shown one after the
	// other, separated by a space.
	'privacy.title': 'Privacy',
	'privacy.summary': '**No account, cookies, ads, analytics or tracking.**',
	'privacy.summaryMore': 'Your setups and plans stay on your device unless you share a link yourself.',
	// {name} is the person who runs the site.
	'privacy.operator': 'Ragnapax is a free fan project run by {name}.',
	// Shown only where the site knows its source code. {link} is
	// "privacy.contactLink", linking to the project's issues.
	'privacy.contact': 'For questions or requests about your data, {link}.',
	'privacy.contactLink': 'open an issue on GitHub',
	'privacy.device':
		'**On your device**, this browser keeps your setup for each map, your theme and language, and a copy of the planner so it works offline.',
	'privacy.deviceMore':
		'They are only there for features you use, never leave your device, and you can delete them below.',
	'privacy.links':
		'**Share links** carry the setup, plan and guild names after the # sign, which browsers never send to a server.',
	'privacy.linksMore': 'Anyone you share a link with, and the app you send it through, can read it.',
	// True for GitHub Pages only: change it if the site is published elsewhere.
	'privacy.host':
		'**Hosting:** GitHub Pages (GitHub, Inc., USA) serves the site. Like any web server, it receives your IP address and browser details.',
	'privacy.hostLogs':
		'GitHub logs IP addresses for security, which is needed to deliver the site safely (legitimate interest, Art. 6(1)(f) GDPR).',
	// {link} is "privacy.hostLink", linking to GitHub's privacy statement.
	'privacy.hostMore': 'GitHub is certified under the EU-US Data Privacy Framework; more in {link}.',
	'privacy.hostLink': 'the GitHub Privacy Statement',
	// {link} is "privacy.hostRetentionLink", linking to that part of GitHub's
	// privacy statement. GitHub gives no fixed period.
	'privacy.hostRetention':
		'GitHub sets no fixed period for keeping these logs: it keeps them as long as that purpose and the law require ({link}).',
	'privacy.hostRetentionLink': 'how GitHub retains data',
	'privacy.rights':
		'**Your rights:** under the GDPR you can ask for access to, correction or deletion of your personal data, and object to its use.',
	'privacy.rightsMore':
		'You can also complain to your data protection authority. The planner collects nothing about you; requests about server logs go to GitHub.',
	'privacy.forget': 'Delete saved data',
	// Asked before deleting; the page then starts afresh.
	'privacy.forget.confirm':
		'Delete every setup, plan and choice saved on this device? This cannot be undone.',

	// Shown before the first plan. One person plans for the whole group and
	// shares the link; everyone else only opens it.
	'intro.name':
		'**Name the four guilds** in your group and tap the towns each one starts with. They appear early on Wednesday, before declares open at 11:00 server time.',
	'intro.goal': '**Choose a goal**: equal points or equal resources.',
	'intro.plan':
		'**Find a fair plan** and share the link with your group. Only one person needs to plan: everyone else opens the link to see what to declare each day.',
	'intro.private': 'Everything runs on your device; nothing is uploaded.',

	// Opening a plan from someone else's link.
	'shared.intro':
		'Someone shared this plan with you. Pick your guild below to see just your declares. Follow it rather than planning again, so every guild works from the same plan.',
	// The same card for the player's own plan, which puts the setup away.
	'planned.intro':
		'Your plan is ready. Share it with your group: the others follow your link rather than planning again. The setup is put away so a stray tap can\'t change it.',
	'shared.edit': 'Edit setup',

	// Banner when a new version of the planner has replaced the one the page
	// was loaded from; the page cannot fetch the solver until it reloads.
	'update.ready': 'A new version of Ragnapax is ready. Reload to keep planning.',
	'update.reload': 'Reload',

	// A share link that cannot be opened. The fallback sentence follows the problem.
	'link.damaged': 'This link is damaged. Ask for it to be sent again.',
	'link.older': 'This link is from an older version of the planner. Ask for a new one.',
	'link.newer': 'This link is from a newer version of the planner. Reload to update.',
	'link.map': 'This link is for a map the planner does not know yet.',
	'link.goal': 'This link has an unknown goal.',
	'link.towns': 'This link\'s starting towns are damaged.',
	'link.townRules': 'This link\'s starting towns break the map\'s rules.',
	'link.plan': 'This link\'s plan is damaged.',
	// {problem}: one of the "rule." messages below.
	'link.rules': 'This link\'s plan breaks Ragnarok\'s rules: {problem}',
	'link.fallback': 'Your own saved setup is shown instead.',
	'link.dismiss': 'Dismiss',

	// Names. {number} is 1 to 4: the guild's place in the list.
	'guild.default': 'Guild {number}',
	'kingdom.vacant': 'Vacant',

	// Maps and kingdoms. Use the game's own names where it translates them.
	'map.floating-city': 'The Floating City',
	'map.galaxy-terminal': 'The Galaxy Terminal',
	'map.sea-of-poseidon': 'The Sea of Poseidon',
	// {letter}: the town's letter, A to Z.
	'town.name': 'Town {letter}',
	// Short names are drawn inside the dorm's marker on small screens: keep
	// them to about 6 letters, or 3 Chinese, Japanese or Korean characters.
	'dorm.Dionysia': 'Dionysia',
	'dorm.Dionysia.short': 'Dio',
	'dorm.Vagastrom': 'Vagastrom',
	'dorm.Vagastrom.short': 'Vaga',
	'dorm.Frostheim': 'Frostheim',
	'dorm.Frostheim.short': 'Frost',
	'dorm.Hotarubi': 'Hotarubi',
	'dorm.Hotarubi.short': 'Hota',
	'dorm.Obscuary': 'Obscuary',
	'dorm.Obscuary.short': 'Obs',
	'dorm.Mortkranken': 'Mortkranken',
	'dorm.Mortkranken.short': 'Mort',
	'dorm.Jabberwock': 'Jabberwock',
	'dorm.Jabberwock.short': 'Jabber',
	'dorm.Sinostra': 'Sinostra',
	'dorm.Sinostra.short': 'Sino',
	'castle.name': 'Darkwick Castle',
	// Drawn inside the castle's marker: at most 6 letters, or 3 characters.
	'castle.short': 'Castle',

	// Setting up starting towns.
	'setup.title': 'Starting towns',
	'setup.help': {
		one: 'Pick a guild, then tap the town it starts with this week.',
		other: 'Pick a guild, then tap the {count} towns it starts with this week.',
	},
	'setup.clear': 'Clear',
	'setup.guilds': 'Guild to assign towns to',
	'setup.assign': 'Assign towns to {guild}',
	'setup.guildName': 'Name of guild {number}',
	// Read out for the "3/4" next to each guild.
	'setup.townCount': '{count} of {total} towns',
	'setup.map': 'Map of {map}. Tap a town to assign it.',
	'setup.done': 'All set.',
	// {kingdoms}: a list of towns, e.g. "Town Q" or "Town Q and Town R".
	'setup.vacant': {one: '{kingdoms} starts Vacant.', other: '{kingdoms} start Vacant.'},
	'setup.progress': '{count} of {total} towns assigned.',
	// Shown under the map once days are recorded as played (see "record.").
	'setup.locked':
		'Starting towns are locked while days are recorded as played. Remove those days to change them.',
	// Instead, while a plan is being found for these towns ("solve." messages)
	// and not yet confirmed the best, before any plan is found and after,
	// naming the button shown ("solve.cancel", then "solve.usePlan").
	'setup.lockedSearching':
		'Starting towns are locked until the best plan is confirmed. Cancel to change them sooner.',
	'setup.lockedChecking':
		'Starting towns are locked until the best plan is confirmed. Use this plan to change them sooner.',
	'setup.tooMany': {
		one: '{guild} has {count} town too many; tap one of its towns to remove it.',
		other: '{guild} has {count} towns too many; tap some of its towns to remove them.',
	},

	// Choosing a goal.
	'goal.title': 'Goal',
	'goal.help': {
		one: 'Wednesday to Monday, up to {count} declare per guild each day.',
		other: 'Wednesday to Monday, up to {count} declares per guild each day.',
	},
	'goal.points': 'Equal points',
	// {town}, {dorm}, {castle}: points a day for each, 1, 2 and 3.
	'goal.points.description':
		'Every guild scores the same total, with castle and dorm days shared out as evenly as possible. Each day, a town is worth {town} point, a dorm {dorm} and the castle {castle}.',
	'goal.resources': 'Equal resources',
	'goal.resources.description':
		'Every guild holds towns, dorms and the castle for the same number of days.',
	'goal.fillMap': 'Use every kingdom',
	// {guild}: the name of the first guild that plays (see "advanced.inactive").
	'goal.fillMap.description':
		'Hold as much of the map as possible, every day. Totals may then differ slightly; extras are shared out as evenly as possible, with the most going to {guild}.',
	// Instead of "goal.fillMap.description" once days are recorded as played:
	// the first guild may then be unable to get the most.
	'goal.fillMap.description.played':
		'Hold as much of the map as possible, every day. Totals may then differ slightly; extras are shared out as evenly as the days already played allow.',
	// Under "goal.fillMap" while it is on, and in the title of a plan copied
	// as text.
	'goal.castleLast': 'Extra castle days last',
	// {first}, {last}: the names of the first and last guilds that play.
	'goal.castleLast.description':
		'When the castle cannot be shared evenly, its extra days go to {last} first instead of {first}. {first} still gets the most points, from other kingdoms.',

	// A disclosure under the goal's options, for choices few groups need.
	'advanced.title': 'Advanced options',
	// A switch per guild follows, named by the guild's name.
	'advanced.inactive': 'Guilds sitting out',
	'advanced.inactive.description':
		'The game can put guilds that don\'t play Ragnarok in a group. A guild sitting out makes no declares, nobody declares on its kingdoms, and it isn\'t counted when sharing out points.',
	// Under the guild switches when every guild but one sits out, whose
	// switch is then disabled.
	'advanced.inactive.last': 'At least one guild must play.',
	// A switch, also in the title of a plan copied as text.
	'advanced.fewestDays': 'Declare on fewer days',
	'advanced.fewestDays.description':
		'Each guild declares on as few days as possible, so players log in to declare less often. Plans may then need more declares in all.',

	// "How plans are ranked", most important first.
	'ranking.title': 'How plans are ranked',
	'ranking.total': 'Most points for everyone combined',
	'ranking.gap.points': 'Smallest gap in points between guilds',
	'ranking.gap.castle': 'Smallest gap in castle-days between guilds',
	'ranking.gap.dormitory': 'Smallest gap in dorm-days between guilds',
	'ranking.gap.town': 'Smallest gap in town-days between guilds',
	// Before "ranking.declarations" with "advanced.fewestDays" on.
	'ranking.days': 'Fewest days with declares, per guild',
	'ranking.declarations': 'Fewest declares',
	'ranking.note': 'Each step only breaks ties left by the ones before it.',

	// Finding a plan.
	'solve.find': 'Find a fair plan',
	'solve.again': 'Plan again',
	'solve.needsSetup': 'Assign every guild its starting towns first.',
	// Above "solve.again" while the plan is up to date and proven the best,
	// so nobody plans again for nothing or forgets to change the setup first.
	'solve.alreadyBest':
		'This is already the fairest plan possible for this setup. Planning again cannot make it fairer: change the setup first if something changed.',
	'solve.alreadyBest.fillMap':
		'This already uses as much of the map as possible, as evenly as it allows. Planning again cannot improve it: change the setup first if something changed.',
	'solve.loading': 'Loading the solver…',
	'solve.searching': 'Searching for a plan…',
	'solve.checking': 'Found a plan. Checking nothing better exists…',
	'solve.trimming': 'Best plan confirmed. Trimming declares…',
	// Time spent so far, e.g. "12s".
	'solve.elapsed': '{seconds}s',
	'solve.download': 'The solver is a one-time ~1.3 MB download.',
	'solve.usePlan': 'Use this plan',
	'solve.cancel': 'Cancel',
	'solve.timeout': 'No plan was found in time. Try again on a faster device.',
	'solve.infeasible': 'No plan can satisfy these starting towns.',
	'solve.unavailable': 'The solver could not be downloaded. Check your connection and try again.',
	// {detail}: a technical description, in English.
	'solve.error': 'Something went wrong while planning: {detail}',
	// Read out when a plan is ready. {summary}: one of the "result." summaries,
	// such as "The fairest plan possible, with the fewest declares."
	'solve.done': 'Plan ready. {summary}',

	// The plan.
	'result.title': 'Plan',
	// Badges next to the title, shown in capitals.
	'result.fairest': 'Fairest',
	'result.best': 'Best',
	'result.bestFound': 'Best found',
	'result.improving': 'Improving as better plans are found…',
	'result.optimal': 'The fairest plan possible, with the fewest declares.',
	'result.proven': 'The fairest plan possible, with the most points for everyone.',
	'result.optimal.fillMap':
		'Uses as much of the map as possible, shared as evenly as it allows, with the fewest declares.',
	'result.proven.fillMap': 'Uses as much of the map as possible, shared as evenly as it allows.',
	// Instead of "result.optimal" and "result.optimal.fillMap" with
	// "advanced.fewestDays" on.
	'result.optimal.fewestDays': 'The fairest plan possible, with declares on the fewest days.',
	'result.optimal.fillMap.fewestDays':
		'Uses as much of the map as possible, shared as evenly as it allows, with declares on the fewest days.',
	'result.unproven': 'The best plan found in the time given. A better one may exist.',
	// Under the title of a plan brought back from this device, such as after
	// a refresh or on the next visit.
	'result.saved': 'Your saved plan, checked against Ragnarok\'s rules.',
	'result.shared': 'A shared plan, checked against Ragnarok\'s rules.',
	'result.stale': 'The setup changed after this plan was made, so it is out of date.',
	'result.update': 'Update',
	// {problem}: one of the "rule." messages below.
	'result.broken': 'This plan breaks Ragnarok\'s rules: {problem}',
	// A warning above the scores when the plan does not leave a guild sitting
	// out alone (see "advanced.inactive"), such as in a link edited by hand. It
	// breaks no rule. {day} is a weekday, {guild} and {rival} guild names.
	'result.sittingOutAttacked':
		'{day}: {guild} declares on {kingdom}, held by {rival}, which sits out. Guilds sitting out may defend their kingdoms when attacked.',
	'result.sittingOutDeclares': '{day}: {guild} declares on {kingdom}, though it sits out.',
	'result.share': 'Share plan',
	'result.copy': 'Copy as text',
	'result.copyDeclares': 'Copy declares for {guild}',
	// Title of the message when sharing through the phone's share menu.
	'result.shareTitle': 'Ragnarok plan for {map}',
	'result.linkCopied': 'Link copied',
	'result.planCopied': 'Plan copied',
	'result.declaresCopied': 'Declares for {guild} copied',
	// Shown when copying is blocked, above a box with the text to copy.
	'result.copyThis': 'Copy this:',

	// Under the plan's summary once days are recorded as played. {day}: the
	// last day recorded, e.g. "Thursday".
	'result.played': 'Planned from the end of {day}, keeping what happened until then.',

	// Recording how days actually went, to plan the rest of the week again.
	'record.title': 'Changes during the week',
	'record.help':
		'If a day didn\'t go to plan, record what happened, plan the rest of the week from there and share the new plan with your group.',
	// {days}: a list of weekdays, e.g. "Wednesday and Thursday".
	'record.recorded': 'Played: {days}.',
	// {day}: a weekday, e.g. "Thursday".
	'record.start': 'Record {day}',
	'record.forget': 'Remove {day}',
	'record.replan': 'Plan the rest of the week',
	// Before a list of weekdays: the days up to the one picked went exactly
	// as planned and can be saved together, so only a day that didn't needs
	// recording by hand.
	'record.until': 'Went to plan up to',
	// {day}: the weekday picked after "record.until", e.g. "Friday".
	'record.asPlanned': 'Save up to {day} as planned',
	'record.editHelp':
		'This is {day} as planned. Pick a guild, then tap each kingdom it held at the end of the day. Tap again to undo.',
	'record.guilds': 'Guild to give kingdoms to',
	'record.assign': 'Give kingdoms to {guild}',
	'record.map': 'Map of {map} at the end of {day}. Tap a kingdom to change who holds it.',
	// {problem}: one of the "rule." messages below.
	'record.broken': 'That can\'t have happened: {problem}',
	'record.save': 'Save {day}',
	'record.cancel': 'Cancel',

	// Scores.
	'score.points': {
		one: 'Every guild scores **{count} point**.',
		other: 'Every guild scores **{count} points**.',
	},
	// {towns}, {dorms}, {castle}: the "score.days" messages below.
	'score.holdings': 'Every guild gets **the same holdings**: {towns}, {dorms} and {castle}.',
	'score.townDays': {one: '{count} town-day', other: '{count} town-days'},
	'score.dormDays': {one: '{count} dorm-day', other: '{count} dorm-days'},
	'score.castleDays': {one: '{count} castle-day', other: '{count} castle-days'},
	// {extras}: a list of "score.extra", e.g. "Night Owls +2, Bears +1".
	'score.fillPoints': {
		one: 'Every guild scores at least **{count} point**, with the map fully used. Extra: {extras}.',
		other:
			'Every guild scores at least **{count} points**, with the map fully used. Extra: {extras}.',
	},
	'score.extra': '{guild} +{count}',
	// When the shares are not even and the map is not fully used, as after a
	// day played off-plan or a plan stopped early: the table has the details.
	'score.pointsUneven': 'Guilds score between **{least}** and **{most}** points.',
	'score.holdingsUneven': 'Holdings differ between guilds; the table shows each guild\'s.',
	'score.fillResources':
		'The map is fully used and holdings are as even as it allows. Extra days are shared out so points stay as close as possible.',
	// Table headings: a short word, and its meaning when tapped or hovered.
	'score.guild': 'Guild',
	'score.pointsShort': 'Pts',
	'score.pointsLong': 'Points',
	'score.townShort': 'Town',
	'score.townLong': 'Town-days',
	'score.dormShort': 'Dorm',
	'score.dormLong': 'Dorm-days',
	'score.castleShort': 'Cstl',
	'score.castleLong': 'Castle-days',
	'score.declaresShort': 'Decl',
	'score.declaresLong': 'Declares over the whole Ragnarok',
	// Under the name of a guild sitting out (see "advanced.inactive"), whose
	// numbers are left out of the headline.
	'score.inactive': 'Sitting out',

	// Day-by-day replay. Weekday names need no translation: see `weekday`.
	'days.focus': 'Show declares for',
	'days.all': 'All guilds',
	'days.tabs': 'Day',
	'days.previous': 'Previous day',
	'days.next': 'Next day',
	// Tab before Wednesday, for the starting position.
	'days.start': 'Start',
	'days.startTitle': 'Starting position',
	'days.mapStart': '{map} at the start',
	'days.mapEnd': '{map} at the end of {day}',
	'days.startNote': 'Starting position. Pick a day to see who declares where.',
	// {today}: points earned that day; {total}: points so far.
	'days.points': '+{today} · {total} pts',
	'days.pointsTitle': 'Points today, and running total',
	// A capture from another guild; {guild} is drawn with the guild's colour.
	'days.from': 'from {guild}',
	'days.none': 'No declares',
	// On a day recorded as played (see "record.").
	'days.played': 'Played: this is what happened.',

	// Read out for each kingdom on the map; {owner} is a guild or "Vacant".
	'marker.owner': '{kingdom}, {owner}',
	'marker.captured': '{kingdom}, {owner}, captured this day',
	// Read out for a name shown shortened, such as "Wed (Wednesday)" or "Vaga
	// (Vagastrom)": what is on screen first, so people who control the page by
	// voice can say it, then the name in full.
	'label.shortened': '{short} ({full})',
	// Read out on entering a map whose kingdoms can be tapped.
	'map.keys': 'Arrow keys move between kingdoms.',

	// Theme switch.
	'theme.title': 'Theme',
	'theme.system': 'Match device theme',
	'theme.light': 'Light theme',
	'theme.dark': 'Dark theme',

	// A plan as text for game or Discord chat.
	'text.declaresFor': 'Declares for {guild}',
	'text.moves': '{guild}: {moves}',
	'text.from': '{kingdom} (from {guild})',
	'text.none': 'no declares',
	// {guilds}: the guilds sitting out (see "advanced.inactive"), e.g. "Bears, Owls".
	'text.inactive': 'Sitting out: {guilds}',
	// {scores}: each guild's "text.score", separated by " · ".
	'text.points': 'Points: {scores}',
	'text.score': '{guild} {points}',
	// Between kingdoms in a list, e.g. "Vagastrom, Dionysia".
	'list.separator': ', ',

	// Rules a plan can break. {day} is a weekday, {guild} and {rival} guild names.
	'rule.days': {
		one: 'The plan covers {count} day instead of {days}.',
		other: 'The plan covers {count} days instead of {days}.',
	},
	'rule.guilds': '{day}: declares for unknown guilds.',
	'rule.limit': {
		one: '{day}: {guild} declares {count} time (max {max}).',
		other: '{day}: {guild} declares {count} times (max {max}).',
	},
	'rule.unknown': '{day}: {guild} declares on an unknown kingdom.',
	'rule.held': '{day}: {guild} declares on {kingdom}, which it already holds.',
	'rule.adjacent': '{day}: {guild} declares on {kingdom} without holding a kingdom next to it.',
	'rule.twice': '{day}: {guild} declares on {kingdom} twice.',
	// {rival} declared first, then {guild}.
	'rule.contested': '{day}: {rival} and {guild} both declare on {kingdom}.',
} as const satisfies Catalogue;
