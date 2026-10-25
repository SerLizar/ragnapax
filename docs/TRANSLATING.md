# Translating Ragnapax

Tokyo Debunkers is played in nine languages, and Ragnapax should speak
all of them. The interface is ready for translation; what it needs now is
players who speak these languages. Thank you for helping!

| Language            | Code      | File                               |
| ------------------- | --------- | ---------------------------------- |
| Japanese            | `ja`      | `src/i18n/translations/ja.ts`      |
| English             | `en`      | `src/i18n/en.ts` (the source text) |
| French              | `fr`      | `src/i18n/translations/fr.ts`      |
| German              | `de`      | `src/i18n/translations/de.ts`      |
| Italian             | `it`      | `src/i18n/translations/it.ts`      |
| Spanish             | `es`      | `src/i18n/translations/es.ts`      |
| Korean              | `ko`      | `src/i18n/translations/ko.ts`      |
| Simplified Chinese  | `zh-Hans` | `src/i18n/translations/zh-Hans.ts` |
| Traditional Chinese | `zh-Hant` | `src/i18n/translations/zh-Hant.ts` |

`npm run i18n:status` shows how far each one has got.

## Ground rules

### Translations are written by people, not machines

Every translation must be written by a person who speaks the language
fluently, and checked by a second one before it is offered to players. Do not
submit text from machine translation (Google Translate, DeepL and the like) or
from AI tools, even as a first draft that you then edit. Pull requests that
appear machine-made will not be accepted.

Why so strict: guilds use the planner to agree, in the middle of a live
Ragnarok, who declares on which kingdom. A plan only works if every player
reads it the same way, and a wrong word means lost points. Machine translation
gets game terms wrong in ways that read fluently, which is the worst kind of
mistake. Dictionaries, the game itself and asking other players are all
welcome.

### Use the game's own words

Players should recognise every term from the game. **Whenever the game has a
word for something, use exactly the word the game uses in your language**,
even if another word sounds more natural or a dictionary suggests something
else. Open the game with its language set to yours, and copy its terms from
the Ragnarok screens, the event notices and the help pages.

Terms to look up in the game:

| English term                                                                          | What it is                                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Ragnarok (official name _Game Of Claws: Ragnarok_)                                    | The weekly game mode the planner is for                          |
| Guild                                                                                 | A team of players                                                |
| Group                                                                                 | The four guilds playing one Ragnarok together                    |
| Kingdom                                                                               | The game's word for any town, dorm or castle on the Ragnarok map |
| Town (Town A, Town B…)                                                                | The smallest kingdoms, named by letter                           |
| Dorm, dormitory                                                                       | The middle kingdoms, each named after a dormitory                |
| Dionysia, Vagastrom, Frostheim, Hotarubi, Obscuary, Mortkranken, Jabberwock, Sinostra | The dorms' names                                                 |
| Darkwick Castle, castle                                                               | The kingdom at the heart of every map                            |
| The Floating City, The Galaxy Terminal, The Sea of Poseidon                           | The maps' names                                                  |
| Vacant                                                                                | A kingdom nobody holds                                           |
| Declare (verb, and noun: "3 declares a day")                                          | Claiming a kingdom for the day                                   |
| Declare phase, battle phase, server time                                              | The parts of a Ragnarok day, and the clock they follow           |
| Points                                                                                | What guilds earn each day for the kingdoms they hold             |
| Tokyo Debunkers, ZigZaGame Inc.                                                       | The game's title and its publisher, as your app store shows them |

When the game has no word for something, as with "point sharing", "plan" or
"solver", use what players of your language say in their guild and community
chats. If there is nothing established, use plain everyday words.

Short names matter too. Players often shorten dorm names (in English, Dio,
Vaga, Frost, Hota, Obs, Mort, Jabber and Sino). Use the short forms players of
your language actually use.

### Keep it short and friendly

The planner is used on phones, often older ones with small screens. Write
plainly and briefly, in the friendly tone of the English, and address the
player the way the game does in your language (formal or informal). Do not
translate:

- the app's name, **Ragnapax**;
- `{placeholders}` (see below);
- **AGPL-3.0**, the name of the licence.

## How to translate

1. **Say you are working on it.** Open an issue (or comment on an existing one)
   so two people do not translate the same language at once.
2. **Set up the project** as the [README](../README.md#development) explains,
   and run `npm run dev`.
3. **Translate.** Open `src/i18n/en.ts` next to your language's file. English
   has every message, with a comment above each group saying where it appears
   and what its placeholders hold. Copy each message's key into your file and
   write your text. `npm run i18n:status -- <code>` (for example
   `npm run i18n:status -- fr`) lists every message still missing, ready to
   copy.
4. **Look at it.** The development server offers every language in the picker
   at the top of the page, finished or not. Messages you have not translated
   yet appear in English. Go through every screen: set up the starting towns,
   find a plan, step through the days, open "How plans are ranked", and try the
   light and dark themes. Check on a phone-sized window (about 412 px wide) and
   a very small one (300 px): nothing should be cut off or overflow.
5. **Run the checks:** `npm run lint && npm run check && npm test`. The tests
   catch most slips (see [Checks](#checks)).
6. **Open a pull request**, ideally one per language. Say who reviewed the
   translation, or ask for a reviewer who speaks the language.

You do not have to translate everything at once: missing messages fall back
to English, and players only see a language once it is finished and marked
ready.

## The format

A translation file is a list of messages by key. Keys stay exactly as they are
in English; only the text after each key is translated. Starting from the
English messages:

```ts
// src/i18n/en.ts
	'setup.title': 'Starting towns',
	'setup.clear': 'Clear',
```

a translation file holds the same keys, with your text in place of `…`:

```ts
// src/i18n/translations/<code>.ts
export default {
	'setup.title': '…',
	'setup.clear': '…',
} satisfies Translation;
```

### Placeholders

Words in braces, like `{guild}` or `{map}`, are filled in by the app. Keep
every one, spelled exactly the same, but move it wherever your grammar needs
it. Never translate what is inside the braces.

```ts
'result.copyDeclares': 'Copy declares for {guild}',
```

Comments in `en.ts` say what each placeholder holds. Some placeholders stand
for markup rather than words: in `'days.from': 'from {guild}'`, `{guild}` is
the guild's coloured mark followed by its name.

### Bold

Text between double asterisks is shown in bold. Keep the asterisks in pairs,
around the words that carry the same weight in your language:

```ts
'score.points': {one: 'Every guild scores **{count} point**.', …},
```

### Plurals

Messages that depend on a number have one text per plural form, chosen by
`{count}`. Each language has its own forms, following the
[Unicode plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html):

| Language                                 | Forms to write | Notes                            |
| ---------------------------------------- | -------------- | -------------------------------- |
| English, German, Italian, Spanish        | `one`, `other` | `one` is used for 1              |
| French                                   | `one`, `other` | `one` is used for 0 and 1        |
| Japanese, Korean, Chinese (both scripts) | `other` only   | You can write plain text instead |

```ts
// English
'setup.vacant': {one: '{kingdoms} starts Vacant.', other: '{kingdoms} start Vacant.'},
// A language with one and other, such as French or German
'setup.vacant': {one: '…', other: '…'},
// A language with a single form, such as Japanese: plain text is fine
'setup.vacant': '…',
```

Other forms (such as `many`, which these languages only use for millions)
are not needed.

### Names on the map

Names drawn inside markers must fit. Keep dorm short names (`dorm.*.short`)
and the castle's short name (`castle.short`) to about 6 Latin letters, or 3
Chinese, Japanese or Korean characters. Full dorm names appear on wide screens
when there is room; the drawing switches to short names when there is not.
The tests lay out every map in every language and fail if a name makes
markers overlap.

### Weekdays and lists

Weekday names ("Wednesday", "Wed") and the "and" in lists ("A, B, and C")
come from the browser's built-in data for the language the planner is shown
in (not the browser's own language setting): there is nothing to translate.

## Checks

`npm test` checks every translation (`src/i18n/catalogues.test.ts` and
`src/ui/map-layout.test.ts`), and fails when a translation:

- uses a key English does not have, for example a typo;
- leaves a message empty;
- drops a placeholder, adds one English does not have, or misspells one;
- has an unpaired `**`, or bold where English has none (or none where it has);
- lacks a plural form the language needs, or has one it does not use;
- makes a name too long for its marker on the map;
- is marked ready while some messages are missing.

## Marking a language ready

A language is offered to players once it is marked `ready: true` in
`src/i18n/locales.ts`. Do that in its own pull request, when:

- every message is translated (`npm run i18n:status` shows 100%);
- a second fluent speaker has read the whole interface in the app, not just
  the file, and agrees it uses the game's terms;
- all checks pass.

Once a second language is ready, the language picker appears at the top of
the page, next to the map picker. Players get their device's language automatically when the
planner has it, and can pick another.

## Keeping translations up to date

When new features add messages, they appear in English in your language until
someone translates them; `npm run i18n:status` shows what is missing. When
the meaning of an English message changes, it gets a new key, so the old
translation stops being used rather than saying something out of date.

Contributions are licensed like the rest of the project; see
[CONTRIBUTING.md](../CONTRIBUTING.md). Add your name to the
`SPDX-FileCopyrightText` lines at the top of the file you translate.
