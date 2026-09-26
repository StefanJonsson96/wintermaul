// Skulls, wraiths, banshees, liches, storm elementals and golems.
import { alpha, ellipse, glow, outline, shade, type Ctx } from '../util';
import { Look, BONE, evilEye, brow, fangs, spikes, claws, limb, fill, crown, hoodedFace, robe } from './parts';

export function skull(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.2 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.7, k.body, 0.55);
  // trailing ghost-fire
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const fx = -R * (0.3 + t * 1.1);
    const fy = by - R * (0.35 + Math.sin(ph * 2 + i) * 0.12) + t * R * 0.1;
    glow(ctx, fx, fy, R * (0.55 - t * 0.3), k.dark, 0.7);
  }
  ctx.restore();
  // tongues of ghost-fire streaming back from the crown
  for (let i = 0; i < 4; i++) {
    const bx = R * (0.25 - i * 0.22);
    const len = R * (1.0 + (i % 2) * 0.35 + Math.sin(ph * 2 + i) * 0.12);
    const tipX = bx - len * 0.75;
    const tipY = by - R * 0.35 - len * 0.55 + Math.sin(ph * 3 + i * 1.7) * R * 0.08;
    for (const [w, col] of [
      [1, alpha(k.body, 0.85)],
      [0.5, alpha(shade(k.eye, 0.5), 0.9)],
    ] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(bx - R * 0.2 * w, by - R * 0.3);
      ctx.quadraticCurveTo(bx - R * 0.1, by - R * 0.3 - len * 0.35, tipX, tipY);
      ctx.quadraticCurveTo(bx + R * 0.1 * w, by - R * 0.45 - len * 0.2, bx + R * 0.2 * w, by - R * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  // cranium
  ctx.fillStyle = fill(ctx, 0, by - R * 0.1, R * 0.5, BONE);
  ctx.beginPath();
  ctx.arc(0, by - R * 0.12, R * 0.5, Math.PI * 0.85, Math.PI * 2.15);
  ctx.quadraticCurveTo(R * 0.5, by + R * 0.3, R * 0.25, by + R * 0.28);
  ctx.lineTo(-R * 0.2, by + R * 0.28);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.strokeStyle = alpha('#6a6258', 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-R * 0.25, by - R * 0.55);
  ctx.lineTo(-R * 0.1, by - R * 0.35);
  ctx.lineTo(-R * 0.2, by - R * 0.2);
  ctx.stroke();
  // sockets
  ctx.fillStyle = '#07090f';
  ellipse(ctx, R * 0.22, by - R * 0.1, R * 0.15, R * 0.13);
  ctx.fill();
  ellipse(ctx, -R * 0.08, by - R * 0.1, R * 0.13, R * 0.12);
  ctx.fill();
  evilEye(ctx, R * 0.22, by - R * 0.1, R * 0.07, k.eye);
  evilEye(ctx, -R * 0.08, by - R * 0.1, R * 0.06, k.eye);
  // gaping jaw
  const jaw = Math.sin(ph * 2) * R * 0.06;
  ctx.fillStyle = shade(BONE, -0.1);
  ctx.beginPath();
  ctx.moveTo(-R * 0.18, by + R * 0.32 + jaw);
  ctx.lineTo(R * 0.34, by + R * 0.32 + jaw);
  ctx.lineTo(R * 0.28, by + R * 0.5 + jaw);
  ctx.lineTo(-R * 0.12, by + R * 0.48 + jaw);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  fangs(ctx, -R * 0.15, by + R * 0.28, R * 0.3, by + R * 0.28, 5, R * 0.09);
  fangs(ctx, -R * 0.12, by + R * 0.33 + jaw, R * 0.28, by + R * 0.33 + jaw, 4, R * 0.07, -1);
}

export function wraith(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.5, k.body, 0.35);
  ctx.restore();
  robe(ctx, R, by, ph, shade(k.dark, 0.1), k.body);
  // long skeletal arms reaching for you
  for (const [dy, col, reach] of [
    [-0.08, shade(BONE, -0.4), 0.85],
    [0.12, BONE, 1.0],
  ] as const) {
    const hx = R * 0.2 + R * reach * 0.75;
    const hy = by + R * (dy - 0.15) + Math.sin(ph + dy * 10) * R * 0.08;
    ctx.fillStyle = shade(k.dark, 0.15);
    ctx.beginPath();
    ctx.moveTo(R * 0.15, by + R * (dy - 0.15));
    ctx.lineTo(R * 0.55, by + R * (dy - 0.12));
    ctx.lineTo(R * 0.5, by + R * (dy + 0.1));
    ctx.lineTo(R * 0.2, by + R * (dy + 0.2));
    ctx.closePath();
    ctx.fill();
    limb(ctx, R * 0.5, by + R * (dy - 0.02), hx, hy, Math.max(2, R * 0.06), col);
    claws(ctx, hx, hy, R * 0.22, -0.25);
  }
  // hood with a peak
  ctx.fillStyle = shade(k.dark, 0.2);
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.3);
  ctx.quadraticCurveTo(-R * 0.6, by - R * 1.05, -R * 0.15, by - R * 1.28);
  ctx.quadraticCurveTo(-R * 0.35, by - R * 1.5 + Math.sin(ph) * R * 0.05, -R * 0.55, by - R * 1.62);
  ctx.quadraticCurveTo(R * 0.4, by - R * 1.4, R * 0.55, by - R * 0.95);
  ctx.quadraticCurveTo(R * 0.65, by - R * 0.55, R * 0.5, by - R * 0.3);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  hoodedFace(ctx, R * 0.12, by - R * 0.78, R * 0.38, k, false);
}

export function banshee(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by - R * 0.3, R * 1.6, k.body, 0.35);
  ctx.restore();
  // hair streaming back
  ctx.fillStyle = alpha(shade(k.body, 0.35), 0.85);
  ctx.beginPath();
  ctx.moveTo(R * 0.3, by - R * 1.1);
  for (let i = 0; i <= 5; i++) {
    const x = R * 0.1 - i * R * 0.35;
    ctx.lineTo(x, by - R * (1.15 - i * 0.12) + Math.sin(ph * 2 + i) * R * 0.12);
    ctx.lineTo(x - R * 0.12, by - R * (0.8 - i * 0.1) + Math.sin(ph * 2 + i + 1) * R * 0.1);
  }
  ctx.lineTo(-R * 0.2, by - R * 0.4);
  ctx.closePath();
  ctx.fill();
  robe(ctx, R, by, ph, shade(k.body, -0.15), k.body);
  // arms flung wide
  for (const [dir, col] of [
    [-1, shade(k.body, -0.3)],
    [1, shade(k.body, 0.2)],
  ] as const) {
    const ex = R * (dir > 0 ? 0.85 : -0.5);
    const ey = by - R * (0.4 + Math.sin(ph) * 0.08);
    limb(ctx, R * 0.05, by - R * 0.35, ex, ey, R * 0.08, col);
    claws(ctx, ex, ey, R * 0.16, dir > 0 ? -0.6 : Math.PI + 0.6);
  }
  // gaunt screaming face
  const hx = R * 0.18;
  const hy = by - R * 0.78;
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.3, shade(k.body, 0.4));
  ellipse(ctx, hx, hy, R * 0.27, R * 0.34);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#05070c';
  ellipse(ctx, hx + R * 0.1, hy - R * 0.06, R * 0.08, R * 0.07);
  ctx.fill();
  ellipse(ctx, hx - R * 0.07, hy - R * 0.06, R * 0.07, R * 0.07);
  ctx.fill();
  evilEye(ctx, hx + R * 0.1, hy - R * 0.06, R * 0.05, k.eye);
  evilEye(ctx, hx - R * 0.07, hy - R * 0.06, R * 0.045, k.eye);
  ctx.fillStyle = '#05070c';
  ellipse(ctx, hx + R * 0.04, hy + R * 0.16, R * 0.08, R * 0.13);
  ctx.fill();
  if (k.boss) crown(ctx, hx, hy - R * 0.28, R * 0.6, R * 0.4, shade(k.eye, 0.4), 4);
}

export function lich(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.3 + Math.sin(ph) * R * 0.06;
  robe(ctx, R, by, ph, k.dark, shade(k.dark, 0.2));
  // trim of the robe
  ctx.strokeStyle = alpha(k.eye, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(R * 0.05, by - R * 0.55);
  ctx.lineTo(R * 0.1, by + R * 0.8);
  ctx.stroke();
  // staff with a glowing skull-orb
  const sx = R * 0.65;
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.09 + 3;
  ctx.beginPath();
  ctx.moveTo(sx - R * 0.1, -R * 0.05);
  ctx.lineTo(sx + R * 0.05, by - R * 1.2);
  ctx.stroke();
  ctx.strokeStyle = '#4a3a2e';
  ctx.lineWidth = R * 0.09;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, sx + R * 0.05, by - R * 1.3, R * 0.7, k.eye, 0.9);
  ctx.restore();
  ctx.fillStyle = shade(k.eye, 0.55);
  ctx.beginPath();
  ctx.arc(sx + R * 0.05, by - R * 1.3, R * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - R * 0.12, by - R * 1.1);
  ctx.quadraticCurveTo(sx - R * 0.2, by - R * 1.45, sx + R * 0.05, by - R * 1.5);
  ctx.moveTo(sx + R * 0.2, by - R * 1.1);
  ctx.quadraticCurveTo(sx + R * 0.3, by - R * 1.45, sx + R * 0.05, by - R * 1.5);
  ctx.stroke();
  // bony hand on the staff
  limb(ctx, R * 0.1, by - R * 0.3, sx, by - R * 0.55, R * 0.08, BONE);
  claws(ctx, sx - R * 0.02, by - R * 0.55, R * 0.12, 0.2);
  // hood and skull
  ctx.fillStyle = shade(k.dark, 0.1);
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.35);
  ctx.quadraticCurveTo(-R * 0.45, by - R * 1.25, R * 0.12, by - R * 1.3);
  ctx.lineTo(-R * 0.05, by - R * 1.05);
  ctx.quadraticCurveTo(R * 0.6, by - R * 1.0, R * 0.5, by - R * 0.35);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  hoodedFace(ctx, R * 0.12, by - R * 0.72, R * 0.34, k, true);
}

export function elemental(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.8, k.body, 0.5);
  ctx.restore();
  // swirling storm below
  ctx.strokeStyle = alpha(k.body, 0.85);
  ctx.lineWidth = R * 0.14;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const r = R * (0.3 + i * 0.15);
    ctx.ellipse(0, by + R * (0.45 + i * 0.22), r, r * 0.3, 0, ph + i, ph + i + Math.PI * 1.3);
    ctx.stroke();
  }
  // crackling arms
  for (const [x0, dir] of [
    [-R * 0.35, -1],
    [R * 0.35, 1],
  ] as const) {
    ctx.strokeStyle = shade(k.eye, 0.4);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, by);
    let x = x0;
    let y = by;
    for (let i = 0; i < 4; i++) {
      x += dir * R * 0.22;
      y += (i % 2 ? -1 : 1) * R * 0.18 + Math.sin(ph * 3 + i) * R * 0.05;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // storm-cloud body
  const g = ctx.createRadialGradient(0, by - R * 0.3, R * 0.1, 0, by, R * 0.8);
  g.addColorStop(0, shade(k.body, 0.25));
  g.addColorStop(1, shade(k.dark, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = R * (0.55 + (i % 2) * 0.12);
    const x = Math.cos(a) * rr;
    const y = by - R * 0.1 + Math.sin(a) * rr * 0.95;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(Math.cos(a - 0.35) * rr * 1.25, by - R * 0.1 + Math.sin(a - 0.35) * rr * 1.2, x, y);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // furious face
  evilEye(ctx, R * 0.25, by - R * 0.25, R * 0.1, k.eye);
  evilEye(ctx, -R * 0.05, by - R * 0.25, R * 0.09, k.eye);
  brow(ctx, R * 0.25, by - R * 0.25, R * 0.1, shade(k.dark, -0.4));
  ctx.fillStyle = '#07101c';
  ctx.beginPath();
  ctx.moveTo(-R * 0.1, by + R * 0.05);
  ctx.lineTo(R * 0.05, by + R * 0.15);
  ctx.lineTo(R * 0.15, by + R * 0.02);
  ctx.lineTo(R * 0.28, by + R * 0.14);
  ctx.lineTo(R * 0.4, by + R * 0.0);
  ctx.lineTo(R * 0.3, by + R * 0.3);
  ctx.lineTo(-R * 0.02, by + R * 0.28);
  ctx.closePath();
  ctx.fill();
}

export function golem(ctx: Ctx, R: number, ph: number, k: Look): void {
  const swing = Math.sin(ph) * 0.35;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 0.85;
  const shard = (x: number, y: number, w: number, h: number, c: string) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(c, 0.25));
    g.addColorStop(1, shade(c, -0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.lineTo(x + w * 0.9, y + h * 0.05);
    ctx.lineTo(x + w, y + h * 0.7);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.1, y + h * 0.95);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 2);
  };
  const crack = (pts: [number, number][]) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = alpha(k.eye, 0.9);
    ctx.lineWidth = Math.max(1.5, R * 0.05);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(-R * 0.25, hipY - bob);
  ctx.rotate(-swing);
  shard(-R * 0.2, 0, R * 0.4, R * 0.85, shade(k.dark, -0.15));
  ctx.restore();
  ctx.save();
  ctx.translate(-R * 0.5, -R * 1.75 - bob);
  ctx.rotate(swing * 0.8);
  shard(-R * 0.22, 0, R * 0.44, R * 1.0, shade(k.body, -0.3));
  ctx.restore();
  // torso of jagged blocks with a glowing core
  shard(-R * 0.75, -R * 2.0 - bob, R * 1.5, R * 1.2, k.body);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -R * 1.45 - bob, R * 0.7, k.eye, 0.8);
  ctx.restore();
  crack([
    [-R * 0.5, -R * 1.75 - bob],
    [-R * 0.15, -R * 1.5 - bob],
    [R * 0.05, -R * 1.62 - bob],
    [R * 0.45, -R * 1.2 - bob],
  ]);
  crack([
    [-R * 0.15, -R * 1.5 - bob],
    [-R * 0.25, -R * 1.05 - bob],
  ]);
  for (const side of [-1, 1]) {
    const px = side * R * 0.5;
    spikes(
      ctx,
      [
        [px - R * 0.3, -R * 1.95 - bob],
        [px - R * 0.1, -R * 2.05 - bob],
        [px + R * 0.1, -R * 2.05 - bob],
        [px + R * 0.3, -R * 1.95 - bob],
      ],
      R * (k.boss ? 0.65 : 0.45),
      shade(k.eye, 0.4),
      side * 0.25,
    );
  }
  // sunken head under a jagged brow
  shard(-R * 0.1, -R * 2.45 - bob, R * 0.58, R * 0.5, shade(k.body, 0.05));
  evilEye(ctx, R * 0.3, -R * 2.22 - bob, R * 0.075, k.eye);
  evilEye(ctx, R * 0.12, -R * 2.22 - bob, R * 0.07, k.eye);
  brow(ctx, R * 0.28, -R * 2.23 - bob, R * 0.1, shade(k.dark, -0.2));
  if (k.boss) crown(ctx, R * 0.2, -R * 2.42 - bob, R * 0.8, R * 0.45, shade(k.eye, 0.45), 3);
  ctx.save();
  ctx.translate(R * 0.25, hipY - bob);
  ctx.rotate(swing);
  shard(-R * 0.2, 0, R * 0.4, R * 0.85, k.dark);
  ctx.restore();
  // front arm ending in a huge fist
  ctx.save();
  ctx.translate(R * 0.55, -R * 1.75 - bob);
  ctx.rotate(-swing * 0.8);
  shard(-R * 0.22, 0, R * 0.46, R * 0.8, shade(k.body, -0.1));
  shard(-R * 0.28, R * 0.72, R * 0.58, R * 0.45, shade(k.body, -0.05));
  ctx.restore();
}
