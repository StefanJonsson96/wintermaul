// Plays the start of the tutorial on an emulated phone with touch input and screenshots it.
//   node scripts/mobile-test.mjs [url] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:8787';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const logs = [];
page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const wait = (ms) => page.waitForTimeout(ms);
const check = (label, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) process.exitCode = 1;
};

/** Screen position of a lane cell's top-left corner plus (dx, dy) cells. */
const cell = (x, y) => page.evaluate(([x, y]) => window.winterward.game.renderer.cam.toScreen(5 + x, 6 + y), [x, y]);

/** Dispatches a touch gesture on the game canvas: each finger is a list of points over the same steps. */
async function gesture(fingers, steps = 8) {
  await page.evaluate(
    async ([fingers, steps]) => {
      const canvas = document.getElementById('game-canvas');
      const r = canvas.getBoundingClientRect();
      const touch = (id, p) => new Touch({ identifier: id, target: canvas, clientX: r.left + p.x, clientY: r.top + p.y });
      const fire = (type, list, changed) => canvas.dispatchEvent(new TouchEvent(type, { touches: list, changedTouches: changed, bubbles: true, cancelable: true }));
      const at = (f, k) => ({ x: f[0].x + ((f[1].x - f[0].x) * k) / steps, y: f[0].y + ((f[1].y - f[0].y) * k) / steps });
      const all = (k) => fingers.map((f, i) => touch(i + 1, at(f, k)));
      for (let i = 0; i < fingers.length; i++) fire('touchstart', all(0).slice(0, i + 1), [all(0)[i]]);
      for (let k = 1; k <= steps; k++) {
        await new Promise((res) => requestAnimationFrame(res));
        fire('touchmove', all(k), all(k));
      }
      fire('touchend', [], all(steps));
    },
    [fingers, steps],
  );
}

await page.goto(url);
await wait(900);
check('coarse pointer detected', await page.evaluate(() => document.documentElement.classList.contains('touch')));
await page.screenshot({ path: `${out}/m0-menu.png` });

await page.touchscreen.tap(...(await center('.solo-tile:has-text("Tutorial")')));
await wait(1500);
await page.touchscreen.tap(...(await center('.coach-actions button:has-text("Next")')));
await wait(600);
console.log('coach:', await page.evaluate(() => document.querySelector('.coach-body')?.textContent));
await page.screenshot({ path: `${out}/m1-tutorial.png` });

// build: tap the Cinder Pot, then tap three gaps of the first pillar line
await page.touchscreen.tap(...(await center('.build-grid .cmd-btn')));
await wait(300);
check('Done button shows while building', await page.isVisible('.done-btn'));
for (const y of [2, 6, 10]) {
  const p = await cell(9 + 1, y + 1);
  await page.touchscreen.tap(p.x, p.y);
  await wait(250);
}
const towers = () => page.evaluate(() => [...window.winterward.game.state.towers.values()].filter((t) => t.owner === 0).length);
check('three taps built three towers', (await towers()) === 3);
check('still in build mode', await page.isVisible('.done-btn'));
// drag to aim, release to build
const a = await cell(9 + 1, 14 + 1 - 3);
const b = await cell(9 + 1, 14 + 1);
await gesture([[a, b]]);
await wait(300);
check('drag and release built a fourth tower', (await towers()) === 4);
await page.screenshot({ path: `${out}/m2-building.png` });
await page.touchscreen.tap(...(await center('.done-btn')));
await wait(200);
check('Done leaves build mode', !(await page.isVisible('.done-btn')));

// pinch to zoom in, then pan with one finger
const zoom0 = await page.evaluate(() => window.winterward.game.renderer.cam.zoom);
await gesture([
  [{ x: 380, y: 200 }, { x: 300, y: 200 }],
  [{ x: 460, y: 200 }, { x: 560, y: 200 }],
]);
const zoom1 = await page.evaluate(() => window.winterward.game.renderer.cam.zoom);
check(`pinch zooms in (${zoom0.toFixed(1)} -> ${zoom1.toFixed(1)})`, zoom1 > zoom0 * 1.4);
const camX0 = await page.evaluate(() => window.winterward.game.renderer.cam.x);
await gesture([[{ x: 600, y: 250 }, { x: 400, y: 250 }]]);
const camX1 = await page.evaluate(() => window.winterward.game.renderer.cam.x);
check('one finger pans', camX1 > camX0 + 3);
await page.evaluate(() => window.winterward.game.renderer.focusLane(0));
await wait(300);

// tap a tower: the selection panel replaces the build bar
const t = await cell(9 + 1, 2 + 1);
await page.touchscreen.tap(t.x, t.y);
await wait(400);
check('tap selects a tower', (await page.evaluate(() => window.winterward.game.selected.size)) === 1);
check('build bar hidden while selecting', !(await page.isVisible('.build-panel')));
await page.screenshot({ path: `${out}/m3-selected.png` });

// a long press on an upgrade shows its tooltip instead of buying it
const gold0 = await page.evaluate(() => window.winterward.game.state.me.gold);
const [ux, uy] = await center('.upg-btn');
await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const t = new Touch({ identifier: 9, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
}, [ux, uy]);
await wait(700);
check('long press shows a tooltip', await page.isVisible('#tooltip:not(.hidden)'));
await page.screenshot({ path: `${out}/m4-tooltip.png` });
await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const t = new Touch({ identifier: 9, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true, cancelable: true }));
  el.click();
}, [ux, uy]);
await wait(300);
check('the click after a long press does not buy', (await page.evaluate(() => window.winterward.game.state.me.gold)) === gold0);

// leave through the in-page confirmation
await page.touchscreen.tap(...(await center('.top-right button[title="Leave game"]')));
await wait(300);
check('leaving asks in the page', await page.isVisible('.confirm'));
await page.touchscreen.tap(...(await center('.confirm button:has-text("Keep playing")')));
await wait(200);

// upright: the rotate hint covers the game
await page.setViewportSize({ width: 390, height: 844 });
await wait(600);
check('portrait shows the rotate hint', await page.isVisible('.rotate-hint'));
await page.screenshot({ path: `${out}/m5-portrait.png` });
console.log(logs.join('\n') || 'no errors');
await browser.close();

async function center(selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`not visible: ${selector}`);
  return [box.x + box.width / 2, box.y + box.height / 2];
}
