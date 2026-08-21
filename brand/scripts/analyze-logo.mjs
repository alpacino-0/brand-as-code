/**
 * Asıl logonun geometrisini ÖLÇER.
 *
 * Marka kitabındaki her sayı buradan gelir: oran, harf sınırları, derz
 * (harfleri ayıran ince boşluk) kalınlığı, V'nin diyagonal açısı.
 * Hiçbiri tahmin edilmez.
 *
 * Çalıştır: node brand/scripts/analyze-logo.mjs
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, '..', '..', brand.sourceLogo)
const OUT = join(here, '..', 'assets', 'logo', '_source', 'geometry.json')

/** Mürekkep maskesini kaynak PNG'nin alfa kanalından yüksek çözünürlükte üretir. */
async function inkMask(scale = 8) {
  const a = await sharp(SRC).ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true })
  const { data, info } = a
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] > 128) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .extract({ left: x0, top: y0, width: w, height: h })
    .resize(w * scale, h * scale, { kernel: 'nearest' })
    .toColourspace('b-w')
    .raw()
    .toBuffer()
  return { buf, W: w * scale, H: h * scale, srcW: w, srcH: h, scale }
}

const at = (m, x, y) => m.buf[y * m.W + x] > 128

/** Her sütunun mürekkep doluluk oranı — harf sınırları buradan çıkar. */
function columnProfile(m) {
  const p = new Array(m.W).fill(0)
  for (let x = 0; x < m.W; x++) {
    let c = 0
    for (let y = 0; y < m.H; y++) if (at(m, x, y)) c++
    p[x] = c / m.H
  }
  return p
}

/**
 * Derz: harfleri ayıran ince dikey boşluk.
 *
 * Sabit bir eşik kullanılmaz — derzlerin bir kısmı harflerin çakıştığı yerde
 * tamamen boşalmaz. Bunun yerine sütun doluluk profilindeki yerel vadiler
 * aranır: komşularından belirgin biçimde düşük olan dar bölgeler.
 */
function findJoints(profile, m) {
  const inner = profile.slice(Math.round(m.W * 0.02), Math.round(m.W * 0.98))
  const sorted = [...inner].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const cutoff = median * 0.55

  const joints = []
  const gaps = []
  let run = null
  const close = (run, x) => {
    run.end = x - 1
    run.width = run.end - run.start + 1
    // A joint is narrow — where two letterforms meet. A wide valley is either
    // a letter's own counter (the inside of a V) or the space between separated
    // letters. Both are recorded; consumers pick the one they need.
    if (run.width <= m.scale * 6) joints.push(run)
    else gaps.push(run)
  }
  for (let x = Math.round(m.W * 0.02); x < Math.round(m.W * 0.98); x++) {
    const low = profile[x] < cutoff
    if (low && !run) run = { start: x, min: profile[x] }
    else if (low && run) run.min = Math.min(run.min, profile[x])
    else if (!low && run) {
      close(run, x)
      run = null
    }
  }
  return { joints, gaps, median: +median.toFixed(3), cutoff: +cutoff.toFixed(3) }
}

/** Bir kenarın açısını iki y seviyesindeki x konumundan hesaplar. */
function edgeAngle(m, yA, yB, { fromRight = true, xMin = 0, xMax = null }) {
  const hi = xMax ?? m.W - 1
  const scan = (y) => {
    if (fromRight) {
      for (let x = hi; x >= xMin; x--) if (at(m, x, y)) return x
    } else {
      for (let x = xMin; x <= hi; x++) if (at(m, x, y)) return x
    }
    return null
  }
  const a = scan(yA)
  const b = scan(yB)
  if (a === null || b === null) return null
  const dx = b - a
  const dy = yB - yA
  // Yataydan ölçülen açı
  return { deg: +(Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI).toFixed(2), xA: a, xB: b, dx, dy }
}

async function main() {
  const m = await inkMask(8)
  const profile = columnProfile(m)
  const { joints, gaps, median, cutoff } = findJoints(profile, m)

  const toSrc = (v) => +(v / m.scale).toFixed(2)
  const toUnits = (v) => +((v / m.scale) * (100 / m.srcH)).toFixed(2) // cap yüksekliği 100 birim

  // Toplam mürekkep oranı
  let ink = 0
  for (let i = 0; i < m.W * m.H; i++) if (m.buf[i] > 128) ink++

  // V'nin dış (sağ) diyagonali: üst kenardan aşağı
  const vRight = edgeAngle(m, Math.round(m.H * 0.05), Math.round(m.H * 0.75), { fromRight: true })
  // V'nin iç (sol) kenarı — sağdan tarayarak V'nin içindeki boşluğun sağ sınırı
  const vLeftOuter = edgeAngle(m, Math.round(m.H * 0.1), Math.round(m.H * 0.9), {
    fromRight: false,
    xMin: Math.round(m.W * 0.68),
  })

  const report = {
    note:
      'brand/logo-beyaz.png üzerinden ÖLÇÜLMÜŞ değerler. Marka kitabındaki geometri ' +
      'sayıları buradan gelir. Yeniden ölçmek için: npm run brand:analyze',
    source: { pixels: `${m.srcW}×${m.srcH}`, measuredAt: `${m.scale}× örnekleme` },
    aspect: +(m.srcW / m.srcH).toFixed(4),
    inkCoverage: +((ink / (m.W * m.H)) * 100).toFixed(1),
    capHeightUnits: 100,
    widthUnits: +((m.srcW / m.srcH) * 100).toFixed(2),
    jointDetection: { medianColumnCoverage: median, cutoff },
    joints: joints.map((j) => ({
      atUnits: toUnits((j.start + j.end) / 2),
      widthSrcPx: toSrc(j.width),
      widthUnits: toUnits(j.width),
      minCoverage: +j.min.toFixed(3),
    })),
    gaps: gaps.map((j) => ({
      atUnits: toUnits((j.start + j.end) / 2),
      widthSrcPx: toSrc(j.width),
      widthUnits: toUnits(j.width),
      minCoverage: +j.min.toFixed(3),
    })),
    vDiagonal: vRight ? { angleFromHorizontalDeg: vRight.deg } : null,
    vInnerEdge: vLeftOuter ? { angleFromHorizontalDeg: vLeftOuter.deg } : null,
  }

  await writeFile(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8')

  console.log('SOURCE ARTWORK — measured')
  console.log(`  source            ${report.source.pixels} px`)
  console.log(`  aspect            ${report.aspect}:1  (width ${report.widthUnits} units / cap 100)`)
  console.log(`  ink coverage      ${report.inkCoverage}%`)
  console.log(`  joints            ${report.joints.length}  (median column coverage ${median}, cutoff ${cutoff})`)
  for (const j of report.joints) {
    console.log(`    · ${String(j.atUnits).padStart(6)} units · width ${j.widthUnits} birim (${j.widthSrcPx} px)`)
  }
  console.log(`  outer diagonal    ${report.vDiagonal?.angleFromHorizontalDeg}° (from horizontal)`)
  console.log(`  inner edge        ${report.vInnerEdge?.angleFromHorizontalDeg}° (from horizontal)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
