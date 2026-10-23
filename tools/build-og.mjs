// Renders the 1200 x 630 social preview image to assets/img/og-image.png.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const font = (f) => pathToFileURL(resolve(ROOT, 'assets/fonts', f)).href;
const logo = readFileSync(resolve(ROOT, 'assets/img/logo-on-dark.svg'), 'utf8');

const html = `<!doctype html><html><head><style>
@font-face{font-family:'Be Vietnam Pro';font-weight:400;src:url('${font('BeVietnamPro-400.woff2')}')}
@font-face{font-family:'Be Vietnam Pro';font-weight:700;src:url('${font('BeVietnamPro-700.woff2')}')}
@font-face{font-family:'JetBrains Mono';font-weight:100 800;src:url('${font('JetBrainsMono-Variable.woff2')}')}
html,body{margin:0}
.card{width:1200px;height:630px;box-sizing:border-box;background:#0c1317;color:#f1f5f8;font-family:'Be Vietnam Pro',sans-serif;
  display:grid;grid-template-columns:1fr 380px;align-items:center;gap:40px;padding:60px 64px;position:relative;overflow:hidden}
.card::before{content:"";position:absolute;inset:0 0 auto 0;height:8px;background:#EF5350}
.band{position:absolute;right:0;top:0;bottom:0;width:470px;background:#1d3140;border-left:1px solid #263641}
.text{position:relative}
.caps{font-size:18px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#ffb3ae;margin:0 0 22px}
h1{font-size:68px;line-height:1.05;letter-spacing:-.02em;font-weight:700;margin:0 0 24px}
p{font-size:25px;line-height:1.45;color:#c2ced6;margin:0 0 34px;max-width:620px}
.mono{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:17px;letter-spacing:.06em;color:#8fa1ad;display:flex;align-items:center;gap:12px}
.dot{width:10px;height:10px;border-radius:50%;background:#86EFAC}
.logo{position:relative;justify-self:center}
.logo svg{width:340px;height:auto;display:block}
</style></head><body><div class="card"><div class="band"></div>
<div class="text"><p class="caps">Redbelly DAO member guide</p><h1>How DAO voting works now</h1>
<p>How to vote, when eligibility is checked, and how many votes each verified wallet gets.</p>
<div class="mono"><span class="dot"></span>LAST VERIFIED 22 OCT 2026</div></div>
<div class="logo">${logo}</div></div></body></html>`;

const tmp = resolve(ROOT, 'tools/.og.html');
writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(tmp).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: resolve(ROOT, 'assets/img/og-image.png') });
await browser.close();
rmSync(tmp, { force: true });
console.log('wrote assets/img/og-image.png');
