# Changelog

All notable changes to Winterward. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/): the major number changes when saves or the
network protocol break, the minor number for new features, the patch number for fixes and balance.

## [1.0.0] - 2026-09-26

### Added
- **Campaign**: *The Long Winter*, twelve stages on a painted map of the road north. Stages can start late in
  the war with a war chest, limit the races, or add mutators (swift creeps, regeneration, extra armor, bigger
  waves). Each stage has three stars: reach a wave, win, win losing only a few lives.
- **Runestones and talents**: stars pay runestones, spent in a five-branch talent tree (Arsenal, Alchemy,
  Fortune, Bulwark, Kinship) with gated rows and capstones such as Deadeye, Frostbite and Second Wind.
  Respec is free.
- **The Endless Frontier**: endless mode inside the campaign, paying a runestone every 5 waves past wave 20
  the first time you reach them.
- **Campaign talents in multiplayer**: a lobby switch (off by default) that lets everyone bring the talents
  they earned. The lobby shows each player's runestones and lets you edit your talents without leaving.
- Stage briefings with the enemies of the stage, a goal tracker in the HUD, and stars, runestones and newly
  opened stages on the end screen.
- The game version is shown in the menu, reported by `/healthz`, and checked when connecting: a browser tab
  older than the server is told to reload.

### Changed
- The simulation is split into `Game` (state, commands, waves), `Horde` (creeps) and `Combat` (towers and
  damage). `scripts/fingerprint.ts` proves such refactors change nothing: seeded bot games hash identically.
- Creature art is split into modules (parts, humanoids, beasts, flyers, spirits); the sprites are
  pixel-identical.
- The compiler rejects unused code; dead state was removed.
- Tooltips, range circles, prices and refunds on the HUD include your talents.

## [0.4.0] - 2026-09-25

### Added
- **Single player in the browser**: solo games are simulated locally, can be paused (P) and sped up to 2× or 3×
  (F), and pause themselves when the tab is hidden.
- **Tutorial**: one click from the menu, an 8-wave game with a coach that explains one idea at a time (walls,
  zig-zags, calling waves, upgrading, air, leaks, lumber) and waits for you to try it.
- Skirmish: a solo game with the classic rules, no server needed.

## [0.3.0] - 2026-09-25

### Changed
- **Creeps look like enemies**: a new roster of monsters (ghouls, kobold raiders, frostfang wolves, liches,
  banshees, the Winter Tyrant…) drawn from 24 creature shapes, each with 8 walking frames.
- **Towers with racial identities**: every race has its own building kit (Frostborn ice citadels, Emberforge
  forges, Clockwork workshops, Wildgrove living trees…), with idle effects such as flames, orbs and sparks.

## [0.2.0] - 2026-09-25

### Changed
- Balance pass with headless bot games: fairer races, smoother waves, lives that scale with the number of
  players, winnable bosses (healers no longer stack, bosses don't heal themselves).
- Tips between waves, stable hotkeys (the race button always uses L), one-row build panel, a stronger
  Frostborn opening.

## [0.1.0] - 2026-09-25

### Added
- Co-op maze tower defense for 1–8 players in the browser, inspired by the Warcraft III map Wintermaul: every
  tower is a wall, leaked creeps run into the next player's lane, 12 races with 8 towers and a Legend each,
  40 waves ending with the Winter Tyrant, endless mode.
- Old-school pre-game setup: the first player picks the difficulty and race mode (all pick, double, all
  random, same race) and anyone can go random for bonus gold.
- Authoritative Node server with rooms, 4-letter codes, quick play, spectators, reconnects and bots; no login.
- Procedural art and sound: no image or audio files.
- Docs (design notes, hosting guide), Dockerfile and unit tests.

[1.0.0]: https://github.com/StefanJonsson96/wintermaul/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/StefanJonsson96/wintermaul/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/StefanJonsson96/wintermaul/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/StefanJonsson96/wintermaul/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/StefanJonsson96/wintermaul/releases/tag/v0.1.0
