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

## Innovations (kept small on purpose)

- **Live path preview** and path length while placing towers.
- **Mass upgrades**: box-select or double-click to select towers and upgrade them together.
- **Targeting modes** per tower (first / last / strong / weak / close).
- **Gold gifting** between players (right-click a player in the scoreboard).
- **Pings** (Alt+click), in-game chat with old-school `-commands`.
- **Bots** that build real mazes, for solo play or to fill seats.
- **Endless mode** after wave 40.

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
