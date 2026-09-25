// Visual QA page: open /?gallery to see every tower and creep sprite.
import { creepSprite } from './art/creeps';
import { raceEmblem } from './art/emblems';
import { drawTowerAnim, GX, GY, TH, towerHead, towerMeta, towerSprite, TW } from './art/towers';
import { SP } from './art/util';
import { RACES, towersOfRace } from '../shared/data/races';
import { CREEPS } from '../shared/data/waves';

export function showGallery(): void {
  document.documentElement.style.cssText = 'overflow:auto;height:auto';
  document.body.style.cssText = 'overflow:auto;height:auto';
  document.getElementById('app')!.style.position = 'static';
  const root = document.createElement('div');
  root.style.cssText = 'padding:16px;background:#8fa6c4;min-height:100vh;';
  document.body.innerHTML = '';
  document.body.appendChild(root);
  const scale = 0.75;
  for (const race of RACES) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:4px;margin-bottom:6px;';
    const em = raceEmblem(race.id, 48);
    row.appendChild(em);
    for (const def of towersOfRace(race.id)) {
      const c = document.createElement('canvas');
      c.width = TW * scale;
      c.height = TH * scale;
      const ctx = c.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(towerSprite(def), 0, 0);
      ctx.save();
      ctx.scale(SP, SP);
      const m = towerMeta(def);
      const head = towerHead(def);
      if (head && m.head !== null) {
        ctx.save();
        ctx.translate(GX / SP, GY / SP - m.head);
        ctx.rotate(-0.5);
        ctx.drawImage(head, -1, -1, 2, 2);
        ctx.restore();
      }
      drawTowerAnim(ctx, def, GX / SP, GY / SP, 1.3, 10, 3);
      ctx.restore();
      c.title = def.name;
      row.appendChild(c);
    }
    root.appendChild(row);
  }
  const creeps = document.createElement('div');
  creeps.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end;margin-top:10px;';
  for (const def of Object.values(CREEPS)) {
    if (def.id.endsWith('s')) continue;
    const spr = creepSprite(def);
    const c = document.createElement('canvas');
    c.width = spr.size;
    c.height = spr.size;
    c.getContext('2d')!.drawImage(spr.frames[1], 0, 0);
    c.title = def.name;
    c.style.background = 'rgba(0,0,0,0.08)';
    creeps.appendChild(c);
  }
  root.appendChild(creeps);
}

/** /?gallery=towers[&race=frost]: tower sprites with their heads and animations, labelled. */
export function showTowers(race: string | null): void {
  document.documentElement.style.cssText = 'overflow:auto;height:auto';
  document.body.style.cssText = 'overflow:auto;height:auto;margin:0';
  document.body.innerHTML = '';
  const root = document.createElement('div');
  root.style.cssText = 'padding:10px;background:#b9c9dc;font:12px sans-serif;color:#0b1424';
  document.body.appendChild(root);
  const scale = race ? 1.3 : 0.62;
  for (const r of RACES) {
    if (race && r.id !== race) continue;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:flex-end;gap:2px;margin-bottom:4px;${race ? 'flex-wrap:wrap' : ''}`;
    const label = document.createElement('div');
    label.style.cssText = 'width:74px;font-weight:bold';
    label.textContent = r.name;
    row.appendChild(label);
    for (const def of towersOfRace(r.id)) {
      const cell = document.createElement('div');
      cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:#d3dfec;border-radius:6px';
      const c = document.createElement('canvas');
      c.width = TW * scale;
      c.height = TH * scale;
      const ctx = c.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(towerSprite(def), 0, 0);
      ctx.save();
      ctx.scale(SP, SP);
      const m = towerMeta(def);
      const head = towerHead(def);
      if (head && m.head !== null) {
        ctx.save();
        ctx.translate(GX / SP, GY / SP - m.head);
        ctx.rotate(-0.5);
        ctx.drawImage(head, -1, -1, 2, 2);
        ctx.restore();
      }
      drawTowerAnim(ctx, def, GX / SP, GY / SP, 1.3, 10, 3);
      ctx.restore();
      const name = document.createElement('div');
      name.textContent = def.name;
      cell.append(c, name);
      row.appendChild(cell);
    }
    root.appendChild(row);
  }
}

/** /?gallery=creeps: every wave's creature, large and labelled. */
export function showCreeps(): void {
  document.documentElement.style.cssText = 'overflow:auto;height:auto';
  document.body.style.cssText = 'overflow:auto;height:auto;margin:0';
  document.body.innerHTML = '';
  const root = document.createElement('div');
  root.style.cssText = 'display:grid;grid-template-columns:repeat(8, 1fr);gap:6px;padding:10px;background:#b9c9dc;font:12px sans-serif;color:#0b1424';
  document.body.appendChild(root);
  for (const def of Object.values(CREEPS)) {
    if (def.id.endsWith('s')) continue;
    const spr = creepSprite(def);
    const cell = document.createElement('div');
    cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:#d3dfec;border-radius:8px;padding:4px';
    const c = document.createElement('canvas');
    const px = 170;
    c.width = px;
    c.height = px;
    const ctx = c.getContext('2d')!;
    const k = Math.min(1.6, (px * 0.95) / spr.size);
    ctx.translate(px / 2 - spr.gx * k, px * 0.86 - spr.gy * k);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(20,30,50,0.25)';
    ctx.beginPath();
    ctx.ellipse(spr.gx, spr.gy, def.size * SP * 0.9, def.size * SP * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(spr.frames[1], 0, -spr.lift * SP);
    const label = document.createElement('div');
    label.textContent = `${def.id.slice(1)} ${def.name}`;
    cell.append(c, label);
    root.appendChild(cell);
  }
}

export function showCreep(id: string): void {
  const def = CREEPS[id];
  const spr = creepSprite(def);
  document.body.innerHTML = '';
  document.body.style.cssText = 'background:#8fa6c4;overflow:auto';
  for (const f of spr.frames.slice(0, 4)) {
    const c = document.createElement('canvas');
    c.width = spr.size * 3;
    c.height = spr.size * 3;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f, 0, 0, spr.size * 3, spr.size * 3);
    document.body.appendChild(c);
  }
}
