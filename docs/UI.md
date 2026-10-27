# The interface

How the interface is put together: its components, the map drawing, spacing,
themes, accessibility and languages. Read it before changing what players see
or hear. Part of the architecture docs; [ARCHITECTURE.md](ARCHITECTURE.md) is
the overview.

## User interface

Mobile first, a single column, down to 300 px wide; from 960 px wide, setup on
the left and the plan on the right (sticky). Below 420 px the map and language
pickers move to their own row (wrapping if they must), and below 360 px spacing
tightens and the score table's headings shrink, so nothing scrolls sideways even
with the longest guild names (9 wide characters, such as kanji or emoji). The
header's logo is 32 px, and 64 px from 640 px wide, where it fills both header
rows; it is hidden only when a larger text size would leave the title too
little room (below 18em wide). Components in `src/ui/`:

| Component                           | Role                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SetupCard`                         | Guild rows (colour, editable name, town count) acting as the "brush"; the map for tapping starting towns. The brush moves to the next guild once one is complete; any leftover town is Vacant automatically.                                                                                         |
| `RecordCard`                        | "Changes during the week": records the days that went to plan in one go, then the next day as played, starting from the plan for it, on a map where each tap gives a kingdom to the chosen guild; removes the last day recorded; plans the rest of the week. See [Recording days as played](#recording-days-as-played).                         |
| `GoalCard`                          | Goal choice, "Use every kingdom" switch and, under it, "Extra castle days last"; "Advanced options", open while one is in use, with "Declare on fewer days" and a switch per guild to have it sit out (never all four); "How plans are ranked", the plan button and `SolveProgress`. |
| `SolveProgress`                     | Step messages (loading, searching, checking, trimming), elapsed time, Cancel or "Use this plan".                                                                                                                                                                                                     |
| `ResultCard`                        | Quality badge and summary, stale notice, a warning when the plan does not leave a guild sitting out alone, `Scoreboard`, `DayExplorer`, Share and Copy actions. |
| `Scoreboard`                        | Headline ("Every guild scores 50 points", who got extra, or the range when shares are uneven), over the guilds that play, and the per-guild table, where guilds sitting out are marked so. |
| `DayExplorer`                       | A switch between "Day by day" and "Whole week" (`WeekOverview`), not remembered; guild focus chips (wrapping onto more rows, never scrolling sideways), which apply to both. Day by day: day tabs (Start, then Wed to Mon), the map on that day with captures ringed, each guild's declares and running points. Opens on today, by the device's calendar (`src/domain/calendar.ts`; Monday once the week is over), and underlines today's tab, rechecked whenever the page comes back into view.|
| `WeekOverview`                      | Every day's declares, Wednesday to Monday, as the plan copied as text lists them: guilds sitting out only on days they declare (`guildsListed`), today and days played tagged. |
| `Declares`                          | One guild's declares on one day as kingdom chips, naming the guild each was taken from, or "No declares". |
| `MapCanvas`, `map-layout.ts`        | SVG map used by both setup and replay, laid out as in [Drawing the map](#drawing-the-map). Towns are circles, dorms stretched hexagons, the castle a keep. Each held kingdom has its guild's colour and outline; captures are ringed. Roads take the owner's colour when both ends share an owner.   |
| `ThemeSwitch`                       | Match device, Light or Dark, in the header.                                                                                                                                                                                                                                                          |
| `guilds.ts`, `Outline`, `GuildMark` | Guild colours and outline patterns; the outline renderer shared by map markers; the small guild swatch used in lists, so each guild's outline is learnt everywhere.                                                                                                                                  |
| `Icon`                              | Inline stroke icons.                                                                                                                                                                                                                                                                                 |
| `Rich`                              | A translated message with **bold** runs, drawn as text, never as HTML.                                                                                                                                                                                                                               |

### Recording days as played

Players follow a plan in the game, and sometimes a day goes differently: a
guild declares on the wrong kingdom, forgets to declare, or a declare does not
go through. `RecordCard` lets them record each day as it actually ended, one
day at a time from Wednesday, and plan the rest of the week from there:

- Days that went to plan are saved together: "Went to plan up to" picks the
  last of them (yesterday by the device's clock, at first) and
  `recordAsPlanned` copies them from the plan, so only the day that went
  wrong needs recording by hand. It is offered while the plan on screen
  keeps the rules and agrees with every day recorded so far, and so goes
  once a day is recorded otherwise, until the rest of the week is planned
  again.
- The day starts as planned, through `followPlan`, so a day that went to plan
  is saved with one tap, and a day that did not needs only the differences.
- Each tap gives a kingdom to the chosen guild, or gives it back to its owner
  the day before. `dayBetween` checks the result; a position the rules cannot
  reach (a guild with four declares, or a kingdom out of reach) is explained
  and cannot be saved.
- Recording a day makes the current plan out of date, as any setup change
  does, and "Plan the rest of the week" plans from the last day recorded.
- Monday is never recorded, as nothing would be left to plan.
- Starting towns are locked while days are recorded, since those days were
  played from them; removing the days unlocks them. They are also locked
  while a solve runs, until it confirms the best plan (see "Application
  state" in docs/ARCHITECTURE.md).

The days travel in links and saved data as `h`, validated with `replay` like
everything else, and the plan's `p` then lists only the days after them.

### Drawing the map

`src/ui/map-layout.ts` turns a map into a drawing, as pure geometry tested in
`map-layout.test.ts`:

- **Fill the canvas.** The drawing is a 100 × 100 canvas. Each axis is
  stretched separately, as far as it goes while keeping every marker (and its
  capture ring) inside, so maps use the whole area whatever their in-game
  proportions. Stretching keeps every kingdom on the same side of every other.
- **Steady marker size.** Markers are full size on maps up to 400 px wide and
  keep that size in pixels on wider ones, so a large map gains room between
  kingdoms rather than oversized markers.
- **Names inside markers.** Every kingdom carries its name inside its shape,
  in its owner's text colour. Dorms show full names (Dionysia) whenever no
  markers would overlap with them, and short ones (Dio) otherwise; in practice
  that is from about 500 px wide. The castle always says "Castle", below its
  battlements: "Darkwick Castle" would only fit in a keep stretched out of
  shape, and it is the one castle on the map.
- **Tested.** For every map at widths from 230 to 900 px, no markers overlap
  and no road passes under a kingdom it does not connect.

### Spacing

Spacing follows a soft 8 px grid: margins, padding and gaps are multiples of
8 px, with 4 px steps (4, 8, 12) allowed below 16 px for tight spots inside
small components. "Soft" means only spacing is on the grid; borders, text and
odd-sized content are not, so boxes need not land on grid lines. Sizes follow
along where it costs nothing (icons 16 or 20 px, radii 8 and 16 px, body text
on a 24 px line), and `src/ui/spacing.test.ts` checks every stylesheet.

The map drawing is exempt. It is a 100-unit SVG scaled to its frame (250 px
wide on a 300 px phone, 346 px on a typical one), so any pixel grid inside it
would only hold at one width; its frame sits on the grid like everything else.

### Themes

Design tokens (colours, radii, shadows) are CSS custom properties in
`src/app.css`: light values on `:root`, dark ones on `:root[data-theme="dark"]`.
Players choose **Match device**, **Light** or **Dark** with the switch in the
header (`ThemeSwitch`, state in `src/state/theme.svelte.ts`); the choice is
saved under `ragnapax/theme` and "Match device" follows the system setting
live.

A small inline script at the top of `index.html` reads the saved choice and the
system setting and sets `data-theme` before the first paint, so the page never
flashes the wrong theme. That means the dark tokens exist only once, and there
is no `prefers-color-scheme` query in CSS. The script and `ThemeState` must agree
on the storage key and the theme colours for the browser chrome.

The web app manifest's `theme_color` and `background_color` are the light
theme's background too. An installed app shows them before the page loads
(the splash screen, the status bar, the task switcher), and a manifest
cannot follow the theme, so a light bar that the dark theme then darkens
beats a coloured one that changes on every start.

### Colour and accessibility

Guilds are told apart by **colour and outline**, so colour is never the only
cue (WCAG 1.4.1). The colours come from the Okabe–Ito and Paul Tol
colour-blind-safe palettes, picked by search to stay as far apart as possible
for protanopia, deuteranopia and tritanopia and to differ in lightness:

| Guild | Fill             | Label | Outline  |
| ----- | ---------------- | ----- | -------- |
| 1     | red `#cc3311`    | white | solid    |
| 2     | sky `#56b4e9`    | dark  | dashed   |
| 3     | yellow `#f0e442` | dark  | dotted   |
| 4     | indigo `#332288` | white | dash-dot |

Measured with CIEDE2000 differences under the Machado et al. (2009)
simulations at full severity, the four guilds stay at least 30 apart for any
colour-vision deficiency (about 10 is where small markers start to blur) and
13 apart in greyscale. Every outline is two lines in one grey: a solid one on
the edge and, inside it past a sliver of fill, the guild's pattern. Each guild
has its own grey in each theme (`--guild-1-outline` to `--guild-4-outline`),
the one that stands out most from both its fill and the map: at least 3:1
against each, except sky blue on the dark map, where no grey can and the best
reaches about 2.8:1. Both lines follow the marker's own edge (`Shape.inset`
moves it inwards for the pattern), battlements included, and patterns repeat a
whole number of times around it, so no marker shows a seam.

Markers set back from the rest (other guilds' when focusing on one, kingdoms
that cannot be tapped) fade only their fill, over an opaque base so roads do
not show through; their outlines and labels switch to the theme's `--outline`
and text colours, which stand out from the faded fill. Roads are drawn in
`--road`, at least 3:1 against the map, and a road a guild holds is cased in
it, since a pale guild colour alone would vanish.

`src/ui/accessibility.test.ts` holds all of this in place: every text pairing in
both themes reaches 4.5:1 (read from `app.css`, so it tests what ships), map
shapes, roads, the switch and focus outlines reach 3:1, guild labels reach
4.5:1 on full and faded fills, guild outlines reach the contrasts above
against their fill and the map, outlines 3:1 on faded fills, the colour differences above hold,
and every guild has a distinct outline. The colour maths lives in
`src/test/color.ts`.

Beyond colour: every map marker has a spoken label ("Town A, Night Owls,
captured this day"); interactive markers are buttons, and each map is one stop
on the Tab key, with arrow keys moving to the nearest kingdom that way as drawn
(`nearestInDirection`), since the map files' order, which screen readers follow,
is kept for solve times; guild
pickers are toggle buttons (`aria-pressed`), since pressing the guild shown
again shows them all; the theme switch is a radio group with one Tab stop and
arrow keys; the goal options are named by their title alone and described by
their explanation (`aria-describedby`), so their names stay short to hear; days are a proper tab list with arrow-key navigation; selected
states are drawn in system colours in forced-colours mode (Windows contrast
themes), which drops backgrounds;
progress and toasts use live regions, and a finished plan is announced
wherever focus is; reduced-motion preferences are respected, and the capture
ring stops pulsing within five seconds anyway (WCAG 2.2.2).

**Focus never falls to the top of the page.** Many buttons give way to what
they start: "Find a fair plan" to the progress, the progress to the plan,
"Edit setup" to the setup. Browsers drop focus when the focused control
disappears or is disabled, which loses a keyboard or screen reader player's
place. `keepFocus` (`src/ui/focus.ts`), set up in `App.svelte`, notices and
moves focus on: to the solve's progress while solving, to the plan's heading
when a solve made a new one, else to the card's control marked with
`focusFallback` or its heading. The ids and markers it looks for are
defined once, in `focus.ts`. Focus the player moved elsewhere is
left alone. Mark new controls that start or end something accordingly.

### Icons

`public/icon.svg` is the only icon anyone edits: the favicon, the logo in the
header and the manifest's scalable icon. The `ragna-icons` plugin in
`vite.config.ts` draws every PNG the site also needs from it, with
`scripts/icons.ts`, and links them from `index.html` and the web app manifest.
Nothing generated is committed; the dev server draws and serves the same
files, again whenever the SVG changes.

| File in `dist/assets/`         | Size   | For                                                                               |
| ------------------------------ | ------ | --------------------------------------------------------------------------------- |
| `icon-32-<hash>.png`           | 32 px  | Favicon for browsers without SVG favicons, such as Safari before 26               |
| `apple-touch-icon-<hash>.png`  | 180 px | Home screen on iOS; opaque, since iOS fills transparency with black               |
| `icon-192-<hash>.png`          | 192 px | Manifest, purpose `any`: Android asks for PNGs before offering to install         |
| `icon-512-<hash>.png`          | 512 px | Manifest, purpose `any`                                                           |
| `icon-maskable-512-<hash>.png` | 512 px | Manifest, purpose `maskable`: shrunk to 80% on an opaque square, for cropped icons |

Opaque icons are filled with the colour of the SVG's first `<rect>`, its
rounded square. A maskable icon may be cropped to any shape covering the
central circle of 80% of its width; at 80% that is the circle inscribed in
the SVG, so **keep the artwork inside the circle inscribed in the icon**.
`src/test/icons.test.ts` checks that, and that the opaque icons have no
transparent pixel. The PNG favicon's `sizes` lets browsers that can show the
SVG one prefer it.

The PNGs are drawn by [resvg](https://github.com/linebender/resvg) through
`@resvg/resvg-js`, a development dependency: prebuilt for Windows, macOS and
Linux, with no system libraries or install scripts, and faithful to the SVG
standard. Each file is named after its content, so the service worker can keep
them across deploys and cache them only when a browser asks for one (see
"Offline and caching" in docs/OPERATIONS.md).

## Languages

Tokyo Debunkers is played in Japanese, English, French, German, Italian,
Spanish, Korean, and simplified and traditional Chinese, so the planner is
built to speak all nine. English is written; the others wait for players who
speak them ([TRANSLATING.md](TRANSLATING.md) is their guide). Translations are
by people only, never machines: players trust a plan only if it reads right.

| File                          | Role                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `i18n/locales.ts`             | The nine languages: code, own name, and whether each is `ready`; matching a browser's languages.   |
| `i18n/en.ts`                  | Every message, by key, with a note on where it appears. The source text and fallback.              |
| `i18n/translations/<code>.ts` | One file per other language, by the same keys. Missing messages show in English.                   |
| `i18n/format.ts`              | Fills in `{placeholders}`, picks plural forms with `Intl.PluralRules`, splits out `**bold**` runs. |
| `i18n/i18n.svelte.ts`         | The current language as state; `t`, `rich`, `weekday`, `list`; loading translations.               |
| `i18n/describe.ts`            | Words domain data: map and kingdom names, priorities, broken rules, link problems.                 |
| `state/locale.svelte.ts`      | Which language to use, remembering the player's choice.                                            |

**Messages.** Components call `t('setup.title')`; the compiler knows every key
and the placeholders each message needs, so a typo or a missing value fails
`npm run check`. Messages with bold text are drawn by `Rich.svelte` from
`rich(…)`, which keeps markup out of translations: nothing goes through
`{@html}`. Because `t` reads the language from rune state, text updates in
place when the language changes. Weekday names come from
`Intl.DateTimeFormat` and lists from `Intl.ListFormat`, both given the
interface language rather than the browser's, so a Spanish browser viewing
the planner in English still reads "Wednesday" and "A, B, and C". They need no
translation, and the same goes for any other `Intl` API: always pass it the
interface language. Where markup must sit inside a sentence, such as the guild mark in
"from Night Owls", the message keeps a placeholder for it and `aroundSlot`
returns the text on either side, so any word order works.

**Choosing a language.** The first of the device's languages the planner
speaks (`navigator.languages`; "fr-CA" gets French, "zh-TW" traditional
Chinese), unless the player picked one in the header, next to the map, which is remembered. The
app is mounted once the language has loaded, so a translated page never
flashes English, and `<html lang>` and the page title follow the language. Only
languages marked `ready` are offered, and the picker appears only once there
are two; development builds offer all nine, so translators can see their work
in place.

**Size.** English is bundled. Each other language is its own chunk,
`language-<code>-<hash>.js`, downloaded only by those who use it and cached
lazily by the service worker, like the solver.

**Layout.** Names drawn on the map are measured with Chinese, Japanese and
Korean characters a full em wide, and `map-layout.test.ts` lays out every map
in every language, so a name too long for its marker fails a test.
Styles use logical properties (`padding-inline`, `inset-inline-start`,
`text-align: start`) rather than left and right, so a right-to-left language
would mirror the layout; keep new styles that way. Arrow keys on the map and
the day tabs would still need flipping for one.
`catalogues.test.ts` holds each translation to the English keys, placeholders,
bold markers and the plural forms its language needs, and requires a `ready`
language to be complete.

Not translated: `index.html` (the description and the message without
JavaScript), the web app manifest, technical details in error reports, and map
validation messages, which only developers see.

## How to extend

### Add or change interface text

Add the message to `src/i18n/en.ts`, next to related ones, with a comment
saying where it appears and what its placeholders hold, and use it with `t` or
`rich`. Never write words in a component or in `src/domain/`: the domain
returns data, and `src/i18n/describe.ts` words it. Changing an English message
leaves translations of the old meaning behind: if the meaning changes, give it
a new key, so translations fall back to English until they are updated.
