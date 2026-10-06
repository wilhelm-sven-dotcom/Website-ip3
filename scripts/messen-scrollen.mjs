// Misst, wie flüssig sich Seiten scrollen lassen: gleichmäßiges Scrollen per Mausrad bzw.
// Wischgeste, Bildabstände aus requestAnimationFrame, lange Tasks und Layoutverschiebungen.
// CPU-Drosselung über das Chrome-DevTools-Protokoll simuliert ein mittleres Gerät.
// Entwicklungswerkzeug. Voraussetzung: Vorschau läuft (npm run vorschau).
// Aufruf: node scripts/messen-scrollen.mjs [basisUrl] [drosselung]
import { chromium } from 'playwright';

const [basis = 'http://127.0.0.1:8080', drossel = '4'] = process.argv.slice(2);
const seiten = (process.env.SEITEN || '/unsere-leistungen/privat,/,/referenzen,/unsere-leistungen/batteriespeicher').split(',');
const profile = [
  { name: 'Desktop', viewport: { width: 1440, height: 900 } },
  { name: 'Handy', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const zeilen = [];

for (const p of profile) {
  for (const pfad of seiten) {
    const ctx = await browser.newContext({ viewport: p.viewport, isMobile: !!p.isMobile, hasTouch: !!p.hasTouch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(basis + pfad, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(drossel) });
    // Messung im Seitenkontext: Bildabstände, lange Tasks, Layoutverschiebungen
    await page.evaluate(() => {
      const m = (window.__messung = { frames: [], longtasks: [], cls: 0, laeuft: true });
      let letzte = performance.now();
      const tick = (t) => {
        m.frames.push(t - letzte);
        letzte = t;
        if (m.laeuft) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => m.longtasks.push(e.duration))).observe({ type: 'longtask', buffered: false });
        new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (m.cls += e.value))).observe({ type: 'layout-shift', buffered: false });
      } catch {}
    });
    const hoehe = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const schritt = 90; // px je Ereignis, etwa 1.350 px/s bei 15 Ereignissen pro Sekunde
    const start = Date.now();
    let y = 0;
    while (y < hoehe && Date.now() - start < 60000) {
      if (p.hasTouch) await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'instant' }), schritt);
      else await page.mouse.wheel(0, schritt);
      await page.waitForTimeout(66);
      y = await page.evaluate(() => scrollY);
    }
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const m = window.__messung;
      m.laeuft = false;
      return m;
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const f = m.frames.slice(1).sort((a, b) => a - b);
    const p95 = f[Math.floor(f.length * 0.95)] || 0;
    const lang = f.filter((x) => x > 50).length;
    zeilen.push({
      profil: p.name,
      seite: pfad,
      bilder: f.length,
      'über 50 ms': lang,
      'Anteil %': ((lang / Math.max(1, f.length)) * 100).toFixed(1),
      'p95 ms': p95.toFixed(0),
      'max ms': (f[f.length - 1] || 0).toFixed(0),
      'lange Tasks': m.longtasks.length,
      'Summe Tasks ms': m.longtasks.reduce((a, b) => a + b, 0).toFixed(0),
      CLS: m.cls.toFixed(3),
    });
    await ctx.close();
  }
}
await browser.close();
console.table(zeilen);
