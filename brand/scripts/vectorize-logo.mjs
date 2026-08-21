/**
 * brand/logo-beyaz.png → vektörel wordmark.
 *
 * Bu, markanın ASIL logosudur. Harf konturları bir yazı tipinden türetilmez;
 * verilen PNG'nin alfa kanalı izlenerek çıkarılır. Kaynak yalnızca 220 × 80 px
 * olduğu için önce yüksek oranda büyütülüp eşiklenir, sonra Potrace ile bezier
 * eğrilerine dönüştürülür — böylece merdiven basamakları kalmaz.
 *
 * Çıktı: brand/assets/logo/_source/wordmark.json
 *   { path, viewBox, width, height, aspect }
 *
 * Çalıştır: node brand/scripts/vectorize-logo.mjs
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import potrace from 'potrace'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, '..', '..', brand.sourceLogo)
const OUT_DIR = join(here, '..', 'assets', 'logo', '_source')

/**
 * Büyütme oranı ve izleme toleransı, ölçümle seçilmiştir (brand/.cache/sweep).
 * 4× büyütme, 8×'ten hem DAHA DOĞRU (%0,72 sapma / %0,90) hem 2,4 kat daha
 * kısa bir path üretir: yüksek büyütme, neredeyse düz kenarları gereksiz
 * sayıda küçük eğriye böler.
 */
const UPSCALE = 4

/** Potrace ayarları — logo için köşeler korunur, gürültü temizlenir. */
const TRACE = {
  threshold: 128,
  turdSize: 4, // 4 px altı lekeleri at (kaynak taramasındaki artıklar)
  alphaMax: 1, // köşe algılama: 1 = keskin köşeleri koru
  optCurve: true,
  optTolerance: 0.2, // ölçülen en düşük sapma
  turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
}

/** Alfa kanalını ikili bir maskeye çevirir ve büyütür. */
async function prepareBitmap() {
  const meta = await sharp(SRC).metadata()
  const alpha = await sharp(SRC).ensureAlpha().extractChannel('alpha').raw().toBuffer({
    resolveWithObject: true,
  })

  // Mürekkep kutusunu bul — logo etrafındaki saydam kenar boşluğu atılır.
  const { data, info } = alpha
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] > 128) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1

  // Alfa kanalını siyah-beyaz görüntüye çevir (Potrace koyu pikselleri izler).
  const cropped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .extract({ left: x0, top: y0, width: w, height: h })
    .negate() // opak = siyah
    .resize(w * UPSCALE, h * UPSCALE, { kernel: 'lanczos3' })
    .threshold(128)
    .png()
    .toBuffer()

  return { bitmap: cropped, w, h, source: `${meta.width}×${meta.height}` }
}

function trace(bitmap) {
  return new Promise((resolve, reject) => {
    potrace.trace(bitmap, TRACE, (err, svg) => (err ? reject(err) : resolve(svg)))
  })
}

/** Potrace SVG'sinden path verisini ve viewBox'ı çıkarır. */
function extract(svg) {
  const d = (svg.match(/ d="([^"]+)"/) ?? [])[1]
  const width = Number((svg.match(/width="([\d.]+)"/) ?? [])[1])
  const height = Number((svg.match(/height="([\d.]+)"/) ?? [])[1])
  const fillRule = /fill-rule="([^"]+)"/.exec(svg)?.[1] ?? 'evenodd'
  if (!d) throw new Error('Potrace path üretmedi')
  return { d, width, height, fillRule }
}

/**
 * Path'i cap yüksekliği 100 birim olacak şekilde ölçekler ve
 * sol-üst köşeyi (0,0)'a taşır. Tüm marka geometrisi bu birimle konuşur.
 */
function normalize(d, width, height, targetHeight = 100) {
  const s = targetHeight / height
  const num = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi
  const scaled = d.replace(num, (m) => {
    const v = Number(m) * s
    return String(Number(v.toFixed(3)))
  })
  return { d: scaled, width: +(width * s).toFixed(3), height: targetHeight }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const { bitmap, w, h, source } = await prepareBitmap()
  const svg = await trace(bitmap)
  const raw = extract(svg)
  const norm = normalize(raw.d, raw.width, raw.height)

  const result = {
    note:
      'BİEV asıl wordmark. brand/logo-beyaz.png alfa kanalından vektörleştirildi. ' +
      'Do not edit by hand — if the source PNG changes: npm run brand:vectorize',
    sourcePixels: source,
    inkBox: `${w}×${h}`,
    upscale: UPSCALE,
    width: norm.width,
    height: norm.height,
    aspect: +(norm.width / norm.height).toFixed(4),
    fillRule: raw.fillRule,
    viewBox: `0 0 ${norm.width} ${norm.height}`,
    path: norm.d,
  }

  await writeFile(join(OUT_DIR, 'wordmark.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')

  console.log(`✓ wordmark.json`)
  console.log(`  source       ${source} px → ink box ${w}×${h}`)
  console.log(`  tracing      ${UPSCALE}× upscale, Potrace alphaMax ${TRACE.alphaMax}`)
  console.log(`  oran         ${result.aspect}:1`)
  console.log(`  path length  ${norm.d.length} characters`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
