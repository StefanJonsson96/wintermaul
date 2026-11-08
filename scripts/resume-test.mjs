// Saved games: play a skirmish, reload the page, continue it, and check it is the same game.
//   node scripts/resume-test.mjs [url] [outDir]
import { mkdirSync } from 'node:fs';
import { launchChromium } from './browser.mjs';

const url = process.argv[2] ?? 'http://localhost:8787';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const wait = (ms) => page.waitForTimeout(ms);
let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
};
// the game's exact state: a continued game must match it to the last hit point
const sim = () =>
  page.evaluate(() => {
    const g = window.winterward.local.game;
    return {
      tick: g.tick,
      wave: g.wave,
      phase: g.phase,
      lives: g.lives,
      gold: g.players[0].gold,
      towers: [...g.towers.values()].map((t) => `${t.def.id}@${t.x},${t.y}`).join(' '),
      creeps: [...g.creeps.values()].map((c) => `${c.def.id}:${c.x.toFixed(3)},${c.y.toFixed(3)},${c.hp.toFixed(2)}`).join(' '),
    };
  });
const cellToScreen = (x, y) => page.evaluate(([x, y]) => window.winterward.game.renderer.cam.toScreen(5 + x, 6 + y), [x, y]);
/** Builds the selected tower with its top-left cell at (x, y): point first so the ghost catches up, then click. */
const buildAt = async (x, y) => {
  const p = await cellToScreen(x + 1, y + 1);
  await page.mouse.move(p.x, p.y);
  await wait(80);
  await page.mouse.down();
  await page.mouse.up();
  await wait(60);
};

await page.goto(url);
await wait(800);
check(!(await page.isVisible('.continue-row')), 'no game in progress at first');
await page.click('.solo-grid .solo-tile:has-text("Skirmish")');
await wait(700);
await page.click('text=Lock in & start');
await wait(600);
await page.click('.race-card >> text=Stonewardens');
await wait(400);
// plug pillar gaps
for (const y of [10, 14, 6, 18]) {
  await page.keyboard.press('q');
  await buildAt(9, y);
}
await page.keyboard.press('Escape');
await page.keyboard.press('g');
await page.keyboard.press('f');
await page.keyboard.press('f');
// into the first wave, creeps on the field
await page.waitForFunction(() => window.winterward.local.game.creeps.size > 5, null, { timeout: 30000 });
await wait(1500);
// hiding the page (as a phone does when you switch apps) saves right away
const hide = (hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
await hide(true);
const before = await sim();
console.log('before', before.tick, before.wave, before.phase, before.towers, `${before.creeps.split(' ').length} creeps`);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('winterward.game.v1') ?? 'null'));
check(stored && stored.tick === before.tick, `saved at tick ${stored?.tick} (game at ${before.tick}) with ${stored?.cmds.length} commands`);
check(before.towers.split(' ').length === 4, `four towers built (${before.towers})`);

await page.reload();
await wait(900);
check(await page.isVisible('.continue-row'), 'the menu offers Continue after a reload');
console.log('   ', await page.textContent('.continue-row'));
await page.screenshot({ path: `${out}/resume-1-menu.png` });
await page.click('.solo-tile.continue');
await page.waitForFunction(() => !!window.winterward.game, null, { timeout: 30000 });
await wait(500);
const after = await sim();
check(after.tick === before.tick, `continued at the same tick (${after.tick})`);
check(after.towers === before.towers && after.gold === before.gold && after.lives === before.lives && after.wave === before.wave, 'same towers, gold, lives and wave');
check(after.creeps === before.creeps, 'every creep in the same place with the same health');
check(await page.isVisible('.paused-banner'), 'the continued game is paused');
await page.screenshot({ path: `${out}/resume-2-paused.png` });
await page.click('.paused-banner');
await wait(1500);
check((await sim()).tick > after.tick, 'clicking the paused banner resumes the game');

// leaving keeps it; starting another game asks first
await page.click('.top-right button[title="Leave game"]');
await wait(300);
check((await page.textContent('.confirm-q')).includes('Continue'), 'leaving says the game is saved');
await page.click('.confirm button:has-text("Leave")');
await wait(600);
check(await page.isVisible('.continue-row'), 'Continue is offered again after leaving');
await page.click('.solo-grid .solo-tile:has-text("Skirmish")');
await wait(400);
check(await page.isVisible('.confirm-q >> text=Start a new game?'), 'a new skirmish asks before replacing the saved game');
await page.click('.confirm button:has-text("Cancel")');
await wait(300);
await page.click('.continue-x');
await wait(300);
await page.click('.confirm button:has-text("Abandon")');
await wait(300);
check(!(await page.isVisible('.continue-row')), 'abandoning removes it');

// a campaign stage: Continue sits in the stage briefing
await page.click('.solo-grid .solo-tile:has-text("Campaign")');
await wait(800);
await page.click('.cb-actions button.primary');
await page.waitForFunction(() => !!window.winterward.game, null, { timeout: 30000 });
await page.waitForSelector('.race-card', { timeout: 5000 });
await page.click('.race-card >> text=Emberforge');
await page.waitForFunction(() => window.winterward.local.game.players[0].races.length > 0 && !document.querySelector('.race-card'), null, { timeout: 5000 });
await wait(300);
await page.keyboard.press('q');
await buildAt(9, 10);
await page.waitForFunction(() => window.winterward.local.game.towers.size > 0, null, { timeout: 5000 });
await page.click('.top-right button[title="Leave game"]');
await wait(300);
await page.click('.confirm button:has-text("Leave")');
await wait(800);
const brief = await page.textContent('.cb-actions');
check(brief.includes('Continue') && brief.includes('Restart'), `the stage briefing offers Continue and Restart (${brief.trim()})`);
await page.screenshot({ path: `${out}/resume-3-campaign.png` });
await page.click('.cb-actions button:has-text("Continue")');
await page.waitForFunction(() => !!window.winterward.game, null, { timeout: 30000 });
await wait(400);
check((await sim()).towers.includes('fire_1'), 'the campaign game came back with its tower');

console.log(logs.slice(0, 20).join('\n') || 'no errors');
console.log(failures ? `${failures} FAILED` : 'all passed');
await browser.close();
process.exit(failures ? 1 : 0);
