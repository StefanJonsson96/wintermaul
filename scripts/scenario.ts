// Dev scenario for visual testing (server must run with WINTERWARD_DEV=1):
//   npx tsx scripts/scenario.ts <outdir> <race> <wave> [upgradeTo...]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { Bot } from '../src/shared/sim/bot';

const out = process.argv[2] ?? 'screenshots';
const race = process.argv[3] ?? 'fire';
const wave = Number(process.argv[4] ?? 12);
const upgrades = process.argv.slice(5);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:8787');
await page.waitForTimeout(700);
await page.click('#screen-menu button:has-text("Private room")');
await page.waitForTimeout(400);
await page.click('#screen-lobby .lobby-actions button:has-text("Add bot")');
await page.waitForTimeout(150);
await page.click('#screen-lobby button:has-text("Start game")');
await page.waitForTimeout(700);
await page.click('text=Lock in & start');
await page.waitForTimeout(500);
const send = (msg: unknown) => page.evaluate((m) => (window as any).winterward.net.send(m), msg);
await send({ type: 'cmd', cmd: { c: 'race', race } });
await page.keyboard.press('Escape');
await send({ type: 'chat', text: '-gold 20000' });
await send({ type: 'chat', text: '-lumber 2' });
await page.waitForTimeout(300);
for (const p of Bot.serpentine()) await send({ type: 'cmd', cmd: { c: 'build', tower: `${race}_1`, x: p.x, y: p.y } });
await page.waitForTimeout(1500);
// upgrade along given chain (e.g. fire_2a fire_3a fire_4a) for a subset of towers
const ids: number[] = await page.evaluate(() => [...(window as any).winterward.game.state.towers.values()].filter((t: any) => t.owner === 0).map((t: any) => t.id));
let k = 0;
for (const to of upgrades) {
  const subset = ids.filter((_, i) => i % (2 + k) === 0);
  await send({ type: 'cmd', cmd: { c: 'upgrade', ids: subset, to } });
  await page.waitForTimeout(4200);
  k++;
}
await send({ type: 'chat', text: `-wave ${wave}` });
await page.waitForTimeout(12000);
await page.screenshot({ path: `${out}/late-1.png` });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/late-2.png` });
// zoom in a bit on the action
await page.mouse.move(800, 450);
await page.mouse.wheel(0, -500);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/late-3.png` });
const fps = await page.evaluate(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); })`);
console.log('fps (swiftshader, headless):', fps);
const perf = await page.evaluate(`new Promise((res) => {
  const g = window.winterward.game; const r = g.renderer; const orig = r.render.bind(r);
  let n = 0, total = 0, maxT = 0;
  r.render = (...a) => { const t0 = performance.now(); orig(...a); const d = performance.now() - t0; total += d; n++; maxT = Math.max(maxT, d); };
  setTimeout(() => { r.render = orig; res({ frames: n, avgMs: +(total / n).toFixed(2), maxMs: +maxT.toFixed(1), creeps: g.state.creeps.size, towers: g.state.towers.size, particles: g.fx.particles.length }); }, 3000);
})`);
console.log('render JS cost:', JSON.stringify(perf));
console.log(errors.slice(0, 20).join('\n'));
await browser.close();
