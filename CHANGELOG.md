# Changelog

What changed for players in each release of Ragnapax. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as
[Versioning](docs/OPERATIONS.md#versioning) explains for a planner without an
API.

## 1.8.1 - 2026-10-30

### Changed

- The round marks that show each guild's colour and outline beside its name
  are bigger, so the outlines are easier to tell apart: in the score table,
  the guild buttons, the day's declares, the whole week and the advanced
  options. The guild buttons are a little taller to fit them.

## 1.8.0 - 2026-10-30

### Changed

- Copying a plan as text now starts from the day picked in "Day by day", so
  once the week is under way your group only gets the days still to come. The
  button says which day it starts from, such as "Copy as text from Friday",
  and a note under it says how to copy every day: pick Wednesday or the whole
  week. The points at the end are still the whole week's.

## 1.7.1 - 2026-10-29

### Changed

- A tidy-up behind the scenes of the goal and its options, so new options are
  easier to add without mistakes. Nothing changes in how the planner looks,
  plans or shares.

## 1.7.0 - 2026-10-28

### Added

- A "Plan for another group" button beside "Edit setup", for players who plan
  for more than one group, such as one for each of their guilds. It clears the
  guild names, starting towns, days recorded and the plan, and keeps your goal
  and options. Guilds sitting out are cleared too, as they differ from group
  to group.

## 1.6.2 - 2026-10-28

### Fixed

- Without a link, the planner opens on The Sea of Poseidon this week rather
  than The Floating City: this week's cluster change repeats last week's map,
  and the weekly map now follows on from that.
- On Tuesdays, while the game still shows the last Ragnarok's results, the
  planner stays on that week's map instead of moving on to the next one.

## 1.6.1 - 2026-10-28

### Fixed

- Share links with spaces in guild names no longer get cut short in some
  chat apps.

## 1.6.0 - 2026-10-27

### Added

- A "Set holdings by hand" switch under "Advanced options", for groups
  that agree on their own shares: type in how many days each guild holds
  towns, dorms and the castle, and plans come as close to them as they
  can. The numbers start from what equal resources usually gives on the
  map, and Reset brings them back. While it is on, the goal and "Use every
  kingdom" are turned off, and a warning says when a kind adds up to more
  days than the map has, such as more than 6 castle-days in all. Share
  links and plans copied as text remember it.

## 1.5.0 - 2026-10-27

### Added

- A "Set starting towns from lists" switch under "Advanced options", for
  those used to planning in spreadsheets: instead of the map, the setup
  lists the towns, each with its guild to pick. It is your own choice, kept
  on this device for every map, and links don't include it.

## 1.4.0 - 2026-10-27

### Added

- A "Whole week" view in the plan, next to "Day by day": every day's
  declares, Wednesday to Monday, in one list, as in the plan copied as text.
  Today and days already played are marked, and picking a guild shows only
  its declares.

## 1.3.0 - 2026-10-26

### Added

- A "Declare on fewer days" switch under "Advanced options": plans have each
  guild declare on as few days as possible, so players log in to declare
  less often, even if that takes more declares in all. Plans stay just as
  fair, though finding them can take a little longer. Share links and plans
  copied as text remember it.

## 1.2.0 - 2026-10-25

### Added

- "Advanced options" under the goal, with a switch per guild for guilds
  sitting out: guilds the game put in the group that don't play Ragnarok.
  They make no declares, nobody declares on their kingdoms, and the guilds
  that play share the points between themselves. Share links and plans
  copied as text say which guilds sit out. A shared plan that declares on a
  guild sitting out still opens, with a warning that it may defend.

## 1.1.0 - 2026-10-24

### Added

- With "Use every kingdom" on, a new "Extra castle days last" switch: when
  the castle cannot be shared evenly, its extra days go to the last guild
  rather than the first, while the first guild still gets the most points.
  Share links remember it.

## 1.0.0 - 2026-10-24

The first public release.

### Added

- A map editor for Ragnarok's three maps, the Galaxy Terminal, the Sea of
  Poseidon and the Floating City, opening on this week's map: pick a guild,
  tap its four starting towns, and any town left over is Vacant.
- Fair plans for the four guilds of a group, found on the phone by an exact
  optimiser, with better plans shown as they are found and a note once the
  plan is proven fairest. Two goals, equal resources (the default) or equal
  points, and an option to use every kingdom.
- A day-by-day view of each plan, Wednesday to Monday, with captures, each
  guild's declares and running scores, and a focus on one guild.
- Recording days that did not go to plan, and planning the rest of the week
  from them.
- Share links, checked against the rules when opened, and plain-text export
  for chats that mangle links.
- Setups and plans saved on the device, per map.
- Light and dark themes, following the device unless one is chosen.
- Offline use and installing as an app, with a prompt to reload when a new
  version arrives.
- A privacy notice, and a way to delete everything the planner saved on the
  device.
- English, with Japanese, French, German, Italian, Spanish, Korean and
  Chinese (simplified and traditional) ready for translators.
