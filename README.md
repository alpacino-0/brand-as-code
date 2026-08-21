# brand-as-code

Generate a complete brand system — logo variants, colour tokens, icons, React components, documentation and a print-ready brand book — from **one PNG and one palette file**. Then verify, on every build, that nobody hand-edited the output.

A brand guideline delivered as a PDF is at its most accurate on the day it ships. After that it decays: three copies of the logo end up in three folders, nobody remembers which blue is the right blue, and the contrast ratios in the document were typed by hand and never checked. This pipeline treats the guideline as a build artifact instead of a document.

```bash
npm run brand:all
```

## What it does

| Step | Command | Output |
|---|---|---|
| 1 | `brand:vectorize` | Traces the source PNG to clean SVG paths |
| 2 | `brand:analyze` | **Measures** the artwork: aspect ratio, ink coverage, letter joints, diagonal angles → `geometry.json` |
| 3 | `brand:tokens` | Colour tokens with **computed** contrast ratios, WCAG grades and CMYK → `colors.css`, `tailwind.colors.js`, `tokens.json` |
| 4 | `brand:logo` `brand:icons` | Logo lock-ups, monogram, silhouette and favicon set |
| 5 | `brand:raster` | PNG/OG raster exports at every size you need |
| 6 | `brand:components` | React components with `fill="currentColor"` so colour stays in CSS |
| 7 | `brand:docs` `brand:pdf` | Markdown documentation and a print-ready brand book |
| 8 | `brand:verify` | **Fails the build** if any generated file was edited by hand |

### Nothing is guessed

`brand:analyze` reads the alpha channel of your source artwork at 8× supersampling and derives the numbers that go into the brand book — proportions, letter bounds, the width of the gaps between letters, diagonal angles. Change the logo, re-run, and every number in the documentation updates itself.

### Nothing is typed twice

Contrast ratios and CMYK values are computed from the palette, never written by hand. If a colour fails WCAG for its declared intent, the build tells you — and the palette can carry that constraint as data:

```
· Documented limit (graphic use, not text):
  · Accent / Surface: 2.89:1 — constraint recorded in palette.mjs

✓ All 11 pairs used as text pass AA.
```

### Nothing drifts

`brand:verify` hashes every file in your public and component directories with SHA-256 and compares it against the pipeline's output. A stale logo, a hand-edited SVG or a leftover file stops the build. A brand rule becomes a test rather than a suggestion.

## Getting started

```bash
git clone https://github.com/<you>/brand-as-code
cd brand-as-code
npm install
```

1. Drop your wordmark as a transparent PNG at `brand/source/logo.png` — the highest resolution you have.
2. Edit `brand.config.mjs`: set `prefix`, `name` and your typefaces.
3. Edit `brand/assets/tokens/palette.mjs` with your colours.
4. Run `npm run brand:all`.

Everything generated is named from `prefix`, including CSS custom properties (`--acme-*`), file names (`acme-logo-primary-*.svg`) and the Tailwind colour key. Change the prefix once and the whole output renames itself.

## Palette format

`palette.mjs` is the single source of truth. Each colour carries its role and, where relevant, its constraints:

```js
export const core = [
  {
    key: 'accent',
    name: 'Accent',
    hex: '#B08A3E',
    role: 'Accent — graphic only',
    constraint:
      'MUST NOT be used as text on light grounds (2.89:1 — fails). ' +
      'Free for fills, rules and icons ≥24 px.',
  },
]

/** Documented usage split, rendered into the brand book. */
export const ratio = [
  { key: 'surface', pct: 60 },
  { key: 'brand', pct: 25 },
  { key: 'secondary', pct: 10 },
  { key: 'accent', pct: 5 },
]
```

## Status

Verified end to end against a brand it was not written for: source PNG → vectorised wordmark → measured geometry → tokens → 17 logo variants → favicon set → React components → integrity check. 48 generated files, all steps green.

Two things are still shaped by the project this was extracted from:

- **`brand:docs` / `brand:pdf`** need a brand-book content module that ships with the original project. Not included; the step will fail until you supply one.
- **`brand:icons`** emits a fixed set of product icons rather than reading a folder you control. Replace `ICONS` in `brand/scripts/build-icons.mjs` for now.

Code comments are still in Turkish. Console output, generated file headers and this documentation are English.

## Requirements

- Node 18+
- `sharp` (raster), `potrace` (vectorising), `opentype.js` (wordmark metrics), `playwright-core` (PDF rendering)

Typefaces are fetched by `brand:fonts` from Google Fonts. The defaults (Cinzel, Inter) are licensed under the SIL Open Font License 1.1 — free for commercial use, embeddable in web and PDF. If you swap them, check the licence of what you swap in.

## Licence

MIT — see [LICENSE](LICENSE).

The pipeline is MIT. **The brand you run through it is yours**, and nothing here grants rights to anyone else's logo, palette or typefaces.

## Origin

Extracted from a production brand system built for a stone company. The approach — measure the artwork, compute the tokens, verify the output — turned out to be the reusable part.
