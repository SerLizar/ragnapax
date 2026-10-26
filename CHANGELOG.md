# Changelog

What changed for players in each release of Ragnapax. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as
[Versioning](docs/OPERATIONS.md#versioning) explains for a planner without an
API.

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
