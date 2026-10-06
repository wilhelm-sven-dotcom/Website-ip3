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
  // Hochformat: Schlussbild mittig statt über dem Textfeld der Live-Fassung (statische Fassung ohne Textfeld)
  { name: 'system', p: 1, t: 3.0, tuneHoch: { sy: -0.06 } },
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
  // ohne Zeichen 3: Seitenelement der Live-Fassung, das Social-Media-Bild setzt sein eigenes
  await page.addStyleTag({ content: '.story__flow,.story__poster,.story__zeichen,.site-header,.skip-link{display:none !important}' });
  for (const s of shots) {
    await page.evaluate(
      ([s, hoch]) => {
        window.__storyTune = (hoch && s.tuneHoch) || {};
        window.__story.setProgress(s.p, s.t);
      },
      [s, size.h > size.w]
    );
    await page.waitForTimeout(200);
    const buf = await (await page.$('[data-story-stage]')).screenshot({ type: 'png' });
    await sharp(buf).resize(size.w, size.h).webp({ quality: 82 }).toFile(`${out}/${s.name}-${size.suffix}.webp`);
    console.log('ok', s.name, size.suffix);
  }
  await page.close();
}
await browser.close();
