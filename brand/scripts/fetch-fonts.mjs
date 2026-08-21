/**
 * Cinzel + Inter woff2 dosyalarını Google Fonts'tan indirir ve base64 gömülü
 * bir CSS üretir.
 * Çalıştır: node brand/scripts/fetch-fonts.mjs
 *
 * Neden gömülü? PDF Chromium ile üretiliyor. Fontlar dışarıdan yüklenirse
 * build ağ bağlantısına ve zamanlamaya bağımlı olur; gömülü olduğunda PDF
 * her koşulda aynı çıkar ve fontlar PDF'e mutlaka gömülür.
 *
 * Türkçe için latin + latin-ext altkümelerinin ikisi de gereklidir:
 *   Ç ç Ö ö Ü ü  → latin (Latin-1 Supplement)
 *   İ ı Ş ş Ğ ğ  → latin-ext (Latin Extended-A)
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cacheDir = join(here, '..', '.cache', 'fonts')
const outFile = join(here, '..', 'pdf', 'src', 'fonts.css')

/** Tarayıcı UA olmadan Google Fonts woff2 yerine ttf döner. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const FAMILIES = [
  { name: brand.fonts.display, weights: [400, 600, 700] },
  { name: brand.fonts.text, weights: [400, 500, 600, 700, 900] },
]

/**
 * The text family is also fetched as a variable TTF. opentype.js cannot parse
 * woff2, and the descriptor line is typeset with it. Google Fonts serves TTF
 * instead of woff2 when the request carries no browser User-Agent.
 */
async function fetchVariableTtf(family) {
  const url =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100..900`
  const css = await (await fetch(url)).text()
  const src = css.match(/src:\s*url\(([^)]+)\)/)
  if (!src) throw new Error(`${family}: no font URL in the TTF stylesheet`)
  const buf = Buffer.from(await (await fetch(src[1])).arrayBuffer())
  const file = join(here, '..', '.cache', `${family.replace(/\s+/g, '')}-var.ttf`)
  await writeFile(file, buf)
  return { file, bytes: buf.length }
}

/** Türkçe için zorunlu kod noktaları — indirilen altkümede varlığı doğrulanır. */
const REQUIRED = {
  'İ': 0x0130, 'ı': 0x0131, 'Ş': 0x015e, 'ş': 0x015f,
  'Ğ': 0x011e, 'ğ': 0x011f, 'Ç': 0x00c7, 'ç': 0x00e7,
  'Ö': 0x00d6, 'ö': 0x00f6, 'Ü': 0x00dc, 'ü': 0x00fc,
}

/** 'U+0100-024F, U+0259' → [[0x100,0x24f],[0x259,0x259]] */
function parseUnicodeRange(str) {
  return str.split(',').map((part) => {
    const t = part.trim().replace(/^U\+/i, '')
    if (t.includes('-')) {
      const [a, b] = t.split('-')
      return [parseInt(a, 16), parseInt(b, 16)]
    }
    if (t.includes('?')) {
      return [parseInt(t.replace(/\?/g, '0'), 16), parseInt(t.replace(/\?/g, 'F'), 16)]
    }
    const v = parseInt(t, 16)
    return [v, v]
  })
}

function rangesCover(ranges, cp) {
  return ranges.some(([a, b]) => cp >= a && cp <= b)
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function fetchBinaryCached(url, file) {
  const path = join(cacheDir, file)
  if (existsSync(path)) return readFile(path)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(path, buf)
  return buf
}

/** Google Fonts CSS'ini @font-face bloklarına ayırır. */
function parseFaces(css) {
  const faces = []
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? []
  for (const b of blocks) {
    const get = (re) => (b.match(re) ?? [])[1]
    const family = get(/font-family:\s*'([^']+)'/)
    const weight = Number(get(/font-weight:\s*(\d+)/) ?? 400)
    const style = get(/font-style:\s*(\w+)/) ?? 'normal'
    const src = get(/src:\s*url\(([^)]+)\)/)
    const range = get(/unicode-range:\s*([^;]+);/)
    if (family && src) faces.push({ family, weight, style, src, range: range?.trim() })
  }
  return faces
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  await mkdir(dirname(outFile), { recursive: true })

  const out = [
    `/* ${brand.name} — embedded fonts. Generated; do not edit by hand.`,
    '   Source: brand/scripts/fetch-fonts.mjs',
    `   ${brand.fonts.display} and ${brand.fonts.text} are licensed under the SIL Open Font License 1.1. */`,
    '',
  ]

  const coverage = {}
  let faceCount = 0
  let totalBytes = 0

  for (const fam of FAMILIES) {
    const url =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam.name)}:wght@` +
      fam.weights.join(';') +
      '&display=swap'
    const css = await fetchText(url)
    const faces = parseFaces(css)

    // Yalnızca latin ve latin-ext altkümeleri gerekli.
    const keep = faces.filter((f) => {
      if (!f.range) return true
      const ranges = parseUnicodeRange(f.range)
      return Object.values(REQUIRED).some((cp) => rangesCover(ranges, cp))
    })

    if (!keep.length) throw new Error(`${fam.name}: no subset covers the required codepoints`)

    for (const f of keep) {
      const file = `${f.family.replace(/\s+/g, '')}-${f.weight}-${keep.indexOf(f)}.woff2`
      const buf = await fetchBinaryCached(f.src, file)
      totalBytes += buf.length
      faceCount++
      out.push(
        `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;`,
        `src:url(data:font/woff2;charset=utf-8;base64,${buf.toString('base64')}) format('woff2');`,
        f.range ? `unicode-range:${f.range};}` : '}',
        '',
      )
    }

    // Hangi Türkçe karakterin hangi ağırlıkta kapsandığını doğrula.
    for (const w of fam.weights) {
      const forWeight = keep.filter((f) => f.weight === w)
      const allRanges = forWeight.flatMap((f) => (f.range ? parseUnicodeRange(f.range) : [[0, 0x10ffff]]))
      const missing = Object.entries(REQUIRED)
        .filter(([, cp]) => !rangesCover(allRanges, cp))
        .map(([ch]) => ch)
      coverage[`${fam.name} ${w}`] = missing.length ? `MISSING: ${missing.join(' ')}` : 'complete'
    }
  }

  await writeFile(outFile, out.join('\n'), 'utf8')

  const ttf = await fetchVariableTtf(brand.fonts.text)

  console.log(`✓ fonts.css           ${faceCount} @font-face, ${(totalBytes / 1024).toFixed(0)} KB embedded`)
  console.log(`✓ ${basename(ttf.file).padEnd(19)} ${(ttf.bytes / 1024).toFixed(0)} KB — variable TTF for typesetting`)
  const bad = Object.entries(coverage).filter(([, v]) => v !== 'complete')
  for (const [k, v] of Object.entries(coverage)) console.log(`  ${k.padEnd(14)} codepoint coverage: ${v}`)
  if (bad.length) {
    console.error('\n✗ Some weights are missing required codepoints.')
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
