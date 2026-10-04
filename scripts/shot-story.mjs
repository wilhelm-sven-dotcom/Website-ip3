// Rendert Einzelbilder der Inszenierung zu gegebenen Fortschrittswerten (Entwicklungswerkzeug).
// Aufruf: node scripts/shot-story.mjs <url> <outDir> <w> <h> p1 p2 ...
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url = 'http://127.0.0.1:4321/', out = 'shots', w = '1440', h = '900', ...ps] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'capture', { waitUntil: 'load' });
await page.waitForFunction(() => window.__story || document.querySelector('.story.is-static'), null, { timeout: 120000 });
const isStatic = await page.evaluate(() => !!document.querySelector('.story.is-static'));
if (isStatic) console.log('STATIC MODE', await page.evaluate(() => document.querySelector('.story').dataset.staticReason));
for (const p of (ps.length ? ps : ['0', '0.3', '0.5', '0.58', '0.72', '0.85', '1']).map(Number)) {
  await page.evaluate((p) => window.__story && window.__story.setProgress(p, 3.0), p);
  await page.waitForTimeout(150);
  const el = await page.$('[data-story-stage]');
  await el.screenshot({ path: `${out}/p-${p.toFixed(3)}.png` });
  console.log('shot', p);
}
console.log(logs.join('\n'));
await browser.close();
