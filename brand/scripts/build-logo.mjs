/**
 * Logo SVG seti üreticisi — ASIL logodan (brand/logo-beyaz.png).
 * Çalıştır: node brand/scripts/build-logo.mjs
 *
 * Üretilenler (brand/assets/logo/):
 *   <prefix>-logo-primary      · asıl wordmark, olduğu gibi
 *   <prefix>-logo-horizontal   · wordmark + ayraç + MARBLE, tek satır
 *   <prefix>-monogram          · asıl logodan kesilen B (favicon, app ikonu)
 *   <prefix>-silhouette        · tek renk siluet (Safari pinned tab)
 * her biri × petrol / white / black / reverse / current
 *
 * Dosya adları değiştirilmez: proje bileşenleri ve public/ bunlara bağlı.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { buildPrimary, buildLockup, buildMonogram, SPEC, WORDMARK, MEASURED } from './wordmark.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'assets', 'logo')

const COLORS = {
  petrol: { ink: '#003851', bg: null },
  white: { ink: '#FFFFFF', bg: null },
  black: { ink: '#1A2226', bg: null },
  reverse: { ink: '#F5F3EE', bg: '#003851' },
  current: { ink: 'currentColor', bg: null },
}

const CREDIT =
  'BİEV MARBLE — asıl logo. Kontur brand/logo-beyaz.png alfa kanalından vektörleştirilmiştir.'

function svgWrap({ title, viewBox, width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="${title}">
<title>${title}</title>
<desc>${CREDIT}</desc>
${body}
</svg>
`
}

const bgRect = (bg, x, y, w, h) =>
  bg ? `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" fill="${bg}"/>\n` : ''

/** Ana kilit: asıl wordmark. */
function primarySvg(geo, { ink, bg }) {
  const pad = geo.H * 0.1
  const x = -pad
  const y = -pad
  const w = geo.bb.w + pad * 2
  const h = geo.bb.h + pad * 2
  return svgWrap({
    title: 'BİEV MARBLE',
    viewBox: `${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`,
    width: Math.round(w * 3),
    height: Math.round(h * 3),
    body: bgRect(bg, x, y, w, h) + `<path d="${geo.path}" fill="${ink}" fill-rule="${geo.fillRule}"/>`,
  })
}

/** Tek satır kilit: wordmark · ayraç · MARBLE. */
function horizontalSvg(lock, { ink, bg }) {
  const H = lock.H
  const gap = H * 0.26
  const ruleW = H * 0.045
  const descScale = 0.24 // wordmark cap'ine oran
  const ruleX = lock.width + gap

  // MARBLE'ı tek satıra taşı: küçült ve taban çizgisini wordmark tabanına hizala
  const s = (H * descScale) / lock.descriptorCap
  const dx = ruleX + ruleW + gap
  const dy = H - lock.totalHeight * s

  const descTransform = `translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${s.toFixed(5)})`
  // Ölçeklenmiş MARBLE genişliği
  const descW = lock.width * s
  const totalW = dx + descW
  const pad = H * 0.1
  const x = -pad
  const y = -pad
  const w = totalW + pad * 2
  const h = H + pad * 2

  return svgWrap({
    title: 'BİEV MARBLE',
    viewBox: `${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`,
    width: Math.round(w * 3),
    height: Math.round(h * 3),
    body:
      bgRect(bg, x, y, w, h) +
      `<path d="${lock.wordmarkPath}" fill="${ink}" fill-rule="${lock.fillRule}"/>\n` +
      `<rect x="${ruleX.toFixed(3)}" y="0" width="${ruleW.toFixed(3)}" height="${H}" fill="${ink}"/>\n` +
      `<g transform="${descTransform}"><path d="${lock.descriptorPath}" fill="${ink}"/></g>`,
  })
}

/**
 * Monogram: asıl logonun B'si.
 * Yol değişmez; viewBox ölçülen ilk derzde kırpılır, kalan harfler dışarıda kalır.
 */
function monogramSvg(mono, { ink, bg }) {
  const pad = mono.H * 0.26
  const boxW = mono.bb.w + pad * 2
  const boxH = mono.H + pad * 2
  const box = Math.max(boxW, boxH)
  const x = -pad - (box - boxW) / 2
  const y = -pad - (box - boxH) / 2
  const clipId = `${PREFIX}-mono-clip-${Math.abs(mono.cutAt * 1000) | 0}`
  return svgWrap({
    title: 'BİEV MARBLE — monogram',
    viewBox: `${x.toFixed(3)} ${y.toFixed(3)} ${box.toFixed(3)} ${box.toFixed(3)}`,
    width: 512,
    height: 512,
    body:
      bgRect(bg, x, y, box, box) +
      `<clipPath id="${clipId}"><rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${(mono.cutAt - x).toFixed(3)}" height="${box.toFixed(3)}"/></clipPath>\n` +
      `<path d="${mono.path}" fill="${ink}" fill-rule="${mono.fillRule}" clip-path="url(#${clipId})"/>`,
  })
}

/** Safari pinned tab: tek renk, maskesiz siluet. */
function silhouetteSvg(mono) {
  const pad = mono.H * 0.26
  const boxW = mono.bb.w + pad * 2
  const boxH = mono.H + pad * 2
  const box = Math.max(boxW, boxH)
  const x = -pad - (box - boxW) / 2
  const y = -pad - (box - boxH) / 2
  return svgWrap({
    title: 'BİEV MARBLE',
    viewBox: `${x.toFixed(3)} ${y.toFixed(3)} ${box.toFixed(3)} ${box.toFixed(3)}`,
    width: 16,
    height: 16,
    body:
      `<clipPath id="${PREFIX}-sil-clip"><rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${(mono.cutAt - x).toFixed(3)}" height="${box.toFixed(3)}"/></clipPath>\n` +
      `<path d="${mono.path}" fill="#000" fill-rule="${mono.fillRule}" clip-path="url(#${PREFIX}-sil-clip)"/>`,
  })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const geo = buildPrimary()
  const lock = buildLockup()
  const mono = buildMonogram()

  const written = []
  for (const [name, colors] of Object.entries(COLORS)) {
    const files = [
      [`${PREFIX}-logo-primary-${name}.svg`, primarySvg(geo, colors)],
      [`${PREFIX}-logo-horizontal-${name}.svg`, horizontalSvg(lock, colors)],
      [`${PREFIX}-monogram-${name}.svg`, monogramSvg(mono, colors)],
    ]
    for (const [file, content] of files) {
      await writeFile(join(outDir, file), content, 'utf8')
      written.push(file)
    }
  }
  await writeFile(join(outDir, `${PREFIX}-silhouette.svg`), silhouetteSvg(mono), 'utf8')
  written.push(`${PREFIX}-silhouette.svg`)

  /** Kitte kullanılan geometri raporu — ölçüm + türetilen kilit ölçüleri. */
  const report = {
    note: 'Asıl logo brand/logo-beyaz.png. Ölçümler brand/scripts/analyze-logo.mjs ile yapılır.',
    source: MEASURED.source,
    capHeight: SPEC.capHeight,
    primary: { width: WORDMARK.width, height: SPEC.capHeight, aspect: WORDMARK.aspect },
    monogram: { width: mono.bb.w, height: SPEC.capHeight, cutAtUnits: mono.cutAt },
    lockup: { width: lock.width, totalHeight: lock.totalHeight, descriptorCap: lock.descriptorCap },
    inkCoverage: MEASURED.inkCoverage,
    joints: MEASURED.joints,
    vDiagonalDeg: MEASURED.vDiagonal?.angleFromHorizontalDeg,
    vInnerEdgeDeg: MEASURED.vInnerEdge?.angleFromHorizontalDeg,
    /** Güvenli alan = cap yüksekliğinin yarısı. */
    clearSpaceUnits: SPEC.capHeight * 0.5,
  }
  await writeFile(join(outDir, 'geometry.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  written.push('geometry.json')

  console.log(`✓ ${written.length} files → brand/assets/logo/  (source: original artwork)`)
  console.log(`  wordmark aspect ${WORDMARK.aspect}:1`)
  console.log(`  monogram cut    ${mono.cutAt} units (first measured boundary)`)
  console.log(`  V diyagonali    ${report.vDiagonalDeg}° from horizontal`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
