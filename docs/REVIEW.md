# Review of 3.0 (before release)

An independent, adversarial review run while 3.0 was being finished. Fixed in 3.0.0: B1, B2, B4, B5, B6,
the relic-ownership half of B7, the leak-counting part of B8, the wall-discount stacking and the weakest
picks; the version was bumped (B3). Still open: everything under "Next steps" below, the server trusting
relics online (B7), a difficulty floor for achievements and gifted gold counting for the hoard (B8).

---


Baseline: `npx vitest run` 92/92 pass and `npm run fingerprint` runs clean. The tests miss every bug below. Confidence tags: **[ran]** = I reproduced it with a script, **[code]** = I read it in the code, **[susp]** = suspicion only.

## 1. Correctness bugs

**B1 (high). Damage and attack-speed changes from boons and weather don't reach towers that are already built. [ran]**
`Game.refreshMods` (src/shared/sim/game.ts:603-607) recomputes `p.mods`, but towers cache `t.dmgMul`/`t.spdMul`. Those are only recomputed in `Combat.refreshAuras` (src/shared/sim/combat.ts:198-200), and that only runs on build, upgrade or sell in that lane.
- Repro: build `frost_1`, take Blood Price. `p.mods` = `{dmg:1.14, leakMul:1.5}` but the tower stays at `dmgMul 1`. The +14% only shows up after building another tower in that lane. The 1.5× leak penalty applies immediately.
- Affected: Ember, Restless Hands, Blood Price, The Long Night, Stoneskin, and fog's −10% attack speed. Range, crit and type bonuses are read live, so they work.
- Fog side effect: if you build during a fog wave, the −10% speed gets locked onto every tower in that lane until your next build after the fog.
- This came in with the omens commit, because mods used to be static.
- Fix: in `refreshMods`, call `this.combat.refreshAuras(lane)` for that player's lanes. Add a test.
- Fingerprints will change, and saves will drift (see B3).

**B2 (med). Deep Pockets pays more the longer you leave the offer open. [ran]**
`takeBoon` (game.ts:625) computes gold from `this.wave` at the moment you take it, not the wave it was offered on. The card (dialogs.ts:268) also re-renders with the current wave.
- Repro: offered after wave 5 with the card saying "+75". Clicking "Decide later" and taking it after wave 9 paid 135.
- Fix: store the offer wave with `p.omen` (e.g. `{wave, ids}`) and use it for both the payout and the card.

**B3 (med). Save version never bumped, so in-progress saves replay wrong. [code]**
`package.json` is still 2.0.0 through spell removal, relics, weather/omens and the "lighter boons" retune. `canResume` (src/client/saved.ts:65) compares only the version string.
- A game saved on the released 2.0.0 resumes under the new rules: weather turns on, shrines appear, spells are gone. The journal is applied at the same ticks, so builds fail silently and the result is a different game. B1's fix will do the same again.
- Fix: bump the version on every rules change, or add a `RULES_VERSION` that the fingerprint test pins.

**B4 (med). Bots grab the first boon blindly, including ones that hurt the team. [code]**
game.ts:616 has bots take `p.omen[0]`. That can be Blood Price, which costs the shared lives pool 1.5× per leak in the bot's lane. The same blind pick runs in local games with bots and in online bots.
- Fix: score offers and skip any whose effects include `bad`, or weight by the bot's races.

**B5 (low-med). Storm Cloak makes Whiteout Pass's only rule a free bonus. [code]**
`weatherproof` (omens.ts:141) skips the −15% range but keeps the blizzard's creep slow (horde.ts:140). On Whiteout Pass (campaign.ts:395) and in any blizzard, the weather becomes a pure buff.
- Fix: weatherproof should also skip the creep-side upside, or cancel the whole weather.

**B6 (low). A crafted or old save can break Continue, and resumed games skip talent validation. [code]**
`validGame` (saved.ts:29) checks neither `kind.talents` nor `kind.stage`. main.ts:136 passes `kind.talents` unsanitized into `modsFromLoadout` → `taken()` (talents.ts:397):
- If `talents` is missing, `Object.entries(undefined)` throws.
- If present, it grants any nodes with no check on links or budget.

A transfer code can carry such a game. Fix: run `sanitizeLoadout(kind.talents, save.stones)` and validate `kind`.

**B7 (low). Relic slots aren't enforced anywhere except the UI click handler. [code]**
`cleanRelics` (relics.ts:62) keeps any 2 known relics, with no ownership or slot check, in `parseSave`, in transfer import, and on the server (rooms.ts:538).
- A one-line edit of a code gives Heart of Winter and the Crown with zero achievements.
- Locally that only cheats yourself. Online with talents on, the server trusts whatever the client sends, and sanitizes loadouts against the full `TREE_COST`.
- Fix: clamp to owned feats in `parseSave`. Online, show each player's relics and spent points in the lobby so the host can see what they're allowing.

**B8 (low). Some achievements are easy to get without earning them. [code / susp]**
- `flawless` and `stormproof` compare lives at the end of the wave. `payInterest` heals from life-shrine towers (econ `lifePerWave`, races.ts:656) before the `wave/build` event, which hides leaks.
- `hoard` can be reached through gifts from teammates online.
- There is no difficulty floor: flawless, last_life and endless_50 count on the easiest difficulty.
- `stormproof` is close to automatic: blizzards from wave 4 on are trivial, and its prize (Storm Cloak) is a strong relic.

**Checked and fine:** reconnects (FullState carries `boons`/`omen` via `netPlayers`, current `mods`, `weatherSeed`/`weatherForced`; the client derives `weatherNow`), forced weather overriding the weather setting, tower cap with sell and upgrade, omen pool running out in endless (it falls back to the 3 repeatable boons), and replay ordering.

## 2. Balance (measured)

I gave each boon or relic from wave 1 to a solo bot on hard, classic rules, 12 seeds. Average wave reached; the baseline with nothing is 24.6.
- **Relics, top:** Starlit Mantle 31.1, Dawnstone 30.5, Mason's Level 30.1, Crown 29.7, Pipe 29.5.
- **Relics, bottom:** Shrine Bell 24.6 (bots ignore it, but it does little anyway), Thaw Lily 24.6, Sigil 24.9, Rime Crown 25.2, Tooth 25.4, Purse 25.5.
- **Boons:** Mason's Oath 30.1 and Frost Edge 29.7 are best. Skyhunter, Witchfire and Cold Iron are 24.6-24.8. Wolf Winter 25.8 and Stoneskin 25.2 are weak.
- **Wall discount dominates:** a −2 gold discount on 10-gold walls (the boon, the relic and the Architect talent all stack) is a 20-60% cheaper maze. That's the dominant economy pick.
- **DoT boons are race-locked:** Witchfire and Lily are worth about +4 waves for venom or fire (I tested both), and worth nothing otherwise. The balance script's random races never drew those two in 12 seeds, so the tool is blind to them.
- **Weather and omens barely move outcomes:** `balance.ts` normal ×4 averaged wave 33.0 with them on and 32.5 with `--classic-rules`. Partly that's B1; partly it's bots taking boon[0]. The headline feature has almost no mechanical weight.
- **Act III is not harder than Act II.** The campaign bot, with no relics and blind boons, won 22/24:
  - Last Light 4/4 (three of the four wins took 3 stars, 1.8 lives lost)
  - Whiteout 4/4, Cairns 4/4, Red Moon 4/4
  - Pilgrims 3/4, Aurora Vale 3/4
  - Hexwood, Act II's finale, is 4/4 with 7.5 lives lost.
  - Real players bring relics and pick boons, so Act III will be easier still. The opener, Last Light, is the easiest stage in the act.

## 3. UX, generic feel, dark patterns

- **The new systems aren't explained:** help.ts and tips.ts mention weather, shrines and relics nowhere [code]. A new player meets a modal mid-game with no context. Relics never appear in-game: there's no HUD chip saying what you carry.
- **Boons are numbers, not choices:** 14 of 20 are "+5% X"-style stat bumps, and most relics are too. That's exactly where the "generic" feeling comes from. Picking between +5% damage, +5% range and +6% speed isn't a decision. Weather has the same problem: it's four multipliers plus screen tint, and nothing changes on the board.
- **"Decide later" invites procrastination.** An unanswered offer is settled with card 0 at the next shrine, and is lost entirely after wave 35 [code]. Combined with B2, delaying is rewarded and forgetting is punished silently.
- **Power is gated behind playtime (dark-pattern-adjacent).** Several relics need career grinds: 25k kills (Sickle), 30 games (Pipe, which is top-5), career wins, 1000 kills. Grinding gets you real power, and online that power carries into co-op. The owner dislikes dark patterns; the clean fix is relics that are sidegrades (each with a price), with no grind-only power.
- **Bad picks hurt the whole team.** Blood Price and Heart of Winter raise leak costs on shared lives, but there's no co-op disclosure or confirmation, and teammates can't see who took them.

## 4. Next steps (prioritized)

1. **Fix B1 and add a regression test** (refresh stats on mod change; assert `dmgMul` follows the boon). Then re-measure balance. *S.*
2. **Bump the version or add a rules hash for replays (B3)**, and freeze the offer wave for Deep Pockets (B2). *S.*
3. **Make weather change the board, not the numbers.** Blizzards drop snowdrift cells that act as temporary walls and reroute mazes. Fog hides creep HP bars beyond tower range. Warm wind melts rubble early. Blood moon spawns one elite per lane. Forecasts then become something to plan a maze around, which no other TD does. *M-L.*
4. **Replace %-boons with rule-benders**, e.g. "selling mid-wave leaves no rubble", "your first leak each wave is forgiven", "walls slow creeps by 5%", "Legends cost gold, not lumber", "towers next to 3+ walls gain range". Keep 4-5 stat boons as filler. *M.*
5. **Give every relic a real price and remove grind-gated relics**, or make them cosmetic: a sidegrade loadout, not progression power. *S-M.*
6. **Smarter bot boon picks (B4)** plus a `--boon`/`--relic` matrix mode in `balance.ts` with fixed race pairs, so DoT and air picks get measured. *S.*
7. **Nerf stacking wall discounts** (cap total at 2, or make it a percentage) and buff the dead picks: Skyhunter, Cold Iron, Shrine Bell (make it reroll), Thaw Lily, Sigil. *S.*
8. **Retune Act III:** lower the gold or raise HP on Last Light and Whiteout, and stop Storm Cloak from trivializing Whiteout (B5). Target bot win rate of about 50% without relics. *S.*
9. **Onboarding for the new systems:** a tutorial step for the first shrine, a help page on weather, boons and relics, and a HUD chip listing carried relics and taken boons (team-visible in co-op). *S-M.*
10. **Server hygiene (B7):** show players' relics and spent points in the lobby, and clamp relics to owned feats in `parseSave`. *S.*
11. **Achievement integrity (B8):** count leaks rather than a lives difference, put a difficulty floor on power-granting feats, and ignore gifted gold for `hoard`. *S.*
12. **Shared shrines in co-op:** one shrine per team where each player takes a different card from a common offer. That turns omens into a co-op negotiation, a distinctive social beat. *M.*

Note: the working tree already had uncommitted edits to README.md, docs/DESIGN.md and scripts/readme-shots.mjs, and someone touched src/client/game/dialogs.ts while I worked. None of that is mine; I modified no repo files.
