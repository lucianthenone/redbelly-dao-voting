// Builds the site pages from src/:
//   one page per topic (index.html is How to vote), read.html (the PDF reader),
//   and tools/.print.html, every section on one page, which the PDF and Word builds use.
//   It is a build file only: it is git ignored and never published.
// Inline diagrams come from diagrams/inline/, which build-diagrams.mjs writes.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const PAGES = [
  { file: 'index.html', nav: 'How to vote', sections: ['verify', 'vote'], home: true,
    title: 'How DAO Voting Works Now | Redbelly DAO',
    description: 'A plain language guide to voting on the Redbelly DAO governance platform: how to vote, when eligibility is checked, and how many votes each verified wallet gets.' },
  { file: 'eligibility.html', nav: 'Eligibility', sections: ['eligibility', 'late'], h1: 'Eligibility',
    intro: 'When the platform decides which wallets can vote, and why a wallet verified after a proposal opens cannot vote on it.' },
  { file: 'votes.html', nav: 'Your votes', sections: ['votes'] },
  { file: 'troubleshoot.html', nav: "Why can't I vote?", sections: ['troubleshoot'] },
  { file: 'limits.html', nav: 'Known limits', sections: ['limits'] },
  { file: 'glossary.html', nav: 'Glossary', sections: ['glossary'] },
  { file: 'sources.html', nav: 'Sources', sections: ['sources'] },
];
const HEADER_NAV = PAGES.slice(0, 5);

function section(id) {
  let html = read(`src/sections/${id}.html`);
  return html.replace(/<!-- diagram:([\w-]+) -->\s*<!-- \/diagram:\1 -->/g, (m, d) => {
    const f = resolve(ROOT, `diagrams/inline/${d}.svg`);
    if (!existsSync(f)) throw new Error(`Run build-diagrams.mjs first: ${d} is missing`);
    return `<!-- diagram:${d} -->\n${readFileSync(f, 'utf8')}<!-- /diagram:${d} -->`;
  });
}

// A single-section page uses the section heading as its page title.
function lift(html) {
  const h2 = html.match(/<h2 id="([\w-]+)">([\s\S]*?)<\/h2>/);
  const body = html
    .replace(/\s*<p class="caps section-num">[\s\S]*?<\/p>/, '')
    .replace(/\s*<h2 id="[\w-]+">[\s\S]*?<\/h2>/, '')
    .replace(/aria-labelledby="[\w-]+"/, 'aria-labelledby="page-title"');
  return { title: h2[2].trim(), body };
}

const icons = {
  sun: '<svg class="icon icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  moon: '<svg class="icon icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>',
  doc: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
};

function head({ title, description, robots }) {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">${robots ? `\n<meta name="robots" content="${robots}">` : ''}
<meta name="theme-color" content="#0c1317">
<meta property="og:type" content="article">
<meta property="og:title" content="How DAO Voting Works Now">
<meta property="og:description" content="How to vote on the Redbelly DAO governance platform, when eligibility is checked, and how many votes you get. Last verified 22 October 2026.">
<meta property="og:image" content="assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
<link rel="icon" type="image/png" href="assets/img/icon.png">
<link rel="apple-touch-icon" href="assets/img/icon.png">
<link rel="preload" href="assets/fonts/BeVietnamPro-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/BeVietnamPro-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/style.css">
<script>
  (function () {
    var t = null;
    try { t = localStorage.getItem('dao-voting-theme'); } catch (e) {}
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
`;
}

function header(current) {
  const links = HEADER_NAV.map((p) => `      <a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.nav}</a>`).join('\n');
  return `
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="index.html" aria-label="Redbelly DAO voting guide, home">
      <img class="logo logo--on-light" src="assets/img/logo-on-light.svg" alt="Redbelly DAO" width="73" height="52">
      <img class="logo logo--on-dark" src="assets/img/logo-on-dark.svg" alt="Redbelly DAO" width="73" height="52">
      <span class="brand__label">Voting guide</span>
    </a>
    <nav class="site-nav" aria-label="Guide pages">
${links}
    </nav>
    <a class="header-pdf${current === 'read.html' ? ' is-current' : ''}" href="read.html"${current === 'read.html' ? ' aria-current="page"' : ''}>${icons.doc}<span>Read PDF</span></a>
    <button class="theme-toggle" type="button" aria-label="Switch to light theme" title="Switch theme">
      ${icons.sun}
      ${icons.moon}
    </button>
  </div>
</header>
`;
}

function sidebar(current) {
  const items = PAGES.map((p) => `          <li><a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.nav}</a></li>`).join('\n');
  return `    <aside class="toc" aria-label="Guide pages">
      <details class="toc__box" open>
        <summary class="caps">Guide pages</summary>
        <ol>
${items}
        </ol>
        <a class="toc__pdf" href="read.html">${icons.doc}Read the whole guide as PDF</a>
      </details>
    </aside>
`;
}

function pager(i) {
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  const card = (p, dir) => p
    ? `<a class="pager__link pager__link--${dir}" href="${p.file}"><span class="caps">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="pager__title">${p.nav}</span></a>`
    : '<span></span>';
  return `      <nav class="pager" aria-label="Previous and next page">
        ${card(prev, 'prev')}
        ${card(next, 'next')}
      </nav>
`;
}

const footer = `
<footer class="site-footer">
  <div class="wrap site-footer__inner">
    <div class="site-footer__brand">
      <img class="logo logo--on-light" src="assets/img/logo-on-light.svg" alt="Redbelly DAO" width="78" height="56">
      <img class="logo logo--on-dark" src="assets/img/logo-on-dark.svg" alt="Redbelly DAO" width="78" height="56">
      <p>How DAO voting works now. A guide for Redbelly DAO members.</p>
      <p class="mono site-footer__date">LAST VERIFIED 22 OCT 2026</p>
    </div>
    <div class="site-footer__col">
      <h2 class="caps">Guide</h2>
      <ul>
${PAGES.map((p) => `        <li><a href="${p.file}">${p.nav}</a></li>`).join('\n')}
      </ul>
    </div>
    <div class="site-footer__col">
      <h2 class="caps">Read and download</h2>
      <ul>
        <li><a href="read.html">Read the guide as PDF</a></li>
        <li><a href="downloads/how-dao-voting-works.docx" download>Guide as Word</a></li>
        <li><a href="downloads/dao-voting-diagrams.zip" download>Diagrams and sources (ZIP)</a></li>
      </ul>
      <h2 class="caps site-footer__sub">Official links</h2>
      <ul>
        <li><a href="https://redbelly-governance.vercel.app/" rel="noopener">Governance platform</a></li>
        <li><a href="https://access.redbelly.network/" rel="noopener">Redbelly Access</a></li>
      </ul>
    </div>
  </div>
</footer>

<button class="to-top" type="button" aria-label="Back to top" hidden>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>
</button>
`;

const tail = (scripts = []) => `${footer}
<script src="assets/js/main.js" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}${scripts.length ? '\n' : ''}</body>
</html>
`;

function pageHero(n, h1, intro) {
  return `  <section class="page-hero" id="top" aria-labelledby="page-title">
    <div class="wrap page-hero__inner">
      <p class="caps hero__eyebrow">Part ${n} of ${PAGES.length}</p>
      <h1 id="page-title">${h1}</h1>
${intro ? `      <p class="page-hero__intro">${intro}</p>\n` : ''}      <p class="page-hero__meta"><span class="dot dot--ok" aria-hidden="true"></span><span class="mono">LAST VERIFIED 22 OCT 2026</span></p>
    </div>
  </section>
`;
}

// ---------- topic pages ----------

const outputs = {};
PAGES.forEach((p, i) => {
  let top, body;
  if (p.home) {
    top = `  ${read('src/sections/_hero.html').trim()}\n\n  ${read('src/sections/_summary.html').trim()}\n`;
    body = p.sections.map(section).join('\n');
  } else if (p.sections.length === 1) {
    const { title, body: b } = lift(section(p.sections[0]));
    top = pageHero(i + 1, title, null);
    body = b;
    p.h1 = title;
  } else {
    top = pageHero(i + 1, p.h1, p.intro);
    body = p.sections.map(section).join('\n');
  }
  const description = p.description || `${p.h1}. Part of How DAO Voting Works Now, a guide to voting on the Redbelly DAO governance platform.`;
  const title = p.title || `${p.h1} | How DAO Voting Works Now`;
  outputs[p.file] = head({ title, description }) + header(p.file) + `
<main id="main">
${top}
  <div class="wrap layout">
${sidebar(p.file)}
    <article class="guide">
${body}
${pager(i)}    </article>
  </div>
</main>
` + tail();
});

// ---------- PDF reader ----------

outputs['read.html'] = head({
  title: 'Read the guide as PDF | How DAO Voting Works Now',
  description: 'Read How DAO Voting Works Now as a PDF, right on this page.',
}) + header('read.html') + `
<main id="main">
  <section class="page-hero" id="top" aria-labelledby="page-title">
    <div class="wrap page-hero__inner">
      <p class="caps hero__eyebrow">The whole guide</p>
      <h1 id="page-title">Read the guide as PDF</h1>
      <p class="page-hero__intro">Every page of the guide in one A4 document. Scroll to read it here.</p>
      <p class="page-hero__meta"><span class="dot dot--ok" aria-hidden="true"></span><span class="mono">LAST VERIFIED 22 OCT 2026</span></p>
    </div>
  </section>

  <div class="wrap reader" data-pdf="downloads/how-dao-voting-works.pdf">
    <div class="reader__bar">
      <p class="mono reader__status" role="status" aria-live="polite">LOADING PDF</p>
      <div class="reader__zoom" role="group" aria-label="Zoom">
        <button class="reader__btn" type="button" data-zoom="-1" aria-label="Zoom out">&minus;</button>
        <span class="mono reader__level">100%</span>
        <button class="reader__btn" type="button" data-zoom="1" aria-label="Zoom in">+</button>
      </div>
      <a class="reader__save" href="downloads/how-dao-voting-works.pdf" download>Save a copy</a>
    </div>
    <div class="reader__pages"></div>
    <p class="reader__fallback" hidden>The PDF viewer could not start in this browser. <a href="downloads/how-dao-voting-works.pdf">Open the PDF directly</a>, or read the guide starting at <a href="index.html">How to vote</a>.</p>
    <noscript><p>The PDF viewer needs JavaScript. <a href="downloads/how-dao-voting-works.pdf">Open the PDF directly</a>.</p></noscript>
  </div>
</main>
` + tail(['assets/vendor/pdfjs/pdf.min.js', 'assets/js/reader.js']);

// ---------- tools/.print.html: every section on one page, for the PDF and Word builds ----------

const pageAnchor = (file) => `#${PAGES.find((p) => p.file === file).sections[0]}`;
let all = PAGES.flatMap((p) => p.sections).map(section).join('\n');
all = all.replace(/href="([\w-]+\.html)(#[\w-]+)?"/g, (m, f, h) => (PAGES.some((p) => p.file === f) ? `href="${h || pageAnchor(f)}"` : m));
outputs['print.html'] = head({
  title: 'How DAO Voting Works Now',
  description: 'All sections of How DAO Voting Works Now on one page, used to build the PDF and Word files.',
  robots: 'noindex',
}) + header('print.html') + `
<main id="main" class="print-all">
  ${read('src/sections/_hero.html').trim()}

  ${read('src/sections/_summary.html').trim()}

  <div class="wrap layout">
    <article class="guide">
${all}    </article>
  </div>
</main>
` + tail();

// Clean URLs: link to /troubleshoot rather than /troubleshoot.html. vercel.json serves
// these on Vercel; see the README for GitHub Pages, Netlify and nginx.
const SITE_PAGES = new Set([...PAGES.map((p) => p.file), 'read.html']);
const clean = (html) => html.replace(/href="([\w-]+\.html)(#[\w-]+)?"/g, (m, f, h = '') =>
  (SITE_PAGES.has(f) ? `href="${f === 'index.html' ? './' : f.slice(0, -5)}${h}"` : m));
const printPage = outputs['print.html'];
delete outputs['print.html'];
for (const [file, html] of Object.entries(outputs)) writeFileSync(resolve(ROOT, file), clean(html));
// The print page lives in tools/, so its relative links step up one folder.
writeFileSync(resolve(ROOT, 'tools/.print.html'),
  printPage
    // Links to local files would point at the build folder inside the PDF, so drop them and keep the text.
    .replace(/<a ([^>]*?)href="(?!https?:|#|mailto:|diagrams\/)[^"]*"([^>]*)>/g, '<a $1$2>')
    .replace(/(href|src)="(?!https?:|#|mailto:|data:)/g, '$1="../'));
rmSync(resolve(ROOT, 'print.html'), { force: true });
console.log(`built ${Object.keys(outputs).join(', ')}`);
