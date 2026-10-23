// Fails if anything shipped breaks a brand or task rule:
// no en or em dashes, no emoji, no credit lines, every local link resolves,
// every diagram carries its last verified line, the downloads exist and match.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (file, msg) => problems.push(`${relative(ROOT, file) || file}: ${msg}`);

const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.md', '.json', '.svg', '.drawio', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor']);
const LICENCES = new Set(['assets/fonts/OFL.txt', 'tools/fonts/OFL.txt']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIRS.has(name)) continue;
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(ROOT);

const DASHES = /[\u2012\u2013\u2014\u2015]/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
// Credit lines and handles that must never appear inside the deliverable.
const CREDIT = /\b(made by|created by|designed by|built by|written by|prepared by|submitted by|author:|signed,)\b/i;

function scanText(file, text) {
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (DASHES.test(l)) fail(file, `line ${i + 1} has an en or em dash`);
    if (EMOJI.test(l)) fail(file, `line ${i + 1} has an emoji or pictograph`);
    if (CREDIT.test(l)) fail(file, `line ${i + 1} looks like a credit line`);
  });
}

for (const f of files) {
  const rel = relative(ROOT, f);
  if (!TEXT.has(extname(f)) || LICENCES.has(rel) || rel === 'tools/check.mjs' || rel === 'tools/package-lock.json') continue;
  scanText(f, readFileSync(f, 'utf8'));
}

// Local links, page links and anchors resolve on every page.
const PAGES = readdirSync(ROOT).filter((n) => n.endsWith('.html'));
const pageHtml = Object.fromEntries(PAGES.map((n) => [n, readFileSync(resolve(ROOT, n), 'utf8')]));
for (const [name, page] of Object.entries(pageHtml)) {
  for (const [, url] of page.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    if (/\.html(#|$)/.test(url) && pageHtml[url.split('#')[0]]) fail(name, `link ${url} should use the clean URL`);
    const [raw, anchor] = url.split('#');
    // Clean URLs: "./" is index.html and "troubleshoot" is troubleshoot.html.
    const file = raw === './' ? 'index.html' : raw && !/\.[a-z0-9]+$/i.test(raw) ? `${raw}.html` : raw;
    const target = file || name;
    if (file && !existsSync(resolve(ROOT, file))) { fail(name, `broken local link ${url}`); continue; }
    if (anchor && anchor !== 'top' && target.endsWith('.html') && !pageHtml[target]?.includes(`id="${anchor}"`)) fail(name, `anchor ${url} has no target`);
  }
}
const html = Object.values(pageHtml).join('\n');
const css = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) {
  if (!existsSync(resolve(ROOT, 'assets/css', url))) fail('assets/css/style.css', `missing ${url}`);
}

// Diagrams: three inline, each export carries the last verified line.
const countInline = (h) => (h.match(/<svg[^>]*class="diagram"/g) || []).length;
const topicInline = PAGES.reduce((n, p) => n + countInline(pageHtml[p]), 0);
if (PAGES.includes('print.html')) fail('print.html', 'the print page must stay in tools/, not be published');
if (topicInline !== 3) fail('pages', `expected 3 inline diagrams across the pages, found ${topicInline}`);
const printFile = resolve(ROOT, 'tools/.print.html');
if (existsSync(printFile) && countInline(readFileSync(printFile, 'utf8')) !== 3) fail('tools/.print.html', 'expected all 3 diagrams');
for (const f of readdirSync(resolve(ROOT, 'diagrams')).filter((n) => n.endsWith('.svg'))) {
  const svg = readFileSync(resolve(ROOT, 'diagrams', f), 'utf8');
  if (!svg.includes('LAST VERIFIED')) fail(`diagrams/${f}`, 'missing the last verified line');
}
for (const id of ['01-verification-to-vote', '02-snapshot-timeline', '03-wallets-and-votes']) {
  for (const f of [`diagrams/${id}.svg`, `diagrams/${id}-dark.svg`, `diagrams/${id}.png`, `diagrams/${id}-dark.png`, `diagrams/source/${id}.drawio`]) {
    if (!existsSync(resolve(ROOT, f))) fail(f, 'missing');
  }
}

// Downloads exist, and their text passes the same rules.
const pdf = resolve(ROOT, 'downloads/how-dao-voting-works.pdf');
const docx = resolve(ROOT, 'downloads/how-dao-voting-works.docx');
for (const f of [pdf, docx, resolve(ROOT, 'downloads/dao-voting-diagrams.zip')]) if (!existsSync(f)) fail(f, 'missing');
if (existsSync(docx)) {
  const zip = await JSZip.loadAsync(readFileSync(docx));
  const xml = await zip.file('word/document.xml').async('string');
  const text = xml.replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '');
  scanText(docx, text);
  if (!text.includes('LAST VERIFIED 22 OCT 2026')) fail(docx, 'missing the last verified line');
  const core = await zip.file('docProps/core.xml').async('string');
  const creator = (core.match(/<dc:creator>([^<]*)</) || [])[1];
  if (creator !== 'Redbelly DAO') fail(docx, `document creator is "${creator}", expected the DAO name only`);
}
if (existsSync(pdf)) {
  try {
    const text = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8' });
    scanText(pdf, text);
    const raw = readFileSync(pdf, 'latin1');
    if (/file:\/\//.test(raw)) fail(pdf, 'contains a file:// link to the build folder');
  } catch {
    console.log('pdftotext not found, skipped the PDF text scan');
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n` + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log(`All checks passed on ${files.length} files.`);
