// Crows, bats and dragons.
import { alpha, ellipse, outline, shade, type Ctx } from '../util';
import { Look, MAW, evilEye, brow, fangs, spikes, claws, limb, fill, blob, wing } from './parts';

export function bird(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.3 + Math.sin(ph) * R * 0.08;
  const flap = Math.sin(ph);
  wing(ctx, -R * 0.1, by - R * 0.2, R * 1.2, -0.2 - flap * 0.9, shade(k.dark, -0.2), 'feather');
  // ragged tail
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.05);
  ctx.lineTo(-R * 1.25, by - R * 0.3);
  ctx.lineTo(-R * 1.05, by - R * 0.05);
  ctx.lineTo(-R * 1.3, by + R * 0.12);
  ctx.lineTo(-R * 0.5, by + R * 0.15);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  blob(ctx, 0, by, R * 0.62, R * 0.44, k.body);
  // talons reaching forward
  for (const s of [0, 1]) {
    const tx = R * (0.2 + s * 0.15);
    limb(ctx, tx - R * 0.15, by + R * 0.3, tx + R * 0.2, by + R * 0.65, R * 0.08, '#a88d58');
    claws(ctx, tx + R * 0.2, by + R * 0.65, R * 0.12, 0.6);
  }
  // head with a hooked beak
  const hx = R * 0.55;
  const hy = by - R * 0.32;
  blob(ctx, hx, hy, R * 0.32, R * 0.28, k.body, 0, 1.8);
  spikes(
    ctx,
    [
      [hx - R * 0.35, hy - R * 0.05],
      [hx - R * 0.2, hy - R * 0.25],
      [hx + R * 0.05, hy - R * 0.28],
    ],
    R * 0.25,
    k.dark,
    0.9,
  );
  ctx.fillStyle = '#d8c79a';
  ctx.beginPath();
  ctx.moveTo(hx + R * 0.24, hy - R * 0.14);
  ctx.quadraticCurveTo(hx + R * 0.7, hy - R * 0.15, hx + R * 0.62, hy + R * 0.18);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.02);
  ctx.lineTo(hx + R * 0.25, hy + R * 0.02);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.3);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + R * 0.25, hy + R * 0.04);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.06);
  ctx.lineTo(hx + R * 0.3, hy + R * 0.16);
  ctx.closePath();
  ctx.fill();
  evilEye(ctx, hx + R * 0.1, hy - R * 0.08, R * 0.08, k.eye);
  brow(ctx, hx + R * 0.1, hy - R * 0.08, R * 0.08, shade(k.dark, -0.3));
  wing(ctx, 0, by - R * 0.15, R * 1.3, -flap * 1.0, k.body, 'feather');
}

export function bat(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.12;
  const flap = Math.sin(ph * 1.5);
  wing(ctx, 0, by - R * 0.1, R * 1.35, -0.1 - flap * 0.9, shade(k.dark, -0.25), 'membrane');
  blob(ctx, 0, by, R * 0.42, R * 0.4, k.body);
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? shade(k.body, -0.2) : k.body;
    ctx.beginPath();
    ctx.moveTo(R * 0.1 + side * R * 0.14, by - R * 0.28);
    ctx.lineTo(R * 0.12 + side * R * 0.28, by - R * 0.9);
    ctx.lineTo(R * 0.3 + side * R * 0.05, by - R * 0.32);
    ctx.fill();
    outline(ctx, 1.2);
  }
  ctx.fillStyle = MAW;
  ellipse(ctx, R * 0.25, by + R * 0.12, R * 0.14, R * 0.1);
  ctx.fill();
  fangs(ctx, R * 0.13, by + R * 0.06, R * 0.37, by + R * 0.06, 2, R * 0.16);
  evilEye(ctx, R * 0.28, by - R * 0.1, R * 0.08, k.eye);
  evilEye(ctx, R * 0.08, by - R * 0.1, R * 0.07, k.eye);
  wing(ctx, 0, by, R * 1.4, -flap * 1.05, k.dark, 'membrane');
}

export function dragon(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.06;
  const flap = Math.sin(ph);
  wing(ctx, -R * 0.2, by - R * 0.25, R * 1.55, -0.15 - flap * 0.8, shade(k.dark, -0.25), 'membrane');
  // barbed tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.24 + 3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.4, by);
  ctx.quadraticCurveTo(-R * 1.1, by + R * 0.15 + Math.sin(ph) * R * 0.1, -R * 1.6, by - R * 0.15);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.24;
  ctx.stroke();
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 1.55, by - R * 0.15);
  ctx.lineTo(-R * 1.95, by - R * 0.4);
  ctx.lineTo(-R * 1.8, by - R * 0.1);
  ctx.lineTo(-R * 1.98, by + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
  // body with a spiny ridge
  blob(ctx, -R * 0.1, by, R * 0.74, R * 0.42, k.body);
  ctx.fillStyle = alpha(shade(k.eye, 0.1), 0.35);
  ellipse(ctx, -R * 0.05, by + R * 0.18, R * 0.5, R * 0.14);
  ctx.fill();
  spikes(
    ctx,
    [
      [-R * 0.75, by - R * 0.18],
      [-R * 0.45, by - R * 0.38],
      [-R * 0.1, by - R * 0.43],
      [R * 0.25, by - R * 0.35],
      [R * 0.5, by - R * 0.3],
    ],
    R * 0.22,
    k.dark,
    0.5,
  );
  // claws hanging below
  limb(ctx, R * 0.15, by + R * 0.3, R * 0.3, by + R * 0.62, R * 0.1, shade(k.body, -0.2));
  claws(ctx, R * 0.3, by + R * 0.62, R * 0.13, 0.9);
  // neck and horned head with open jaws
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.3 + 3;
  ctx.beginPath();
  ctx.moveTo(R * 0.4, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.8, by - R * 0.3, R * 0.95, by - R * 0.72);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.3;
  ctx.stroke();
  const hx = R * 1.05;
  const hy = by - R * 0.8;
  for (const [s, col] of [
    [0, shade(k.dark, -0.2)],
    [0.12, k.dark],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(hx - R * 0.1 - s * R, hy - R * 0.14);
    ctx.quadraticCurveTo(hx - R * 0.4 - s * R, hy - R * 0.35, hx - R * 0.62 - s * R, hy - R * 0.58);
    ctx.lineTo(hx - R * 0.02 - s * R, hy - R * 0.2);
    ctx.fill();
    outline(ctx, 1.2);
  }
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.32, k.body);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.25, hy - R * 0.18);
  ctx.lineTo(hx + R * 0.55, hy - R * 0.06);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.04);
  ctx.lineTo(hx - R * 0.2, hy + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.15, hy + R * 0.08);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.04);
  ctx.lineTo(hx + R * 0.35, hy + R * 0.32);
  ctx.lineTo(hx - R * 0.1, hy + R * 0.22);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx, hy + R * 0.06, hx + R * 0.48, hy + R * 0.04, 4, R * 0.08);
  evilEye(ctx, hx + R * 0.06, hy - R * 0.06, R * 0.07, k.eye);
  brow(ctx, hx + R * 0.06, hy - R * 0.06, R * 0.07, shade(k.dark, -0.3));
  wing(ctx, -R * 0.05, by - R * 0.2, R * 1.65, -flap * 0.95, k.dark, 'membrane');
}
