// Regenerates the images in docs/images. Needs a server started with WINTERWARD_DEV=1:
//   npm run build && WINTERWARD_DEV=1 npm start      (in another terminal)
//   node scripts/readme-shots.mjs [url] [only]       e.g. only = gameplay
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:8787';
const only = process.argv[3];
const out = 'docs/images';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const logs = [];
const wait = (page, ms) => page.waitForTimeout(ms);
// halfway through the campaign: six stages won, some talents learned
const SAVE = JSON.stringify({
  stars: { hollowmere: 3, pinewatch: 3, mill: 2, crowspire: 3, frostfen: 2, ironpass: 2, glimmerdeep: 1 },
  best: { hollowmere: 10, pinewatch: 13, mill: 15, crowspire: 20, frostfen: 22, ironpass: 25, glimmerdeep: 23 },
  stones: 48,
  talents: { honed: 5, eagle: 2, pierce: 2, magic: 2, elemental: 1, virulence: 3, chill: 2, warchest: 3, bounty: 3, hearts: 4, scouts: 1, snow: 2, kin_fire: 3, kin_arcane: 2, kin_storm: 2 },
  endlessBest: 0,
  last: 'glimmerdeep',
});

async function newPage(save) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url);
  await page.evaluate((s) => {
    localStorage.setItem('winterward.name', 'Aurora');
    if (s) localStorage.setItem('winterward.campaign.v1', s);
    else localStorage.removeItem('winterward.campaign.v1');
  }, save ?? null);
  await page.reload();
  await wait(page, 900);
  return page;
}

async function chat(page, text) {
  await page.keyboard.press('Enter');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await wait(page, 150);
}

const shots = {
  /** A two-player game in wave 18 with a maze of three races. */
  async gameplay() {
    const page = await newPage();
    await page.click('button:has-text("Private room")');
    await wait(page, 500);
    await page.click('.lobby-actions button:has-text("Add bot")');
    page.once('dialog', (d) => d.accept());
    await page.click('button:has-text("Start game")');
    await wait(page, 1200);
    await page.click('button:has-text("Lock in & start")');
    await wait(page, 900);
    await page.click('.race-card:has-text("Emberforge")');
    await wait(page, 400);
    await chat(page, '-lumber 2');
    for (const race of ['Arcanum', 'Stormcallers']) {
      await page.keyboard.press('l');
      await wait(page, 500);
      await page.click(`.race-card:has-text("${race}")`);
      await wait(page, 400);
    }
    await chat(page, '-gold 4500');
    await chat(page, '-autopilot');
    await chat(page, '-speed 6');
    await wait(page, 14000);
    await chat(page, '-speed 1');
    await chat(page, '-wave 24');
    await wait(page, 18000);
    await page.evaluate(() => document.querySelectorAll('.chat-log > *').forEach((el) => el.remove()));
    await page.screenshot({ path: `${out}/gameplay.png` });
    await page.context().close();
  },

  /** The main menu with the single-player tiles. */
  async menu() {
    const page = await newPage(SAVE);
    await page.screenshot({ path: `${out}/menu.png` });
    await page.context().close();
  },

  /** The campaign map halfway through, with a briefing open. */
  async campaign() {
    const page = await newPage(SAVE);
    await page.click('.solo-tile:has-text("Campaign")');
    await wait(page, 1500);
    await page.screenshot({ path: `${out}/campaign.png` });
    await page.click('.camp-head button:has-text("Talents")');
    await wait(page, 600);
    await page.mouse.move(5, 5);
    await page.screenshot({ path: `${out}/talents.png` });
    await page.context().close();
  },

  /** The tutorial coach asking for the first walls. */
  async tutorial() {
    const page = await newPage();
    await page.click('.solo-tile:has-text("Tutorial")');
    await wait(page, 1200);
    await page.click('.coach-actions button:has-text("Next")');
    await wait(page, 3500);
    await page.screenshot({ path: `${out}/tutorial.png` });
    await page.context().close();
  },

  /** The race picker at the start of a skirmish. */
  async races() {
    const page = await newPage();
    await page.click('.solo-tile:has-text("Skirmish")');
    await wait(page, 1500);
    if (await page.isVisible('button:has-text("Lock in & start")')) await page.click('button:has-text("Lock in & start")');
    await wait(page, 1000);
    await page.hover('.race-card:has-text("Arcanum")');
    await wait(page, 400);
    await page.screenshot({ path: `${out}/races.png` });
    await page.context().close();
  },
};

for (const [name, fn] of Object.entries(shots)) {
  if (only && only !== name) continue;
  await fn();
  console.log('shot', name);
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
