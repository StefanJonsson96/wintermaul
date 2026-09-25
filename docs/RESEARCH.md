# How Wintermaul works — research notes

This is what I found about the Warcraft III map *Wintermaul* before designing **Winterward**.
Everything that follows in the game design traces back to these notes.

## Sources

1. **The original map itself** — `Wintermaul X14 Balanced Version` by *dukewintermaul* (edited by Sum_Asinus).
   The extracted map files (`war3map.j` JASS script, `war3map.wts` strings, `war3map.w3u` unit data) are
   mirrored in the open-source Unity study project
   [RodinSevar/towerdefence](https://github.com/RodinSevar/towerdefence) (`mpq_files/`). I parsed the script and
   the unit table directly (a small `w3u` parser), so the numbers below are the map's real values, not memory.
2. Web search results / snippets about later versions (*Wintermaul One*, *Wintermaul One Revamped*,
   *Wintermaul One Revolution*, *Wintermaul Wars*):
   - [ENT Gaming — "Wintermaul One Rule"](https://entgaming.net/forum/viewtopic.php?t=84095) (leak rotation, kill stealing)
   - [Wintermaul One Revolution](https://wintermaul.one/) and its [changelogs](https://wintermaul.one/changelog/) (race count, modes)
   - [Hive Workshop — Wintermaul One Revamped](https://www.hiveworkshop.com/threads/wintermaul-one-revamped-v4b.212876/) (anti-block / anti-juggle systems)
   - [Maul Tactics — mazing guide](https://maultactics.gg/articles/mazing-guide) and [Wintermaul Wars history](https://maultactics.gg/articles/wintermaul-wars-history)

   Several of these sites are blocked by this environment's network policy, so for them I only had search-engine
   snippets. The map files were the primary source.

## The classic map (Wintermaul TD, dukewintermaul)

### Layout & flow
- **9 defenders** (Red, Blue, Teal, Purple, Yellow, Orange, Green, Pink, Gray) + the computer "Forces of Northrend".
- Start locations form a **3 × 3 grid**: top row (Red / Blue / Teal), middle row (Orange / Yellow / Purple),
  bottom row (Green / Gray / Pink). Map description: *"Attackers come from the top three places at the top of
  the map. You must keep them from reaching the bottom where the ship is."*
- Creeps are spawned **all at once** at the spawn regions (X14 added extra spawns for the middle and bottom rows:
  15 spawn regions in total), and are given `move` orders through a chain of waypoint regions
  (e.g. `Left Spawn → Left Move 1 → Left Move 2 → Load`). The middle column splits into a left and right group.
- Because routes run **through several players' areas in sequence**, whatever a top player fails to kill walks
  into the players below. *Leaking gives your monsters to the next player.* Kills pay the killer, which is why
  the tips say: *"If someone is leaking, build behind them, do not build in front of their base, they need as
  many kills as possible."*
- The bottom-centre player (Gray) is the **last defender** and gets **+50 % of the level bonus**.
- Reaching the ship region (`Load`) removes the creep and costs **1 shared life**
  (*"A unit has boarded the ship! N chances left"*). If the **level-30 boss (Duke Wintermaul) boards, you lose
  instantly.**

### Mazing & blocking
- Towers are built by a worker, on the Warcraft III build grid; creeps path around them with normal WC3
  pathfinding. The whole game is about **mazing**: forcing the longest possible walk past your towers.
- Tips from the map: *"Never block with towers, it will cause units to run down a different path or attack"*,
  *"Attackers require at least one square to move through."*
- `Prevent Attack` trigger: a creep that starts attacking a tower is re-ordered to walk to the ship after 1 s.
- Later versions (*Wintermaul One Revamped*) added an **anti-block system** (placements that seal the path are
  refused) and an **anti-juggle system** (a sold tower leaves a dummy blocker, so you can't flip creeps between
  two exits by building/selling).

### Economy
- Start: **60 gold, 1 lumber**. Lumber is spent on an *element* (race) building at your Element Chooser.
- **+1 lumber at level 15** → a second element.
- Kill bounty per creep (dice rolled, grows with level: 1 → ~5, boss 90–190).
- **Level bonus** after each level: starts at 10 gold, **+2 every level**, paid to everyone.
- **Sell = 75 % refund.** (*"Most of the time, selling is not the best choice."*)
- The *Laser Cannon* (750 g + 1 lumber, 2-minute build) could only be built by the bottom three players.

### Waves (X14, real data)
- Level 1 starts after **60 s**; each next level starts **30 s after the previous one is completely cleared**.
- **20 creeps per spawn**, **15 on air levels**, **1 boss** on level 30.

| Lv | Creep | HP | Armor | Notes | Lv | Creep | HP | Armor | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Scout | 19 | 0 | | 16 | Eternal Spirit | 1300 | 14 | |
| 2 | Engineer | 60 | 0 | | 17 | Supply Tank | 1525 | 10 | "very difficult" |
| 3 | Night Ranger | 113 | 2 | | 18 | Walking Corpse | 2125 | 10 | |
| 4 | Barbarian | 160 | 0 | | 19 | Totem Carrier | 2500 | 15 | |
| 5 | Baby Dragon | 110 | 0 | **air** | 20 | Unholy Knight | 2875 | 15 | |
| 6 | Stalker | 265 | 3 | light | 21 | Crystal Mage | 3125 | 16 | light |
| 7 | Water Runner | 325 | 4 | | 22 | Frozen Infernal | 3625 | 17 | |
| 8 | Ice Troll | 375 | 5 | | 23 | Adult Dragon | 3000 | 20 | **air** |
| 9 | Wolf Rider | 400 | 7 | | 24 | Polar Bear | 4250 | 18 | |
| 10 | Hovercraft | 450 | 7 | fortified, hover | 25 | Possessed Hunter | 5000 | 18 | |
| 11 | Goblin Machine | 625 | 8 | | 26 | Corrupt Chieftain | 5625 | 19 | |
| 12 | Frosty Reptile | 782 | 10 | | 27 | Ancient Dragon | 5250 | 19 | **air** |
| 13 | Demonic Pet | 900 | 10 | light | 28 | Spider Fiend | 7500 | 20 | |
| 14 | Matured Dragon | 825 | 12 | **air** | 29 | Armored Wisp | 8200 | 20 | |
| 15 | Ice Shard Golem | 1375 | 12 | | 30 | **Duke Wintermaul** | 70000 | 15 | **boss, leak = defeat** |

Levels 31–50 are joke "bonus levels" during which you can no longer lose lives.
Movement speed rises from 200 to ~450 WC3 units/s over the 30 levels.

### Difficulty
Red picks within 30 s: Very Easy (100 lives), Easy (40), **Normal (20)**, Hard (10), Perfection (1).

### Races ("elements") in X14 — each with a builder and 6–7 towers
| Element | Identity (from the map's own tooltips) |
|---|---|
| Fire | moderate damage + splash; bonus vs heavy, weak vs fortified/light |
| Ice | slows, high minimum damage, low range; bonus vs light |
| Electric | very fast, low damage; chain lightning; *Thunder Rod* removes 25 % current HP |
| Stone | high damage, short range, crits (2×); bonus vs fortified; *Paralyzer* leaves 10 HP |
| Tech | very long range, long cooldowns; missiles, nukes |
| Poison | medium everything, slows; *Crawler* halves HP |
| Earth | big splash |
| Crystal | weak early, dominant late game (chaos damage) |
| Gravity | special effects: slow aura, % HP, *Black Hole* |
| Demonic | chaos damage, huge range & splash, slow |
| Heaven | average stats; *Gate Keeper* aura permanently slows everything nearby |
| Space | "queen of special-effect towers"; *The Void* kills anything near it |

The map's built-in strategy guide assigns roles by position ("Fire is best used up top", "Tech is best on
the bottom", "It's always a good idea to have 1 Thunder Rod at the very beginning of your maze").

## Later versions: Wintermaul One (the one most people remember from Battle.net / ENT)
- **One spawn per player; each player defends their own lane.** Designed "to minimize kill stealing".
- **Leaks rotate**: *"Units killed before leaking don't take away lives and the leaks go circular so
  Player0 → Player1 → … → Player8 → Player0."* A leaked creep costs a life **and** is teleported into the next
  player's lane.
- **45–49 races** with difficulty ratings, 4–6 towers each, upgrade chains; lumber buys races.
- Modes: All Pick, All Pick Double, All Random, All Random Double, Same Builder, infinite waves, many difficulties.
- ~40 waves; anti-block and anti-juggle systems.

## What makes it fun (distilled)
1. **Mazing** on an open field — every tower is both a wall and a gun; the path you force *is* your defence.
2. **Leaks are shared**: your mistakes land on a teammate, their kills are your lost gold. Social pressure,
   helping, blaming, carrying.
3. **Race roulette**: picking one (then a second) race from many, each with a clear identity and trade-offs,
   against a fixed wave list with air levels, armored levels and bosses → "one more game with a new combo".
4. A slow, readable difficulty ramp with **spikes** (air levels, armored level, "level 17", the boss).
