// Umbral: the cult of the dark. Obsidian slabs split by violet light, bone and chains,
// gothic spires and gates that open onto nothing.
import {
  alpha,
  type Build,
  contactShadow,
  type Ctx,
  ellipse,
  glow,
  outline,
  polySlab,
  skull,
  shade,
  spikeCrown,
  type Spec,
  taperedPrism,
  window_,
} from './common';

const OBSIDIAN = '#221c2e';
const OBS_TOP = '#3e3554';
const BONE = '#dcd4c0';
const IRON = '#4a4656';

function cracks(ctx: Ctx, pts: [number, number][], color: string): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = shade(color, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier, glow: vio } = p;
  const rx = 50 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  polySlab(ctx, X, Y + 5, rx, ry, 14, 6, OBS_TOP, OBSIDIAN, Math.PI / 6);
  cracks(
    ctx,
    [
      [X - rx * 0.7, Y + 5],
      [X - rx * 0.4, Y + 9],
      [X - rx * 0.15, Y + 2],
      [X + rx * 0.1, Y + 12],
    ],
    vio,
  );
  cracks(
    ctx,
    [
      [X + rx * 0.3, Y - 8],
      [X + rx * 0.5, Y],
      [X + rx * 0.72, Y - 2],
    ],
    vio,
  );
  skull(ctx, X, Y + 5 + ry + 5, 5.5, BONE, vio);
  // chains draped over the edge
  ctx.strokeStyle = IRON;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = X + side * (rx * 0.35 + i * 5);
      const y = Y + 5 + ry * 0.8 + Math.sin((i / 5) * Math.PI) * 5 + 4;
      ctx.moveTo(x - 2, y);
      ctx.ellipse(x, y, 2.5, 1.6, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = vio;
    ctx.beginPath();
    ctx.arc(X + (i - (Math.min(4, tier) - 1) / 2) * 12 + (i >= Math.min(4, tier) / 2 ? 10 : -10), Y + 5 + ry + 5, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A hooded idol of black stone. */
function idol(ctx: Ctx, x: number, baseY: number, w: number, h: number, vio: string): void {
  ctx.fillStyle = OBSIDIAN;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.quadraticCurveTo(x - w * 0.55, baseY - h * 0.6, x - w * 0.3, baseY - h * 0.85);
  ctx.quadraticCurveTo(x, baseY - h * 1.1, x + w * 0.3, baseY - h * 0.85);
  ctx.quadraticCurveTo(x + w * 0.55, baseY - h * 0.6, x + w / 2, baseY);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(OBS_TOP, 0.2));
  g.addColorStop(1, shade(OBSIDIAN, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#07050c';
  ellipse(ctx, x, baseY - h * 0.7, w * 0.22, h * 0.13);
  ctx.fill();
  glow(ctx, x - w * 0.08, baseY - h * 0.7, w * 0.16, vio, 1);
  glow(ctx, x + w * 0.08, baseY - h * 0.7, w * 0.16, vio, 1);
}

function gothicSpire(ctx: Ctx, x: number, baseY: number, w: number, h: number, vio: string): void {
  taperedPrism(ctx, x, baseY, w, w * 0.62, h, OBS_TOP, h * 0.3);
  window_(ctx, x - w * 0.08, baseY - h * 0.45, w * 0.24, h * 0.22, vio, '#07050c');
  spikeCrown(ctx, x - w * 0.05, baseY - h + 2, w * 0.7, h * 0.08, 3, OBSIDIAN);
}

export function drawShadow(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: vio } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  switch (slot) {
    case '1': {
      idol(ctx, X, Y + 2, 34 * s, 60 * s, vio);
      muzzle = Y - 44 * s;
      fx.push({ k: 'glow', x: X, y: muzzle, r: 22, color: vio });
      break;
    }
    case '2a': {
      // a bone totem stacked with skulls, a violet flame on top
      ctx.strokeStyle = 'rgba(8,14,28,0.8)';
      ctx.lineWidth = 11 * s;
      ctx.beginPath();
      ctx.moveTo(X, Y + 2);
      ctx.lineTo(X, Y - 66 * s);
      ctx.stroke();
      ctx.strokeStyle = BONE;
      ctx.lineWidth = 8 * s;
      ctx.stroke();
      skull(ctx, X, Y - 20 * s, 11 * s, BONE, vio);
      skull(ctx, X, Y - 46 * s, 10 * s, shade(BONE, -0.1), vio);
      for (const side of [-1, 1]) {
        ctx.strokeStyle = BONE;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(X, Y - 60 * s);
        ctx.quadraticCurveTo(X + side * 22 * s, Y - 62 * s, X + side * 24 * s, Y - 78 * s);
        ctx.stroke();
      }
      muzzle = Y - 76 * s;
      fx.push({ k: 'flame', x: X, y: Y - 66 * s, w: 16 * s, h: 26 * s, n: 3, color: vio, core: '#f0d8ff' });
      break;
    }
    case '3a': {
      // the Soul Reaper: a gothic obelisk bearing a scythe
      gothicSpire(ctx, X, Y + 2, 38 * s, 104 * s, vio);
      ctx.strokeStyle = 'rgba(8,14,28,0.8)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(X - 30 * s, Y - 6 * s);
      ctx.lineTo(X + 30 * s, Y - 96 * s);
      ctx.stroke();
      ctx.strokeStyle = '#6b4a36';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.fillStyle = '#cfd4de';
      ctx.beginPath();
      ctx.moveTo(X + 30 * s, Y - 96 * s);
      ctx.quadraticCurveTo(X - 10 * s, Y - 118 * s, X - 34 * s, Y - 96 * s);
      ctx.quadraticCurveTo(X - 6 * s, Y - 104 * s, X + 26 * s, Y - 88 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      muzzle = Y - 110 * s;
      fx.push({ k: 'glow', x: X, y: Y - 52 * s, r: 30, color: vio });
      break;
    }
    case '4a': {
      // the Void Maw: a ring of fangs around a hungry dark orb
      idol(ctx, X, Y + 2, 44 * s, 50 * s, vio);
      const cy = Y - 92 * s;
      const r = 30 * s;
      glow(ctx, X, cy, r * 1.9, vio, 0.5);
      ctx.fillStyle = '#08060e';
      ellipse(ctx, X, cy, r, r);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = BONE;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x0 = X + Math.cos(a) * r;
        const y0 = cy + Math.sin(a) * r;
        const x1 = X + Math.cos(a) * r * 0.62;
        const y1 = cy + Math.sin(a) * r * 0.62;
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(a + 1.6) * 4, y0 + Math.sin(a + 1.6) * 4);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0 + Math.cos(a - 1.6) * 4, y0 + Math.sin(a - 1.6) * 4);
        ctx.fill();
      }
      muzzle = cy;
      fx.push({ k: 'vortex', x: X, y: cy, r: 20 * s, color: vio });
      break;
    }
    case '2b': {
      gothicSpire(ctx, X, Y + 2, 32 * s, 96 * s, vio);
      // a lantern hanging from an iron arm
      ctx.strokeStyle = IRON;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X + 8 * s, Y - 70 * s);
      ctx.lineTo(X + 30 * s, Y - 74 * s);
      ctx.lineTo(X + 30 * s, Y - 66 * s);
      ctx.stroke();
      ctx.fillStyle = IRON;
      ctx.fillRect(X + 24 * s, Y - 66 * s, 12 * s, 14 * s);
      ctx.fillStyle = shade(vio, 0.3);
      ctx.fillRect(X + 26 * s, Y - 64 * s, 8 * s, 10 * s);
      muzzle = Y - 110 * s;
      fx.push({ k: 'glow', x: X + 30 * s, y: Y - 59 * s, r: 26, color: vio });
      fx.push({ k: 'wisps', x: X, y: Y - 40 * s, r: 34 * s, color: vio, n: 3 });
      break;
    }
    case '3b': {
      // the Singularity: a black ring gate with a spiral inside
      for (const side of [-1, 1]) taperedPrism(ctx, X + side * 30 * s, Y + 2, 16 * s, 12 * s, 58 * s, OBS_TOP, 10 * s);
      const cy = Y - 50 * s;
      ctx.lineWidth = 12 * s;
      ctx.strokeStyle = 'rgba(8,14,28,0.8)';
      ellipse(ctx, X, cy, 30 * s, 34 * s);
      ctx.stroke();
      ctx.lineWidth = 8 * s;
      ctx.strokeStyle = OBS_TOP;
      ellipse(ctx, X, cy, 30 * s, 34 * s);
      ctx.stroke();
      ctx.fillStyle = '#07050c';
      ellipse(ctx, X, cy, 25 * s, 29 * s);
      ctx.fill();
      muzzle = cy;
      fx.push({ k: 'vortex', x: X, y: cy, r: 26 * s, color: vio });
      fx.push({ k: 'glow', x: X, y: cy, r: 40, color: vio });
      break;
    }
    case '4b': {
      // the Black Hole above a cracked altar
      taperedPrism(ctx, X, Y + 2, 58 * s, 50 * s, 22 * s, OBS_TOP);
      cracks(
        ctx,
        [
          [X - 22 * s, Y - 4 * s],
          [X - 6 * s, Y - 14 * s],
          [X + 4 * s, Y - 4 * s],
          [X + 20 * s, Y - 16 * s],
        ],
        vio,
      );
      for (const side of [-1, 1]) {
        ctx.fillStyle = BONE;
        ctx.beginPath();
        ctx.moveTo(X + side * 26 * s, Y - 20 * s);
        ctx.quadraticCurveTo(X + side * 40 * s, Y - 60 * s, X + side * 16 * s, Y - 84 * s);
        ctx.quadraticCurveTo(X + side * 30 * s, Y - 56 * s, X + side * 20 * s, Y - 22 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.6);
      }
      const cy = Y - 72 * s;
      glow(ctx, X, cy, 60 * s, vio, 0.45);
      muzzle = cy;
      fx.push({ k: 'vortex', x: X, y: cy, r: 38 * s, color: vio });
      break;
    }
    case 'L': {
      // The Void: a gate of obsidian that opens onto nothing
      for (const side of [-1, 1]) taperedPrism(ctx, X + side * 34 * s, Y + 4, 22 * s, 16 * s, 118 * s, OBS_TOP, 20 * s);
      ctx.fillStyle = OBSIDIAN;
      ctx.beginPath();
      ctx.moveTo(X - 44 * s, Y - 112 * s);
      ctx.quadraticCurveTo(X, Y - 150 * s, X + 44 * s, Y - 112 * s);
      ctx.lineTo(X + 44 * s, Y - 98 * s);
      ctx.quadraticCurveTo(X, Y - 132 * s, X - 44 * s, Y - 98 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      skull(ctx, X, Y - 124 * s, 10 * s, BONE, vio);
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.moveTo(X - 26 * s, Y + 2);
      ctx.lineTo(X - 26 * s, Y - 90 * s);
      ctx.quadraticCurveTo(X, Y - 118 * s, X + 26 * s, Y - 90 * s);
      ctx.lineTo(X + 26 * s, Y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = alpha(vio, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      muzzle = Y - 60 * s;
      fx.push({ k: 'vortex', x: X, y: Y - 55 * s, r: 34 * s, color: vio });
      fx.push({ k: 'wisps', x: X, y: Y - 70 * s, r: 40 * s, color: vio, n: 4 });
      break;
    }
  }
  return { muzzle, fx };
}
