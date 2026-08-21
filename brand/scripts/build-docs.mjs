/**
 * brand/*.md ve brand/en/*.md dosyalarını üretir.
 * Çalıştır: node brand/scripts/build-docs.mjs
 *
 * Markdown, PDF ile AYNI içerik modüllerinden üretilir. Elle yazılsaydı iki çıktı
 * zamanla ayrışırdı; buradan üretildiğinde ayrışamaz.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { pages as pagesCore, BRAND } from '../pdf/src/content.mjs'
import { pagesVisual, LOGO_MIN } from '../pdf/src/content-visual.mjs'
import { pagesApps } from '../pdf/src/content-apps.mjs'
import { core, scales, semantic, ratio, contrastPairs, pantoneApprox } from '../assets/tokens/palette.mjs'
import { contrastRatio, gradeLabel, hexToCmyk, formatCmyk, formatRgb } from './color.mjs'
import { ICONS, CUT_ANGLE_FROM_HORIZONTAL } from './build-icons.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const brandDir = join(here, '..')

const ALL = Object.fromEntries([...pagesCore, ...pagesVisual, ...pagesApps].map((p) => [p.id, p]))
const L = (v, lang) => (v && typeof v === 'object' && ('tr' in v || 'en' in v) ? v[lang] : v)

// ── Markdown yardımcıları ───────────────────────────────────
const esc = (s) => String(s).replace(/\|/g, '\\|')
const h2 = (s) => `## ${s}\n`
const h3 = (s) => `### ${s}\n`
const p = (s) => `${s}\n`
const ul = (items) => items.map((i) => `- ${i}`).join('\n') + '\n'
const table = (head, rows) =>
  `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` +
  rows.map((r) => `| ${r.map(esc).join(' | ')} |`).join('\n') +
  '\n'
const kvTable = (rows, lang, head) =>
  table(head, rows.map((r) => [L(r.k, lang), L(r.v, lang)]))

const T = {
  tr: {
    key: 'Alan', val: 'Değer', use: 'Kullanım', do: 'Yapılır', dont: 'Yapılmaz',
    item: 'Parça', spec: 'Ölçü', detail: 'Düzen', name: 'Ad', role: 'Rol',
    file: 'Dosya', size: 'Ölçü', ratio: 'Oran', grade: 'Değerlendirme', pair: 'Çift',
    colour: 'Renk', example: 'Örnek', bad: 'Kötü', good: 'İyi', format: 'Format',
    generated: 'Bu dosya koddan üretilmiştir. Elle düzenlemeyin — kaynak: `brand/pdf/src/content*.mjs` · yeniden üret: `npm run brand:docs`',
    source: 'Kaynak', back: '← Dizin',
  },
  en: {
    key: 'Field', val: 'Value', use: 'Use', do: 'Do', dont: "Don't",
    item: 'Item', spec: 'Spec', detail: 'Layout', name: 'Name', role: 'Role',
    file: 'File', size: 'Size', ratio: 'Ratio', grade: 'Grade', pair: 'Pair',
    colour: 'Colour', example: 'Example', bad: 'Bad', good: 'Good', format: 'Format',
    generated: 'This file is generated from code. Do not edit by hand — source: `brand/pdf/src/content*.mjs` · regenerate: `npm run brand:docs`',
    source: 'Source', back: '← Index',
  },
}

function frontMatter(title, lang, links) {
  return `# ${title}\n\n> ${T[lang].generated}\n\n${links}\n\n---\n\n`
}

// ── Bölüm üreticileri ───────────────────────────────────────

const sections = {
  ozet(lang) {
    const s = ALL.summary
    return p(L(s.lead, lang)) + '\n' + kvTable(s.rows, lang, [T[lang].key, T[lang].val])
  },

  strateji(lang) {
    const po = ALL.positioning
    const va = ALL.values
    const au = ALL.audience
    const di = ALL.differentiation
    let out = ''
    out += h2(L(po.title, lang))
    out += `> **${L(po.statement, lang)}**\n\n`
    out += kvTable(po.frame, lang, [T[lang].key, T[lang].val]) + '\n'
    out += h3(L(po.proof.title, lang)) + ul(L(po.proof.items, lang)) + '\n'
    out += `> ${L(po.proof.caveat, lang)}\n\n`

    out += h2(L(va.title, lang))
    out += table([T[lang].name, T[lang].val], va.values.map((v) => [L(v.k, lang), L(v.v, lang)])) + '\n'
    out += h3(L(va.personality.title, lang)) + p(L(va.personality.lead, lang)) + '\n'
    out += ul(va.personality.axes.map((a) => `${L(a.a, lang)} ←${'─'.repeat(2)}${'●'}${'─'.repeat(2)}→ ${L(a.b, lang)}  (${a.pos}%)`)) + '\n'

    out += h2(L(au.title, lang)) + p(L(au.lead, lang)) + '\n'
    out += table(
      [T[lang].name, lang === 'tr' ? 'Ne ister' : 'What they need', lang === 'tr' ? 'Ne söylenir' : 'What we say'],
      au.groups.map((g) => [L(g.k, lang), L(g.need, lang), L(g.say, lang)]),
    ) + '\n'

    out += h2(L(di.title, lang)) + p(L(di.lead, lang)) + '\n'
    for (const c of di.columns) out += h3(L(c.k, lang)) + ul(L(c.items, lang)) + '\n'
    out += `> ${L(di.close, lang)}\n`
    return out
  },

  ad(lang) {
    const n = ALL.naming
    let out = p(L(n.lead, lang)) + '\n'
    out += table(
      [T[lang].key, T[lang].val, T[lang].use],
      n.layers.map((l) => [L(l.k, lang), L(l.v, lang), L(l.use, lang)]),
    ) + '\n'
    out += h3(T[lang].do) + ul(L(n.rules.do, lang)) + '\n'
    out += h3(T[lang].dont) + ul(L(n.rules.dont, lang))
    return out
  },

  ilham(lang) {
    const i = ALL.inspiration
    let out = `**${L(i.kicker, lang)}**\n\n> ## ${L(i.headline, lang)}\n\n`
    out += L(i.body, lang).map((b) => b + '\n').join('\n') + '\n'
    out += kvTable(i.mapping, lang, [T[lang].key, T[lang].val]) + '\n'
    out += `> ${L(i.note, lang)}\n`
    return out
  },

  sozlu(lang) {
    const v = ALL.voice
    const m = ALL.messaging
    const b = ALL.boilerplate
    let out = h2(L(v.title, lang)) + p(L(v.lead, lang)) + '\n'
    out += table([T[lang].key, T[lang].val], v.principles.map((x) => [L(x.k, lang), L(x.v, lang)])) + '\n'
    out += h3(lang === 'tr' ? 'Örnekler' : 'Examples')
    for (const e of v.examples) {
      out += `**${T[lang].bad}:** ~~${L(e.bad, lang)}~~\n\n**${T[lang].good}:** ${L(e.good, lang)}\n\n`
    }
    out += h2(L(m.title, lang))
    out += `**${L(m.core.k, lang)}**\n\n> ${L(m.core.v, lang)}\n\n`
    out += p(L(m.lead, lang)) + '\n'
    out += table([T[lang].key, T[lang].val], m.variants.map((x) => [L(x.k, lang), L(x.v, lang)])) + '\n'
    out += h3(L(m.slogan.k, lang)) + p(L(m.slogan.v, lang)) + '\n'
    out += h2(L(b.title, lang)) + p(L(b.lead, lang)) + '\n'
    for (const bl of b.blocks) out += h3(L(bl.k, lang)) + '```\n' + L(bl.v, lang) + '\n```\n\n'
    return out
  },

  renk(lang) {
    const cc = ALL['color-core']
    const cu = ALL['color-usage']
    let out = p(L(cc.lead, lang)) + '\n'
    out += table(
      [T[lang].name, 'HEX', 'RGB', 'CMYK', 'Pantone*', T[lang].role],
      core.map((c) => [
        L({ tr: c.tr, en: c.en }, lang), c.hex, formatRgb(c.hex),
        formatCmyk(hexToCmyk(c.hex)), pantoneApprox[c.key] ?? '—',
        L({ tr: c.role_tr, en: c.role_en }, lang),
      ]),
    ) + '\n'

    const constrained = core.filter((c) => c.constraint_tr)
    if (constrained.length) {
      out += h3(L(cu.constraintTitle, lang))
      out += ul(constrained.map((c) => `**${L({ tr: c.tr, en: c.en }, lang)}** — ${L({ tr: c.constraint_tr, en: c.constraint_en }, lang)}`)) + '\n'
    }

    out += h2(lang === 'tr' ? 'Oran' : 'Ratio')
    out += p(L(cu.ratioLead, lang)) + '\n'
    out += ul(ratio.map((r) => `${L({ tr: r.tr, en: r.en }, lang)} — **${r.pct}%**`)) + '\n'

    out += h2(lang === 'tr' ? 'Kontrast (WCAG 2.1)' : 'Contrast (WCAG 2.1)')
    out += p(L(cu.contrastLead, lang)) + '\n'
    out += table(
      [T[lang].pair, T[lang].ratio, T[lang].grade, lang === 'tr' ? 'Amaç' : 'Intent'],
      contrastPairs.map((c) => {
        const r = contrastRatio(c.fg, c.bg)
        return [L({ tr: c.tr, en: c.en }, lang), `${r.toFixed(2)}:1`, gradeLabel(r, lang), c.intent]
      }),
    ) + '\n'

    out += h2(lang === 'tr' ? 'Tonal skalalar' : 'Tonal scales')
    for (const [name, sc] of Object.entries(scales)) {
      out += h3(name) + table(['step', 'hex'], Object.entries(sc).map(([k, v]) => [k, v])) + '\n'
    }

    out += h2(lang === 'tr' ? 'Anlamsal eşleme' : 'Semantic mapping')
    out += '```css\n' + Object.entries(semantic).map(([k, v]) => `--${PREFIX}-${k}: ${v};`).join('\n') + '\n```\n\n'
    out += `> ${L(cu.printLead, lang)}\n\n`
    out += `\`* \` ${lang === 'tr' ? 'Pantone değerleri yaklaşıktır.' : 'Pantone values are approximate.'}\n\n`
    out += h2(lang === 'tr' ? 'Token dosyaları' : 'Token files') +
      ul(['`brand/assets/tokens/colors.css`', '`brand/assets/tokens/tailwind.colors.js`', '`brand/assets/tokens/tokens.json`'])
    return out
  },

  tipografi(lang) {
    const f = ALL['type-families']
    const s = ALL['type-scale']
    const r = ALL['type-rules']
    let out = ''
    for (const fam of f.families) {
      out += h2(fam.name)
      out += ul([`**${T[lang].role}:** ${L(fam.role, lang)}`, `**${lang === 'tr' ? 'Ağırlıklar' : 'Weights'}:** ${fam.weights}`]) + '\n'
      out += p(L(fam.why, lang)) + '\n' + p(`**${L(fam.rule, lang)}**`) + '\n'
    }
    out += `> ${L(f.license, lang)}\n\n`
    out += h2(L(s.title, lang)) + p(L(s.lead, lang)) + '\n'
    out += table(
      [T[lang].role, lang === 'tr' ? 'Aile' : 'Family', lang === 'tr' ? 'Boy / satır' : 'Size / leading', 'Tracking', lang === 'tr' ? 'Versal' : 'Caps'],
      s.steps.map((x) => [L(x.k, lang), x.font, x.size, x.track, x.caps ? '✓' : '—']),
    ) + '\n'
    out += h2(L(r.title, lang))
    out += h3(T[lang].do) + ul(L(r.rules.do, lang)) + '\n'
    out += h3(T[lang].dont) + ul(L(r.rules.dont, lang)) + '\n'
    out += h3(L(r.turkish.title, lang)) + p(L(r.turkish.lead, lang)) + '\n'
    out += '```\n' + r.turkish.chars + '\n```\n\n'
    out += `> ${L(r.turkish.warn, lang)}\n`
    return out
  },

  logo(lang) {
    const pr = ALL['logo-primary']
    const va = ALL['logo-variants']
    const cs = ALL['logo-clearspace']
    const co = ALL['logo-colors']
    const mi = ALL['logo-misuse']
    const em = ALL.emblem
    let out = h2(L(pr.title, lang)) + p(L(pr.lead, lang)) + '\n'
    out += kvTable(pr.anatomy, lang, [T[lang].key, T[lang].val]) + '\n'
    out += `> ${L(pr.note, lang)}\n\n`

    out += h2(L(va.title, lang)) + p(L(va.lead, lang)) + '\n'
    out += table([T[lang].name, T[lang].use, T[lang].file],
      va.variants.map((v) => [L(v.k, lang), L(v.use, lang), `\`${v.file}-*.svg\``])) + '\n'

    out += h2(L(cs.title, lang)) + p(L(cs.clearspace, lang)) + '\n'
    out += p(L(cs.minLead, lang)) + '\n'
    out += table([T[lang].name, 'px', 'mm'], [
      [lang === 'tr' ? 'Ana kilit' : 'Primary', LOGO_MIN.primary.px, LOGO_MIN.primary.mm],
      [lang === 'tr' ? 'Yatay kilit' : 'Horizontal', LOGO_MIN.horizontal.px, LOGO_MIN.horizontal.mm],
      ['Monogram', LOGO_MIN.monogram.px, LOGO_MIN.monogram.mm],
    ]) + '\n'
    out += `> **${L(cs.rule, lang)}**\n\n`

    out += h2(L(co.title, lang)) + p(L(co.lead, lang)) + '\n'
    out += table([T[lang].use, T[lang].val, T[lang].file],
      co.cases.map((c) => [L(c.k, lang), L(c.v, lang), `\`${c.file}.svg\``])) + '\n'
    out += `> ${L(co.stoneNote, lang)}\n\n`

    out += h2(L(mi.title, lang)) + p(L(mi.lead, lang)) + '\n'
    out += ul(mi.items.map((i) => `**${L(i.k, lang)}** — ${L(i.v, lang)}`)) + '\n'

    out += h2(L(em.title, lang)) + p(L(em.lead, lang)) + '\n'
    out += p(L(em.why, lang)) + '\n'
    out += table([T[lang].file, T[lang].use], em.files.map((f) => [`\`${f.k}\``, L(f.v, lang)]))
    return out
  },

  grafik(lang) {
    const g = ALL['graphic-language']
    const gr = ALL.grid
    const pi = ALL['product-icons']
    let out = p(L(g.lead, lang)) + '\n'
    out += table([T[lang].name, T[lang].val, lang === 'tr' ? 'Kural' : 'Rule', T[lang].file],
      g.elements.map((e) => [L(e.k, lang), L(e.v, lang), L(e.rule, lang), `\`patterns/${e.file}.svg\``])) + '\n'
    out += `> ${L(g.forbidden, lang)}\n\n`
    out += h2(L(gr.title, lang)) + p(L(gr.lead, lang)) + '\n'
    out += kvTable(gr.specs, lang, [T[lang].key, T[lang].val]) + '\n'
    out += ul(L(gr.rules, lang)) + '\n'
    out += h2(L(pi.title, lang)) + p(L(pi.lead, lang)) + '\n'
    out += kvTable(pi.specs, lang, [T[lang].key, T[lang].val]) + '\n'
    out += table([T[lang].name, T[lang].file], ICONS.map((i) => [L({ tr: i.tr, en: i.en }, lang), `\`icons/${i.key}.svg\``])) + '\n'
    out += `> ${L(pi.rule, lang)}\n\n`
    out += `${lang === 'tr' ? 'Temel açı (asıl logonun V harfinden ölçülü)' : 'Base angle (measured from the V of the original logo)'}: **${CUT_ANGLE_FROM_HORIZONTAL}°**\n`
    return out
  },

  fotograf(lang) {
    const f = ALL.photography
    let out = p(L(f.lead, lang)) + '\n'
    out += table([lang === 'tr' ? 'Katman' : 'Layer', T[lang].val, lang === 'tr' ? 'Işık' : 'Light'],
      f.layers.map((l) => [L(l.k, lang), L(l.v, lang), L(l.light, lang)])) + '\n'
    out += h3(T[lang].do) + ul(L(f.rules.do, lang)) + '\n'
    out += h3(T[lang].dont) + ul(L(f.rules.dont, lang))
    return out
  },

  uygulama(lang) {
    const st = ALL['app-stationery']
    const so = ALL['app-social']
    const pa = ALL['app-packaging']
    const en = ALL['app-environment']
    let out = h2(L(st.title, lang)) + p(L(st.lead, lang)) + '\n'
    out += table([T[lang].item, T[lang].spec, T[lang].detail, lang === 'tr' ? 'Malzeme' : 'Stock'],
      st.items.map((i) => [L(i.k, lang), L(i.spec, lang), L(i.detail, lang), L(i.stock, lang)])) + '\n'

    out += h2(L(so.title, lang)) + p(L(so.lead, lang)) + '\n'
    out += table([T[lang].format, T[lang].size, T[lang].use],
      so.formats.map((f) => [L(f.k, lang), f.spec, L(f.use, lang)])) + '\n'
    out += ul(L(so.layout, lang)) + '\n'
    out += `> ${L(so.handle, lang)}\n\n`

    out += h2(L(pa.title, lang)) + p(L(pa.lead, lang)) + '\n'
    out += table([T[lang].item, T[lang].spec, T[lang].detail],
      pa.items.map((i) => [L(i.k, lang), L(i.spec, lang), L(i.detail, lang)])) + '\n'
    out += `> ⚠️ ${L(pa.warn, lang)}\n\n`

    out += h2(L(en.title, lang))
    out += table([T[lang].item, T[lang].detail], en.items.map((i) => [L(i.k, lang), L(i.detail, lang)]))
    return out
  },

  dijital(lang) {
    const d = ALL.digital
    let out = p(L(d.lead, lang)) + '\n'
    out += table([T[lang].file, T[lang].use], d.tokens.map((t) => [`\`${t.k}\``, L(t.v, lang)])) + '\n'
    out += h2('`<head>`') + '```html\n' + d.head + '\n```\n\n'
    out += h2(L(d.gaps.title, lang)) + ul(L(d.gaps.items, lang))
    return out
  },

  yonetisim(lang) {
    const g = ALL.governance
    let out = h2(L(g.naming.title, lang))
    out += '```\n' + g.naming.pattern + '\n\n' + g.naming.examples.join('\n') + '\n```\n\n'
    out += ul(L(g.naming.rules, lang)) + '\n'
    out += h2(L(g.table.title, lang))
    out += table([T[lang].use, T[lang].file], g.table.rows.map((r) => [L(r.use, lang), `\`${r.file}\``])) + '\n'
    out += h2(L(g.process.title, lang)) + ul(L(g.process.items, lang)) + '\n'
    out += h2(lang === 'tr' ? 'Komutlar' : 'Commands')
    out += '```bash\n' +
      'npm run brand:tokens   # palette.mjs → colors.css / tailwind / tokens.json\n' +
      'npm run brand:logo     # logo SVG seti\n' +
      'npm run brand:icons    # ürün ikonları + motifler\n' +
      'npm run brand:fonts    # Cinzel + Inter → gömülü fonts.css\n' +
      'npm run brand:raster   # favicon seti + OG görseli\n' +
      'npm run brand:docs     # brand/*.md + brand/en/*.md\n' +
      'npm run brand:pdf      # TR + EN marka kitabı PDF\n' +
      'npm run brand:all      # hepsi\n```\n'
    return out
  },
}

// ── Dosya planı ─────────────────────────────────────────────
const FILES = [
  { key: 'ozet', tr: ['00-ozet.md', 'Bir Bakışta Marka'], en: ['00-summary.md', 'The Brand at a Glance'] },
  { key: 'strateji', tr: ['01-marka-stratejisi.md', 'Marka Stratejisi'], en: ['01-brand-strategy.md', 'Brand Strategy'] },
  { key: 'ad', tr: ['02-ad-mimarisi.md', 'Ad Mimarisi'], en: ['02-naming-architecture.md', 'Naming Architecture'] },
  { key: 'ilham', tr: ['03-ilham-noktasi.md', 'İlham Noktası'], en: ['03-point-of-origin.md', 'Point of Origin'] },
  { key: 'sozlu', tr: ['04-sozlu-kimlik.md', 'Sözlü Kimlik'], en: ['04-verbal-identity.md', 'Verbal Identity'] },
  { key: 'renk', tr: ['05-renk-paleti.md', 'Renk Paleti'], en: ['05-colour-palette.md', 'Colour Palette'] },
  { key: 'tipografi', tr: ['06-tipografi.md', 'Tipografi'], en: ['06-typography.md', 'Typography'] },
  { key: 'logo', tr: ['07-logo-sistemi.md', 'Logo Sistemi'], en: ['07-logo-system.md', 'Logo System'] },
  { key: 'grafik', tr: ['08-grafik-dil.md', 'Grafik Dil'], en: ['08-graphic-language.md', 'Graphic Language'] },
  { key: 'fotograf', tr: ['09-fotograf-yonu.md', 'Fotoğraf Yönü'], en: ['09-photography.md', 'Photography Direction'] },
  { key: 'uygulama', tr: ['10-uygulamalar.md', 'Uygulamalar'], en: ['10-applications.md', 'Applications'] },
  { key: 'dijital', tr: ['11-dijital.md', 'Dijital'], en: ['11-digital.md', 'Digital'] },
  { key: 'yonetisim', tr: ['12-yonetisim.md', 'Yönetişim'], en: ['12-governance.md', 'Governance'] },
]

function readme(lang) {
  const isTr = lang === 'tr'
  const files = FILES.map((f) => `- [${f[lang][1]}](${f[lang][0]})`).join('\n')
  return `# BİEV MARBLE — ${isTr ? '360° Marka Kiti' : '360° Brand Kit'}

> ${T[lang].generated}

**${L(BRAND.descriptor, lang)}** · ${L(BRAND.place, lang)} · ${BRAND.web}

${isTr ? '**Slogan:**' : '**Slogan:**'} ${L(BRAND.slogan, lang)}

---

## ${isTr ? 'Bölümler' : 'Sections'}

${files}

## ${isTr ? 'Çıktılar' : 'Outputs'}

| ${T[lang].file} | ${T[lang].use} |
|---|---|
| \`pdf/BIEV-Marble-360-Marka-Kitabi-TR.pdf\` | ${isTr ? '35 sayfalık marka kitabı (Türkçe)' : '35-page brand book (Turkish)'} |
| \`pdf/BIEV-Marble-360-Brand-Book-EN.pdf\` | ${isTr ? '35 sayfalık marka kitabı (İngilizce)' : '35-page brand book (English)'} |
| \`assets/logo/\` | ${isTr ? '3 kilit × 5 renk versiyonu, SVG' : '3 lockups × 5 colour versions, SVG'} |
| \`assets/favicon/\` | ${isTr ? 'favicon.ico, PNG boyutları, webmanifest' : 'favicon.ico, PNG sizes, webmanifest'} |
| \`assets/icons/\` | ${isTr ? `${ICONS.length} icons` : `${ICONS.length} product icons`} |
| \`assets/patterns/\` | ${isTr ? `Kesim hattı, damar, açı işareti (${CUT_ANGLE_FROM_HORIZONTAL}°)` : `Cut line, vein, angle mark (${CUT_ANGLE_FROM_HORIZONTAL}°)`} |
| \`assets/og/og-image.png\` | ${isTr ? 'Sosyal paylaşım görseli 1200 × 630' : 'Social preview 1200 × 630'} |
| \`assets/tokens/\` | ${isTr ? 'CSS, Tailwind ve JSON renk tokenları' : 'CSS, Tailwind and JSON colour tokens'} |

## ${isTr ? 'Yeniden üretim' : 'Regenerating'}

\`\`\`bash
npm run brand:all
\`\`\`

${isTr
    ? 'Tüm varlıklar koddan üretilir. SVG, PNG ve PDF dosyaları elle düzenlenmez — kaynak değişir, yeniden üretilir. Renk değişikliği yalnızca `assets/tokens/palette.mjs` üzerinden yapılır.'
    : 'All assets are generated from code. SVG, PNG and PDF files are never hand-edited — change the source and regenerate. Colour changes are made only in `assets/tokens/palette.mjs`.'}

${isTr ? 'İngilizce sürüm:' : 'Turkish version:'} [${isTr ? 'English' : 'Türkçe'}](${isTr ? 'en/README.md' : '../README.md'})
`
}

async function main() {
  await mkdir(join(brandDir, 'en'), { recursive: true })
  let count = 0

  for (const lang of ['tr', 'en']) {
    const dir = lang === 'tr' ? brandDir : join(brandDir, 'en')
    const prefix = lang === 'tr' ? '' : '../'

    await writeFile(join(dir, 'README.md'), readme(lang), 'utf8')
    count++

    for (let i = 0; i < FILES.length; i++) {
      const f = FILES[i]
      const [file, title] = f[lang]
      const prev = i > 0 ? FILES[i - 1][lang] : null
      const next = i < FILES.length - 1 ? FILES[i + 1][lang] : null
      const nav = [
        `[${T[lang].back}](README.md)`,
        prev ? `[← ${prev[1]}](${prev[0]})` : null,
        next ? `[${next[1]} →](${next[0]})` : null,
      ]
        .filter(Boolean)
        .join(' · ')

      const body = sections[f.key](lang)
      const other = lang === 'tr' ? `en/${FILES[i].en[0]}` : `${prefix}${FILES[i].tr[0]}`
      const langLink = `\n\n---\n\n${lang === 'tr' ? 'English' : 'Türkçe'}: [${FILES[i][lang === 'tr' ? 'en' : 'tr'][1]}](${other})\n`

      await writeFile(join(dir, file), frontMatter(title, lang, nav) + body + langLink, 'utf8')
      count++
    }
  }

  console.log(`✓ ${count} markdown dosyası → brand/ ve brand/en/`)
  console.log(`  ${FILES.length} bölüm × 2 dil + 2 dizin`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
