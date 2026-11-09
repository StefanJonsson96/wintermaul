// Achievements: things to do in Winterward. They are kept with the campaign save (so they travel
// with it between devices) and announced the moment they are earned. Some come from the save
// alone (campaign progress, the Rune Web, career totals); the rest are watched for
// during a game (game/feats.ts).
import { CHAPTERS } from '../../shared/campaign';
import { NODE_BY_ID, totalSpent } from '../../shared/talents';
import { type CampaignSave, loadSave, saveHooks, storeSave, totalStars } from './save';

export type FeatGroup = 'battle' | 'campaign' | 'career';

export const FEAT_GROUPS: { id: FeatGroup; name: string }[] = [
  { id: 'battle', name: 'Battle' },
  { id: 'campaign', name: 'Campaign' },
  { id: 'career', name: 'Career' },
];

export interface Feat {
  id: string;
  name: string;
  text: string;
  icon: string;
  group: FeatGroup;
  /** Earned from the save alone. */
  fromSave?: (s: CampaignSave) => boolean;
  /** For feats earned by counting up: where a save stands, out of `goal`. */
  count?: (s: CampaignSave) => number;
  goal?: number;
}

const wonAll = (s: CampaignSave, chapter: number) => CHAPTERS[chapter].stages.filter((st) => !st.endless).every((st) => (s.stars[st.id] ?? 0) >= 2);
const allStars = CHAPTERS.flatMap((c) => c.stages).filter((st) => !st.endless).length * 3;

export const FEATS: Feat[] = [
  { id: 'first_win', name: 'First Light', text: 'Win a game.', icon: 'star', group: 'battle' },
  { id: 'boss', name: 'Kingslayer', text: 'Kill a boss.', icon: 'crown', group: 'battle' },
  { id: 'three_races', name: 'Triple Threat', text: 'Command three races in one game.', icon: 'gem', group: 'battle' },
  { id: 'legend', name: 'Legendary', text: 'Build a Legend tower.', icon: 'crystal', group: 'battle' },
  { id: 'veteran', name: 'Veteran', text: 'Raise a tower to its highest level.', icon: 'bolt', group: 'battle' },
  { id: 'maze_200', name: 'Winding Road', text: 'Make the creeps in your lane walk 200 cells.', icon: 'maze', group: 'battle' },
  { id: 'maze_300', name: 'Labyrinth', text: 'Make the creeps in your lane walk 300 cells.', icon: 'maze', group: 'battle' },
  { id: 'towers_100', name: 'Architect', text: 'Have 100 towers standing at once.', icon: 'brick', group: 'battle' },
  { id: 'hoard', name: "Dragon's Hoard", text: 'Hold 5,000 gold at once.', icon: 'coin', group: 'battle' },
  { id: 'kills_1000', name: 'Exterminator', text: 'Kill 1,000 creeps in one game.', icon: 'sword', group: 'battle' },
  { id: 'flawless', name: 'Not a Scratch', text: 'Win a game without losing a life.', icon: 'shield', group: 'battle' },
  { id: 'last_life', name: 'By a Thread', text: 'Win a game with one life left.', icon: 'heart', group: 'battle' },
  { id: 'full_hard', name: 'Hard Frost', text: 'Win all 40 waves on Hard or Brutal.', icon: 'snow', group: 'battle' },
  { id: 'full_brutal', name: 'Heart of Winter', text: 'Win all 40 waves on Brutal.', icon: 'skull', group: 'battle' },
  { id: 'full_thaw', name: 'Spring Never Came', text: 'Win all 40 waves of The Thaw.', icon: 'drop', group: 'battle' },
  { id: 'endless_50', name: 'The Long Night', text: 'Reach wave 50 in an endless game.', icon: 'infinity', group: 'battle' },
  { id: 'endless_60', name: "Beyond the Map's Edge", text: 'Reach wave 60 in an endless game.', icon: 'infinity', group: 'battle' },
  { id: 'boons_6', name: 'Shrine Keeper', text: 'Take six boons from shrines in one game.', icon: 'banner', group: 'battle' },
  { id: 'stormproof', name: 'Weathered', text: 'Clear a wave in a blizzard or freezing fog without a leak.', icon: 'snow', group: 'battle' },
  { id: 'coop_win', name: 'Shoulder to Shoulder', text: 'Win an online game alongside another player.', icon: 'people', group: 'battle' },


  { id: 'act1', name: "Winter's End", text: 'Win every stage of Act I.', icon: 'map', group: 'campaign', fromSave: (s) => wonAll(s, 0) },
  { id: 'act2', name: 'The Thaw Turned', text: 'Win every stage of Act II.', icon: 'map', group: 'campaign', fromSave: (s) => wonAll(s, 1) },
  { id: 'stars', name: 'Starlit', text: 'Earn every star in the campaign.', icon: 'star', group: 'campaign', count: totalStars, goal: allStars },
  { id: 'keystone', name: 'Keystone', text: 'Take a keystone on the Rune Web.', icon: 'rune', group: 'campaign', fromSave: (s) => Object.keys(s.talents).some((id) => NODE_BY_ID[id]?.kind === 'keystone') },
  { id: 'weaver', name: 'Weaver', text: 'Spend 100 runestones on the Rune Web.', icon: 'rune', group: 'campaign', count: (s) => totalSpent(s.talents), goal: 100 },


  { id: 'career_games', name: 'Old Soldier', text: 'Play 30 games to the end.', icon: 'shield', group: 'career', count: (s) => s.tally.games, goal: 30 },
  { id: 'career_wins', name: 'Warden of the North', text: 'Win 15 games.', icon: 'crown', group: 'career', count: (s) => s.tally.wins, goal: 15 },
  { id: 'career_kills', name: "Winter's Wrath", text: 'Kill 25,000 creeps, every game together.', icon: 'skull', group: 'career', count: (s) => s.tally.kills, goal: 25000 },
];

export const FEAT_BY_ID: Record<string, Feat> = Object.fromEntries(FEATS.map((f) => [f.id, f]));

/** Whether a feat's conditions are met by the save alone. */
function metBySave(f: Feat, s: CampaignSave): boolean {
  if (f.fromSave) return f.fromSave(s);
  return !!f.count && f.count(s) >= (f.goal ?? Infinity);
}

/** Everyone who wants to hear about a new achievement (the toast, an open list). */
const listeners: ((f: Feat) => void)[] = [];

export function onFeat(fn: (f: Feat) => void): void {
  listeners.push(fn);
}

/** Achievements earned so far are kept quiet while this is set (the first check on a new save). */
let quiet = false;

// every save written is checked for achievements its progress has earned
saveHooks.push((s) => {
  const fresh: Feat[] = [];
  for (const f of FEATS) {
    if (s.feats[f.id] || !metBySave(f, s)) continue;
    s.feats[f.id] = Date.now();
    fresh.push(f);
  }
  if (!quiet) for (const f of fresh) for (const fn of listeners) fn(f);
});

/** Grants what an existing save has already earned, without fanfare; returns how many. */
export function catchUp(): number {
  const s = loadSave();
  const before = Object.keys(s.feats).length;
  if (!FEATS.some((f) => !s.feats[f.id] && metBySave(f, s))) return 0;
  quiet = true;
  try {
    storeSave(s);
  } finally {
    quiet = false;
  }
  return Object.keys(loadSave().feats).length - before;
}

/** Marks achievements as earned (those not earned before) and announces them. */
export function earn(ids: string[]): Feat[] {
  const s = loadSave();
  const fresh = ids.map((id) => FEAT_BY_ID[id]).filter((f) => f && !s.feats[f.id]);
  if (!fresh.length) return [];
  for (const f of fresh) s.feats[f.id] = Date.now();
  storeSave(s);
  for (const f of fresh) for (const fn of listeners) fn(f);
  return fresh;
}

/** "12 / 33", for the menu. */
export function featCount(s: CampaignSave = loadSave()): { got: number; all: number } {
  return { got: FEATS.filter((f) => s.feats[f.id]).length, all: FEATS.length };
}
