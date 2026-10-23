// Builds every diagram from diagrams/source/diagrams.mjs:
//   diagrams/<id>.svg and <id>-dark.svg   standalone SVG, light and dark
//   diagrams/<id>.png and <id>-dark.png   PNG at 2x
//   diagrams/source/<id>.drawio           editable in diagrams.net (light)
//   diagrams/inline/<id>.svg              theme-aware SVG that build-pages.mjs places in the pages
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { diagrams, LAST_VERIFIED } from '../diagrams/source/diagrams.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Task Board brand tokens (taskboard.redbellydao.network/brand).
const THEMES = {
  light: { bg: '#EDF1F4', card: '#FFFFFF', edge: '#C3CDD4', zone: '#8FA1AD', steel: '#DDE6ED', ink: '#0F1A22', dim: '#394853', muted: '#596975', accent: '#B3272A', brand: '#EF5350', ok: '#15803D', no: '#B3261E' },
  dark: { bg: '#0c1317', card: '#141f26', edge: '#34444f', zone: '#34444f', steel: '#1d3140', ink: '#f1f5f8', dim: '#c2ced6', muted: '#8fa1ad', accent: '#ffb3ae', brand: '#EF5350', ok: '#86EFAC', no: '#ffb4ab' },
};
const SANS = "'Be Vietnam Pro', ui-sans-serif, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Rough advance widths, used only to size label backgrounds and draw.io text boxes.
const textWidth = (s, size, mono = false) => s.length * size * (mono ? 0.6 : 0.56);

// ---------- SVG ----------

function css(t) {
  return `.dg-bg{fill:${t.bg}}.dg-card{fill:${t.card};stroke:${t.edge}}.dg-steel{fill:${t.steel};stroke:${t.edge}}` +
    `.dg-zone{fill:none;stroke:${t.zone}}.dg-band{fill:${t.steel}}` +
    `.dg-ink{fill:${t.ink}}.dg-dim{fill:${t.dim}}.dg-muted{fill:${t.muted}}.dg-accent{fill:${t.accent}}` +
    `.dg-f-brand{fill:${t.brand}}.dg-f-ok{fill:${t.ok}}.dg-f-no{fill:${t.no}}.dg-f-muted{fill:${t.muted}}` +
    `.dg-s-line{stroke:${t.muted}}.dg-s-brand{stroke:${t.brand}}.dg-s-ok{stroke:${t.ok}}.dg-s-no{stroke:${t.no}}.dg-s-muted{stroke:${t.muted}}.dg-s-edge{stroke:${t.edge}}` +
    `.dg-sans{font-family:${SANS}}.dg-mono{font-family:${MONO}}`;
}

function svgFor(d, mode) {
  const p = `${d.id.slice(0, 2)}`; // marker id prefix, unique per diagram
  const tones = ['line', 'brand', 'ok', 'no', 'muted'];
  const out = [];
  const T = (x, y, text, { cls = 'dim', size = 14, weight = 400, anchor = 'start', mono = false, spacing = 0 } = {}) =>
    out.push(`<text x="${x}" y="${y}" class="dg-${cls} dg-${mono ? 'mono' : 'sans'}" font-size="${size}" font-weight="${weight}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${spacing ? ` letter-spacing="${spacing}"` : ''}>${esc(text)}</text>`);
  const toneFill = (tone) => (tone === 'ok' ? 'f-ok' : tone === 'no' ? 'f-no' : tone === 'brand' ? 'f-brand' : 'f-muted');
  const toneText = (tone) => (tone === 'ok' ? 'f-ok' : tone === 'no' ? 'f-no' : 'accent');

  out.push(`<rect class="dg-bg" width="${d.width}" height="${d.height}"/>`);
  for (const e of d.elements) {
    switch (e.type) {
      case 'heading':
        T(e.x, e.y, e.caps.toUpperCase(), { cls: 'accent', size: 13, weight: 700, spacing: 1.3 });
        T(e.x, e.y + 24, e.sub, { cls: 'dim', size: 15 });
        break;
      case 'zone':
        out.push(`<rect class="dg-zone" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="8" stroke-width="1.5" stroke-dasharray="6 5"/>`);
        T(e.labelX ?? e.x + 16, e.y + 24, e.label.toUpperCase(), { cls: 'muted', size: 12, weight: 700, spacing: 1.2 });
        if (e.note) T(e.x + e.w - 16, e.y + 24, e.note, { cls: 'muted', size: 12, mono: true, anchor: 'end' });
        break;
      case 'box': {
        const cls = e.variant === 'steel' ? 'steel' : 'card';
        const stroke = { brand: ' dg-s-brand', ok: ' dg-s-ok', no: ' dg-s-no' }[e.variant] || '';
        out.push(`<rect class="dg-${cls}${stroke}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="4" stroke-width="${stroke ? 1.75 : 1}"/>`);
        T(e.x + 16, e.y + 26, e.num, { cls: toneText(e.variant), size: 12, weight: 600, mono: true, spacing: 0.6 });
        const titles = e.titleLines || [e.title];
        titles.forEach((t, i) => T(e.x + 16, e.y + 50 + i * 20, t, { cls: 'ink', size: 16, weight: 600 }));
        const top = e.y + 50 + (titles.length - 1) * 20 + 24;
        e.lines.forEach((l, i) => T(e.x + 16, top + i * 20, l, { cls: 'dim', size: 14 }));
        break;
      }
      case 'arrow': {
        const tone = e.tone || 'line';
        const pts = e.points.map(([x, y]) => `${x},${y}`).join(' ');
        out.push(`<polyline class="dg-s-${tone}" points="${pts}" fill="none" stroke-width="1.75" stroke-linejoin="round" marker-end="url(#${p}-arrow-${tone})"/>`);
        if (e.label) {
          const L = e.label;
          const w = textWidth(L.text, 13) + 16;
          const anchor = L.anchor || 'middle';
          const x0 = anchor === 'middle' ? L.x - w / 2 : anchor === 'end' ? L.x - w : L.x - 8;
          if (L.bg !== false) out.push(`<rect class="dg-bg" x="${x0}" y="${L.y - 14}" width="${w}" height="20" rx="4"/>`);
          T(L.x, L.y, L.text, { cls: L.tone ? toneText(L.tone) : 'dim', size: 13, weight: L.tone ? 700 : 500, anchor });
        }
        break;
      }
      case 'band':
        out.push(`<rect class="dg-band" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" opacity="0.7"/>`);
        T(e.x + e.w / 2, e.y + 22, e.label.toUpperCase(), { cls: 'muted', size: 11, weight: 700, anchor: 'middle', spacing: 1.1 });
        break;
      case 'vline':
        out.push(`<line class="dg-s-${e.tone}" x1="${e.x}" y1="${e.y1}" x2="${e.x}" y2="${e.y2}" stroke-width="${e.tone === 'brand' ? 2 : 1.25}" stroke-dasharray="${e.tone === 'brand' ? '0' : '4 4'}"/>`);
        break;
      case 'text':
        T(e.x, e.y, e.text, { cls: e.cls, size: e.size, weight: e.weight, anchor: e.anchor, mono: e.mono });
        break;
      case 'pill': {
        const w = textWidth(e.text, 11, true) + 20;
        out.push(`<rect class="dg-card dg-s-brand" x="${e.x - w / 2}" y="${e.y - 12}" width="${w}" height="24" rx="4" stroke-width="1.5"/>`);
        T(e.x, e.y + 4, e.text, { cls: 'accent', size: 11, weight: 600, mono: true, anchor: 'middle', spacing: 0.6 });
        break;
      }
      case 'track':
        out.push(`<line class="dg-s-${e.tone}" x1="${e.x1}" y1="${e.y}" x2="${e.x2}" y2="${e.y}" stroke-width="3" stroke-linecap="round"/>`);
        out.push(`<circle class="dg-${toneFill(e.tone)}" cx="${e.x1}" cy="${e.y}" r="7"/>`);
        T(e.x1, e.y - 14, e.dotLabel, { cls: 'dim', size: 12, anchor: 'middle' });
        break;
      case 'status':
        out.push(`<circle class="dg-${toneFill(e.tone)}" cx="${e.x + 5}" cy="${e.y - 4}" r="5"/>`);
        T(e.x + 16, e.y, e.text, { cls: toneFill(e.tone), size: 13, weight: 600, mono: true, spacing: 0.5 });
        if (e.sub) T(e.x + 16, e.y + 18, e.sub, { cls: 'dim', size: 12 });
        break;
      case 'note':
        e.lines.forEach((l, i) => T(e.x, e.y + i * 22, l, { cls: 'dim', size: 14 }));
        break;
      case 'wallet': {
        const stroke = e.tone === 'ok' ? 'dg-s-ok' : 'dg-s-edge';
        out.push(`<rect class="dg-card ${stroke}" x="${e.x}" y="${e.y}" width="240" height="68" rx="4" stroke-width="${e.tone === 'ok' ? 1.75 : 1}"/>`);
        T(e.x + 16, e.y + 29, e.title, { cls: 'ink', size: 16, weight: 600 });
        T(e.x + 16, e.y + 51, e.sub, { cls: 'dim', size: 14 });
        out.push(`<circle class="dg-${toneFill(e.tone)}" cx="${e.x + 272}" cy="${e.y + 30}" r="5"/>`);
        T(e.x + 284, e.y + 35, e.result, { cls: toneFill(e.tone), size: 14, weight: 600, mono: true, spacing: 0.5 });
        out.push(`<line class="dg-s-edge" x1="${e.x + 240}" y1="${e.y + 34}" x2="${e.x + 260}" y2="${e.y + 34}" stroke-width="1.25"/>`);
        break;
      }
      case 'fan': {
        const [fx, fy] = e.from;
        const mid = fx + 30;
        for (const [tx, ty] of e.to) {
          out.push(`<polyline class="dg-s-line" points="${fx},${fy} ${mid},${fy} ${mid},${ty} ${tx},${ty}" fill="none" stroke-width="1.5" stroke-linejoin="round"/>`);
        }
        break;
      }
      case 'total':
        out.push(`<rect class="dg-steel" x="${e.x}" y="${e.y}" width="${e.w}" height="56" rx="8"/>`);
        T(e.x + 20, e.y + 24, e.text, { cls: 'ink', size: 15, weight: 600 });
        T(e.x + 20, e.y + 44, e.sub, { cls: 'dim', size: 13 });
        break;
      case 'footer':
        out.push(`<line class="dg-s-edge" x1="28" y1="${e.y - 20}" x2="${d.width - 28}" y2="${e.y - 20}" stroke-width="1"/>`);
        T(28, e.y, `LAST VERIFIED ${LAST_VERIFIED}`, { cls: 'muted', size: 11, weight: 500, mono: true, spacing: 0.6 });
        T(d.width - 28, e.y, 'redbelly-governance.vercel.app', { cls: 'muted', size: 11, mono: true, anchor: 'end' });
        break;
      default:
        throw new Error(`Unknown element type ${e.type}`);
    }
  }

  const markers = tones.map((tone) =>
    `<marker id="${p}-arrow-${tone}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="dg-${toneFill(tone === 'line' ? 'muted' : tone)}"/></marker>`).join('');
  const titleId = `${p}-title`, descId = `${p}-desc`;
  const style = mode === 'inline' ? '' : `<style>${css(THEMES[mode])}</style>`;
  const size = mode === 'inline' ? '' : ` width="${d.width}" height="${d.height}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.width} ${d.height}"${size} role="img" aria-labelledby="${titleId} ${descId}" class="diagram">` +
    `<title id="${titleId}">${esc(d.title)}</title><desc id="${descId}">${esc(d.alt)}</desc>${style}<defs>${markers}</defs>\n${out.join('\n')}\n</svg>\n`;
}

// ---------- draw.io ----------

function drawioFor(d) {
  const t = THEMES.light;
  const cells = [];
  let n = 2;
  const id = () => `c${n++}`;
  const font = (mono) => (mono ? 'JetBrains Mono' : 'Be Vietnam Pro');
  const vertex = (value, style, x, y, w, h) =>
    cells.push(`<mxCell id="${id()}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  const edge = (pts, style) => {
    const [s, ...rest] = pts; const tgt = rest.pop();
    const mid = rest.length ? `<Array as="points">${rest.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join('')}</Array>` : '';
    cells.push(`<mxCell id="${id()}" value="" style="${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${s[0]}" y="${s[1]}" as="sourcePoint"/><mxPoint x="${tgt[0]}" y="${tgt[1]}" as="targetPoint"/>${mid}</mxGeometry></mxCell>`);
  };
  const text = (x, y, s, { color = t.dim, size = 14, bold = false, anchor = 'start', mono = false } = {}) => {
    const w = Math.ceil(textWidth(s, size, mono)) + 12;
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
    vertex(s, `text;html=1;strokeColor=none;fillColor=none;align=${align};verticalAlign=bottom;spacing=0;fontColor=${color};fontSize=${size};fontFamily=${font(mono)};fontStyle=${bold ? 1 : 0};`, x0, y - size * 1.25, w, size * 1.45);
  };
  const toneColor = (tone) => ({ ok: t.ok, no: t.no, brand: t.brand, muted: t.muted, line: t.muted }[tone] || t.muted);
  const toneText = (tone) => (tone === 'ok' ? t.ok : tone === 'no' ? t.no : t.accent);

  for (const e of d.elements) {
    switch (e.type) {
      case 'heading':
        text(e.x, e.y, e.caps.toUpperCase(), { color: t.accent, size: 13, bold: true });
        text(e.x, e.y + 24, e.sub, { color: t.dim, size: 15 });
        break;
      case 'zone':
        vertex('', `rounded=1;arcSize=3;absoluteArcSize=1;fillColor=none;dashed=1;dashPattern=6 5;strokeColor=${t.zone};strokeWidth=1.5;`, e.x, e.y, e.w, e.h);
        text(e.labelX ?? e.x + 16, e.y + 24, e.label.toUpperCase(), { color: t.muted, size: 12, bold: true });
        if (e.note) text(e.x + e.w - 16, e.y + 24, e.note, { color: t.muted, size: 12, mono: true, anchor: 'end' });
        break;
      case 'box': {
        const stroke = { brand: t.brand, ok: t.ok, no: t.no }[e.variant] || t.edge;
        const fill = e.variant === 'steel' ? t.steel : t.card;
        const titles = (e.titleLines || [e.title]).map(esc).join('<br>');
        const html = `<font face="JetBrains Mono" style="font-size:12px" color="${toneText(e.variant)}"><b>${esc(e.num)}</b></font><br>` +
          `<font style="font-size:16px" color="${t.ink}"><b>${titles}</b></font><br>${e.lines.map(esc).join('<br>')}`;
        cells.push(`<mxCell id="${id()}" value="${esc(html)}" style="rounded=1;arcSize=4;absoluteArcSize=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=14;spacingTop=6;fillColor=${fill};strokeColor=${stroke};strokeWidth=${stroke === t.edge ? 1 : 1.75};fontColor=${t.dim};fontSize=14;fontFamily=Be Vietnam Pro;" vertex="1" parent="1"><mxGeometry x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" as="geometry"/></mxCell>`);
        break;
      }
      case 'arrow':
        edge(e.points, `endArrow=block;endFill=1;html=1;rounded=0;strokeColor=${toneColor(e.tone || 'line')};strokeWidth=1.75;`);
        if (e.label) text(e.label.x, e.label.y, e.label.text, { color: e.label.tone ? toneText(e.label.tone) : t.dim, size: 13, bold: !!e.label.tone, anchor: e.label.anchor || 'middle' });
        break;
      case 'band':
        vertex('', `rounded=0;fillColor=${t.steel};strokeColor=none;opacity=70;`, e.x, e.y, e.w, e.h);
        text(e.x + e.w / 2, e.y + 22, e.label.toUpperCase(), { color: t.muted, size: 11, bold: true, anchor: 'middle' });
        break;
      case 'vline':
        edge([[e.x, e.y1], [e.x, e.y2]], `endArrow=none;html=1;strokeColor=${toneColor(e.tone)};strokeWidth=${e.tone === 'brand' ? 2 : 1.25};${e.tone === 'brand' ? '' : 'dashed=1;dashPattern=4 4;'}`);
        break;
      case 'text':
        text(e.x, e.y, e.text, { color: { ink: t.ink, dim: t.dim, muted: t.muted }[e.cls] || t.dim, size: e.size, bold: (e.weight || 400) >= 600, anchor: e.anchor, mono: e.mono });
        break;
      case 'pill': {
        const w = textWidth(e.text, 11, true) + 20;
        vertex(e.text, `rounded=1;arcSize=4;absoluteArcSize=1;html=1;fillColor=${t.card};strokeColor=${t.brand};strokeWidth=1.5;fontColor=${t.accent};fontSize=11;fontFamily=JetBrains Mono;fontStyle=1;`, e.x - w / 2, e.y - 12, w, 24);
        break;
      }
      case 'track':
        edge([[e.x1, e.y], [e.x2, e.y]], `endArrow=none;html=1;strokeColor=${toneColor(e.tone)};strokeWidth=3;`);
        vertex('', `ellipse;fillColor=${toneColor(e.tone)};strokeColor=none;`, e.x1 - 7, e.y - 7, 14, 14);
        text(e.x1, e.y - 14, e.dotLabel, { color: t.dim, size: 12, anchor: 'middle' });
        break;
      case 'status':
        vertex('', `ellipse;fillColor=${toneColor(e.tone)};strokeColor=none;`, e.x, e.y - 9, 10, 10);
        text(e.x + 16, e.y, e.text, { color: toneColor(e.tone), size: 13, bold: true, mono: true });
        if (e.sub) text(e.x + 16, e.y + 18, e.sub, { color: t.dim, size: 12 });
        break;
      case 'note':
        e.lines.forEach((l, i) => text(e.x, e.y + i * 22, l, { color: t.dim, size: 14 }));
        break;
      case 'wallet':
        vertex(`<font style="font-size:16px" color="${t.ink}"><b>${esc(e.title)}</b></font><br>${esc(e.sub)}`,
          `rounded=1;arcSize=4;absoluteArcSize=1;whiteSpace=wrap;html=1;align=left;verticalAlign=middle;spacingLeft=14;fillColor=${t.card};strokeColor=${e.tone === 'ok' ? t.ok : t.edge};strokeWidth=${e.tone === 'ok' ? 1.75 : 1};fontColor=${t.dim};fontSize=14;fontFamily=Be Vietnam Pro;`, e.x, e.y, 240, 68);
        edge([[e.x + 240, e.y + 34], [e.x + 260, e.y + 34]], `endArrow=none;html=1;strokeColor=${t.edge};`);
        vertex('', `ellipse;fillColor=${toneColor(e.tone)};strokeColor=none;`, e.x + 267, e.y + 25, 10, 10);
        text(e.x + 284, e.y + 35, e.result, { color: toneColor(e.tone), size: 14, bold: true, mono: true });
        break;
      case 'fan':
        for (const to of e.to) edge([e.from, [e.from[0] + 30, e.from[1]], [e.from[0] + 30, to[1]], to], `endArrow=none;html=1;rounded=0;strokeColor=${t.muted};strokeWidth=1.5;`);
        break;
      case 'total':
        vertex(`<font style="font-size:15px" color="${t.ink}"><b>${esc(e.text)}</b></font><br><font style="font-size:13px">${esc(e.sub)}</font>`,
          `rounded=1;arcSize=8;absoluteArcSize=1;whiteSpace=wrap;html=1;align=left;verticalAlign=middle;spacingLeft=20;fillColor=${t.steel};strokeColor=none;fontColor=${t.dim};fontFamily=Be Vietnam Pro;`, e.x, e.y, e.w, 56);
        break;
      case 'footer':
        edge([[28, e.y - 20], [d.width - 28, e.y - 20]], `endArrow=none;html=1;strokeColor=${t.edge};`);
        text(28, e.y, `LAST VERIFIED ${LAST_VERIFIED}`, { color: t.muted, size: 11, mono: true });
        text(d.width - 28, e.y, 'redbelly-governance.vercel.app', { color: t.muted, size: 11, mono: true, anchor: 'end' });
        break;
      default:
        throw new Error(`Unknown element type ${e.type}`);
    }
  }
  return `<mxfile host="app.diagrams.net" type="device">\n<diagram id="${d.id}" name="${esc(d.title)}">\n` +
    `<mxGraphModel dx="${d.width}" dy="${d.height}" grid="1" gridSize="4" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${d.width}" pageHeight="${d.height}" background="${t.bg}" math="0" shadow="0">\n` +
    `<root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${cells.join('\n')}\n</root>\n</mxGraphModel>\n</diagram>\n</mxfile>\n`;
}

// ---------- write everything ----------

const fontFace = ['400', '500', '600', '700'].map((w) =>
  `@font-face{font-family:'Be Vietnam Pro';font-weight:${w};src:url('${pathToFileURL(resolve(ROOT, `assets/fonts/BeVietnamPro-${w}.woff2`)).href}') format('woff2')}`).join('') +
  `@font-face{font-family:'JetBrains Mono';font-weight:100 800;src:url('${pathToFileURL(resolve(ROOT, 'assets/fonts/JetBrainsMono-Variable.woff2')).href}') format('woff2')}`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
mkdirSync(resolve(ROOT, 'diagrams/inline'), { recursive: true });

for (const d of diagrams) {
  for (const mode of ['light', 'dark']) {
    const svg = svgFor(d, mode);
    const base = `diagrams/${d.id}${mode === 'dark' ? '-dark' : ''}`;
    writeFileSync(resolve(ROOT, `${base}.svg`), svg);
    const tmp = resolve(ROOT, 'tools/.render.html');
    writeFileSync(tmp, `<!doctype html><html><head><style>${fontFace}html,body{margin:0}</style></head><body>${svg}</body></html>`);
    await page.setViewportSize({ width: d.width, height: d.height });
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg').screenshot({ path: resolve(ROOT, `${base}.png`) });
  }
  writeFileSync(resolve(ROOT, `diagrams/source/${d.id}.drawio`), drawioFor(d));

  writeFileSync(resolve(ROOT, `diagrams/inline/${d.id}.svg`), svgFor(d, 'inline'));
  console.log(`built ${d.id}`);
}
rmSync(resolve(ROOT, 'tools/.render.html'), { force: true });
await browser.close();
