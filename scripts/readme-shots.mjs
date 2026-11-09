// Regenerates the images in docs/images. Needs a server started with WINTERWARD_DEV=1:
//   npm run build && WINTERWARD_DEV=1 npm start      (in another terminal)
//   node scripts/readme-shots.mjs [url] [only]       e.g. only = gameplay
import { mkdirSync } from 'node:fs';
import { launchChromium } from './browser.mjs';

/** A Rune Web loadout: the way to Glass Cannon and Frozen Heart, and every region's hub. */
const WEB = {"arsenal_in": 1, "arsenal_sp1": 1, "arsenal_sp2": 1, "arsenal_w0": 1, "arsenal_hub": 1, "arsenal_w3": 1, "arsenal_k0a": 1, "arsenal_k0b": 1, "arsenal_k0": 1, "rime_in": 1, "rime_sp1": 1, "rime_sp2": 1, "rime_w0": 1, "rime_hub": 1, "bulwark_in": 1, "bulwark_sp1": 1, "bulwark_sp2": 1, "bulwark_w0": 1, "bulwark_hub": 1, "precision_in": 1, "precision_sp1": 1, "precision_sp2": 1, "precision_w0": 1, "precision_hub": 1, "fortune_in": 1, "fortune_sp1": 1, "fortune_sp2": 1, "fortune_w0": 1, "alchemy_in": 1, "alchemy_sp1": 1, "alchemy_sp2": 1, "alchemy_w0": 1, "alchemy_hub": 1, "rime_w3": 1, "rime_k0a": 1, "rime_k0b": 1, "rime_k0": 1};

const url = process.argv[2] ?? 'http://localhost:8787';
const only = process.argv[3];
const out = 'docs/images';
mkdirSync(out, { recursive: true });
const browser = await launchChromium();
const logs = [];
const wait = (page, ms) => page.waitForTimeout(ms);
// well into the campaign: Act I nearly done, Act II begun, a good part of the Rune Web taken, a few
// daily medals and achievements
const day = (ago) => {
  const d = new Date();
  d.setDate(d.getDate() - ago);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const SAVE = JSON.stringify({
  stars: { hollowmere: 3, pinewatch: 3, mill: 3, crowspire: 3, frostfen: 2, ironpass: 3, glimmerdeep: 2, wolfsmoor: 2, ashengate: 2, barrow: 2, meltwater: 3, fjord: 2, hexwood: 2, causeway: 1 },
  best: { hollowmere: 10, pinewatch: 13, mill: 15, crowspire: 20, frostfen: 22, ironpass: 25, glimmerdeep: 26, wolfsmoor: 30, ashengate: 34, barrow: 36, meltwater: 12, fjord: 18, hexwood: 22, causeway: 24 },
  stones: 96,
  talents: WEB,
  endlessBest: 0,
  last: 'causeway',
  daily: { [day(1)]: { medal: 2, wave: 24, plays: 1 }, [day(2)]: { medal: 3, wave: 19, plays: 2 }, [day(3)]: { medal: 1, wave: 29, plays: 1 } },
  feats: { first_win: 1, boss: 1, three_races: 1, legend: 1, maze_200: 1, hoard: 1, flawless: 1, warcry: 1, nova: 1, keystone: 1, daily_medal: 1, daily_gold: 1 },
  tally: { games: 23, wins: 14, kills: 16840 },
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

  /** The Act II map, well into the campaign. */
  async campaign() {
    const page = await newPage(SAVE);
    await page.click('.solo-tile:has-text("Campaign")');
    await wait(page, 1200);
    await page.click('.camp-tab:has-text("Act II")');
    await wait(page, 1500);
    await page.screenshot({ path: `${out}/campaign.png` });
    await page.context().close();
  },

  /** The Rune Web, with a notable's tooltip. */
  async runeweb() {
    const page = await newPage(SAVE);
    await page.click('.solo-tile:has-text("Campaign")');
    await wait(page, 1200);
    await page.click('.camp-head button:has-text("Rune Web")');
    await wait(page, 900);
    // hover the node nearest the middle-right of the web that has a tooltip
    const box = await page.locator('.modal canvas').boundingBox();
    if (box) {
      for (const [fx, fy] of [[0.62, 0.42], [0.6, 0.45], [0.64, 0.4], [0.58, 0.4]]) {
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
        await wait(page, 250);
        if (await page.isVisible('.tooltip')) break;
      }
    }
    await wait(page, 300);
    await page.screenshot({ path: `${out}/runeweb.png` });
    await page.context().close();
  },

  /** Today's daily challenge. */
  async daily() {
    const page = await newPage(SAVE);
    await page.click('.solo-tile:has-text("Daily")');
    await wait(page, 700);
    await page.screenshot({ path: `${out}/daily.png` });
    await page.context().close();
  },

  /** The achievements list. */
  async achievements() {
    const page = await newPage(SAVE);
    await page.click('.menu-links button:has-text("Achievements")');
    await wait(page, 700);
    await page.screenshot({ path: `${out}/achievements.png` });
    await page.context().close();
  },

  /** The Thaw: a later wave of creeps that fight back, with a Frost Nova being aimed. */
  async thaw() {
    const page = await newPage();
    await page.click('button:has-text("Private room")');
    await wait(page, 500);
    await page.click('button:has-text("Start game")');
    await wait(page, 1200);
    await page.click('.choice:has-text("The Thaw")');
    await wait(page, 300);
    await page.click('button:has-text("Lock in & start")');
    await wait(page, 900);
    await page.click('.race-card:has-text("Frostborn")');
    await wait(page, 400);
    await chat(page, '-lumber 1');
    await page.keyboard.press('l');
    await wait(page, 500);
    await page.click('.race-card:has-text("Venomkin")');
    await wait(page, 400);
    await chat(page, '-gold 3500');
    await chat(page, '-autopilot');
    await chat(page, '-speed 6');
    await wait(page, 12000);
    await chat(page, '-speed 1');
    await chat(page, '-wave 17');
    await wait(page, 21000);
    await page.evaluate(() => document.querySelectorAll('.chat-log > *').forEach((el) => el.remove()));
    // aim a Frost Nova at the thick of the wave
    const at = await page.evaluate(() => {
      const st = window.winterward.game.state;
      const mine = [...st.creeps.values()].filter((c) => c.lane === st.myLane && !Number.isFinite(c.deadAt));
      let best = null;
      let most = -1;
      for (const c of mine) {
        const n = mine.filter((d) => (d.x - c.x) ** 2 + (d.y - c.y) ** 2 < 6).length;
        if (n > most) [best, most] = [c, n];
      }
      return best ? window.winterward.game.renderer.cam.toScreen(5 + best.x, 6 + best.y) : null;
    });
    await page.keyboard.press('1');
    if (at) await page.mouse.move(at.x, at.y);
    await wait(page, 300);
    await page.screenshot({ path: `${out}/thaw.png` });
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
