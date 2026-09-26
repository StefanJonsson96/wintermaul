// Rats, wolves, boars and the things with too many legs.
import { alpha, ellipse, glow, outline, roundRect, shade, type Ctx } from '../util';
import { Look, BONE, MAW, evilEye, brow, fangs, spikes, claws, limb, leg, fill, blob } from './parts';

export function rat(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sc = Math.sin(ph * 2);
  const by = -R * 0.62 - Math.abs(sc) * R * 0.05;
  // long bald tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.1 + 2.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.75, by + R * 0.05);
  ctx.bezierCurveTo(-R * 1.3, by + R * 0.1, -R * 1.2, by - R * (0.5 + sc * 0.15), -R * 1.85, by - R * 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#d9a3a0';
  ctx.lineWidth = R * 0.1;
  ctx.stroke();
  for (const [x, off, col] of [
    [-R * 0.45, Math.PI, shade(k.dark, -0.2)],
    [R * 0.4, 0, shade(k.dark, -0.2)],
  ] as const) {
    const a = Math.sin(ph * 2 + off) * 0.6;
    limb(ctx, x, by + R * 0.2, x + Math.sin(a) * R * 0.35, -R * 0.02, R * 0.13, col);
  }
  // hunched mangy body
  ctx.fillStyle = fill(ctx, 0, by, R * 0.8, k.body);
  ctx.beginPath();
  ctx.moveTo(-R * 0.85, by + R * 0.25);
  ctx.quadraticCurveTo(-R * 0.9, by - R * 0.6, -R * 0.1, by - R * 0.62);
  ctx.quadraticCurveTo(R * 0.55, by - R * 0.55, R * 0.7, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.5, by + R * 0.35, -R * 0.85, by + R * 0.25);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  spikes(
    ctx,
    [
      [-R * 0.75, by - R * 0.3],
      [-R * 0.5, by - R * 0.55],
      [-R * 0.2, by - R * 0.64],
      [R * 0.1, by - R * 0.6],
      [R * 0.4, by - R * 0.42],
    ],
    R * 0.16,
    shade(k.body, -0.3),
    0.6,
  );
  // sores
  ctx.fillStyle = alpha('#9fd46a', 0.7);
  ellipse(ctx, -R * 0.3, by - R * 0.15, R * 0.09, R * 0.06);
  ctx.fill();
  for (const [x, off] of [
    [-R * 0.55, 0],
    [R * 0.3, Math.PI],
  ] as const) {
    const a = Math.sin(ph * 2 + off) * 0.6;
    limb(ctx, x, by + R * 0.2, x + Math.sin(a) * R * 0.35, -R * 0.02, R * 0.14, k.dark);
  }
  // pointed head with incisors
  const hx = R * 0.75;
  const hy = by - R * 0.2;
  ctx.fillStyle = shade(k.body, 0.1);
  ctx.beginPath();
  ctx.arc(hx - R * 0.15, hy - R * 0.3, R * 0.17, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.3);
  ctx.fillStyle = alpha('#e8a6a8', 0.8);
  ctx.beginPath();
  ctx.arc(hx - R * 0.15, hy - R * 0.3, R * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.35, k.body);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.3, hy - R * 0.25);
  ctx.quadraticCurveTo(hx + R * 0.15, hy - R * 0.3, hx + R * 0.55, hy + R * 0.05);
  ctx.quadraticCurveTo(hx + R * 0.1, hy + R * 0.3, hx - R * 0.3, hy + R * 0.18);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = '#f4e9c8';
  ctx.fillRect(hx + R * 0.38, hy + R * 0.08, R * 0.07, R * 0.16);
  ctx.fillStyle = '#1a1414';
  ellipse(ctx, hx + R * 0.53, hy + R * 0.03, R * 0.06, R * 0.05);
  ctx.fill();
  evilEye(ctx, hx + R * 0.05, hy - R * 0.07, R * 0.08, k.eye);
}

export function wolf(ctx: Ctx, R: number, ph: number, k: Look): void {
  const gallop = Math.sin(ph);
  const by = -R * 0.98 - Math.abs(Math.sin(ph * 2)) * R * 0.05;
  const bw = R * 1.08;
  const bh = R * 0.46;
  const legLen = R * 0.85;
  const legs: [number, number][] = [
    [bw * 0.55, 0],
    [-bw * 0.55, Math.PI],
    [bw * 0.45, Math.PI],
    [-bw * 0.62, 0],
  ];
  for (let i = 2; i < 4; i++) {
    const [lx, off] = legs[i];
    leg(ctx, lx, by + bh * 0.4, Math.sin(ph + off) * 0.6, legLen, R * 0.18, shade(k.dark, -0.3), lx < 0 ? 0.35 : -0.25);
  }
  // bristling tail
  ctx.fillStyle = shade(k.dark, 0.05);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.8, by - bh * 0.25);
  ctx.lineTo(-bw * 1.35, by - bh * (0.9 + gallop * 0.25));
  ctx.lineTo(-bw * 1.25, by - bh * 0.45);
  ctx.lineTo(-bw * 1.7, by - bh * (0.4 + gallop * 0.2));
  ctx.lineTo(-bw * 1.2, by + bh * 0.05);
  ctx.lineTo(-bw * 0.8, by + bh * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  // body, deeper at the chest
  ctx.fillStyle = fill(ctx, 0, by, bw, k.body);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.9, by);
  ctx.quadraticCurveTo(-bw * 0.8, by - bh * 1.05, bw * 0.1, by - bh * 1.0);
  ctx.quadraticCurveTo(bw * 0.75, by - bh * 1.25, bw * 0.95, by - bh * 0.2);
  ctx.quadraticCurveTo(bw * 0.8, by + bh * 1.1, bw * 0.2, by + bh * 0.8);
  ctx.quadraticCurveTo(-bw * 0.6, by + bh * 0.7, -bw * 0.9, by);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  // raised hackles
  spikes(
    ctx,
    [
      [-bw * 0.7, by - bh * 0.75],
      [-bw * 0.4, by - bh * 0.98],
      [-bw * 0.05, by - bh * 1.02],
      [bw * 0.3, by - bh * 1.12],
      [bw * 0.62, by - bh * 1.05],
    ],
    R * 0.3,
    shade(k.dark, 0.1),
    0.55,
  );
  for (let i = 0; i < 2; i++) {
    const [lx, off] = legs[i];
    const [fx, fy] = leg(ctx, lx, by + bh * 0.4, Math.sin(ph + off) * 0.6, legLen, R * 0.2, shade(k.dark, 0.08), lx < 0 ? 0.35 : -0.25);
    if (i === 0) claws(ctx, fx, fy - R * 0.02, R * 0.12, 0.2);
  }
  // lowered head with open jaws
  const hx = bw * 1.05;
  const hy = by - bh * 0.15;
  const hr = R * 0.4;
  ctx.fillStyle = shade(k.dark, 0.1);
  for (const ex of [-0.25, 0.05]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex * R - hr * 0.3, hy - hr * 0.45);
    ctx.lineTo(hx + ex * R - hr * 0.35, hy - hr * 1.45);
    ctx.lineTo(hx + ex * R + hr * 0.25, hy - hr * 0.55);
    ctx.fill();
    outline(ctx, 1.5);
  }
  blob(ctx, hx, hy, hr, hr * 0.82, k.body, 0, 2);
  // upper jaw
  ctx.fillStyle = fill(ctx, hx + hr, hy, hr, shade(k.body, 0.05));
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.2, hy - hr * 0.35);
  ctx.lineTo(hx + hr * 1.75, hy + hr * 0.02);
  ctx.lineTo(hx + hr * 1.6, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 0.3, hy + hr * 0.3);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // lower jaw, hanging open
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.3, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.6, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.3, hy + hr * 0.75);
  ctx.lineTo(hx + hr * 0.3, hy + hr * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(k.body, -0.15);
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.25, hy + hr * 0.62);
  ctx.lineTo(hx + hr * 1.35, hy + hr * 0.72);
  ctx.lineTo(hx + hr * 1.2, hy + hr * 0.95);
  ctx.lineTo(hx + hr * 0.2, hy + hr * 0.85);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  fangs(ctx, hx + hr * 0.45, hy + hr * 0.3, hx + hr * 1.55, hy + hr * 0.3, 5, hr * 0.22);
  fangs(ctx, hx + hr * 0.45, hy + hr * 0.66, hx + hr * 1.25, hy + hr * 0.74, 3, hr * 0.18, -1);
  ctx.fillStyle = '#101014';
  ellipse(ctx, hx + hr * 1.72, hy - hr * 0.02, hr * 0.12, hr * 0.1);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, shade(k.dark, -0.2));
}

export function boar(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.95 - Math.abs(Math.sin(ph * 2)) * R * 0.04;
  const bw = R * 1.1;
  const bh = R * 0.7;
  const legLen = R * 0.6;
  for (const [lx, off] of [
    [bw * 0.45, Math.PI],
    [-bw * 0.6, 0],
  ] as const) {
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(Math.sin(ph + off) * 0.5) * legLen, by + bh * 0.4 + legLen, R * 0.26, shade(k.dark, -0.3));
  }
  // humped body, massive at the shoulders
  ctx.fillStyle = fill(ctx, bw * 0.1, by - bh * 0.2, bw, k.body);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.9, by + bh * 0.1);
  ctx.quadraticCurveTo(-bw * 0.95, by - bh * 0.8, -bw * 0.1, by - bh * 0.9);
  ctx.quadraticCurveTo(bw * 0.55, by - bh * 1.5, bw * 0.95, by - bh * 0.35);
  ctx.quadraticCurveTo(bw * 1.0, by + bh * 0.75, bw * 0.3, by + bh * 0.7);
  ctx.quadraticCurveTo(-bw * 0.6, by + bh * 0.7, -bw * 0.9, by + bh * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  spikes(
    ctx,
    [
      [-bw * 0.75, by - bh * 0.5],
      [-bw * 0.45, by - bh * 0.82],
      [-bw * 0.1, by - bh * 0.95],
      [bw * 0.25, by - bh * 1.15],
      [bw * 0.55, by - bh * 1.12],
      [bw * 0.8, by - bh * 0.75],
    ],
    R * 0.38,
    shade(k.dark, 0.05),
    0.6,
  );
  if (k.armored) {
    // riveted war-plates
    for (let i = 0; i < 3; i++) {
      const px = -bw * 0.55 + i * bw * 0.45;
      ctx.fillStyle = fill(ctx, px, by - bh * 0.25, bh * 0.5, '#8d9aab');
      roundRect(ctx, px - bw * 0.2, by - bh * 0.6, bw * 0.4, bh * 0.75, bh * 0.15);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.arc(px, by - bh * 0.25, bh * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const [lx, off] of [
    [bw * 0.55, 0],
    [-bw * 0.5, Math.PI],
  ] as const) {
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(Math.sin(ph + off) * 0.5) * legLen, by + bh * 0.4 + legLen, R * 0.28, shade(k.dark, 0.05));
  }
  // lowered head with long tusks
  const hx = bw * 0.98;
  const hy = by + bh * 0.05;
  const hr = R * 0.45;
  blob(ctx, hx, hy, hr, hr * 0.85, shade(k.body, -0.05), 0.2, 2);
  ctx.fillStyle = shade(k.dark, 0.25);
  ellipse(ctx, hx + hr * 0.85, hy + hr * 0.3, hr * 0.45, hr * 0.38);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#140d0d';
  ellipse(ctx, hx + hr * 1.18, hy + hr * 0.22, hr * 0.09, hr * 0.13);
  ctx.fill();
  for (const [s, w] of [
    [1, 4],
    [0.8, 3],
  ] as const) {
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    ctx.lineWidth = w + 2.5;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.7 * s, hy + hr * 0.6);
    ctx.quadraticCurveTo(hx + hr * 1.5, hy + hr * 0.7, hx + hr * 1.45 * s, hy - hr * 0.55);
    ctx.stroke();
    ctx.strokeStyle = BONE;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  evilEye(ctx, hx + hr * 0.2, hy - hr * 0.25, hr * 0.18, k.eye);
  brow(ctx, hx + hr * 0.2, hy - hr * 0.25, hr * 0.18, shade(k.dark, -0.1));
}

export function spider(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.72;
  const legOf = (i: number, side: number) => {
    const a = Math.sin(ph * 2 + i * 1.3 + side * Math.PI) * 0.35;
    const sx = -R * 0.2 + i * R * 0.18;
    const dir = i < 2 ? -1 : 1;
    const kneeX = sx + dir * R * 0.45 + Math.sin(a) * R * 0.2;
    const kneeY = by - R * (0.7 - Math.cos(a) * 0.1);
    const footX = sx + dir * R * 0.95 + Math.sin(a) * R * 0.35;
    const col = side === 0 ? shade(k.dark, -0.35) : k.dark;
    ctx.strokeStyle = 'rgba(8,14,28,0.85)';
    ctx.lineWidth = R * 0.1 + 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, by);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, 0);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = R * 0.1;
    ctx.stroke();
    ctx.fillStyle = alpha(k.eye, 0.8);
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, R * 0.04, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 4; i++) legOf(i, 0);
  // abdomen with a skull mark
  blob(ctx, -R * 0.55, by - R * 0.15, R * 0.7, R * 0.58, k.body);
  ctx.fillStyle = alpha(BONE, 0.8);
  ellipse(ctx, -R * 0.6, by - R * 0.3, R * 0.2, R * 0.17);
  ctx.fill();
  ctx.fillRect(-R * 0.69, by - R * 0.2, R * 0.18, R * 0.1);
  ctx.fillStyle = k.body;
  ellipse(ctx, -R * 0.66, by - R * 0.3, R * 0.05, R * 0.05);
  ctx.fill();
  ellipse(ctx, -R * 0.53, by - R * 0.3, R * 0.05, R * 0.05);
  ctx.fill();
  spikes(
    ctx,
    [
      [-R * 1.15, by - R * 0.2],
      [-R * 0.95, by - R * 0.55],
      [-R * 0.6, by - R * 0.72],
      [-R * 0.25, by - R * 0.6],
    ],
    R * 0.18,
    shade(k.dark, 0.1),
    0.5,
  );
  for (let i = 0; i < 4; i++) legOf(i, 1);
  // head with fangs and a cluster of eyes
  blob(ctx, R * 0.28, by, R * 0.38, R * 0.33, shade(k.body, -0.1));
  for (const s of [0, 1]) {
    ctx.fillStyle = s ? BONE : shade(BONE, -0.3);
    ctx.beginPath();
    const fx = R * (0.55 + s * 0.08);
    ctx.moveTo(fx, by + R * 0.05);
    ctx.quadraticCurveTo(fx + R * 0.3, by + R * 0.15, fx + R * 0.12, by + R * 0.48);
    ctx.lineTo(fx + R * 0.03, by + R * 0.2);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1);
  }
  const eyes: [number, number, number][] = [
    [0.44, -0.16, 0.07],
    [0.56, -0.1, 0.06],
    [0.36, -0.05, 0.05],
    [0.5, 0.0, 0.05],
    [0.3, -0.2, 0.045],
  ];
  for (const [ex, ey, er] of eyes) evilEye(ctx, R * ex, by + R * ey, R * er, k.eye);
}

export function crab(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.62;
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const a = Math.sin(ph * 2 + i + (side > 0 ? 1.5 : 0)) * 0.3;
      const sx = side * R * (0.35 + i * 0.18);
      const kx = sx + side * R * 0.3;
      const ky = by - R * 0.15;
      limb(ctx, sx, by + R * 0.1, kx, ky, R * 0.1, shade(k.dark, -0.2));
      limb(ctx, kx, ky, kx + side * R * 0.15 + Math.sin(a) * R * 0.15, 0, R * 0.08, shade(k.dark, -0.2));
    }
  }
  // raised, open pincers
  for (const side of [-1, 1]) {
    const lift = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * R * 0.12;
    const cx = side * R * 1.0;
    const cy = by - R * 0.85 - lift;
    limb(ctx, side * R * 0.55, by - R * 0.1, cx, cy + R * 0.25, R * 0.15, k.dark);
    for (const [rot, sc] of [
      [-0.5, 1],
      [0.35, 0.8],
    ] as const) {
      ctx.save();
      ctx.translate(cx, cy + R * 0.15);
      ctx.rotate(side * rot - (side > 0 ? 0.6 : Math.PI + 0.6) * 0 + (side > 0 ? -0.8 : -2.35));
      ctx.fillStyle = fill(ctx, R * 0.3, 0, R * 0.3, k.body);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.12 * sc);
      ctx.quadraticCurveTo(R * 0.45 * sc, -R * 0.25 * sc, R * 0.6 * sc, R * 0.02);
      ctx.quadraticCurveTo(R * 0.3 * sc, 0, 0, R * 0.12 * sc);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.6);
      ctx.restore();
    }
  }
  // spiked shell
  ctx.fillStyle = fill(ctx, 0, by, R, k.body);
  ctx.beginPath();
  ctx.ellipse(0, by, R * 0.88, R * 0.5, 0, Math.PI, 0);
  ctx.quadraticCurveTo(R * 0.7, by + R * 0.35, 0, by + R * 0.32);
  ctx.quadraticCurveTo(-R * 0.7, by + R * 0.35, -R * 0.88, by);
  ctx.fill();
  outline(ctx, 2.2);
  const rim: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    rim.push([Math.cos(a) * R * 0.86, by + Math.sin(a) * R * 0.48]);
  }
  spikes(ctx, rim, R * 0.28, shade(k.body, 0.25), 0);
  ctx.fillStyle = alpha(shade(k.body, -0.4), 0.7);
  ellipse(ctx, 0, by - R * 0.15, R * 0.4, R * 0.14);
  ctx.fill();
  // eye stalks
  for (const s of [-0.2, 0.2]) {
    limb(ctx, s * R, by - R * 0.3, s * R * 1.3, by - R * 0.72, 2.5, k.dark);
    evilEye(ctx, s * R * 1.3 + R * 0.02, by - R * 0.75, R * 0.07, k.eye);
  }
  ctx.fillStyle = MAW;
  ellipse(ctx, R * 0.05, by + R * 0.12, R * 0.25, R * 0.08);
  ctx.fill();
  fangs(ctx, -R * 0.15, by + R * 0.08, R * 0.25, by + R * 0.08, 4, R * 0.08);
}

export function beetle(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.62;
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(ph * 2 + i * 2) * 0.4;
    const sx = -R * 0.4 + i * R * 0.42;
    limb(ctx, sx, by, sx + Math.sin(a) * R * 0.3 + R * 0.05, 0, R * 0.1, shade(k.dark, -0.25));
  }
  blob(ctx, -R * 0.08, by - R * 0.05, R * 0.88, R * 0.54, k.body);
  ctx.strokeStyle = shade(k.dark, -0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.95, by - R * 0.05);
  ctx.quadraticCurveTo(-R * 0.1, by - R * 0.2, R * 0.62, by - R * 0.1);
  ctx.stroke();
  // glowing crystal spikes on the shell
  for (let i = 0; i < 4; i++) {
    const x = -R * 0.7 + i * R * 0.38;
    const h = R * (0.42 + (i % 2) * 0.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, by - R * 0.5 - h * 0.5, h * 0.9, k.eye, 0.35);
    ctx.restore();
    ctx.fillStyle = shade(k.eye, 0.35);
    ctx.beginPath();
    ctx.moveTo(x - R * 0.1, by - R * 0.42);
    ctx.lineTo(x - R * 0.02 - i * R * 0.02, by - R * 0.42 - h);
    ctx.lineTo(x + R * 0.1, by - R * 0.42);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
  // head with a horn and mandibles
  blob(ctx, R * 0.78, by + R * 0.04, R * 0.32, R * 0.27, k.dark, 0, 1.8);
  ctx.fillStyle = shade(k.dark, 0.3);
  ctx.beginPath();
  ctx.moveTo(R * 0.9, by - R * 0.18);
  ctx.quadraticCurveTo(R * 1.3, by - R * 0.4, R * 1.28, by - R * 0.85);
  ctx.lineTo(R * 1.1, by - R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  for (const [dy, s] of [
    [0.1, 1],
    [0.22, -1],
  ] as const) {
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(R * 1.02, by + R * dy);
    ctx.quadraticCurveTo(R * 1.35, by + R * (dy + 0.05 * s), R * 1.25, by + R * (dy + 0.2 * s));
    ctx.stroke();
  }
  evilEye(ctx, R * 0.88, by - R * 0.02, R * 0.08, k.eye);
}

export function hydra(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.45;
  // coiled serpent body
  blob(ctx, -R * 0.2, by, R * 0.95, R * 0.42, k.body);
  ctx.strokeStyle = alpha(shade(k.dark, 0.1), 0.8);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-R * 0.6 + i * R * 0.3, by + R * 0.1, R * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  spikes(
    ctx,
    [
      [-R * 1.05, by],
      [-R * 0.75, by - R * 0.35],
      [-R * 0.35, by - R * 0.42],
      [R * 0.05, by - R * 0.4],
    ],
    R * 0.25,
    k.dark,
    0.5,
  );
  // three necks, each with a snapping head
  const heads: [number, number, number][] = [
    [-0.15, 1.35, 0.2],
    [0.45, 1.05, 1.4],
    [0.25, 1.65, 2.6],
  ];
  for (const [nx, h, off] of heads) {
    const sway = Math.sin(ph + off) * R * 0.12;
    const x0 = R * nx;
    const hx = x0 + R * 0.45 + sway;
    const hy = by - R * h;
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    ctx.lineWidth = R * 0.24 + 3;
    ctx.beginPath();
    ctx.moveTo(x0, by - R * 0.1);
    ctx.quadraticCurveTo(x0 - R * 0.2, by - R * h * 0.6, hx - R * 0.1, hy);
    ctx.stroke();
    ctx.strokeStyle = shade(k.body, -0.05);
    ctx.lineWidth = R * 0.24;
    ctx.stroke();
    const hr = R * 0.24;
    ctx.fillStyle = fill(ctx, hx, hy, hr, k.body);
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.8, hy - hr * 0.5);
    ctx.lineTo(hx + hr * 1.5, hy - hr * 0.1);
    ctx.lineTo(hx + hr * 1.35, hy + hr * 0.15);
    ctx.lineTo(hx - hr * 0.6, hy + hr * 0.5);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.6);
    ctx.fillStyle = MAW;
    ctx.beginPath();
    ctx.moveTo(hx, hy + hr * 0.1);
    ctx.lineTo(hx + hr * 1.35, hy + hr * 0.15);
    ctx.lineTo(hx + hr * 1.1, hy + hr * 0.7);
    ctx.closePath();
    ctx.fill();
    fangs(ctx, hx + hr * 0.3, hy + hr * 0.1, hx + hr * 1.3, hy + hr * 0.15, 3, hr * 0.3);
    ctx.fillStyle = k.dark;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.5, hy - hr * 0.4);
    ctx.lineTo(hx - hr * 1.2, hy - hr * 1.0);
    ctx.lineTo(hx - hr * 0.1, hy - hr * 0.45);
    ctx.fill();
    evilEye(ctx, hx + hr * 0.35, hy - hr * 0.2, hr * 0.2, k.eye);
  }
}
