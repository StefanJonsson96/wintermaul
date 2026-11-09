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
- **Commander spells**: Frost Nova, Meteor and War Cry (`src/shared/sim/spells.ts`), each on its own
  cooldown (45, 55 and 60 s), cast on any lane. Nova freezes creeps for 2.5 s (bosses are slowed,
  immune creeps ignore it); Meteor lands a second later for half a typical creep's health of this wave
  (bosses take 30%); War Cry makes your towers in a wide circle attack 40% faster for 8 s. They are a
  way to rescue a leak, not a damage source: a tower does more over a wave. A rules option turns them
  off; bots never cast them.

## Single player

Solo games do not need the server: `LocalGame` runs the same simulation in the browser through the
same `GameRunner` the server uses, and speaks the same protocol, so the game view cannot tell the
difference. That makes pausing (P) and 2×/3× speed (F) possible; snapshots carry the speed so the
client clock keeps in step, and a hidden tab pauses the game.

- **Tutorial**: a real 8-wave Emberforge game (20 lives, a long first countdown) with a coach that
  shows one idea at a time, highlights the cells or buttons involved and moves on when the player has
  done it. A player who follows along wins with a few leaks; one who stops building loses.
- **Skirmish**: a solo game with the classic rules dialog.
- **Saved games.** A single-player game is saved as its seed and the commands given, with the tick of
  each (`src/client/saved.ts`). Continue builds a new game on the same seed and replays the commands
  (`src/shared/sim/replay.ts`); since the simulation is deterministic it lands on the same state,
  then shows it paused. The save is written every few seconds and when the tab is hidden or closed, and
  a save from another version of the game is not offered. Developer commands make a game unsaveable.
- **Daily challenge** (`src/shared/daily.ts`): the date, hashed, seeds a random generator that picks
  the wave set, a first wave from a short list (1 to 24), fifteen waves from there, a war chest of
  about nine tenths of what a player would have built up by then, 10% more creep health, sometimes
  Hard, and one or two twists. Medals: Bronze for reaching nine waves in, Silver for winning, Gold for
  winning losing at most three lives. `npm run balance:daily` plays bots over a run of days; over 40
  days they earned no medal 13 times, Bronze 10, Silver 15 and Gold twice.
- **Achievements**: 33 of them, kept with the campaign save. Some follow from the save (stars, the
  web, medals, career totals: a hook on every save checks them); the rest are watched for during a
  game by a tracker that reads the event stream and the player's state, in multiplayer too.

## The campaign

The campaign is two acts on two painted maps (`src/shared/campaign.ts`): *The Long Winter*, twelve
stages on the road north, and *The Thaw*, nine stages on the glacier with the second wave set, which
opens once *The Drowned Mill* is won. Each stage is a rule set for the ordinary game. The rules can
change the first and last wave, lives, starting gold and lumber, creep health, speed, armor and
regeneration, the number of creeps per wave, bounty, and the races that can be picked. Late stages
drop the player into the war (wave 15, 20, 30…) with a war chest and a long first countdown, which
makes them a different puzzle: build a whole maze at once.

Three stars per stage: reach a wave, win, win losing at most a few lives. Stars pay **runestones**,
174 in all; winning a stage opens the next. The Endless Frontier (open after *The Iron Pass*) pays one
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

Bots cast no spells and follow a fixed maze plan, so a person should do better; the last stages of
each act are meant to take a few tries.

## Code architecture

- `src/shared/sim/game.ts` holds the state, the commands and the wave flow; `horde.ts` moves, heals,
  leaks and kills creeps and runs their abilities; `combat.ts` does targeting, attacks, damage and
  on-hit effects; `spells.ts` the commander spells; `entities.ts` has the plain data types. The
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
