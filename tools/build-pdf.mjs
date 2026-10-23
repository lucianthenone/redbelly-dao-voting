// Prints tools/.print.html (every section on one page) to downloads/how-dao-voting-works.pdf (A4, light theme, print stylesheet).
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'downloads/how-dao-voting-works.pdf');

const browser = await chromium.launch();
const context = await browser.newContext({ colorScheme: 'light' });
const page = await context.newPage();
await page.goto(pathToFileURL(resolve(ROOT, 'tools/.print.html')).href, { waitUntil: 'load' });
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  document.title = 'How DAO Voting Works Now';
  return document.fonts.ready;
});
await page.emulateMedia({ media: 'print', colorScheme: 'light' });

const footer = `
  <div style="width:100%; padding:0 15mm; font-family:Helvetica, Arial, sans-serif; font-size:7.5px; color:#596975; display:flex; justify-content:space-between;">
    <span>How DAO voting works now. Last verified 22 October 2026.</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: footer,
  tagged: true,
  outline: true,
});
await browser.close();
console.log(`wrote ${OUT}`);
