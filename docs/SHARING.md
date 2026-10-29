# Share links and saved data

How a setup and its plan travel in a link, how links are opened, and what is
kept on the device. Read it before changing the link format or what the app
stores. Part of the architecture docs; [ARCHITECTURE.md](ARCHITECTURE.md) is
the overview.

## Share links

A share link is the page URL plus a fragment; browsers never send fragments to
servers. The format is defined in `src/share/link.ts`:

| Parameter | Meaning                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `v`       | Version, currently `1`. Other numbers are refused; anything else counts as a damaged link.           |
| `m`       | Map id.                                                                                              |
| `o`       | Goal: `p` (points) or `r` (resources).                                                               |
| `f`       | `1` when using every kingdom; absent otherwise.                                                      |
| `c`       | `1` when extra castle-days go to the last guilds (`castleLast`); absent otherwise, the old behaviour. |
| `d`       | `1` when guilds declare on the fewest days (`fewestDays`); absent otherwise, the old behaviour.     |
| `k`       | Holdings set by hand (`targets`): each guild's town-, dorm- and castle-days separated by `.`, guilds by `-`, e.g. `k=25.10.1-25.10.1-25.10.1-25.10.1`; absent when sharing by the goal, the old behaviour. Four guilds of three whole numbers, none past what one guild could hold, or the link is damaged. `f` and `c` keep their values, for when holdings are no longer set. |
| `i`       | Guilds sitting out (`inactive`), one digit `1`–`4` each, e.g. `i=24`; absent when every guild plays, the old behaviour. All four is a damaged link. |
| `g`       | Guild name, repeated once per guild, in order. Trimmed, without hidden characters, cut to 9 characters as players see them; blank is "Guild N". Spaces are written `%20`, not `+`, which chat apps that tidy links turn into real spaces; `+` is still read. |
| `t`       | One digit per town in link order: `0` Vacant, `1`–`4` guild.                                         |
| `h`       | Optional days already played, written like `p`. Absent until someone records a day.                  |
| `p`       | Optional plan: days separated by `-`, guilds by `.`, one character per kingdom (`0-9a-zA-Z`).        |
|           | With `h`, only the days after those played.                                                          |
| `s`       | `1` in a link shared with someone else (the Share button); absent in the player's own address bar.   |

Example (about 100 characters with short names):
`#v=1&m=floating-city&o=p&g=A&g=B&g=C&g=D&t=11221124244334303&p=nh.ij.k.ml-o..j.f-...o-9.n.o.-.o..-l..f.`

Decoding validates everything, and a plan must pass `simulate`, so a damaged or
hand-edited link can never show an illegal plan. A plan that does not leave
the guilds sitting out alone breaks no rule: it opens, with a warning (see
"Settings and priorities" in docs/SOLVER.md). A kingdom a guild lists
twice on one day (only possible by hand) is read as one declare. Problems are reported as a
`ShareLinkError` with a `problem` code, explained in the reader's language.
Untouched guild names travel blank, so each reader sees "Guild 1" in their own
language. A setup without a plan may be incomplete (it is still being filled
in); one with a plan must be complete.

**Compatibility rules:** adding an optional parameter whose absence means the
old behaviour is fine without a version change.
Anything that changes the meaning of existing links needs a new `v`. Map ids
and kingdom ids must never change once published, and no kingdom may be
added or removed (see [Maps](SOLVER.md#maps)).

Because a Ragnarok runs from Wednesday to Monday and starting towns are drawn
again each week, no plan is in use on a Tuesday. A breaking change released on
a Tuesday therefore needs no decoder for the old version: old links are
refused with "This link is from an older version of the planner", and links
from a newer build ask the reader to reload.

### Opening links

The address bar always holds the current setup and up-to-date plan, kept in
step by `PlannerState.sync()` with `history.replaceState` (which adds no
history entries). A refresh, a bookmark or reopening a tab therefore brings
back exactly what was on screen. Safari refuses too many address changes in
a few seconds, which fast typing or a stream of plans can reach; a refused
change is retried a second later rather than breaking the page.

The Share button sends the same fragment with `s=1`. A link with it is
**received**: the page shows the "Someone shared this plan with you" view
with the setup collapsed and quality `shared`, keeps `s=1` in the address bar
so a refresh still shows it as shared, and never saves it, so the reader's
own setup for that map is left alone. As soon as the reader changes anything
(a town, a name, an option, the map), plans, or plans for another group, it
becomes their own: `s=1`
goes, and it is saved like any other setup, for good even if the change is
undone.

A link without `s=1` is the reader's own, such as their own address bar after
a refresh. Its plan, like one brought back from storage, has quality
`saved`: how good a plan is known to be only matters while planning, so it
is never kept.

## Saved data

`localStorage` key `ragnapax/v1` (`src/state/storage.ts`):

```json
{
	"maps": {"floating-city": "v=1&m=…"}
}
```

Each map keeps its own setup as a **share link fragment**, with the plan
included only while it is up to date. There is one serialisation format to
maintain, and saved data is validated exactly like links from other people.
The address bar holds the live setup (see [Opening links](#opening-links));
storage is for visits without a link, such as from the home screen, and for
switching maps. A received setup is never saved. Saving waits for half a
second without changes, or for the page to be hidden or closed (see
"Application state" in docs/ARCHITECTURE.md); if the browser is killed
in between, the address bar still holds the change.
Corrupt or incompatible data is dropped silently and the map starts blank.
Blocked storage (private browsing) just means nothing is remembered.

Small preferences have keys of their own: `ragnapax/theme` (see
[Themes](UI.md#themes)), `ragnapax/language` (see [Languages](UI.md#languages))
and `ragnapax/town-lists`, `on` while starting towns are set from lists
rather than on the map (see "Application state" in
[ARCHITECTURE.md](ARCHITECTURE.md#application-state)). Unlike the setup's
options, it is never in links: it is how one player likes to set up, for
every map, and guilds in the same group may differ.

Every key starts with `ragnapax/`, so "Delete saved data" in the privacy
notice (`forgetAll`) removes them all without a list to maintain; keep new
keys under that prefix. See [Privacy](PRIVACY.md).
