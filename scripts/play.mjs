// Scripted browser playthrough: builds towers, calls waves, takes screenshots.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:8787';
const out = process.argv[3] ?? 'screenshots';
const race = process.argv[4] ?? 'Frostborn';
const waves = Number(process.argv[5] ?? 2);
mkdirSync(out, { recursive: true });
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForTimeout(800);
await page.fill('.menu-card input', 'Tester');
await page.click('#screen-menu button:has-text("Private room")');
await page.waitForTimeout(500);
await page.click('#screen-lobby .lobby-actions button:has-text("Add bot")');
await page.waitForTimeout(200);
await page.click('#screen-lobby button:has-text("Start game")');
await page.waitForTimeout(800);
await page.click('text=Lock in & start');
await page.waitForTimeout(800);
await page.click(`.race-card >> text=${race}`);
await page.waitForTimeout(500);

// screen position of a lane-local cell
const cellToScreen = (x, y) => page.evaluate(([x, y]) => {
  const g = window.winterward.game;
  const lane = g.state.myLane;
  const cam = g.renderer.cam;
  const wx = 5 + x, wy = 6 + lane * 30 + y;
  return cam.toScreen(wx, wy);
}, [x, y]);

async function build(x, y) {
  await page.keyboard.press('q');
  const p = await cellToScreen(x + 1, y + 1);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(60);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(80);
}
// plug the pillar gaps: line x=9 leave bottom (22) open, line x=18 leave top (0) open
for (const y of [10, 14, 6, 18, 2]) await build(9, y);
for (const y of [12, 8, 16, 4, 20]) await build(18, y);
await page.waitForTimeout(400);
// hover a ghost to show path preview
await page.keyboard.press('q');
let p = await cellToScreen(22, 12);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/10-build.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('g'); // call wave
for (let w = 0; w < waves; w++) {
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${out}/11-wave-${w}.png` });
  // spend money
  for (const y of [8, 10, 12, 14]) await build(27, y);
  await page.keyboard.press('g');
}
// select a tower and screenshot the panel
p = await cellToScreen(10, 11);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/12-select.png` });
const st = await page.evaluate(() => { const g = window.winterward.game; return { wave: g.state.wave, gold: g.state.me.gold, towers: g.state.towers.size, creeps: g.state.creeps.size }; });
console.log(JSON.stringify(st));
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
