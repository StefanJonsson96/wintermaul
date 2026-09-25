// Two real browser sessions playing together: npx tsx scripts/mp-test.ts <outdir>
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];
async function newPlayer(name: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 820 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.goto('http://localhost:8787');
  await page.waitForTimeout(600);
  await page.fill('.menu-card input[placeholder="Your name"]', name);
  await page.locator('.menu-card input[placeholder="Your name"]').press('Tab');
  return page;
}
const a = await newPlayer('Alice');
const b = await newPlayer('Bob');
await a.click('#screen-menu button:has-text("Private room")');
await a.waitForTimeout(500);
const code = (await a.textContent('.room-code .code'))!.trim();
console.log('room code', code);
await b.fill('.menu-card input[placeholder="CODE"]', code);
await b.click('#screen-menu button:has-text("Join by code")');
await b.waitForTimeout(600);
await b.click('#screen-lobby button:has-text("I\'m ready")');
await a.waitForTimeout(400);
await a.screenshot({ path: `${out}/mp-lobby.png` });
await a.click('#screen-lobby button:has-text("Start game")');
await a.waitForTimeout(900);
await b.screenshot({ path: `${out}/mp-setup-bob.png` });
await a.click('.choice:has-text("Hard")');
await a.waitForTimeout(400);
const bobSees = await b.evaluate(() => (window as any).winterward.game.state.settings.difficulty);
console.log('bob sees difficulty:', bobSees);
await a.click('text=Lock in & start');
await a.waitForTimeout(700);
await a.click('.race-card >> text=Stormcallers');
await b.click('.race-card >> text=Random');
await a.waitForTimeout(500);
const sendA = (m: unknown) => a.evaluate((x) => (window as any).winterward.net.send(x), m);
// Alice plugs pillar gaps and adds towers; Bob builds nothing and will leak into Alice's lane
for (const y of [10, 14, 6, 18, 2]) await sendA({ type: 'cmd', cmd: { c: 'build', tower: 'storm_1', x: 9, y } });
for (const [x, y] of [[12, 9], [12, 13], [15, 9], [15, 13]]) await sendA({ type: 'cmd', cmd: { c: 'build', tower: 'storm_1', x, y } });
await a.waitForTimeout(500);
await a.keyboard.press('g');
await b.keyboard.press('g');
await a.waitForTimeout(16000);
await a.screenshot({ path: `${out}/mp-alice.png` });
await b.screenshot({ path: `${out}/mp-bob.png` });
const sa = await a.evaluate(() => { const s = (window as any).winterward.game.state; return { lives: s.wave.lives, players: s.players.map((p: any) => ({ name: p.name, races: p.races, kills: p.kills, leaks: p.leaks, gold: p.gold })) }; });
const sb = await b.evaluate(() => { const s = (window as any).winterward.game.state; return { lives: s.wave.lives, players: s.players.map((p: any) => ({ name: p.name, kills: p.kills, leaks: p.leaks })) }; });
console.log('alice view', JSON.stringify(sa));
console.log('bob view  ', JSON.stringify(sb));
// chat
await b.keyboard.press('Enter');
await b.keyboard.type('gg wp');
await b.keyboard.press('Enter');
await a.waitForTimeout(500);
const chat = await a.textContent('.game-chat .chat-log');
console.log('alice chat tail:', chat?.slice(-60));
console.log(errors.join('\n'));
await browser.close();
