# Changelog

All notable changes to Winterward. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/): the major number changes when saves or the
network protocol break, the minor number for new features, the patch number for fixes and balance.

## [3.2.0] - 2026-11-10

### Added
- **Campaign Act IV, The Sundered Coast**: seven stages on a new coast map, open once *The Last Cairns* is
  won, with new stage rules: snowdrifts every wave, a champion with every wave, frozen ground where towers
  can't be sold, and boons a stage gives you at the start. *Holder of the Seawall* wins Tidecaller's Conch.
- **Shared shrines** in co-op: one offer for the team, two more boons than players; what one takes the
  others can't. A rules option, on by default with two or more players.

### Changed
- Five relics bend the rules instead of adding stats: Ward Stone, Minotaur Horn, Mason's Level, Oathband
  and Night Lantern.
- Online, the server only accepts relics backed by the achievements the browser reports, within its slots.
- Feats of skill aren't earned on Casual, and gold gifted by teammates doesn't count for Dragon's Hoard.
- Champions (blood moon and Act IV) never replace a boss.
- Saved games from 3.1 can't be continued; campaign progress carries over.

## [3.1.0] - 2026-11-10

### Added
- **Weather that changes the board**: blizzards pile snowdrifts across the creeps' path (the maze reroutes
  until the wave ends), a blood moon makes the last creep of each wave a moon-touched elite (4× health,
  8× gold), and a warm wind melts rubble.
- **Six boons that bend the rules**: Snow Angel's Mercy, Undertow, Quarryman's Blessing, Clean Sweep, Night
  Vigil and Avalanche. Sundering Hymn, Starlight, Steel Rain and Executioner's Moon are gone.
- The help screen explains weather, shrines and relics; the scoreboard shows everyone's boons (red when one
  has a price); with campaign talents on, the lobby shows the relics each player brings.

### Changed
- Saved games from 3.0 can't be continued (the rules changed); campaign progress carries over.

## [3.0.0] - 2026-11-09

### Added
- **Weather**: every wave has a forecast, shown in the wave bar and the preview of the next waves, that
  bends the rules while it runs: blizzards (shorter tower range, slower creeps), auroras (+25% Magic,
  Elemental and Pure), freezing fog (lingering slows, slower towers), a warm wind (faster creeps, stronger
  poison and fire) and blood moons (tougher creeps that pay much more), each with its own look.
- **Omens**: after every fifth wave a wayside shrine offers each player three of twenty boons; take one and
  it lasts the game. Some have a price. The offer can wait (the Shrine button, or O).
- **Campaign Act III, The Long Night**: eight stages under the polar night on a new map, open once
  *Hexwood* is won: a pass that is one long blizzard, a road of shrines, a land with only sixty stones to
  build with, a vale of endless aurora, a night of blood moons, a fog sea, and forty waves of every weather
  at the end. With it the three acts pay for the whole Rune Web.
- **Relics**: every achievement wins a relic, a keepsake with a small bonus (some with a price). Carry one
  into your games, two once you have twelve achievements: campaign, skirmish, and online when the host
  allows campaign talents. Three new achievements (Shrine Keeper, Weathered, Dawn) and their relics.
- **Move progress**: your whole save as a code (or a file) to load on another device. A code cut short is
  refused, both saves are shown before anything is replaced, and the achievements of both are kept.

### Changed
- The rules dialog has Weather and Omens switches (both on by default; off in the tutorial).
- The achievements screen is now Relics & achievements; the campaign screen has a Relics button.
- The lobby option is now *Campaign talents and relics*.

- Career achievements ask for less (12 games, 6 wins, 10,000 kills) so their relics aren't a grind; the
  Old Soldier's Pipe is weaker, Rime Crown, Thaw Lily and Starfall Sigil stronger. Storm Cloak keeps weather
  out of your lane entirely. Wall discounts from talents, relics and boons stop at 30% of a wall's price.
- Saved games from 2.x can't be continued (the rules changed); campaign progress carries over.

### Fixed
- Found by an adversarial review: damage and speed boons (and fog's slowdown) now reach towers already
  built; Deep Pockets pays for the wave it was offered after, not when you take it; bots skip boons with a
  price; relics only count when their achievement is earned; a broken saved game can't break Continue;
  Not a Scratch and Weathered count leaks, so healing can't hide them.

### Removed
- Commander spells (Frost Nova, Meteor, War Cry).
- The daily challenge, with its medals, streak and achievements.

## [2.0.0] - 2026-11-09

### Added
- **The Thaw**: a second set of forty waves, chosen in the rules dialog. Creeps that fight back:
  burrowers that dig in out of reach, blinkers that jump ahead, brood mothers that drop hatchlings,
  wardens that shield their neighbours, war drummers that speed up their wave, brutes that run faster as
  they bleed, and hexers that freeze towers solid. Some waves mix two creeps; the wave preview names every
  trick. Its bosses are Grimmaw the Deep Worm, the Hexmother, the Storm Herald and the Hollow King.
- **Campaign Act II, The Thaw**: nine stages on a glacier map, open once *The Drowned Mill* is won. The
  campaign screen has a tab per act, and the end screen says when a new act opens.
- **The Rune Web** replaces the talent tree: a passive web of 193 nodes in the spirit of Path of Exile,
  with six regions of small nodes, notables and two keystones each, race masteries around the rim, and
  bridges between regions. Pan, zoom, search, a summary of your bonuses, free refunds of anything nothing
  else hangs on, and a touch card on phones.
- **Commander spells**: Frost Nova, Meteor and War Cry, each on its own cooldown, cast with 1, 2, 3 or the
  new Spells panel. The rules dialog can switch them off.
- **Daily challenge**: one game a day, the same for everyone. The date picks the seed, the wave set, a
  stretch of fifteen waves with a war chest, and one or two twists. Bronze, Silver and Gold medals, a play
  streak, and the last week in the briefing.
- **Achievements**: 33 of them, announced as you earn them, listed on the end screen and in a new
  Achievements screen with progress bars. They are kept with your campaign progress.
- **Music**: generated as it plays (pads, bells, wind; drums during waves, darker for bosses), with a
  switch on the menu and a switch and volume in the settings.
- **Continue**: single-player games save as you play. Close the tab, come back, and press Continue on the
  menu to pick up exactly where you were, paused.
- `npm run balance:daily` and `scripts/resume-test.mjs`.

### Changed
- **Talents from the old tree are refunded** once, with a note on the campaign screen: spend the
  runestones again on the Rune Web. The campaign now pays 174 runestones in all.
- The protocol has new events, commands and settings, so servers and browsers must both be 2.0.
- Skirmish uses your rules: difficulty, wave set, endless, spells.
- The menu has a Daily tile and Achievements and Music buttons; on a narrow phone the tiles sit two by
  two.
- Messages show above dialogs.
- Test scripts find Chromium wherever Playwright installed it.

## [1.1.0] - 2026-10-22

### Added
- **Play on a phone or tablet.** Touch controls: tap a tower in the Build panel, then tap the map to build
  (keep a finger down to aim first); you stay in build mode until you tap Done. Drag to move the camera, pinch
  to zoom, tap to select, double-tap to select every tower of a kind, press and hold to add one to the
  selection or to see what a button does.
- A compact HUD for phones on their side, menus and campaign screens that fit small screens, and a hint to
  turn the phone sideways during a game.
- `npm run build:artifact` packs the single-player game (tutorial, campaign, skirmish) into one stand-alone
  page. Hosted as a claude.ai artifact, campaign progress is also kept in the host's private per-player store,
  so it survives a cleared browser and follows you between devices.

### Changed
- Leaving a game and starting a lobby with players not ready now ask inside the page instead of a browser
  dialog.
- The tutorial and the help screen explain the touch controls on touch screens.

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

[3.2.0]: https://github.com/StefanJonsson96/wintermaul/compare/6fc79ca...e640991
[3.1.0]: https://github.com/StefanJonsson96/wintermaul/compare/855dbaa...14b89b1
[3.0.0]: https://github.com/StefanJonsson96/wintermaul/compare/884e287...6db1164
[2.0.0]: https://github.com/StefanJonsson96/wintermaul/compare/6a6b98d...884e287
[1.1.0]: https://github.com/StefanJonsson96/wintermaul/compare/cbb5a72...6a6b98d
[1.0.0]: https://github.com/StefanJonsson96/wintermaul/compare/5a54d04...cbb5a72
[0.4.0]: https://github.com/StefanJonsson96/wintermaul/compare/1b1cb01...5a54d04
[0.3.0]: https://github.com/StefanJonsson96/wintermaul/compare/e7d46a2...1b1cb01
[0.2.0]: https://github.com/StefanJonsson96/wintermaul/compare/efff109...e7d46a2
[0.1.0]: https://github.com/StefanJonsson96/wintermaul/tree/efff109
