// Plays the first steps of the tutorial in a browser and screenshots the coach.
//   node scripts/tutorial-test.mjs [url] [outDir]
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
const coach = () => page.evaluate(() => document.querySelector('.coach-title')?.textContent + ' | ' + document.querySelector('.coach-head')?.textContent);
const cellToScreen = (x, y) => page.evaluate(([x, y]) => window.winterward.game.renderer.cam.toScreen(5 + x, 6 + y), [x, y]);
async function buildAt(x, y) {
  await page.keyboard.press('q');
  const p = await cellToScreen(x + 1, y + 1);
  await page.mouse.move(p.x, p.y);
  await wait(50);
  await page.mouse.click(p.x, p.y);
  await wait(90);
}
await page.goto(url);
await wait(900);
await page.click('.solo-tile:has-text("Tutorial")');
await wait(1200);
console.log('1', await coach());
await page.screenshot({ path: `${out}/40-tutorial-1.png` });
await page.click('.coach-actions button:has-text("Next")');
await wait(500);
console.log('2', await coach());
await page.screenshot({ path: `${out}/41-tutorial-2.png` });
await buildAt(9, 2);
await wait(500);
console.log('3', await coach());
for (const y of [6, 10, 14, 18]) await buildAt(9, y);
await wait(500);
console.log('4', await coach());
for (const y of [4, 8, 12, 16, 20]) await buildAt(18, y);
await page.keyboard.press('Escape');
await wait(500);
console.log('5', await coach());
await page.screenshot({ path: `${out}/42-tutorial-5.png` });
await page.keyboard.press('g');
await wait(1500);
console.log('6', await coach());
await page.keyboard.press('f');
await page.keyboard.press('f');
// wait for wave 1 to clear
for (let i = 0; i < 40; i++) {
  await wait(1000);
  const ph = await page.evaluate(() => { const g = window.winterward.local.game; return `${g.wave}:${g.phase}`; });
  if (ph === '1:build') break;
}
await wait(600);
console.log('7', await coach());
const t = await page.evaluate(() => { const g = window.winterward.game; const t = [...g.state.towers.values()].find((t) => t.owner === 0); return t ? { x: t.x, y: t.y } : null; });
const p = await cellToScreen(t.x + 1, t.y + 0.6);
await page.mouse.click(p.x, p.y);
await wait(600);
console.log('8', await coach());
await page.screenshot({ path: `${out}/43-tutorial-8.png` });
await page.keyboard.press('q');
await wait(800);
console.log('9', await coach(), await page.evaluate(() => { const g = window.winterward.local.game; return `lives ${g.lives} wave ${g.wave}`; }));
console.log(logs.slice(0, 20).join('\n') || 'no errors');
await browser.close();
