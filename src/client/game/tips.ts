// Between-wave tips, in the spirit of the hints the old map printed in chat.

export const TIPS: string[] = [
  'Every tower is also a wall. The longer the creeps walk, the longer your towers shoot.',
  'The gaps between pillars are exactly one tower wide: plugging them bends the path for very little gold.',
  'Alternate the open gap top and bottom from one pillar column to the next to make a zig-zag.',
  'In the first waves, spend every coin as soon as it comes in. Save up for big towers later.',
  'Hold Shift to place several towers in a row.',
  'Drag a box or double-click a tower to select many, then upgrade them all with one key.',
  'Upgrades happen in place, so they never change your maze.',
  'A leak costs lives and walks into the next player\'s lane with the health it has left.',
  'Whoever lands the killing blow on a leaked creep gets its bounty.',
  'Flyers ignore the maze and cross the middle of your lane. Keep anti-air towers there.',
  'The strip under the wave banner shows the next waves and their armor. Prepare early.',
  'Fortified shells shrug off Pierce and Magic. Impact and Pure damage crack them open.',
  'Spirits barely notice arrows and rocks. Magic burns them.',
  'IMMUNE creeps ignore slows, stuns and pulls: only raw damage counts.',
  'Healers mend the creeps around them. Burst them down before they reach the rest of the pack.',
  'Splitters break into shards where they die. Keep some firepower near the end of your maze.',
  'Selling during a wave leaves rubble until the wave ends, so juggling creeps doesn\'t work.',
  'Misplaced a tower? Sell it in the same build phase for a full refund.',
  'Press G or Call wave when you are ready. Once everyone is, the wave comes early and all get bonus gold for the time skipped.',
  'More lumber arrives after waves 7 and 20: add a second race, a third, or build a Legend.',
  'A Legend costs 800 gold and 1 lumber, and you can own one of each.',
  'Right-click a teammate on the scoreboard to send them gold.',
  'Alt+click pings the map for your team.',
  'Towers can target First, Last, Strong, Weak or Close. Strong is great against bosses.',
  'A boss costs 5 lives if it leaks. The Winter Tyrant costs 25, and if he escapes, the game is lost.',
  'Slows make every other tower better. Put them where many towers overlap.',
  'Hover a tower to see its damage type and what it is strong against.',
  'Space jumps the camera back to your lane.',
  'Wildgrove towers grow stronger as they deal damage. Plant them early.',
  'Goldhoard vaults pay interest on your gold after every wave, up to a cap.',
];

/** Deals tips in a shuffled order without repeats until the deck runs out. */
export class TipDeck {
  private deck: string[] = [];

  next(): string {
    if (this.deck.length === 0) {
      this.deck = [...TIPS];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    return this.deck.pop()!;
  }
}
