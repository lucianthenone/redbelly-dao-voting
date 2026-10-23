// Builds downloads/how-dao-voting-works.docx from tools/.print.html, so the Word file always
// matches the web pages. Brand fonts are embedded from tools/fonts.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import JSZip from 'jszip';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, HeadingLevel, ImageRun, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun,
  VerticalAlign, WidthType, CharacterSet, Tab, TabStopType,
} from 'docx';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'downloads/how-dao-voting-works.docx');

// ---------- 1. Read the page structure ----------

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(ROOT, 'tools/.print.html')).href, { waitUntil: 'load' });
const data = await page.evaluate(() => {
  const clean = (s) => s.replace(/\s+/g, ' ');
  function runs(el) {
    const out = [];
    const walk = (node, fmt) => {
      if (node.nodeType === 3) { if (node.textContent) out.push({ ...fmt, text: clean(node.textContent) }); return; }
      if (node.nodeType !== 1) return;
      const n = node;
      if (n.matches('svg, .figure__links')) return;
      const f = { ...fmt };
      if (n.matches('strong, b')) f.b = true;
      if (n.matches('.ui')) { f.b = true; f.ui = true; }
      if (n.matches('.mono')) f.mono = true;
      if (n.matches('a[href^="http"]')) f.link = n.getAttribute('href');
      n.childNodes.forEach((c) => walk(c, f));
    };
    walk(el, {});
    if (out.length) { out[0].text = out[0].text.replace(/^ /, ''); out[out.length - 1].text = out[out.length - 1].text.replace(/ $/, ''); }
    return out.filter((r) => r.text !== '');
  }
  const blocks = [];
  const hero = document.querySelector('.hero');
  blocks.push({ t: 'hero', caps: hero.querySelector('.hero__eyebrow').textContent.trim(), title: hero.querySelector('h1').textContent.trim(), lead: runs(hero.querySelector('.hero__lead')), meta: [...hero.querySelectorAll('.hero__meta li')].map((li) => li.textContent.trim()) });
  const sum = document.querySelector('.summary');
  blocks.push({ t: 'summary', caps: sum.querySelector('h2').textContent.trim(), items: [...sum.querySelectorAll('.answer')].map((a) => ({ h: a.querySelector('h3').textContent.trim(), p: runs(a.querySelector('p')) })) });
  for (const sec of document.querySelectorAll('.guide > section')) {
    for (const el of sec.children) {
      if (el.matches('.section-num')) blocks.push({ t: 'caps', text: el.textContent.trim() });
      else if (el.matches('h2')) blocks.push({ t: 'h2', text: el.textContent.trim() });
      else if (el.matches('h3')) blocks.push({ t: 'h3', text: el.textContent.trim() });
      else if (el.matches('p.lead')) blocks.push({ t: 'lead', runs: runs(el) });
      else if (el.matches('p.note')) blocks.push({ t: 'note', runs: runs(el) });
      else if (el.matches('p')) blocks.push({ t: 'p', runs: runs(el) });
      else if (el.matches('ol.steps')) blocks.push({ t: 'ol', items: [...el.children].map(runs) });
      else if (el.matches('ul')) blocks.push({ t: 'ul', items: [...el.children].map(runs) });
      else if (el.matches('.callout')) blocks.push({ t: 'box', kind: 'callout', title: el.querySelector('h3').textContent.trim(), runs: runs(el.querySelector('p')) });
      else if (el.matches('.evidence')) blocks.push({ t: 'box', kind: 'evidence', title: el.querySelector('.evidence__title').textContent.trim(), runs: runs(el.querySelector('p:not(.evidence__title)')) });
      else if (el.matches('figure')) blocks.push({ t: 'figure', png: el.querySelector('.figure__links a[href$=".png"]').getAttribute('href'), label: el.querySelector('figcaption .caps').textContent.trim(), caption: runs(el.querySelector('figcaption')).filter((r, i) => i > 0).map((r, i) => (i === 0 ? { ...r, text: r.text.trimStart() } : r)) });
      else if (el.matches('.table-wrap')) {
        const t = el.querySelector('table');
        blocks.push({ t: 'table', head: [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim()), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map(runs)) });
      } else if (el.matches('dl')) blocks.push({ t: 'dl', items: [...el.children].map((d) => ({ dt: d.querySelector('dt').textContent.trim(), dd: runs(d.querySelector('dd')) })) });
      else throw new Error('Unhandled element in section ' + sec.id + ': ' + el.outerHTML.slice(0, 80));
    }
  }
  return blocks;
});
await browser.close();

// ---------- 2. Write the Word file ----------

const C = { ink: '0F1A22', dim: '394853', muted: '596975', accent: 'B3272A', edge: 'C3CDD4', soft: 'F4F6F8', head: 'E6EBEF', ok: '15803D', steel: '1D3140', slate: '141F26', onDark: 'F1F5F8', onDarkDim: 'C2CED6', accentDark: 'FFB3AE', edgeDark: '263641', white: 'FFFFFF' };
const SANS = 'Be Vietnam Pro';
const SEMI = 'Be Vietnam Pro SemiBold';
const MONO = 'JetBrains Mono';
const PAGE_W = 11906, MARGIN = 1134, CONTENT_W = PAGE_W - MARGIN * 2; // A4, 2 cm margins

const textRuns = (rs, { size = 21, color = C.ink, dark = false } = {}) => rs.map((r) => {
  const opts = {
    text: r.text,
    font: r.mono ? MONO : r.b ? SEMI : SANS,
    size: r.mono ? size - 2 : size,
    color: r.link ? (dark ? C.accentDark : C.accent) : r.b ? (dark ? C.onDark : C.ink) : color,
    shading: r.ui ? { type: ShadingType.CLEAR, color: 'auto', fill: C.head } : undefined,
    underline: r.link ? {} : undefined,
  };
  const run = new TextRun(opts);
  return r.link ? new ExternalHyperlink({ link: r.link, children: [run] }) : run;
});
const caps = (text, { color = C.accent, size = 16, after = 60, before = 0 } = {}) => new Paragraph({
  spacing: { before, after },
  keepNext: true,
  children: [new TextRun({ text: text.toUpperCase(), font: SEMI, size, color, characterSpacing: 20 })],
});
const none = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const line = (color, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const cellMargins = { top: 140, bottom: 140, left: 200, right: 200 };

const children = [];
let olInstance = 0;

const logo = readFileSync(resolve(ROOT, 'assets/img/logo-on-light.png'));
children.push(new Paragraph({ spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 84, height: 60 }, altText: { title: 'Redbelly DAO', description: 'Redbelly DAO logo', name: 'logo' } })] }));

for (const b of data) {
  switch (b.t) {
    case 'hero': {
      const inner = [
        caps(b.caps, { color: C.accentDark, after: 120 }),
        new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 160 }, children: [new TextRun({ text: b.title, font: SEMI, size: 56, color: C.onDark })] }),
        new Paragraph({ spacing: { after: 160, line: 300 }, children: textRuns(b.lead, { size: 23, color: C.onDarkDim, dark: true }) }),
        new Paragraph({ children: [new TextRun({ text: b.meta.join('    '), font: MONO, size: 16, color: C.onDarkDim })] }),
      ];
      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], layout: TableLayoutType.FIXED,
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
        rows: [new TableRow({ children: [new TableCell({ width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.steel }, margins: { top: 360, bottom: 360, left: 400, right: 400 }, children: inner })] })],
      }));
      break;
    }
    case 'summary': {
      const half = CONTENT_W / 2;
      const cell = (it) => new TableCell({
        width: { size: half, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.steel },
        margins: cellMargins, verticalAlign: VerticalAlign.TOP,
        borders: { top: line(C.edgeDark, 8), bottom: line(C.edgeDark, 8), left: line(C.edgeDark, 8), right: line(C.edgeDark, 8) },
        children: [
          new Paragraph({ spacing: { after: 80 }, border: { bottom: line('34444F', 4) }, children: [new TextRun({ text: it.h, font: SEMI, size: 21, color: C.accentDark })] }),
          new Paragraph({ spacing: { before: 80 }, children: textRuns(it.p, { size: 20, color: C.onDark, dark: true }) }),
        ],
      });
      children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
      children.push(caps(b.caps, { color: C.muted }));
      const rows = [];
      for (let i = 0; i < b.items.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: [cell(b.items[i]), cell(b.items[i + 1])] }));
      children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [half, half], layout: TableLayoutType.FIXED, rows }));
      break;
    }
    case 'caps': children.push(caps(b.text, { before: 360 })); break;
    case 'h2': children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { after: 140 }, children: [new TextRun({ text: b.text, font: SEMI, size: 32, color: C.ink })] })); break;
    case 'h3': children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: b.text, font: SEMI, size: 24, color: C.ink })] })); break;
    case 'lead': children.push(new Paragraph({ spacing: { after: 160, line: 300 }, children: textRuns(b.runs, { size: 23, color: C.ink }) })); break;
    case 'p': children.push(new Paragraph({ spacing: { after: 140, line: 300 }, children: textRuns(b.runs, { color: C.dim }) })); break;
    case 'note': children.push(new Paragraph({ spacing: { after: 160, line: 288 }, indent: { left: 200 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.edge, space: 8 } }, children: textRuns(b.runs, { size: 19, color: C.dim }) })); break;
    case 'ol':
      olInstance += 1;
      for (const it of b.items) children.push(new Paragraph({ numbering: { reference: 'steps', level: 0, instance: olInstance }, spacing: { after: 100, line: 300 }, children: textRuns(it, { color: C.dim }) }));
      break;
    case 'ul':
      for (const it of b.items) children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 100, line: 300 }, children: textRuns(it, { color: C.dim }) }));
      break;
    case 'box': {
      const evidence = b.kind === 'evidence';
      children.push(new Table({
        width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], layout: TableLayoutType.FIXED,
        rows: [new TableRow({ cantSplit: true, children: [new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.soft }, margins: cellMargins,
          borders: { top: line(C.edge), bottom: line(C.edge), right: line(C.edge), left: evidence ? line(C.ok, 24) : line(C.edge) },
          children: [
            evidence ? caps(b.title, { color: C.ok, after: 80 }) : new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: b.title, font: SEMI, size: 22, color: C.ink })] }),
            new Paragraph({ spacing: { line: 300 }, children: textRuns(b.runs, { size: 20, color: C.dim }) }),
          ],
        })] })],
      }));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      break;
    }
    case 'figure': {
      const png = readFileSync(resolve(ROOT, 'tools', b.png));
      const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
      const width = 560, height = Math.round((h / w) * width);
      children.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 100 }, alignment: AlignmentType.LEFT, children: [new ImageRun({ type: 'png', data: png, transformation: { width, height }, altText: { title: b.label, description: b.caption.map((r) => r.text).join(''), name: b.label } })] }));
      children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `${b.label.toUpperCase()}   `, font: SEMI, size: 16, color: C.accent, characterSpacing: 20 }), ...textRuns(b.caption, { size: 18, color: C.dim })] }));
      break;
    }
    case 'table': {
      const cols = b.head.length;
      const widths = cols === 2 ? [Math.round(CONTENT_W * 0.5), CONTENT_W - Math.round(CONTENT_W * 0.5)] : [Math.round(CONTENT_W * 0.36), Math.round(CONTENT_W * 0.3), CONTENT_W - Math.round(CONTENT_W * 0.36) - Math.round(CONTENT_W * 0.3)];
      const border = { top: line(C.edge), bottom: line(C.edge), left: line(C.edge), right: line(C.edge) };
      const head = new TableRow({ tableHeader: true, children: b.head.map((t, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.head }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, borders: border, children: [caps(t, { color: C.muted, after: 0 })] })) });
      const rows = b.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((rs, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, borders: border, children: [new Paragraph({ spacing: { line: 276 }, children: textRuns(rs, { size: 19, color: C.dim }) })] })) }));
      children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: [head, ...rows] }));
      children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      break;
    }
    case 'dl': {
      const widths = [2600, CONTENT_W - 2600];
      const border = { top: none, left: none, right: none, bottom: line(C.edge) };
      const rows = b.items.map((it) => new TableRow({ cantSplit: true, children: [
        new TableCell({ width: { size: widths[0], type: WidthType.DXA }, borders: border, margins: { top: 100, bottom: 100, left: 0, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: it.dt, font: SEMI, size: 20, color: C.ink })] })] }),
        new TableCell({ width: { size: widths[1], type: WidthType.DXA }, borders: border, margins: { top: 100, bottom: 100, left: 160, right: 0 }, children: [new Paragraph({ spacing: { line: 276 }, children: textRuns(it.dd, { size: 20, color: C.dim }) })] }),
      ] }));
      children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: { top: line(C.edge), bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows }));
      break;
    }
    default: throw new Error(`Unknown block ${b.t}`);
  }
}

const footer = new Footer({ children: [new Paragraph({
  style: 'FooterText',
  border: { top: line(C.edge) }, spacing: { before: 120 },
  tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
  children: [
    new TextRun({ text: 'How DAO voting works now. Last verified 22 October 2026.', font: SANS, size: 15, color: C.muted }),
    ...[[new Tab(), 'Page '], [PageNumber.CURRENT], [' of '], [PageNumber.TOTAL_PAGES]].map((c) => new TextRun({ children: c, font: SANS, size: 15, color: C.muted })),
  ],
})] });

const doc = new Document({
  title: 'How DAO Voting Works Now',
  subject: 'Redbelly DAO member guide',
  description: 'How voting works on the Redbelly DAO governance platform. Last verified 22 October 2026.',
  creator: 'Redbelly DAO',
  lastModifiedBy: 'Redbelly DAO',
  fonts: [
    { name: SANS, data: readFileSync(resolve(ROOT, 'tools/fonts/BeVietnamPro-400.ttf')), characterSet: CharacterSet.ANSI },
    { name: SEMI, data: readFileSync(resolve(ROOT, 'tools/fonts/BeVietnamPro-600.ttf')), characterSet: CharacterSet.ANSI },
    { name: MONO, data: readFileSync(resolve(ROOT, 'tools/fonts/JetBrainsMono-400.ttf')), characterSet: CharacterSet.ANSI },
  ],
  styles: {
    default: { document: { run: { font: SANS, size: 21, color: C.ink } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: SEMI, size: 56, color: C.onDark } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SEMI, size: 32, color: C.ink }, paragraph: { outlineLevel: 0 } },
      { id: 'FooterText', name: 'Footer Text', basedOn: 'Normal', run: { font: SANS, size: 15, color: C.muted } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: SEMI, size: 24, color: C.ink }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL_ZERO, text: '%1', alignment: AlignmentType.LEFT, style: { run: { font: MONO, size: 17, color: C.accent }, paragraph: { indent: { left: 560, hanging: 560 } } } }] },
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { color: C.accent }, paragraph: { indent: { left: 400, hanging: 280 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    footers: { default: footer },
    children,
  }],
});

// Word expects upper case font keys, and the embedTrueTypeFonts setting tells
// Word and LibreOffice to use the fonts carried inside the file.
const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
const fontTable = await zip.file('word/fontTable.xml').async('string');
zip.file('word/fontTable.xml', fontTable.replace(/w:fontKey="\{([0-9a-f-]+)\}"/g, (m, k) => `w:fontKey="{${k.toUpperCase()}}"`));
const settings = await zip.file('word/settings.xml').async('string');
if (!settings.includes('<w:displayBackgroundShape/>')) throw new Error('settings.xml layout changed');
zip.file('word/settings.xml', settings.replace('<w:displayBackgroundShape/>', '<w:displayBackgroundShape/><w:embedTrueTypeFonts/>'));
writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`wrote ${OUT}`);
