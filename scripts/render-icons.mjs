// Erzeugt Favicons und das Social-Media-Vorschaubild (Open Graph).
// Voraussetzung: laufender Dev-Server. Aufruf: node scripts/render-icons.mjs [url]
import sharp from 'sharp';
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:4321';
const svg = fs.readFileSync('public/brand/ip3-app-icon-blau.svg');
await sharp(svg, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icon-512.png');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'LF';src:url('${base}/fonts/LibreFranklin-ExtraBold.woff2') format('woff2');font-weight:800}
@font-face{font-family:'LF';src:url('${base}/fonts/LibreFranklin-Regular.woff2') format('woff2');font-weight:400}
@font-face{font-family:'SG';src:url('${base}/fonts/SpaceGrotesk-Medium.woff2') format('woff2');font-weight:500}
html,body{margin:0;width:1200px;height:630px;background:#0c1a3d;overflow:hidden}
.bg{position:absolute;inset:0;background:url('${base}/img/story/modul-1600.webp') 78% 50%/cover no-repeat}
.z{position:absolute;right:-120px;top:-80px;height:820px;opacity:.16}
.t{position:absolute;left:64px;top:56px;width:640px;color:#fff}
.logo{width:250px}
.k{margin-top:110px;font:500 15px/1 SG,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#e8e7ef;display:flex;gap:12px;align-items:center}
.k:before{content:'';width:9px;height:9px;background:#c83c30}
h1{margin:18px 0 0;font:800 92px/0.92 LF,sans-serif;letter-spacing:-.04em}
h1 span{color:#c83c30}
p{margin:22px 0 0;font:400 24px/1.3 LF,sans-serif;color:rgba(255,255,255,.75)}
p b{color:#c83c30;font-weight:400}
</style></head><body><div class="bg"></div><img class="z" src="${base}/brand/zeichen-3-kontur-akzent.png">
<div class="t"><img class="logo" src="${base}/brand/ip3-energietechnik-weiss.svg"><div class="k">Photovoltaik · Batteriespeicher</div>
<h1>Energie<br>hoch drei<span>.</span></h1><p>Planung <b>·</b> Beratung <b>·</b> Umsetzung</p></div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(base + '/robots.txt').catch(() => {});
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const buf = await page.screenshot({ type: 'png' });
fs.mkdirSync('public/img', { recursive: true });
await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile('public/img/og-ip3.jpg');
await browser.close();
console.log('ok');
