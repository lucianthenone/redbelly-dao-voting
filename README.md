# How DAO Voting Works Now

A short, plain language guide to voting on the Redbelly DAO governance platform at <https://redbelly-governance.vercel.app/>. It explains how a member votes, when eligibility is checked, why a wallet verified after a proposal opens cannot vote on it, how many votes each verified account gets, and the known limits of the current setup.

The guide describes how voting works today. It does not propose changes to the voting rules.

**Last verified: 22 October 2026.** Every rule was checked against the live platform. See [VERIFICATION.md](VERIFICATION.md).

## Deliverables

| Deliverable | File |
|---|---|
| The guide as a website | Seven short pages, one per topic: [`index.html`](index.html) (How to vote), `eligibility.html`, `votes.html`, `troubleshoot.html`, `limits.html`, `glossary.html`, `sources.html`. Light and dark theme, back to top button |
| The guide as PDF, read on the site | [`read.html`](read.html) shows the PDF inside the page (PDF.js, works on phones), with a link to save a copy |
| The guide as PDF | [`downloads/how-dao-voting-works.pdf`](downloads/how-dao-voting-works.pdf) (A4, 9 pages) |
| The guide as Word | [`downloads/how-dao-voting-works.docx`](downloads/how-dao-voting-works.docx) (brand fonts embedded) |
| Diagrams as images | [`diagrams/`](diagrams): SVG and PNG, light and dark, also placed in all three versions of the guide |
| Editable diagram sources | [`diagrams/source/`](diagrams/source): `.drawio` files for diagrams.net, and `diagrams.mjs`, the shape and text source the SVG and PNG files are built from |
| Diagrams and sources in one file | [`downloads/dao-voting-diagrams.zip`](downloads/dao-voting-diagrams.zip) |
| Fact check log | [`VERIFICATION.md`](VERIFICATION.md) |

The three diagrams:

1. `01-verification-to-vote`: the path from verifying a wallet at Redbelly Access to a recorded vote.
2. `02-snapshot-timeline`: when eligibility is checked, and why a wallet enabled after the snapshot cannot vote.
3. `03-wallets-and-votes`: how several wallets under one verification are counted.

## Brand

The site, documents and diagrams follow the [Redbelly DAO Task Board brand kit](https://taskboard.redbellydao.network/brand):

- Colour tokens copied from the kit's `tokens.css`, dark by default with the light theme under `data-theme="light"`. Hero and summary bands stay dark steel in both themes.
- Be Vietnam Pro for all text, JetBrains Mono only for machine values such as block numbers, chain IDs and dates. Both are self hosted under the SIL Open Font License (`assets/fonts/OFL.txt`).
- The DAO logo in both variants: `assets/img/logo-on-dark.svg` (light ink) and `assets/img/logo-on-light.svg` (dark ink). The SVG files are vector traces of the kit's master PNG files on the same canvas, so the clear space is unchanged. The master PNG files sit next to them. The page swaps the variant with the theme and never places the logo on a plate.
- Radius 4 px and 8 px, 16 px mobile margin, 1280 px max width, tonal depth without drop shadows, status shown as a dot with a mono label.
- No en or em dashes and no emoji anywhere, including the PDF, the Word file and the diagrams. `tools/check.mjs` enforces this.
- Every diagram carries a dated "Last verified" line in the artwork.

## Run it locally

The site is static. No build step is needed to view it.

```bash
npx serve .
# then open the address it prints, for example http://localhost:3000
```

Pages link to clean URLs such as `/troubleshoot` instead of `/troubleshoot.html`. `serve` handles these the same way Vercel does.

## Deploy

Upload the folder as it is to any static host. The pages use clean URLs (`/eligibility`, not `/eligibility.html`).

- **GitHub Pages setup:** Settings, Pages, deploy from a branch, choose `main` and `/ (root)`. The `.nojekyll` file is included.
- **Vercel:** import the repository with no build command and `.` as the output directory. `vercel.json` turns on clean URLs, and old `.html` links redirect to them.
- **Netlify:** same settings. Netlify serves clean URLs by default.
- **GitHub Pages:** serves `/eligibility` from `eligibility.html` automatically.
- **Your own server (nginx):** copy the folder to the web root, for example `/var/www/dao-voting`, and point a server block at it:

  ```nginx
  server {
    listen 80;
    server_name your-domain.example;
    root /var/www/dao-voting;
    index index.html;
    location / { try_files $uri $uri.html $uri/ =404; }
  }
  ```

The social preview image is `assets/img/og-image.png` (1200 x 630). Some sites need an absolute URL for it: once the guide has its address, change the `og:image` meta tag in `index.html` to the full URL.

## Rebuild the diagrams, PDF and Word file

You only need this after changing the text or the diagrams. It needs Node.js 18 or later.

```bash
cd tools
npm install
npx playwright install chromium   # first time only
npm run build
```

`npm run build` does the following, in order:

| Script | Output |
|---|---|
| `build-diagrams.mjs` | Reads `diagrams/source/diagrams.mjs` and writes the SVG, PNG, `.drawio` and inline files |
| `build-pages.mjs` | Builds every page from `src/sections/` with the shared header, sidebar, Previous and Next links and footer. It also writes `tools/.print.html`, all sections on one page for the PDF and Word builds. That file is git ignored and never published |
| `build-og.mjs` | `assets/img/og-image.png` |
| `build-pdf.mjs` | `downloads/how-dao-voting-works.pdf`, printed from `tools/.print.html` |
| `build-docx.mjs` | `downloads/how-dao-voting-works.docx`, built from the same page so the text always matches |
| `build-zip.mjs` | `downloads/dao-voting-diagrams.zip` |
| `check.mjs` | Fails on dashes, emoji, credit lines, broken links, or a diagram without its last verified line |

To change the text, edit the section in `src/sections/` and run `npm run build`. Do not edit the page files directly: the next build overwrites them.

To edit a diagram, change its shapes or text in `diagrams/source/diagrams.mjs` and run `npm run diagrams`. To edit it by hand instead, open the matching `.drawio` file in diagrams.net and export SVG and PNG.

## Structure

```
index.html                 How to vote (home page)
eligibility.html           When eligibility is checked, and late verification
votes.html                 How many votes you get
troubleshoot.html          Why can't I vote?
limits.html                Known limits
glossary.html              Words used in the guide
sources.html               How the guide was checked
read.html                  the PDF, shown inside the site
vercel.json                clean URLs on Vercel
src/sections/              the text of each section, edit here
VERIFICATION.md            how every rule was checked
assets/css/style.css       brand tokens, layout, print styles for the PDF
assets/js/main.js          theme toggle, back to top button, guide pages list
assets/js/reader.js        the PDF reader on read.html
assets/vendor/pdfjs/       PDF.js 3.11.174 by Mozilla, Apache 2.0 licence
assets/fonts/              Be Vietnam Pro, JetBrains Mono, licence
assets/img/                DAO logo (SVG and PNG, both variants), favicon, social image
diagrams/                  SVG and PNG exports, light and dark
diagrams/source/           diagrams.mjs and .drawio sources
diagrams/inline/           theme-aware SVG placed inside the pages
downloads/                 PDF, Word file, diagrams ZIP
tools/                     build and check scripts
```
