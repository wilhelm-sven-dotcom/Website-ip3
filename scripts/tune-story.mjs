// Entwicklungswerkzeug: rendert Varianten mit überschriebenen Kamera-/Posenwerten.
// Aufruf: node scripts/tune-story.mjs <outDir> <w> <h> '<json array of {name,p,tune}>'
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, w, h, json, url = 'http://127.0.0.1:4321/'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const variants = JSON.parse(json);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url + '?capture', { waitUntil: 'load' });
await page.waitForFunction(() => window.__story, null, { timeout: 120000 });
await page.waitForTimeout(500); // Startbild unter der Leinwand ausgeblendet
if (!process.env.KEEP_FLOW) await page.addStyleTag({ content: '.story__flow{display:none !important}' });
for (const v of variants) {
  await page.evaluate((v) => {
    window.__storyTune = v.tune || {};
    if (v.tune && v.tune.strip) window.__story.setStrip(v.tune.strip);
    window.__story.setProgress(v.p, v.t ?? 3);
  }, v);
  await page.waitForTimeout(100);
  await (await page.$('[data-story-stage]')).screenshot({ path: `${out}/${v.name}.png` });
}
console.log(logs.join('\n'));
await browser.close();
