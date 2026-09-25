// Single-player (in-browser) game test: skirmish, speed and pause.
//   node scripts/local-test.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:8787';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const wait = (ms) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => {
  const w = window.winterward;
  const g = w.game;
  return { wave: g.state.wave.n, phase: g.state.wave.phase, t: +g.state.renderTime.toFixed(2), speed: g.state.speed, simTime: +w.local.game.time.toFixed(2), towers: w.local.game.towers.size, gold: Math.floor(g.state.me.gold) };
});
await page.goto(url);
await wait(900);
await page.screenshot({ path: `${out}/30-menu.png` });
await page.click('.solo-tile:has-text("Skirmish")');
await wait(800);
await page.click('text=Lock in & start');
await wait(700);
await page.click('.race-card >> text=Emberforge');
await wait(500);
const cellToScreen = (x, y) => page.evaluate(([x, y]) => window.winterward.game.renderer.cam.toScreen(5 + x, 6 + y), [x, y]);
for (const y of [10, 14, 6, 18, 2]) {
  await page.keyboard.press('q');
  const p = await cellToScreen(10, y + 1);
  await page.mouse.click(p.x, p.y);
  await wait(80);
}
await page.keyboard.press('Escape');
console.log('built', JSON.stringify(await state()));
await page.keyboard.press('g');
await wait(3000);
console.log('wave started', JSON.stringify(await state()));
await page.keyboard.press('f');
await page.keyboard.press('f');
await wait(3000);
const fast = await state();
console.log('at 3x', JSON.stringify(fast));
await page.keyboard.press('p');
await wait(1500);
const p1 = await state();
await wait(1500);
const p2 = await state();
console.log('paused', JSON.stringify(p1), '->', JSON.stringify(p2));
await page.screenshot({ path: `${out}/31-paused.png` });
// build while paused: the tower should show up immediately
await page.keyboard.press('q');
const bp = await cellToScreen(22, 12);
await page.mouse.click(bp.x, bp.y);
await wait(400);
console.log('built while paused', JSON.stringify(await state()), 'client towers', await page.evaluate(() => window.winterward.game.state.towers.size));
await page.keyboard.press('Escape');
await page.keyboard.press('p');
await wait(2000);
console.log('resumed', JSON.stringify(await state()));
await page.screenshot({ path: `${out}/32-running.png` });
page.once('dialog', (d) => d.accept());
await page.click('.top-right button[title="Leave game"]');
await wait(600);
console.log('menu visible:', await page.isVisible('#screen-menu'));
console.log(logs.slice(0, 20).join('\n') || 'no errors');
await browser.close();
