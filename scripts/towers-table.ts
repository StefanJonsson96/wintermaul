// Prints a table of tower stats for balancing: npx tsx scripts/towers-table.ts [id-prefix]
import { TOWERS } from '../src/shared/data/races';

const rows = Object.values(TOWERS).sort((a, b) => a.race.localeCompare(b.race) || a.id.localeCompare(b.id));
const filter = process.argv[2];
console.log('id         tier cost total   dmg    cd  rng  type        dps  dps/g  notes');
for (const d of rows) {
  if (filter && !d.id.startsWith(filter)) continue;
  let total = d.cost;
  for (let p = d.parent ? TOWERS[d.parent] : undefined; p; p = p.parent ? TOWERS[p.parent] : undefined) total += p.cost;
  const a = d.attack;
  let dps = 0;
  let dmg = 0;
  if (a) {
    dmg = (a.dmg[0] + a.dmg[1]) / 2;
    const crit = a.crit ? 1 + a.crit.chance * (a.crit.mult - 1) : 1;
    dps = (dmg * crit * (a.multishot ?? 1)) / a.cd;
  } else if (d.pulse?.dmg) {
    dmg = d.pulse.dmg;
    dps = d.pulse.dmg / d.pulse.every;
  }
  const dot = a?.onHit?.dot;
  const notes = [
    a?.splash ? `splash ${a.splash}` : '',
    a?.chain ? `chain ${a.chain.count}` : '',
    a?.multishot ? `x${a.multishot}` : '',
    a?.line ? 'line' : '',
    a?.beam ? 'beam' : '',
    dot ? `dot ${dot.dps}x${dot.dur}s st${dot.maxStacks ?? 1}` : '',
    a?.onHit?.slow ? `slow ${a.onHit.slow.pct}` : '',
    d.pulse ? `pulse r${d.pulse.radius}` : '',
    d.aura ? 'aura' : '',
    d.econ ? 'econ' : '',
    a ? a.targets : d.pulse?.targets ?? '',
  ].filter(Boolean).join(' ');
  console.log(
    `${d.id.padEnd(10)} ${String(d.tier).padStart(4)} ${String(d.cost).padStart(4)} ${String(total).padStart(5)} ${dmg.toFixed(0).padStart(5)} ${(a?.cd ?? d.pulse?.every ?? 0).toFixed(2).padStart(5)} ${(a?.range ?? d.pulse?.radius ?? 0).toFixed(1).padStart(4)}  ${(a?.type ?? d.pulse?.type ?? '-').padEnd(9)} ${dps.toFixed(0).padStart(5)} ${(dps / total).toFixed(2).padStart(6)}  ${notes}`,
  );
}
