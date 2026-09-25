import { RACE_BY_ID } from '../../shared/data/races';
import { makeCanvas, shade, star, type Ctx } from './util';

const cache = new Map<string, HTMLCanvasElement>();

/** Round race badge with a glyph for its element. */
export function raceEmblem(raceId: string, size = 64): HTMLCanvasElement {
  const key = `${raceId}@${size}`;
  let c = cache.get(key);
  if (c) return c;
  const race = RACE_BY_ID[raceId];
  const [canvas, ctx] = makeCanvas(size, size);
  const r = size / 2;
  ctx.translate(r, r);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, shade(race.color, 0.35));
  g.addColorStop(0.7, shade(race.color, -0.25));
  g.addColorStop(1, shade(race.color, -0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = shade(race.accent, 0.1);
  ctx.stroke();
  ctx.lineWidth = r * 0.03;
  ctx.strokeStyle = 'rgba(8,14,28,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.99, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.12;
  glyph(ctx, race.icon, r * 0.55);
  cache.set(key, canvas);
  return canvas;
}

function glyph(ctx: Ctx, icon: string, s: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (icon) {
    case 'snowflake': {
      ctx.lineWidth = s * 0.14;
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s);
        ctx.moveTo(0, -s * 0.55);
        ctx.lineTo(-s * 0.25, -s * 0.8);
        ctx.moveTo(0, -s * 0.55);
        ctx.lineTo(s * 0.25, -s * 0.8);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'flame': {
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 0.9, s * 0.8, -s * 0.8, -s * 0.2, -s * 0.1, -s);
      ctx.bezierCurveTo(0, -s * 0.4, s * 0.5, -s * 0.5, s * 0.35, -s * 0.9);
      ctx.bezierCurveTo(s * 1.0, -s * 0.2, s * 0.8, s * 0.8, 0, s);
      ctx.fill();
      break;
    }
    case 'bolt': {
      ctx.beginPath();
      ctx.moveTo(s * 0.25, -s);
      ctx.lineTo(-s * 0.55, s * 0.12);
      ctx.lineTo(-s * 0.02, s * 0.12);
      ctx.lineTo(-s * 0.3, s);
      ctx.lineTo(s * 0.6, -s * 0.2);
      ctx.lineTo(s * 0.05, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'mountain': {
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.7);
      ctx.lineTo(-s * 0.3, -s * 0.6);
      ctx.lineTo(0, -s * 0.1);
      ctx.lineTo(s * 0.35, -s * 0.8);
      ctx.lineTo(s, s * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rune': {
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, s * 0.5);
      ctx.moveTo(-s * 0.3, -s * 0.1);
      ctx.lineTo(s * 0.3, s * 0.2);
      ctx.stroke();
      break;
    }
    case 'drop': {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.4, -s * 0.4, s * 0.75, 0, s * 0.75, s * 0.3);
      ctx.arc(0, s * 0.3, s * 0.75, 0, Math.PI);
      ctx.bezierCurveTo(-s * 0.75, 0, -s * 0.4, -s * 0.4, 0, -s);
      ctx.fill();
      break;
    }
    case 'gear': {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? s * 0.72 : s * 0.95;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'eye': {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s * 0.9, s, 0);
      ctx.quadraticCurveTo(0, s * 0.9, -s, 0);
      ctx.fill();
      ctx.fillStyle = '#1a1030';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.18, s * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sun': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = s * 0.14;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
        ctx.lineTo(Math.cos(a) * s * 0.98, Math.sin(a) * s * 0.98);
        ctx.stroke();
      }
      break;
    }
    case 'leaf': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.8);
      ctx.bezierCurveTo(-s * 0.9, -s * 0.4, s * 0.1, -s, s * 0.9, -s * 0.9);
      ctx.bezierCurveTo(s * 0.9, 0, s * 0.3, s * 0.8, -s * 0.8, s * 0.8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,60,30,0.7)';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.8);
      ctx.quadraticCurveTo(0, 0, s * 0.8, -s * 0.8);
      ctx.stroke();
      break;
    }
    case 'coin': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(110,70,0,0.85)';
      ctx.font = `bold ${s * 1.2}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, s * 0.06);
      break;
    }
    case 'gem': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.25);
      ctx.lineTo(-s * 0.45, -s * 0.8);
      ctx.lineTo(s * 0.45, -s * 0.8);
      ctx.lineTo(s * 0.9, -s * 0.25);
      ctx.lineTo(0, s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,40,90,0.55)';
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.25);
      ctx.lineTo(s * 0.9, -s * 0.25);
      ctx.moveTo(-s * 0.3, -s * 0.25);
      ctx.lineTo(0, s * 0.95);
      ctx.lineTo(s * 0.3, -s * 0.25);
      ctx.stroke();
      break;
    }
    default:
      star(ctx, 0, 0, s, s * 0.45, 5);
      ctx.fill();
  }
}
