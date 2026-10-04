// Rendert Standbilder der Inszenierung für Poster und statische Darstellung.
// Voraussetzung: laufender Dev-Server (npm run dev). Aufruf: node scripts/render-stills.mjs [url]
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:4321/';
const out = 'public/img/story';
fs.mkdirSync(out, { recursive: true });

const shots = [
  { name: 'modul', p: 0, t: 1.2 },
  { name: 'zelle', p: 0.585, t: 2.4 },
  { name: 'system', p: 1, t: 3.0 },
];
const sizes = [
  { suffix: '1600', w: 1600, h: 900 },
  { suffix: '900', w: 900, h: 1125 },
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1.5 });
  await page.goto(url + '?capture', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__story, null, { timeout: 120000 });
  await page.addStyleTag({ content: '.story__flow,.story__poster,.site-header,.skip-link{display:none !important}' });
  for (const s of shots) {
    await page.evaluate((s) => window.__story.setProgress(s.p, s.t), s);
    await page.waitForTimeout(200);
    const buf = await (await page.$('[data-story-stage]')).screenshot({ type: 'png' });
    await sharp(buf).resize(size.w, size.h).webp({ quality: 82 }).toFile(`${out}/${s.name}-${size.suffix}.webp`);
    console.log('ok', s.name, size.suffix);
  }
  await page.close();
}
await browser.close();
