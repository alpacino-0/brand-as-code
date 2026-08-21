/**
 * Favicon seti, app ikonları ve OG görseli.
 * Çalıştır: node brand/scripts/build-raster.mjs
 *
 * Zincir: SVG → (Chromium) 1024 px PNG → (sharp) tüm boyutlar → (Node) .ico konteyner
 * Chromium kullanılır çünkü logo SVG'si <mask> içerir; sharp'ın SVG motoru
 * maskeyi güvenilir şekilde işlemez.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

import { launch } from './browser.mjs'
import { semantic } from '../assets/tokens/palette.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const logoDir = join(here, '..', 'assets', 'logo')
const faviconDir = join(here, '..', 'assets', 'favicon')
const ogDir = join(here, '..', 'assets', 'og')

const PETROL = semantic['surface-inverse'] // #003851
const LIGHT = semantic['text-inverse'] // #F5F3EE

/** Bir HTML parçasını verilen ölçüde PNG'ye render eder. */
async function renderPng(browser, { html, width, height, scale = 1 }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  })
  await page.setContent(
    `<!doctype html><meta charset="utf-8">
     <style>*{margin:0;padding:0;box-sizing:border-box}
       html,body{width:${width}px;height:${height}px;overflow:hidden}</style>${html}`,
    { waitUntil: 'load' },
  )
  await page.evaluate(() => document.fonts?.ready)
  const buf = await page.screenshot({ omitBackground: true })
  await page.close()
  return buf
}

/**
 * PNG gömülü .ico konteyneri.
 * ICONDIR (6 bayt) + her görsel için ICONDIRENTRY (16 bayt) + PNG verileri.
 */
export function buildIco(pngs) {
  const count = pngs.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(count, 4)

  const entries = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  pngs.forEach(({ size, data }, i) => {
    const e = 16 * i
    entries.writeUInt8(size >= 256 ? 0 : size, e + 0) // width
    entries.writeUInt8(size >= 256 ? 0 : size, e + 1) // height
    entries.writeUInt8(0, e + 2) // palette
    entries.writeUInt8(0, e + 3) // reserved
    entries.writeUInt16LE(1, e + 4) // color planes
    entries.writeUInt16LE(32, e + 6) // bits per pixel
    entries.writeUInt32LE(data.length, e + 8)
    entries.writeUInt32LE(offset, e + 12)
    offset += data.length
  })

  return Buffer.concat([header, entries, ...pngs.map((p) => p.data)])
}

async function main() {
  await mkdir(faviconDir, { recursive: true })
  await mkdir(ogDir, { recursive: true })

  const monoReverse = await readFile(join(logoDir, `${PREFIX}-monogram-reverse.svg`), 'utf8')
  const monoCurrent = await readFile(join(logoDir, `${PREFIX}-monogram-current.svg`), 'utf8')
  const primaryWhite = await readFile(join(logoDir, `${PREFIX}-logo-primary-white.svg`), 'utf8')
  const silhouette = await readFile(join(logoDir, `${PREFIX}-silhouette.svg`), 'utf8')
  const kesim = await readFile(join(here, '..', 'assets', 'patterns', 'kesim-hatti.svg'), 'utf8')

  const browser = await launch()

  // --- Ana ikon: petrol zemin üzerine açık monogram, tam taşma ---
  const iconHtml = `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;background:${PETROL}">
    <div style="width:1024px;height:1024px">${monoReverse.replace(/width="\d+" height="\d+"/, 'width="1024" height="1024"')}</div>
  </div>`
  const master = await renderPng(browser, { html: iconHtml, width: 1024, height: 1024 })

  /**
   * Maskable ikon: Android ikonu daire/squircle olarak kırpar.
   * İşaret, güvenli bölge olan iç %80'e sığmalı — bu yüzden %66'ya küçültülür.
   */
  // color: LIGHT ZORUNLU — monogram fill="currentColor" kullanır; renk bağlamı
  // verilmezse tarayıcı varsayılanı olan siyaha düşer ve ikon petrol üzerine
  // siyah çıkar.
  const maskableHtml = `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;background:${PETROL};color:${LIGHT}">
    <div style="width:676px;height:676px">${monoCurrent.replace(/width="\d+" height="\d+"/, 'width="676" height="676"')}</div>
  </div>`
  const maskable = await renderPng(browser, { html: maskableHtml, width: 1024, height: 1024 })

  // --- OG görseli 1200×630 ---
  const ogHtml = `<div style="width:1200px;height:630px;background:${PETROL};position:relative;display:flex;flex-direction:column;justify-content:center;padding:0 88px;font-family:system-ui,sans-serif;overflow:hidden">
    <div style="position:absolute;inset:0;color:${LIGHT};opacity:.10">
      ${kesim.replace('width="200" height="200"', 'width="1200" height="630"').replace('viewBox="0 0 200 200"', 'viewBox="0 0 1200 630"').replace('<rect width="200" height="200"', '<rect width="1200" height="630"')}
    </div>
    <div style="position:relative;width:430px">${primaryWhite.replace(/width="\d+" height="\d+"/, 'width="430"')}</div>
    <div style="position:relative;margin-top:44px;color:${LIGHT};font-size:30px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">
      Doğal Taş Üretim ve İhracat
    </div>
    <div style="position:relative;margin-top:14px;color:${LIGHT};font-size:22px;opacity:.62">
      
    </div>
  </div>`
  const og = await renderPng(browser, { html: ogHtml, width: 1200, height: 630 })
  await writeFile(join(ogDir, 'og-image.png'), await sharp(og).png({ quality: 92 }).toBuffer())

  await browser.close()

  // --- Boyut türetme ---
  const png = (buf, size) => sharp(buf).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer()

  const outputs = [
    ['favicon-16x16.png', await png(master, 16)],
    ['favicon-32x32.png', await png(master, 32)],
    ['favicon-48x48.png', await png(master, 48)],
    ['apple-touch-icon.png', await png(master, 180)],
    ['icon-192.png', await png(master, 192)],
    ['icon-512.png', await png(master, 512)],
    ['icon-maskable-512.png', await png(maskable, 512)],
  ]
  for (const [name, buf] of outputs) await writeFile(join(faviconDir, name), buf)

  // --- .ico (16 + 32 + 48) ---
  const ico = buildIco([
    { size: 16, data: await png(master, 16) },
    { size: 32, data: await png(master, 32) },
    { size: 48, data: await png(master, 48) },
  ])
  await writeFile(join(faviconDir, 'favicon.ico'), ico)

  // --- Safari pinned tab (tek renk siluet) ---
  await writeFile(join(faviconDir, 'safari-pinned-tab.svg'), silhouette, 'utf8')

  // --- Web app manifest ---
  const manifest = {
    name: 'BİEV Marble',
    short_name: 'BİEV',
    description: 'Doğal taş üretim ve ihracat — İscehisar, Afyonkarahisar',
    start_url: '/',
    display: 'standalone',
    background_color: PETROL,
    theme_color: PETROL,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  await writeFile(join(faviconDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  // --- Doğrulama: her PNG gerçekten istenen boyutta mı? ---
  const checks = []
  for (const [name] of outputs) {
    const meta = await sharp(join(faviconDir, name)).metadata()
    checks.push(`${name.padEnd(24)} ${meta.width}×${meta.height} ${meta.format}`)
  }
  const ogMeta = await sharp(join(ogDir, 'og-image.png')).metadata()
  const icoBuf = await readFile(join(faviconDir, 'favicon.ico'))
  const icoValid = icoBuf.readUInt16LE(0) === 0 && icoBuf.readUInt16LE(2) === 1
  const icoCount = icoBuf.readUInt16LE(4)

  console.log('✓ favicon set → brand/assets/favicon/')
  for (const c of checks) console.log('  ' + c)
  console.log(`  favicon.ico              ${icoCount} images, signature ${icoValid ? 'valid' : 'GEÇERSİZ'}`)
  console.log(`  site.webmanifest         ${manifest.icons.length} icons`)
  console.log(`✓ og-image.png            ${ogMeta.width}×${ogMeta.height}`)

  if (!icoValid) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
