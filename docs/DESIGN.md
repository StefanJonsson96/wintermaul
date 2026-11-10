# Winterward — game design

Winterward keeps the loop that made *Wintermaul* addictive (see [RESEARCH.md](RESEARCH.md)) and
modernises the parts that were WC3 limitations. Everything here is original: names, races, towers,
creeps, art (drawn procedurally in code) and sounds (synthesized).

## The core loop (unchanged from Wintermaul)

| Wintermaul | Winterward |
|---|---|
| Up to 9 defenders, shared lives | Up to **8 players** (bots can fill seats), **shared lives** |
| Mazing on an open field; towers are walls | Same. 2×2 towers on a fine grid, creeps need a 1-cell gap |
| Blocking is refused / punished | **Anti-block**: a placement that would seal the path is refused |
| Anti-juggle (Wintermaul One Revamped) | Selling while creeps are on the field leaves **rubble** until the wave ends |
| Leaks flow into the next players' areas (classic) / rotate to the next lane (Wintermaul One) | A leak **costs lives and teleports the creep into the next player's lane** with the health it has left. If it gets through that maze too, it escapes. |
| Kills pay the killer — kill stealing drama | Same: whoever kills a leaked creep gets the bounty |
| Start with 1 lumber for an element; +1 lumber at level 15 | 1 lumber for a race; **+1 after wave 7 and wave 20** → second race, third race, or a Legend |
| 60 s before level 1, 30 s between cleared levels | Setup (30 s), then 45 s to wave 1 and 25 s between cleared waves; **Call wave** skips ahead when everyone is ready |
| Level bonus: 10 gold + 2 per level | Same formula: `10 + 2 × wave` |
| Red picks the difficulty in the first 30 s (Very Easy…Perfection) | Same ritual: the first player gets a rules dialog for 30 s (Casual / Normal / Hard / Brutal / Perfection, race mode, endless). Lives grow with the number of players (Normal: 30, +20 per extra player), because every lane can leak |
| `-random` | **Random** race card (or type `-random`) for +15 gold |
| Air levels, fortified levels, boss on level 30 (if Duke Wintermaul boards, you lose) | Air, swarm, fortified, spirit, immune, healers, splitters, shields; bosses on 10/20/30; the **Winter Tyrant** on 40 — if he escapes, you lose |
| Sell for 75% | 75% (100% if you undo during the same build phase) |

## The lane

Each player owns a 44×24-cell lane. Creeps enter through a portal on the left and leave through an
ice gate on the right. Four columns of **ancient pillars** stand in the field; the gaps between
pillars are exactly one tower wide. Plugging all but one gap of a column bends the path for 50 gold,
so the first minutes are about *bending the path fast* — exactly the "keep building or you wipe"
feeling of the first Wintermaul waves. Later you build full walls between the pillar columns and
turn the field into a serpentine (a full maze is ~120 towers and ~7× the straight path).

The path preview (dashed line) updates live while you place a tower, and the ghost tower turns red
with a reason when a spot is illegal.

## Races (12) and towers (96)

Every race has the same tree, like Wintermaul One's upgrade chains:

```
Tier 1 (cheap wall) ─┬─ 2a ─ 3a ─ 4a
                     └─ 2b ─ 3b ─ 4b        + a Legend (800 gold + 1 lumber)
```

Upgrades happen in place (so they never change your maze) and get more gold-efficient per tier.

| Race | Element | Identity |
|---|---|---|
| Frostborn | Ice | slows, freezes, frost auras, shatter bonus vs frozen |
| Emberforge | Fire | splash, burn, meteors and burning ground; weak vs fortified/air |
| Stormcallers | Lightning | fast zaps, chain lightning, % current health (Thunder Rod), anti-air |
| Stonewardens | Earth | the cheapest walls, big crits, quake stuns |
| Arcanum | Arcane | ramping beams, armor shred, damage auras |
| Venomkin | Poison | stacking armor-ignoring poison, slows, Crawler Nest halves health |
| Clockwork | Tech | long range, snipers, railguns, missiles, a nuke |
| Umbral | Shadow | execute, curses, pulls, the Void |
| Sunguard | Radiant | attack-speed / damage auras, slow auras, anti-spirit, restores lives |
| Wildgrove | Nature | towers that level up as they fight, roots |
| Goldhoard | Fortune | kill gold, interest vaults, a gambling Legend |
| Prismatic | Crystal | pure damage multishot, slow start and a strong finish |

Damage types vs armor classes (Pierce / Impact / Magic / Elemental / Pure vs Light / Medium /
Heavy / Fortified / Spirit) plus Warcraft-style numeric armor make race choice matter per wave.

## The Thaw: a second set of waves

The rules dialog (and the second act of the campaign) can swap the forty classic waves for **The
Thaw** (`T` in `src/shared/data/waves.ts`), forty waves of creeps with abilities the classic set does
not have. Each is a field on the creep definition, run by `Horde.useAbilities`:

| Ability | What it does | The answer |
|---|---|---|
| Burrow | Digs in every few seconds: untargetable, a little faster | Towers that hit hard when it surfaces; slows |
| Blink | Jumps a few cells ahead along its path | Long mazes still work; burst at the end |
| Brood | Drops hatchlings as it walks | Splash |
| Ward | Shields the creeps around it | Kill the warden first (target *strong*) |
| War drums | Speeds up its whole wave | Slows, stuns |
| Frenzy | Runs faster as it loses health | Finish it fast; slows |
| Hex | Freezes a tower near it for a few seconds | Spread the damage over many towers |

Some waves mix two creeps. The wave preview and the wave bar name every trick a wave has. Tuned with
bots, a Thaw game goes about as far as a classic one (solo average wave ~32, duos ~32).

## Innovations (kept small on purpose)

- **Live path preview** and path length while placing towers.
- **Mass upgrades**: box-select or double-click to select towers and upgrade them together.
- **Targeting modes** per tower (first / last / strong / weak / close).
- **Gold gifting** between players (right-click a player in the scoreboard).
- **Pings** (Alt+click), in-game chat with old-school `-commands`.
- **Bots** that build real mazes, for solo play or to fill seats.
- **Endless mode** after wave 40.

## Weather and omens

Two systems make one game unlike the next (`src/shared/sim/omens.ts`); both are rules options, on by
default and off in the tutorial.

- **Weather.** Every wave has a forecast: still air (most often), blizzard (−15% tower range, creeps
  10% slower), aurora (+25% Magic, Elemental and Pure damage), freezing fog (slows last twice as long,
  towers 10% slower), warm wind (creeps 12% faster, poison and burns +35%) or blood moon (creeps +20%
  health, +40% kill gold). The first three waves are calm and the same storm never comes twice in a
  row. The forecast is a pure function of the seed and the wave, so clients show the next waves'
  weather without being told and replays agree. Weather is in force while its wave runs.
- **Omens.** After every fifth wave (before the last) a shrine offers each player three of twenty
  boons, drawn from the seed; lasting boons are never offered twice. A boon is talent-style bonuses,
  something given at once (gold that scales with the wave, lives, lumber), or both, and some have a
  price (*Blood Price*: +14% damage, leaks cost half again). An offer can wait; a new shrine settles
  an unanswered one with its first boon. Bots take theirs at once.
- Weather also changes the board: a blizzard piles three 2×2 snowdrifts on each lane's current path
  (placed like towers, so they never seal it; they block building and melt when the wave ends); under a
  blood moon the last creep of each wave in every lane is moon-touched (4× health, 8× gold); a warm
  wind melts rubble and selling in it leaves none. Drift positions come from the seed, the wave and the
  lane, so replays agree. With weather on, solo bots reach a few waves less on average but win more
  often: the storms swing games both ways.
- Six boons bend the rules rather than add percentages: Snow Angel's Mercy (the first non-boss leak of
  each wave is free), Undertow (leaks lose 40% health), Quarryman's Blessing (no rubble), Clean Sweep
  and Night Vigil (gold, or a life, for a wave with no leak from your lane) and Avalanche (the first
  leak of a wave stuns the rest of your lane for 3 s).
- **Shared shrines** (two or more players, a rules option on by default): one offer for the team, two
  more boons than players; each takes one, and a taken boon is gone for the others. Bots take from what
  is left as the next wave starts.
- A player's bonuses are now their own (talents and relics) plus boons plus weather, recomputed when
  any of them changes and sent to clients as an event, so tooltips and range circles stay right.

Stacked boons are strong: with a full set and campaign talents, bots won stages they used to lose.
Each boon was cut to about two thirds, and wall discounts from every source stop at 30% of a wall's price; solo bots on Normal now average wave ~36 with both systems
on against ~35 without, and a person choosing boons well does better.

## Single player

Solo games do not need the server: `LocalGame` runs the same simulation in the browser through the
same `GameRunner` the server uses, and speaks the same protocol, so the game view cannot tell the
difference. That makes pausing (P) and 2×/3× speed (F) possible; snapshots carry the speed so the
client clock keeps in step, and a hidden tab pauses the game.

- **Tutorial**: a real 8-wave Emberforge game (20 lives, a long first countdown) with a coach that
  shows one idea at a time, highlights the cells or buttons involved and moves on when the player has
  done it. A player who follows along wins with a few leaks; one who stops building loses.
- **Skirmish**: a solo game with the rules dialog, carrying the player's relics.
- **Saved games.** A single-player game is saved as its seed and the commands given, with the tick of
  each (`src/client/saved.ts`). Continue builds a new game on the same seed and replays the commands
  (`src/shared/sim/replay.ts`); since the simulation is deterministic it lands on the same state,
  then shows it paused. The save is written every few seconds and when the tab is hidden or closed, and
  a save from another version of the game is not offered. Developer commands make a game unsaveable.
- **Achievements and relics**: 29 achievements, kept with the campaign save. Some follow from the
  save (stars, the web, career totals: a hook on every save checks them); the rest are watched for
  during a game by a tracker that reads the event stream and the player's state, in multiplayer too.
  Each wins a relic (`src/shared/relics.ts`): small bonuses, some with a price, applied like talents.
  One slot, two at twelve achievements. Saved games remember the relics they started with; online,
  relics come along with campaign talents when the host allows them.
- **Moving progress**: the whole save as a code, base64 JSON with a checksum so a truncated copy is
  refused (`src/client/campaign/transfer.ts`). Loading keeps the achievements of both devices.

## The campaign

The campaign is four acts on four painted maps (`src/shared/campaign.ts`): *The Long Winter*, twelve
stages on the road north; *The Thaw*, nine stages on the glacier with the second wave set, which opens
once *The Drowned Mill* is won; and *The Long Night*, eight stages under the polar night, open once
*Hexwood* is won, built on the new rules: forced weather on every wave, shrines every second to fourth
wave, and a tower cap; and *The Sundered Coast*, seven stages on the frozen sea, open once *The Last
Cairns* is won, with snowdrifts every wave, a champion with every wave (never the boss), frozen ground
where towers can't be sold, and boons a stage gives everyone at the start. Each stage is a rule set for the ordinary game. The rules can
change the first and last wave, lives, starting gold and lumber, creep health, speed, armor and
regeneration, the number of creeps per wave, bounty, and the races that can be picked. Late stages
drop the player into the war (wave 15, 20, 30…) with a war chest and a long first countdown, which
makes them a different puzzle: build a whole maze at once.

Three stars per stage: reach a wave, win, win losing at most a few lives. Stars pay **runestones**,
174 in the first two acts (most of the 192-node web), 205 with Act III and 229 with Act IV; winning a stage opens the next. The Endless Frontier (open after *The Iron Pass*) pays one
runestone per 5 waves past wave 20 the first time they are reached, a long tail for players who want
more of the web.

### The Rune Web

The talent tree is a passive web in the spirit of Path of Exile (`src/shared/talents.ts`): 193 nodes
around a start node, the Hearth, in six regions at 60° from each other: Arsenal (damage), Precision
(range, speed, critical hits), Rime (slows and stuns), Bulwark (lives), Fortune (gold) and Alchemy
(poison and fire). Every node costs one runestone and must connect to the Hearth through nodes already
taken; clicking a far node takes the shortest path to it.

- **Small nodes** give a little each (+2% damage, +2% range, +3% against bosses…).
- **Notables** sit on wheels around each region's hub and give a named, bigger bonus.
- **Keystones**, two per region at the end of long branches, change how a build plays and come with
  a drawback (*Glass Cannon*: +30% damage, leaks cost double lives).
- **Race masteries** (+10% damage for one race, on short branches of +3% nodes) ring the rim, two
  per region, one per race, so a build around a race pair crosses regions.
- Bridges between neighbouring regions make loops, so there is more than one way to a keystone.

The whole web costs 192 runestones and the campaign pays 174, so even a completionist leaves some
of it untaken. Nodes are data: each adds to a `PlayerMods` record (`src/shared/sim/mods.ts`) that the
simulation reads per player. A node can be given back for free unless that would cut off others. The
saved loadout, and the one a browser sends a multiplayer server, are cleaned the same way: unknown
nodes dropped, only what connects to the Hearth kept, within the runestones earned.

In multiplayer the host can switch **Campaign talents** on (off by default). Each browser sends its
loadout and the server keeps only what is possible.

### Campaign balance

`npm run balance:campaign` plays every stage with a bot that owns the passives a player would have by
then (every earlier stage won, no third stars), spent along a typical path through the Rune Web.
Latest results, 8 games per stage with random race pairs:

| Act I stage | Bot wins | | Act II stage | Bot wins | |
|---|---|---|---|---|---|
| 1 Hollowmere | 8/8 | ~3 lives lost | 1 Meltwater Ford | 8/8 | ~2 lives lost |
| 2 Pinewatch | 8/8 | ~6 | 2 The Drowned Fjord | 8/8 | ~4 |
| 3 The Drowned Mill | 8/8 | ~6 | 3 Hexwood | 8/8 | ~7 |
| 4 Crowspire | 8/8 | ~7 | 4 Shattered Causeway | 7/8 | |
| 5 Frostfen | 8/8 | ~14 of 24: tense | 5 Brood Caverns | 6/8 | losses at wave 28 |
| 6 The Iron Pass | 7/8 | | 6 Stormwatch | 8/8 | ~8 |
| 7 Glimmerdeep | 7/8 | | 7 The Frozen Sea | 7/8 | |
| 8 Wolfsmoor | 8/8 | ~10 | 8 The Hollow Throne | 5/8 | ~22 lives lost when won |
| 9 The Ashen Gate | 7/8 | | 9 Heart of the Glacier | 6/8 | Brutal; losses at wave 40 |
| 10 Silent Barrow | 7/8 | | | | |
| 11 The Rimewall | 6/8 | the Winter Tyrant; losses at wave 40 | | | |
| 12 Throne of Winter | 6/8 | all 40 waves on Brutal | | | |

Act III, 6 games per stage (lives lost when won in brackets): Last Light 6/6 (~6), Whiteout Pass 5/6
(~9), Pilgrims' Road 6/6 (~9), The Last Cairns 6/6 (~6), Aurora Vale 6/6 (~5), Night of the Red Moon
6/6 (~7), The Fog Sea 6/6 (~7), The Long Night 5/6 (~14). Bots there carry a lot of the Rune Web. Bots pick boons blindly and follow a fixed maze plan, so a person should do better; the last stages of
each act are meant to take a few tries.

## Code architecture

- `src/shared/sim/game.ts` holds the state, the commands and the wave flow; `horde.ts` moves, heals,
  leaks and kills creeps and runs their abilities; `combat.ts` does targeting, attacks, damage and
  on-hit effects; `omens.ts` weather and boons; `entities.ts` has the plain data types. The
  simulation is deterministic for a given seed, which is what saved games rely on.
- `npm run fingerprint` plays seeded bot games (with and without talents and stage rules) and hashes
  every event. A refactor that must not change behaviour has to leave its output identical; the split
  of the simulation into these modules was checked this way.
- The client splits the game screen into the view (input, camera, frame loop), the renderer, the HUD,
  its dialogs and the combat effects. The procedural art lives in `src/client/art`, with a building kit
  per race and creatures grouped by body type.
- Music (`src/client/music.ts`) is generated as it plays: a scheduler wakes four times a second and
  writes the next bar or two of notes into WebAudio: pads over a D minor progression, bells walking the
  pentatonic scale into an echo, a bass, wind, and drums while a wave is on (darker chords for
  bosses). It has its own bus and limiter, so it never pumps with the sound effects.
- Versions follow semantic versioning (see `CHANGELOG.md`). The server reports its version on
  `/healthz` and when a browser connects, and an outdated tab is asked to reload.

## Multiplayer architecture

- The server runs the authoritative simulation at 20 ticks/s per room and broadcasts compact
  snapshots at 10 Hz (creep positions + an ordered event list: shots, deaths, leaks, builds…).
- Clients render ~160 ms in the past and interpolate, so movement is smooth; projectiles and
  effects are replayed from the events at the right moment.
- Commands (build, upgrade, sell, race, …) are validated on the server; the client only predicts
  placement legality (same pathfinding code) for the ghost preview.
- No accounts: a random token in `localStorage` lets a player reconnect to their seat after a
  refresh or network drop. Rooms have 4-letter codes; public rooms are listed in the menu.

## Balance workflow

`npm run balance -- --players 2 --games 6` plays full games with bots headlessly and prints how far
they got and where lives were lost. Useful options: `--races stone` (bots start with that race),
`--difficulty hard`, `--quiet` (one summary line) and `--patch '{"stone_1.attack.range": 4}'` to try a
data change without editing files (numbers multiply arrays such as `dmg`, and replace everything else).
`scripts/debug-bot.ts`, `debug-wave.ts` and `debug-boss.ts` show what a bot built, what one wave did
and how the bosses fared.

The knobs, from global to local:

- `baseHp` in `src/shared/data/waves.ts`: the health curve of every wave (+7% per wave).
- `TIER_DAMAGE` and `RACE_DAMAGE` in `src/shared/data/races.ts`: damage per tier and per race.
- per-wave `hpMul`, `armorAdd`, `regen` and heal values in the wave list.
- `DIFFICULTIES` in `src/shared/protocol.ts`: lives, lives per extra player and creep health.
  Extra health on Hard and Brutal phases in over the first 15 waves so the opening stays survivable.

Where the bots end up (6–8 games each; the bots follow a fixed maze plan and a simple upgrade
heuristic, so humans should do better):

| Setting | Bots reach |
|---|---|
| Casual, solo | wave 38–40; they usually beat the Tyrant on his second pass |
| Normal, solo, any race | wave 29–37 (average ~32) |
| Normal, 2 or 4 players | wave ~27–29 |
| Hard, solo | wave ~22 (either an early collapse or the high 20s) |
| Brutal, solo | wave ~12 |

The bots are deliberately mediocre, so the difficulty is tuned for humans: Normal should be
beatable by a team that mazes well and prepares for air and fortified waves.
