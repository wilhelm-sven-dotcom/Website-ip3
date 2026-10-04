// Nimmt echtes Scrollen durch die Inszenierung Bild für Bild auf und erzeugt ein Video.
// Entwicklungswerkzeug. Aufruf: node scripts/video-story.mjs <url> <out.mp4> <w> <h> [frames]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://127.0.0.1:8080/', out = 'story.mp4', w = '1440', h = '900', n = '240'] = process.argv.slice(2);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const dir = path.join(path.dirname(out), 'frames-' + path.basename(out, '.mp4'));
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const mobile = +w < 800;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
await page.goto(url + (url.includes('?') ? '&' : '?') + 'capture', { waitUntil: 'load' });
await page.waitForFunction(() => window.__story, null, { timeout: 120000 });
await page.waitForTimeout(1500);
// Scrollweg: Inszenierung plus Übergang in den nächsten Abschnitt
const end = await page.evaluate(() => {
  const s = document.querySelector('[data-story]');
  return s.offsetTop + s.offsetHeight - innerHeight * 0.2;
});
const frames = +n;
for (let i = 0; i <= frames; i++) {
  const t = i / frames;
  // sanfte Beschleunigung am Anfang und Ende wie beim echten Scrollen
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(e * end));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  await page.evaluate(() => window.__story.renderAtScroll(1 / 30));
  await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
}
await browser.close();
execFileSync(ffmpeg, ['-y', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out], { stdio: 'ignore' });
console.log('video', out);
