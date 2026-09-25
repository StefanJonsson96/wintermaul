// Full-flow browser test against a dev server (WINTERWARD_DEV=1): setup, race, building, mass
// upgrade, a second race, a Legend, and the final wave through to the end screen.
//   node scripts/flow-test.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:8787';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const state = () => page.evaluate(() => {
  const g = window.winterward.game;
  const me = g.state.me;
  return { wave: g.state.wave.n, phase: g.state.wave.phase, lives: g.state.wave.lives, gold: Math.floor(me.gold), lumber: me.lumber, races: me.races, towers: [...g.state.towers.values()].filter((t) => t.owner === me.id).length };
});
const say = async (text) => {
  await page.keyboard.press('Enter');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await wait(300);
};
const cellToScreen = (x, y) => page.evaluate(([x, y]) => {
  const g = window.winterward.game;
  return g.renderer.cam.toScreen(5 + x, 6 + g.state.myLane * 30 + y);
}, [x, y]);
async function place(key, x, y) {
  await page.keyboard.press(key);
  const p = await cellToScreen(x + 1, y + 1);
  await page.mouse.move(p.x, p.y);
  await wait(60);
  await page.mouse.click(p.x, p.y);
  await wait(90);
}

await page.goto(url);
await wait(800);
await page.fill('.menu-card input', 'Flow');
await page.click('#screen-menu button:has-text("Private room")');
await wait(500);
await page.click('#screen-lobby .lobby-actions button:has-text("Add bot")');
await wait(200);
await page.click('#screen-lobby button:has-text("Start game")');
await wait(900);
await page.click('.setup-grid .choice:has-text("Casual")');
await wait(300);
await page.click('text=Lock in & start');
await wait(900);
await shot('20-race-picker');
await page.click('.race-card >> text=Frostborn');
await wait(600);

// maze: plug pillar gaps
for (const y of [10, 14, 6, 18, 2]) await place('q', 9, y);
for (const y of [12, 8, 16, 4, 20]) await place('q', 18, y);
await page.keyboard.press('Escape');
console.log('after building', JSON.stringify(await state()));

// money, then box-select the first column and upgrade all with Q
await say('-gold 3000');
const a = await cellToScreen(8.2, 1);
const b = await cellToScreen(12, 22);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
await page.mouse.move(b.x, b.y, { steps: 8 });
await page.mouse.up();
await wait(300);
await shot('21-multi-select');
await page.keyboard.press('q');
await wait(400);
console.log('after mass upgrade', JSON.stringify(await state()));
await shot('22-upgraded');
await page.keyboard.press('Escape');

// a second race
await say('-lumber 2');
await wait(300);
await page.keyboard.press('l'); // "New race / Legend"
await wait(500);
await shot('23-second-race');
await page.click('.race-card >> text=Clockwork').catch((e) => logs.push(`race pick: ${e.message}`));
await wait(600);
console.log('after second race', JSON.stringify(await state()));

// a Legend (the build panel lists tier-1 towers and Legends)
const keys = await page.$$eval('.build-grid .cmd-btn', (els) => els.map((e) => e.innerText.replace(/\n/g, ' ')));
console.log('build buttons', JSON.stringify(keys));
const legendKey = ['q', 'w', 'e', 'r', 't', 'y'][keys.findIndex((k) => /800/.test(k))];
await place(legendKey, 30, 10);
await wait(500);
await shot('24-legend');
console.log('after legend', JSON.stringify(await state()));

// start and fast-forward to the final wave
await page.keyboard.press('g');
await wait(3000);
await say('-speed 6');
await say('-wave 39');
await wait(4000);
await shot('25-late');
await say('-gold 30000');
for (let i = 0; i < 12; i++) {
  await wait(5000);
  const s = await state();
  console.log('tick', JSON.stringify(s));
  if (s.phase === 'victory' || s.phase === 'defeat') break;
}
await wait(1500);
await shot('26-end');
const end = await page.$eval('.modal', (m) => m.innerText.slice(0, 400)).catch(() => 'no modal');
console.log('end modal:', end.replace(/\n+/g, ' | '));
console.log(logs.slice(0, 30).join('\n') || 'no errors');
await browser.close();
