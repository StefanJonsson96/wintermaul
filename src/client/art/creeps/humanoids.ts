// Ghouls, kobolds, imps, trolls, giants, knights and the Winter Tyrant.
import { alpha, ellipse, glow, outline, roundRect, shade, type Ctx } from '../util';
import { Look, BONE, MAW, evilEye, brow, fangs, spikes, claws, limb, leg, fill, blob, crown, weaponClub } from './parts';

export function ghoul(ctx: Ctx, R: number, ph: number, k: Look, antlers: boolean): void {
  const sw = Math.sin(ph) * 0.6;
  const bob = Math.abs(Math.cos(ph)) * R * 0.08;
  const hipX = -R * 0.2;
  const hipY = -R * 0.95 - bob;
  const shX = R * 0.3;
  const shY = -R * 1.72 - bob;
  const skin = k.body;
  leg(ctx, hipX, hipY, -sw, R * 1.02, R * 0.2, shade(skin, -0.45), 0.4);
  // far arm dangles forward
  limb(ctx, shX - R * 0.05, shY + R * 0.1, shX + R * 0.45 - sw * R * 0.2, shY + R * 0.85, R * 0.15, shade(skin, -0.45));
  claws(ctx, shX + R * 0.45 - sw * R * 0.2, shY + R * 0.85, R * 0.22, 1.2);
  // hunched torso with ribs and a spine ridge
  const ang = Math.atan2(shY - hipY, shX - hipX);
  const cx = (hipX + shX) / 2;
  const cy = (hipY + shY) / 2;
  blob(ctx, cx, cy, R * 0.55, R * 0.36, skin, ang);
  ctx.strokeStyle = alpha(k.dark, 0.7);
  ctx.lineWidth = Math.max(1.2, R * 0.05);
  for (let i = 0; i < 3; i++) {
    const t = -0.2 + i * 0.25;
    const rx = cx + Math.cos(ang) * R * t;
    const ry = cy + Math.sin(ang) * R * t;
    ctx.beginPath();
    ctx.moveTo(rx - R * 0.08, ry - R * 0.2);
    ctx.quadraticCurveTo(rx + R * 0.12, ry, rx - R * 0.02, ry + R * 0.28);
    ctx.stroke();
  }
  const back: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    const t = -0.45 + i * 0.22;
    back.push([cx + Math.cos(ang) * R * t - Math.sin(ang) * -R * 0.33, cy + Math.sin(ang) * R * t + Math.cos(ang) * -R * 0.33]);
  }
  spikes(ctx, back, R * 0.2, shade(skin, -0.25), 0.5);
  // ragged loincloth
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(hipX - R * 0.35, hipY - R * 0.12);
  ctx.lineTo(hipX + R * 0.3, hipY - R * 0.05);
  ctx.lineTo(hipX + R * 0.2, hipY + R * 0.35);
  ctx.lineTo(hipX + R * 0.02, hipY + R * 0.22);
  ctx.lineTo(hipX - R * 0.12, hipY + R * 0.4);
  ctx.lineTo(hipX - R * 0.28, hipY + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.5);
  leg(ctx, hipX + R * 0.1, hipY, sw, R * 1.02, R * 0.22, shade(skin, -0.15), 0.4);
  // head: bald, jutting jaw, pointed ear
  const hx = shX + R * 0.38;
  const hy = shY - R * 0.12;
  const hr = R * 0.33;
  if (antlers) {
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    for (const [w, col] of [
      [R * 0.12 + 3, 'rgba(8,14,28,0.8)'],
      [R * 0.12, '#d8cdb4'],
    ] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      for (const side of [-1, 1]) {
        const bx = hx - hr * 0.2 + side * hr * 0.25;
        ctx.beginPath();
        ctx.moveTo(bx, hy - hr * 0.7);
        ctx.quadraticCurveTo(bx - hr * 0.6, hy - hr * 2.2, bx - hr * 1.4 + side * hr * 0.3, hy - hr * 2.9);
        ctx.moveTo(bx - hr * 0.45, hy - hr * 1.75);
        ctx.lineTo(bx + hr * 0.35, hy - hr * 2.55);
        ctx.moveTo(bx - hr * 0.95, hy - hr * 2.45);
        ctx.lineTo(bx - hr * 0.55, hy - hr * 3.1);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = shade(skin, -0.2);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.6, hy - hr * 0.2);
  ctx.lineTo(hx - hr * 1.5, hy - hr * 0.95);
  ctx.lineTo(hx - hr * 0.35, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  blob(ctx, hx, hy, hr, hr * 0.92, antlers ? '#d8d0c0' : skin, 0, 2);
  // hanging jaw with fangs
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.05, hy + hr * 0.25);
  ctx.lineTo(hx + hr * 0.85, hy + hr * 0.95);
  ctx.lineTo(hx + hr * 0.05, hy + hr * 0.75);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx + hr * 0.2, hy + hr * 0.3, hx + hr * 1.0, hy + hr * 0.27, 4, hr * 0.28);
  fangs(ctx, hx + hr * 0.15, hy + hr * 0.78, hx + hr * 0.85, hy + hr * 0.92, 3, hr * 0.22, -1);
  if (antlers) {
    // bare skull face
    ctx.fillStyle = '#0b0a10';
    ellipse(ctx, hx + hr * 0.35, hy - hr * 0.2, hr * 0.32, hr * 0.26);
    ctx.fill();
  }
  evilEye(ctx, hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, k.eye);
  brow(ctx, hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, shade(skin, -0.5));
  // near arm reaching out, claws first
  const ax = shX + R * 0.1;
  const ay = shY + R * 0.15;
  const ex = ax + R * 0.75 + sw * R * 0.15;
  const ey = ay + R * 0.35;
  limb(ctx, ax, ay, ex, ey, R * 0.17, shade(skin, -0.1));
  claws(ctx, ex, ey, R * 0.26, 0.5);
}

export function kobold(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.55;
  const bob = Math.abs(Math.cos(ph)) * R * 0.06;
  const hipY = -R * 0.8 - bob;
  const shY = -R * 1.6 - bob;
  leg(ctx, -R * 0.12, hipY, -sw, R * 0.84, R * 0.22, shade(k.dark, -0.2), 0.3);
  // round shield on the far arm, with a spike
  ctx.fillStyle = fill(ctx, -R * 0.35, shY + R * 0.45, R * 0.45, '#6b4a32');
  ellipse(ctx, -R * 0.38, shY + R * 0.45, R * 0.36, R * 0.44);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#b8c2cc';
  ellipse(ctx, -R * 0.38, shY + R * 0.45, R * 0.1, R * 0.12);
  ctx.fill();
  ctx.strokeStyle = alpha('#2a1a10', 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.38, shY + R * 0.05);
  ctx.lineTo(-R * 0.38, shY + R * 0.85);
  ctx.stroke();
  // torso in studded leather
  blob(ctx, 0, (hipY + shY) / 2, R * 0.42, R * 0.48, k.body);
  ctx.fillStyle = shade(k.dark, 0.1);
  ctx.fillRect(-R * 0.38, hipY - R * 0.18, R * 0.76, R * 0.14);
  ctx.fillStyle = '#c8ccd2';
  for (let i = 0; i < 3; i++) ctx.fillRect(-R * 0.22 + i * R * 0.2, shY + R * 0.3, R * 0.06, R * 0.06);
  leg(ctx, R * 0.12, hipY, sw, R * 0.84, R * 0.22, k.dark, 0.3);
  // snouted head with spiked cap
  const hx = R * 0.22;
  const hy = shY - R * 0.28;
  const hr = R * 0.36;
  ctx.fillStyle = shade(k.body, -0.15);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.4, hy - hr * 0.3);
  ctx.lineTo(hx - hr * 1.5, hy - hr * 1.1);
  ctx.lineTo(hx - hr * 0.6, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  blob(ctx, hx, hy, hr, hr * 0.9, k.body, 0, 2);
  blob(ctx, hx + hr * 0.95, hy + hr * 0.25, hr * 0.62, hr * 0.36, shade(k.body, -0.05), 0.1, 1.6);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.5, hy + hr * 0.42);
  ctx.lineTo(hx + hr * 1.55, hy + hr * 0.38);
  ctx.lineTo(hx + hr * 1.35, hy + hr * 0.62);
  ctx.lineTo(hx + hr * 0.6, hy + hr * 0.62);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx + hr * 0.6, hy + hr * 0.42, hx + hr * 1.45, hy + hr * 0.4, 4, hr * 0.18);
  ctx.fillStyle = '#1a1414';
  ellipse(ctx, hx + hr * 1.52, hy + hr * 0.1, hr * 0.1, hr * 0.08);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.12, hr * 0.2, k.eye);
  // iron cap with a spike
  ctx.fillStyle = fill(ctx, hx, hy - hr * 0.5, hr, '#8e97a3');
  ctx.beginPath();
  ctx.arc(hx, hy - hr * 0.15, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#cfd6de';
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.15, hy - hr * 1.05);
  ctx.lineTo(hx - hr * 0.3, hy - hr * 1.75);
  ctx.lineTo(hx + hr * 0.18, hy - hr * 1.05);
  ctx.fill();
  outline(ctx, 1.2);
  // spear thrust forward
  const ax = R * 0.2;
  const ay = shY + R * 0.2;
  const ex = ax + R * 0.45;
  const ey = ay + R * 0.45;
  limb(ctx, ax, ay, ex, ey, R * 0.17, shade(k.body, -0.1));
  const tx = ex + R * 1.1;
  const ty = ey - R * 0.55 + sw * R * 0.1;
  limb(ctx, ex - R * 0.5, ey + R * 0.25, tx, ty, Math.max(2, R * 0.07), '#7a5634');
  ctx.fillStyle = '#d6dde6';
  ctx.beginPath();
  const a = Math.atan2(ty - ey, tx - ex);
  ctx.moveTo(tx + Math.cos(a) * R * 0.45, ty + Math.sin(a) * R * 0.45);
  ctx.lineTo(tx + Math.cos(a + 1.9) * R * 0.14, ty + Math.sin(a + 1.9) * R * 0.14);
  ctx.lineTo(tx + Math.cos(a) * R * 0.1, ty + Math.sin(a) * R * 0.1);
  ctx.lineTo(tx + Math.cos(a - 1.9) * R * 0.14, ty + Math.sin(a - 1.9) * R * 0.14);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
}

export function imp(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.8;
  const bob = Math.abs(Math.cos(ph)) * R * 0.12;
  const hipY = -R * 0.75 - bob;
  const shY = -R * 1.35 - bob;
  // barbed tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.1 + 3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, hipY);
  ctx.bezierCurveTo(-R * 1.0, hipY + R * 0.2, -R * 0.9, hipY - R * (0.9 + Math.sin(ph) * 0.2), -R * 1.35, hipY - R * 0.8);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.1;
  ctx.stroke();
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 1.35, hipY - R * 0.8);
  ctx.lineTo(-R * 1.62, hipY - R * 0.62);
  ctx.lineTo(-R * 1.5, hipY - R * 1.05);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
  // little bat wings
  for (const [s, col] of [
    [-0.25, shade(k.dark, -0.2)],
    [0, k.dark],
  ] as const) {
    ctx.save();
    ctx.translate(-R * 0.1 + s * R, shY + R * 0.1);
    ctx.rotate(-0.5 - Math.sin(ph * 2) * 0.25);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-R * 0.3, -R * 0.9);
    ctx.lineTo(-R * 0.5, -R * 0.5);
    ctx.lineTo(-R * 0.85, -R * 0.55);
    ctx.lineTo(-R * 0.75, -R * 0.2);
    ctx.lineTo(-R * 0.95, -R * 0.05);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.4);
    ctx.restore();
  }
  leg(ctx, -R * 0.1, hipY, -sw, R * 0.84, R * 0.16, shade(k.body, -0.35), 0.5);
  blob(ctx, R * 0.05, (hipY + shY) / 2, R * 0.36, R * 0.38, k.body, 0.3);
  leg(ctx, R * 0.1, hipY, sw, R * 0.84, R * 0.17, shade(k.body, -0.1), 0.5);
  // big grinning head with horns
  const hx = R * 0.32;
  const hy = shY - R * 0.3;
  const hr = R * 0.4;
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? shade(k.dark, -0.3) : k.dark;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.35 + side * hr * 0.2, hy - hr * 0.6);
    ctx.quadraticCurveTo(hx - hr * 0.5 + side * hr * 0.2, hy - hr * 1.5, hx + hr * 0.35 + side * hr * 0.2, hy - hr * 1.55);
    ctx.quadraticCurveTo(hx - hr * 0.05 + side * hr * 0.2, hy - hr * 1.1, hx + hr * 0.05 + side * hr * 0.2, hy - hr * 0.7);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.3);
  }
  ctx.fillStyle = shade(k.body, -0.1);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy - hr * 0.1);
  ctx.lineTo(hx - hr * 1.45, hy - hr * 0.45);
  ctx.lineTo(hx - hr * 0.55, hy + hr * 0.3);
  ctx.fill();
  outline(ctx, 1.3);
  blob(ctx, hx, hy, hr, hr * 0.88, k.body, 0, 2);
  // wide grin
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.1, hy + hr * 0.25);
  ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.75, hx + hr * 1.0, hy + hr * 0.12);
  ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.35, hx - hr * 0.1, hy + hr * 0.25);
  ctx.fill();
  fangs(ctx, hx, hy + hr * 0.3, hx + hr * 0.9, hy + hr * 0.18, 5, hr * 0.15);
  evilEye(ctx, hx + hr * 0.42, hy - hr * 0.2, hr * 0.22, k.eye);
  brow(ctx, hx + hr * 0.42, hy - hr * 0.2, hr * 0.22, shade(k.body, -0.55));
  const ax = R * 0.2;
  const ay = shY + R * 0.12;
  limb(ctx, ax, ay, ax + R * 0.55, ay + R * 0.2 - sw * R * 0.1, R * 0.13, shade(k.body, -0.05));
  claws(ctx, ax + R * 0.55, ay + R * 0.2 - sw * R * 0.1, R * 0.2, -0.2);
}

export function troll(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.5;
  const bob = Math.abs(Math.cos(ph)) * R * 0.06;
  const hipY = -R * 0.95 - bob;
  const shY = -R * 1.85 - bob;
  const tw = R * 1.05;
  leg(ctx, -R * 0.15, hipY, -sw, R * 0.98, R * 0.28, shade(k.dark, -0.2), 0.3);
  limb(ctx, -R * 0.05, shY + R * 0.2, R * 0.2 + sw * R * 0.3, shY + R * 1.3, R * 0.24, shade(k.body, -0.4));
  claws(ctx, R * 0.2 + sw * R * 0.3, shY + R * 1.3, R * 0.24, 1.4);
  // hunched torso
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.body);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.4, hipY);
  ctx.quadraticCurveTo(-tw * 0.75, (hipY + shY) / 2, -tw * 0.2, shY - R * 0.15);
  ctx.quadraticCurveTo(tw * 0.4, shY - R * 0.35, tw * 0.62, shY + R * 0.1);
  ctx.quadraticCurveTo(tw * 0.55, (hipY + shY) / 2, tw * 0.38, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  // war paint
  ctx.strokeStyle = alpha(k.eye, 0.55);
  ctx.lineWidth = Math.max(1.5, R * 0.06);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-tw * 0.1 + i * tw * 0.18, shY + R * 0.25);
    ctx.lineTo(-tw * 0.2 + i * tw * 0.18, shY + R * 0.55);
    ctx.stroke();
  }
  if (k.boss) {
    // bone armor for the warlord
    ctx.fillStyle = fill(ctx, -tw * 0.2, shY, R * 0.4, BONE);
    ctx.beginPath();
    ctx.arc(-tw * 0.15, shY + R * 0.05, R * 0.38, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.6);
    spikes(
      ctx,
      [
        [-tw * 0.5, shY + R * 0.05],
        [-tw * 0.3, shY - R * 0.25],
        [-tw * 0.05, shY - R * 0.3],
        [tw * 0.2, shY - R * 0.15],
      ],
      R * 0.35,
      BONE,
    );
  }
  ctx.fillStyle = shade(k.dark, -0.1);
  ctx.fillRect(-tw * 0.4, hipY - R * 0.2, tw * 0.8, R * 0.18);
  leg(ctx, R * 0.15, hipY, sw, R * 0.98, R * 0.3, k.dark, 0.3);
  // head thrust forward
  const hx = tw * 0.55;
  const hy = shY - R * 0.05;
  const hr = R * 0.36;
  spikes(
    ctx,
    [
      [hx - hr * 1.0, hy - hr * 0.1],
      [hx - hr * 0.7, hy - hr * 0.75],
      [hx - hr * 0.2, hy - hr * 1.0],
      [hx + hr * 0.3, hy - hr * 0.85],
    ],
    hr * 0.9,
    shade(k.eye, -0.35),
    0.8,
  );
  blob(ctx, hx, hy, hr, hr * 0.9, k.body, 0, 2);
  ctx.fillStyle = shade(k.body, -0.1);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.4, hy - hr * 0.2);
  ctx.lineTo(hx - hr * 1.6, hy - hr * 0.65);
  ctx.lineTo(hx - hr * 0.55, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  // underbite with tusks
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1, hy + hr * 0.35);
  ctx.lineTo(hx + hr * 1.05, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 0.95, hy + hr * 0.6);
  ctx.lineTo(hx + hr * 0.15, hy + hr * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BONE;
  for (const tx of [0.35, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(hx + hr * tx - hr * 0.1, hy + hr * 0.6);
    ctx.lineTo(hx + hr * tx + hr * 0.12, hy - hr * 0.05);
    ctx.lineTo(hx + hr * tx + hr * 0.12, hy + hr * 0.6);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1);
  }
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, shade(k.body, -0.55));
  if (k.boss) crown(ctx, hx - hr * 0.05, hy - hr * 0.72, hr * 1.5, hr * 0.7, '#c9b27a', 3);
  // weapon arm
  const ax = R * 0.25;
  const ay = shY + R * 0.25;
  const ex = ax + R * 0.35;
  const ey = ay + R * 0.7;
  limb(ctx, ax, ay, ex, ey, R * 0.26, shade(k.body, -0.1));
  if (k.boss) {
    // great axe
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(-1.1 + Math.sin(ph) * 0.15);
    ctx.fillStyle = '#5a3d26';
    ctx.fillRect(-R * 0.3, -R * 0.06, R * 1.9, R * 0.12);
    ctx.fillStyle = fill(ctx, R * 1.5, 0, R * 0.5, '#aeb8c4');
    ctx.beginPath();
    ctx.moveTo(R * 1.25, -R * 0.08);
    ctx.quadraticCurveTo(R * 1.35, -R * 0.75, R * 1.85, -R * 0.7);
    ctx.quadraticCurveTo(R * 1.6, 0, R * 1.85, R * 0.7);
    ctx.quadraticCurveTo(R * 1.35, R * 0.75, R * 1.25, R * 0.08);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.8);
    ctx.restore();
  } else weaponClub(ctx, ex, ey, R * 1.2, R * 0.28, -1.0 + Math.sin(ph) * 0.2, '#6b4a2e', BONE);
}

export function giant(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.45;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 1.0 - bob;
  const shY = -R * 2.05 - bob;
  const tw = R * 1.15;
  leg(ctx, -R * 0.2, hipY, -sw, R * 1.03, R * 0.34, shade(k.body, -0.45), 0.25);
  limb(ctx, -tw * 0.35, shY + R * 0.25, -tw * 0.3 + sw * R * 0.3, shY + R * 1.2, R * 0.28, shade(k.body, -0.4));
  // torso with fur loincloth
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.body);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.42, hipY);
  ctx.quadraticCurveTo(-tw * 0.68, (hipY + shY) / 2, -tw * 0.5, shY);
  ctx.lineTo(tw * 0.5, shY);
  ctx.quadraticCurveTo(tw * 0.68, (hipY + shY) / 2, tw * 0.42, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  ctx.strokeStyle = alpha(k.dark, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.2, shY + R * 0.3);
  ctx.quadraticCurveTo(0, shY + R * 0.5, tw * 0.2, shY + R * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#5b4a3c';
  ctx.beginPath();
  ctx.moveTo(-tw * 0.46, hipY - R * 0.2);
  ctx.lineTo(tw * 0.46, hipY - R * 0.2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(tw * 0.46 - (i * tw * 0.92) / 6, hipY + R * (i % 2 ? 0.28 : 0.12));
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // ice pauldrons
  for (const side of [-1, 1]) {
    const px = side * tw * 0.45;
    blob(ctx, px, shY + R * 0.08, R * 0.34, R * 0.26, k.dark, 0, 1.8);
    spikes(
      ctx,
      [
        [px - R * 0.32, shY + R * 0.05],
        [px - R * 0.1, shY - R * 0.2],
        [px + R * 0.12, shY - R * 0.2],
        [px + R * 0.33, shY + R * 0.05],
      ],
      R * 0.4,
      shade(k.eye, 0.35),
      0.1,
    );
  }
  leg(ctx, R * 0.2, hipY, sw, R * 1.03, R * 0.36, shade(k.body, -0.2), 0.25);
  // head: heavy brow, icicle beard, crown of ice
  const hx = R * 0.18;
  const hy = shY - R * 0.4;
  const hr = R * 0.38;
  blob(ctx, hx, hy, hr, hr, k.body, 0, 2);
  ctx.fillStyle = shade(k.eye, 0.5);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy + hr * 0.25);
  for (let i = 0; i <= 6; i++) {
    const px = hx - hr * 0.5 + (i * hr * 1.5) / 6;
    ctx.lineTo(px, hy + hr * (i % 2 ? 0.55 : 1.35 - i * 0.08));
  }
  ctx.lineTo(hx + hr * 1.0, hy + hr * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  ctx.fillStyle = MAW;
  ellipse(ctx, hx + hr * 0.55, hy + hr * 0.38, hr * 0.28, hr * 0.12);
  ctx.fill();
  fangs(ctx, hx + hr * 0.3, hy + hr * 0.3, hx + hr * 0.8, hy + hr * 0.3, 3, hr * 0.15);
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.15, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.15, hr * 0.2, shade(k.body, -0.6));
  crown(ctx, hx - hr * 0.05, hy - hr * 0.7, hr * 1.9, hr * 0.9, shade(k.eye, 0.4), 4);
  // near arm raising an ice-spiked club
  const ax = tw * 0.4;
  const ay = shY + R * 0.3;
  const ex = ax + R * 0.2;
  const ey = ay + R * 0.75;
  limb(ctx, ax, ay, ex, ey, R * 0.3, shade(k.body, -0.1));
  weaponClub(ctx, ex, ey, R * 1.5, R * 0.34, -1.25 + Math.sin(ph) * 0.18, shade(k.dark, 0.1), shade(k.eye, 0.45));
}

export function knight(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.45;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 1.0 - bob;
  const shY = -R * 2.0 - bob;
  const tw = R * 0.9;
  const plate = k.body;
  // tattered cape
  ctx.fillStyle = shade(k.dark, -0.1);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.35, shY + R * 0.05);
  ctx.quadraticCurveTo(-tw * 1.2, hipY, -tw * (1.2 + Math.sin(ph) * 0.1), -R * 0.25);
  for (let i = 0; i < 4; i++) ctx.lineTo(-tw * (1.05 - i * 0.28), -R * (i % 2 ? 0.45 : 0.15));
  ctx.lineTo(tw * 0.1, hipY + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  leg(ctx, -R * 0.15, hipY, -sw, R * 1.02, R * 0.28, shade(plate, -0.45), 0.2);
  // sword arm behind
  const sx = -R * 0.2;
  const sy = shY + R * 0.2;
  limb(ctx, sx, sy, sx - R * 0.3, sy + R * 0.6, R * 0.22, shade(plate, -0.35));
  ctx.save();
  ctx.translate(sx - R * 0.3, sy + R * 0.6);
  ctx.rotate(-2.3 + Math.sin(ph) * 0.12);
  ctx.fillStyle = '#c9d2dc';
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.07);
  ctx.lineTo(R * 1.45, -R * 0.05);
  ctx.lineTo(R * 1.65, 0);
  ctx.lineTo(R * 1.45, R * 0.05);
  ctx.lineTo(0, R * 0.07);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  ctx.fillStyle = '#3a3040';
  ctx.fillRect(-R * 0.05, -R * 0.22, R * 0.1, R * 0.44);
  ctx.restore();
  // breastplate
  const g = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
  g.addColorStop(0, shade(plate, -0.45));
  g.addColorStop(0.45, shade(plate, 0.15));
  g.addColorStop(1, shade(plate, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, hipY);
  ctx.lineTo(-tw * 0.55, shY + R * 0.05);
  ctx.lineTo(tw * 0.55, shY + R * 0.05);
  ctx.lineTo(tw * 0.45, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  ctx.fillStyle = k.dark;
  ctx.fillRect(-tw * 0.46, hipY - R * 0.2, tw * 0.92, R * 0.16);
  // spiked pauldron
  blob(ctx, tw * 0.3, shY + R * 0.1, R * 0.36, R * 0.24, shade(plate, -0.1), 0, 1.8);
  spikes(
    ctx,
    [
      [tw * 0.3 - R * 0.34, shY + R * 0.05],
      [tw * 0.3 - R * 0.1, shY - R * 0.12],
      [tw * 0.3 + R * 0.12, shY - R * 0.12],
      [tw * 0.3 + R * 0.35, shY + R * 0.05],
    ],
    R * (k.armored ? 0.45 : 0.3),
    shade(plate, 0.25),
    0.15,
  );
  leg(ctx, R * 0.15, hipY, sw, R * 1.02, R * 0.3, shade(plate, -0.25), 0.2);
  // great helm with a glowing slit
  const hx = R * 0.12;
  const hy = shY - R * 0.38;
  const hr = R * 0.36;
  ctx.fillStyle = fill(ctx, hx, hy, hr, shade(plate, 0.05));
  roundRect(ctx, hx - hr * 0.85, hy - hr * 0.9, hr * 1.8, hr * 1.85, hr * 0.45);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#07090f';
  ctx.fillRect(hx - hr * 0.2, hy - hr * 0.2, hr * 1.1, hr * 0.26);
  ctx.fillRect(hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, hr * 0.75);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, hx + hr * 0.45, hy - hr * 0.07, hr * 1.2, k.eye, 0.9);
  ctx.restore();
  ctx.fillStyle = shade(k.eye, 0.5);
  ctx.fillRect(hx - hr * 0.05, hy - hr * 0.13, hr * 0.85, hr * 0.12);
  // horns of black iron
  for (const side of [0, 1]) {
    ctx.fillStyle = side ? '#2a2630' : '#1c1a22';
    ctx.beginPath();
    const bx = hx - hr * (0.3 + side * 0.35);
    ctx.moveTo(bx, hy - hr * 0.8);
    ctx.quadraticCurveTo(bx - hr * 0.2, hy - hr * 1.7, bx + hr * 0.5, hy - hr * 2.0);
    ctx.quadraticCurveTo(bx + hr * 0.1, hy - hr * 1.5, bx + hr * 0.3, hy - hr * 0.85);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
  // kite shield in front with a skull
  const shx = R * 0.55;
  const shy = shY + R * 0.35;
  ctx.fillStyle = fill(ctx, shx + R * 0.2, shy + R * 0.4, R * 0.6, shade(k.dark, 0.15));
  ctx.beginPath();
  ctx.moveTo(shx, shy);
  ctx.lineTo(shx + R * 0.62, shy);
  ctx.lineTo(shx + R * 0.62, shy + R * 0.75);
  ctx.quadraticCurveTo(shx + R * 0.45, shy + R * 1.15, shx + R * 0.31, shy + R * 1.3);
  ctx.quadraticCurveTo(shx + R * 0.1, shy + R * 1.15, shx, shy + R * 0.75);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  ctx.strokeStyle = alpha('#d8dee8', 0.7);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const skx = shx + R * 0.31;
  const sky = shy + R * 0.5;
  ctx.fillStyle = BONE;
  ellipse(ctx, skx, sky, R * 0.17, R * 0.15);
  ctx.fill();
  ctx.fillRect(skx - R * 0.09, sky + R * 0.08, R * 0.18, R * 0.12);
  ctx.fillStyle = '#120c14';
  ellipse(ctx, skx - R * 0.07, sky, R * 0.05, R * 0.05);
  ctx.fill();
  ellipse(ctx, skx + R * 0.07, sky, R * 0.05, R * 0.05);
  ctx.fill();
  if (k.armored) {
    spikes(
      ctx,
      [
        [shx + R * 0.62, shy + R * 0.1],
        [shx + R * 0.62, shy + R * 0.45],
        [shx + R * 0.62, shy + R * 0.8],
      ],
      R * 0.3,
      '#cfd6de',
      -0.6,
    );
  }
}

export function tyrant(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.35;
  const bob = Math.abs(Math.cos(ph)) * R * 0.04;
  const hipY = -R * 1.05 - bob;
  const shY = -R * 2.1 - bob;
  const tw = R * 1.15;
  // storm cape
  ctx.fillStyle = shade(k.dark, -0.25);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, shY);
  ctx.quadraticCurveTo(-tw * 1.5, hipY - R * 0.2, -tw * (1.45 + Math.sin(ph) * 0.1), -R * 0.1);
  for (let i = 0; i < 6; i++) ctx.lineTo(-tw * (1.3 - i * 0.28), -R * (i % 2 ? 0.35 : 0.02));
  ctx.lineTo(tw * 0.2, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = alpha(k.eye, 0.35);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.4, shY + R * 0.1);
  ctx.quadraticCurveTo(-tw * 1.2, hipY, -tw * 1.3, -R * 0.2);
  ctx.lineTo(-tw * 1.15, -R * 0.15);
  ctx.quadraticCurveTo(-tw * 1.0, hipY, -tw * 0.3, shY + R * 0.3);
  ctx.closePath();
  ctx.fill();
  leg(ctx, -R * 0.2, hipY, -sw, R * 1.08, R * 0.36, shade(k.body, -0.5), 0.2);
  // dark plate armor
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.dark);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, hipY + R * 0.1);
  ctx.lineTo(-tw * 0.6, shY);
  ctx.lineTo(tw * 0.6, shY);
  ctx.lineTo(tw * 0.45, hipY + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  // glowing rune on the chest
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, shY + R * 0.5, R * 0.6, k.eye, 0.8);
  ctx.restore();
  ctx.strokeStyle = shade(k.eye, 0.5);
  ctx.lineWidth = Math.max(2, R * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, shY + R * 0.2);
  ctx.lineTo(-R * 0.18, shY + R * 0.5);
  ctx.lineTo(0, shY + R * 0.8);
  ctx.lineTo(R * 0.18, shY + R * 0.5);
  ctx.closePath();
  ctx.stroke();
  // ice-spiked pauldrons
  for (const side of [-1, 1]) {
    const px = side * tw * 0.5;
    blob(ctx, px, shY + R * 0.05, R * 0.42, R * 0.3, shade(k.body, -0.2), 0, 2);
    spikes(
      ctx,
      [
        [px - R * 0.4, shY],
        [px - R * 0.15, shY - R * 0.25],
        [px + R * 0.15, shY - R * 0.25],
        [px + R * 0.4, shY],
      ],
      R * 0.6,
      shade(k.eye, 0.55),
      side * 0.2,
    );
  }
  leg(ctx, R * 0.2, hipY, sw, R * 1.08, R * 0.38, shade(k.body, -0.3), 0.2);
  // skull helm with a tall crown of ice
  const hx = R * 0.12;
  const hy = shY - R * 0.42;
  const hr = R * 0.4;
  crown(ctx, hx, hy - hr * 0.55, hr * 2.4, hr * 1.5, shade(k.eye, 0.5), 5);
  ctx.fillStyle = fill(ctx, hx, hy, hr, '#cfd8e6');
  ellipse(ctx, hx, hy, hr * 0.95, hr);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#070910';
  ellipse(ctx, hx + hr * 0.1, hy - hr * 0.05, hr * 0.28, hr * 0.24);
  ctx.fill();
  ellipse(ctx, hx + hr * 0.62, hy - hr * 0.05, hr * 0.22, hr * 0.22);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.15, hy - hr * 0.05, hr * 0.2, k.eye);
  evilEye(ctx, hx + hr * 0.62, hy - hr * 0.05, hr * 0.17, k.eye);
  ctx.fillStyle = '#070910';
  ctx.fillRect(hx - hr * 0.2, hy + hr * 0.4, hr * 1.0, hr * 0.3);
  fangs(ctx, hx - hr * 0.15, hy + hr * 0.4, hx + hr * 0.75, hy + hr * 0.4, 5, hr * 0.2);
  // frost greatsword
  const ax = tw * 0.42;
  const ay = shY + R * 0.3;
  const ex = ax + R * 0.2;
  const ey = ay + R * 0.7;
  limb(ctx, ax, ay, ex, ey, R * 0.3, shade(k.dark, 0.1));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(-1.35 + Math.sin(ph) * 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, R * 1.2, 0, R * 1.2, k.eye, 0.45);
  ctx.restore();
  ctx.fillStyle = fill(ctx, R * 1.2, 0, R, shade(k.eye, 0.6));
  ctx.beginPath();
  ctx.moveTo(R * 0.25, -R * 0.16);
  ctx.lineTo(R * 2.2, -R * 0.1);
  ctx.lineTo(R * 2.55, 0);
  ctx.lineTo(R * 2.2, R * 0.1);
  ctx.lineTo(R * 0.25, R * 0.16);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = '#2a2433';
  ctx.fillRect(R * 0.15, -R * 0.35, R * 0.14, R * 0.7);
  ctx.fillRect(-R * 0.35, -R * 0.06, R * 0.5, R * 0.12);
  ctx.restore();
}
