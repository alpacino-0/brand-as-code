/**
 * palette.mjs → colors.css · tailwind.colors.js · tokens.json
 *
 * Kontrast oranları ve CMYK değerleri burada HESAPLANIR; hiçbiri elle yazılmaz.
 * Çalıştır: node brand/scripts/build-tokens.mjs
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { core, scales, semantic, ratio, contrastPairs, pantoneApprox } from '../assets/tokens/palette.mjs'
import { contrastRatio, wcagGrade, gradeLabel, hexToCmyk, formatCmyk, hexToHsl, formatRgb } from './color.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'assets', 'tokens')

const HEADER = `/* ${brand.name} — generated. Do not edit by hand.
   Source:    brand/assets/tokens/palette.mjs
   Generator: brand/scripts/build-tokens.mjs */`

/** Ana renkleri hesaplanmış tüm metadata ile zenginleştirir. */
export function enrichCore() {
  return core.map((c) => ({
    ...c,
    rgb: formatRgb(c.hex),
    hsl: hexToHsl(c.hex),
    cmyk: formatCmyk(hexToCmyk(c.hex)),
    pantone: pantoneApprox[c.key] ?? null,
  }))
}

/** Bir çiftin kendi kullanım amacına (intent) göre eşiği. */
const THRESHOLD = { text: 4.5, large: 3, graphic: 3 }

/** Kontrast çiftlerini hesaplanmış oran, WCAG notu ve amaca göre geçme durumuyla döndürür. */
export function computeContrast() {
  return contrastPairs.map((p) => {
    const r = contrastRatio(p.fg, p.bg)
    const threshold = THRESHOLD[p.intent] ?? 4.5
    return {
      ...p,
      ...wcagGrade(r),
      threshold,
      meetsIntent: r >= threshold,
      labelTr: gradeLabel(r, 'tr'),
      labelEn: gradeLabel(r, 'en'),
    }
  })
}

function buildCss(enriched, contrast) {
  const lines = [HEADER, '', ':root {']

  lines.push('  /* Ana marka renkleri */')
  for (const c of enriched) {
    lines.push(`  --${PREFIX}-${c.key}: ${c.hex}; /* ${c.tr} — ${c.role_tr} */`)
  }

  lines.push('', '  /* Tonal skalalar */')
  for (const [name, scale] of Object.entries(scales)) {
    for (const [step, hex] of Object.entries(scale)) {
      lines.push(`  --${PREFIX}-${name}-${step}: ${hex};`)
    }
  }

  lines.push('', '  /* Anlamsal eşlemeler — kodda bunları kullanın */')
  for (const [name, hex] of Object.entries(semantic)) {
    lines.push(`  --${PREFIX}-${name}: ${hex};`)
  }

  lines.push('}')

  lines.push('', '/* Kontrast referansı (hesaplanmış, WCAG 2.1) */')
  for (const c of contrast) {
    lines.push(`/*  ${c.fg} üzerine ${c.bg} → ${c.ratio}:1 — ${c.labelTr} (${c.tr}) */`)
  }

  return lines.join('\n') + '\n'
}

function buildTailwind(enriched) {
  const core = Object.fromEntries(enriched.map((c) => [c.key, c.hex]))
  const colors = { ...core }

  // A key that also has a tint scale becomes an object. DEFAULT is the core hex
  // when one exists, otherwise whatever the scale itself declares.
  for (const [key, scale] of Object.entries(scales)) {
    colors[key] = core[key] ? { ...scale, DEFAULT: core[key] } : { ...scale }
  }

  return (
    `${HEADER}\n\n` +
    `/** Spread into Tailwind's theme.extend.colors:\n` +
    ` *    import colors from './brand/assets/tokens/tailwind.colors.js'\n` +
    ` *    theme: { extend: { colors } }\n` +
    ` */\n` +
    `export default ${JSON.stringify({ [PREFIX]: colors }, null, 2)}\n`
  )
}

function buildJson(enriched, contrast) {
  return JSON.stringify(
    {
      $schema: 'https://design-tokens.org/schema.json',
      name: 'BİEV Marble',
      version: '1.0.0',
      generatedBy: 'brand/scripts/build-tokens.mjs',
      note: 'Generated. Source: brand/assets/tokens/palette.mjs',
      core: enriched,
      scales,
      semantic,
      ratio,
      contrast,
      pantoneNote:
        'Pantone değerleri yaklaşıktır ve baskı öncesi fiziksel kılavuzla doğrulanmalıdır.',
      cmykNote:
        'CMYK değerleri ICC profili kullanmayan matematiksel dönüşümdür; matbaa provası zorunludur.',
    },
    null,
    2,
  ) + '\n'
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const enriched = enrichCore()
  const contrast = computeContrast()

  await writeFile(join(outDir, 'colors.css'), buildCss(enriched, contrast), 'utf8')
  await writeFile(join(outDir, 'tailwind.colors.js'), buildTailwind(enriched), 'utf8')
  await writeFile(join(outDir, 'tokens.json'), buildJson(enriched, contrast), 'utf8')

  console.log(`✓ colors.css            (${enriched.length} ana renk, ${Object.keys(scales).length} scales)`)
  console.log(`✓ tailwind.colors.js`)
  console.log(`✓ tokens.json           (${contrast.length} contrast pairs computed)`)

  const textFails = contrast.filter((c) => c.intent === 'text' && !c.meetsIntent)
  if (textFails.length) {
    console.error('\n✗ Pairs used as TEXT that fall below AA (4.5:1):')
    for (const f of textFails) console.error(`  ! ${f.tr}: ${f.ratio}:1`)
    process.exitCode = 1
    return
  }

  const graphicLow = contrast.filter((c) => c.intent === 'graphic' && !c.meetsIntent)
  if (graphicLow.length) {
    console.log('\n· Documented limit (graphic use, not text):')
    for (const f of graphicLow) {
      console.log(`  · ${f.tr}: ${f.ratio}:1 — constraint recorded in palette.mjs`)
    }
  }
  console.log(`\n✓ All ${contrast.filter((c) => c.intent === 'text').length} pairs used as text pass AA.`)
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('build-tokens.mjs')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
