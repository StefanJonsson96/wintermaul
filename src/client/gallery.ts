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
