import { ARMOR_LABEL, DAMAGE_LABEL, DAMAGE_TABLE } from '../../shared/combat';
import { RACE_BY_ID, TOWERS, totalCost } from '../../shared/data/races';
import type { ArmorType, TowerDef } from '../../shared/types';
import { h } from '../ui/dom';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

export function dps(def: TowerDef): number {
  const a = def.attack;
  if (!a) return 0;
  const avg = (a.dmg[0] + a.dmg[1]) / 2;
  let v = a.beam ? (avg * (1 + a.beam.maxMult)) / 2 : avg / a.cd;
  if (a.crit) v *= 1 + a.crit.chance * (a.crit.mult - 1);
  return v * (a.multishot ?? 1);
}

/** Bullet list of what the tower does, in plain words. */
export function effects(def: TowerDef): string[] {
  const out: string[] = [];
  const a = def.attack;
  if (a) {
    if (a.targets === 'ground') out.push('Ground only — cannot hit flyers');
    if (a.targets === 'air') out.push('Air only');
    if (a.beam) out.push(`Beam ramps up to ${num(a.beam.maxMult)}× on one target`);
    if (a.splash) out.push(`Splash damage (${num(a.splash)} cells)`);
    if (a.multishot) out.push(`Hits ${a.multishot} targets at once`);
    if (a.chain) out.push(`Chains to ${a.chain.count} more enemies`);
    if (a.line) out.push('Pierces every enemy in a line');
    if (a.crit) out.push(`${pct(a.crit.chance)} chance to deal ${num(a.crit.mult)}× damage`);
    if (a.groundFire) out.push(`Leaves burning ground (${a.groundFire.dps}/s)`);
    if (a.goldScaling) out.push(`+${pct(a.goldScaling.pct)} of your gold as bonus damage (max ${a.goldScaling.max})`);
    if (a.onHit) out.push(...onHitText(a.onHit));
  }
  const p = def.pulse;
  if (p) {
    const what: string[] = [];
    if (p.dmg) what.push(`${p.dmg} damage`);
    if (p.pull) what.push(`drags enemies ${p.pull} cells back`);
    if (p.annihilate) what.push(`erases non-boss enemies (bosses lose ${pct(p.annihilate.bossPct)})`);
    out.push(`Every ${num(p.every)}s within ${num(p.radius)} cells: ${what.join(', ') || 'a pulse'}`);
    if (p.onHit) out.push(...onHitText(p.onHit));
    if (p.targets === 'ground') out.push('Pulse hits ground only');
  }
  const au = def.aura;
  if (au) {
    const tw: string[] = [];
    if (au.towerDmgPct) tw.push(`+${pct(au.towerDmgPct)} damage`);
    if (au.towerSpdPct) tw.push(`+${pct(au.towerSpdPct)} attack speed`);
    if (au.xpRate) tw.push(`${num(1 + au.xpRate)}× growth`);
    if (tw.length) out.push(`Aura: towers within ${num(au.radius)} get ${tw.join(', ')}`);
    const en: string[] = [];
    if (au.enemySlowPct) en.push(`slowed ${pct(au.enemySlowPct)}`);
    if (au.enemyDps) en.push(`take ${au.enemyDps} damage/s`);
    if (en.length) out.push(`Aura: enemies within ${num(au.radius)} are ${en.join(' and ')}`);
  }
  const e = def.econ;
  if (e) {
    if (e.killGold) out.push(`${e.killGoldChance ? `${pct(e.killGoldChance)} chance of ` : ''}+${e.killGold} gold per kill`);
    if (e.interestPct) out.push(`${pct(e.interestPct)} interest after each wave (max ${e.interestCap})`);
    if (e.perWave) out.push(`+${e.perWave} gold after each wave`);
    if (e.lifePerWave) out.push(`Restores ${e.lifePerWave} team life per wave`);
  }
  if (def.growth) out.push(`Grows up to ${def.growth.maxLevel} levels (+${pct(def.growth.dmgPerLevel)} damage each)`);
  if (def.limit) out.push(`Limit ${def.limit} per player`);
  return out;
}

function onHitText(o: NonNullable<TowerDef['attack']>['onHit']): string[] {
  if (!o) return [];
  const out: string[] = [];
  if (o.slow) out.push(`Slows ${pct(o.slow.pct)} for ${num(o.slow.dur)}s`);
  if (o.stun) out.push(o.stun.chance >= 1 ? `Stuns for ${num(o.stun.dur)}s` : `${pct(o.stun.chance)} chance to freeze for ${num(o.stun.dur)}s`);
  if (o.root) out.push(`${pct(o.root.chance)} chance to root for ${num(o.root.dur)}s`);
  if (o.dot) out.push(`${o.dot.kind === 'poison' ? 'Poison' : 'Burn'}: ${o.dot.dps}/s for ${num(o.dot.dur)}s${o.dot.maxStacks > 1 ? ` (stacks ×${o.dot.maxStacks})` : ''} — ignores armor`);
  if (o.sunder) out.push(`Strips ${o.sunder.armor} armor${o.sunder.maxStacks > 1 ? ` (stacks ×${o.sunder.maxStacks})` : ''}`);
  if (o.amplify) out.push(`Target takes +${pct(o.amplify.pct)} damage for ${num(o.amplify.dur)}s`);
  if (o.percentCurrent) out.push(`Removes ${pct(o.percentCurrent.pct)} of current health (bosses ${pct(o.percentCurrent.bossPct)})`);
  if (o.execute) out.push(`Executes non-boss enemies below ${pct(o.execute)} health`);
  if (o.shatter) out.push(`+${pct(o.shatter - 1)} damage to frozen enemies`);
  if (o.bonusVsAir) out.push(`${num(o.bonusVsAir)}× damage against flyers`);
  if (o.bonusVsArmor) for (const [k, v] of Object.entries(o.bonusVsArmor)) out.push(`${num(v!)}× damage against ${ARMOR_LABEL[k as ArmorType]}`);
  if (o.spreadOnDeath) out.push('Poison spreads when the carrier dies');
  return out;
}

export function vsText(def: TowerDef): string | null {
  const t = def.attack?.type ?? def.pulse?.type;
  if (!t) return null;
  const row = DAMAGE_TABLE[t];
  const strong = (Object.keys(row) as ArmorType[]).filter((k) => row[k] >= 1.25).map((k) => ARMOR_LABEL[k]);
  const weak = (Object.keys(row) as ArmorType[]).filter((k) => row[k] <= 0.6).map((k) => ARMOR_LABEL[k]);
  if (t === 'pure') return 'Pure: equal damage against every armor';
  return `${DAMAGE_LABEL[t]}${strong.length ? ` · strong vs ${strong.join(', ')}` : ''}${weak.length ? ` · weak vs ${weak.join(', ')}` : ''}`;
}

export function towerTooltip(def: TowerDef, opts: { cost?: number; note?: string } = {}): HTMLElement {
  const race = RACE_BY_ID[def.race];
  const a = def.attack;
  const stats = h('div', { class: 'tt-stats' });
  if (a) {
    const dmg = a.beam ? `${a.dmg[0]}/s` : a.dmg[0] === a.dmg[1] ? String(a.dmg[0]) : `${a.dmg[0]}–${a.dmg[1]}`;
    stats.append(
      h('span', null, 'Damage ', h('b', null, dmg)),
      h('span', null, 'Speed ', h('b', null, a.beam ? 'beam' : `${num(a.cd)}s`)),
      h('span', null, 'Range ', h('b', null, num(a.range))),
      h('span', null, 'DPS ', h('b', null, String(Math.round(dps(def))))),
    );
  } else if (def.pulse) {
    stats.append(h('span', null, 'Pulse ', h('b', null, `${num(def.pulse.every)}s`)), h('span', null, 'Radius ', h('b', null, num(def.pulse.radius))));
  } else if (def.aura) {
    stats.append(h('span', null, 'Aura radius ', h('b', null, num(def.aura.radius))));
  }
  const vs = vsText(def);
  const cost = opts.cost ?? def.cost;
  return h(
    'div',
    null,
    h('div', { class: 'tt-title', style: { color: race?.color } }, def.name),
    h('div', { class: 'tt-meta' }, `${def.tier === 5 ? 'Legend' : `Tier ${def.tier}`} · ${race?.name ?? ''}${vs ? ` · ${vs}` : ''}`),
    stats,
    h('div', null, def.desc),
    ...effects(def).map((e) => h('div', { style: { color: '#b9c9e0', fontSize: '12px' } }, `• ${e}`)),
    h(
      'div',
      { style: { marginTop: '6px' } },
      h('span', { class: 'tt-cost' }, `${cost} gold`),
      def.lumber ? h('span', { style: { color: 'var(--lumber)', fontWeight: '700' } }, ` + ${def.lumber} lumber`) : null,
      def.tier > 1 && def.tier < 5 ? h('span', { class: 'muted' }, ` (total ${totalCost(def.id)})`) : null,
    ),
    opts.note ? h('div', { style: { color: '#ffb44f', marginTop: '4px' } }, opts.note) : null,
  );
}

export function upgradesOf(defId: string): TowerDef[] {
  return TOWERS[defId]?.upgrades.map((u) => TOWERS[u]) ?? [];
}
