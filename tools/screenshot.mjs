// Headless visual QA: boots the dev/preview server URL and captures key states.
// Usage: node tools/screenshot.mjs [url] [outDir]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'shots';
const chrome = process.env.CHROME || '/usr/bin/google-chrome';
import fs from 'node:fs';
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(url, { waitUntil: 'networkidle0' });
await wait(800);
await page.screenshot({ path: `${out}/01-start.png` });

await page.click('#start-btn');
await page.mouse.move(640, 400);
await wait(1500);
for (let i = 0; i < 6; i++) { await page.mouse.click(600 + i * 20, 420); await wait(60); }
await page.screenshot({ path: `${out}/02-running-clicks.png` });

await page.mouse.move(900, 400);
await page.mouse.click(900, 400, { button: 'right' });
await wait(500);
await page.screenshot({ path: `${out}/03-ramp.png` });
await wait(900);
await page.screenshot({ path: `${out}/04-ramp-jump.png` });

await page.evaluate(() => { game.popups.spawnByName('word'); game.popups.spawnByName('windshield'); });
await page.keyboard.type('TABS');
await page.keyboard.press('Enter');
await page.keyboard.type('NEO');
await wait(900);
await page.screenshot({ path: `${out}/05-popups.png` });

await page.evaluate(() => { game.popups.reset(); game.player.knockDown(); });
await wait(1200);
await page.screenshot({ path: `${out}/06-ragdoll.png` });
await page.keyboard.press('Space');
await wait(400);
const state = await page.evaluate(() => ({ s: game.player.state, c: Math.floor(game.economy.cookies), d: Math.floor(game.distance), speed: Math.round(game.speed), obstacles: game.track.obstacles.length }));
await page.evaluate(() => { game.distance = 2000; game.speed = 90; });
await page.mouse.move(400, 400);
await wait(1500);
await page.screenshot({ path: `${out}/07-fast.png` });

await page.setViewport({ width: 390, height: 844 });
await wait(500);
await page.screenshot({ path: `${out}/08-mobile.png` });

console.log(JSON.stringify({ state, errors }, null, 1));
await browser.close();
