/**
 * Payload admin bileşenlerini marka SVG'lerinden ÜRETİR.
 * Çalıştır: node brand/scripts/build-components.mjs
 *
 * Üretilenler:
 *   src/components/admin/Logo.tsx           (.<prefix>-logo--primary)
 *   src/components/admin/LogoHorizontal.tsx (.<prefix>-logo--horizontal)
 *   src/components/admin/Icon.tsx   (.<prefix>-logo--monogram)
 *   src/components/admin/KategoriIkonlari.tsx (ürün kategorisi ikonları)
 *   public/*                        (favicon seti + OG görseli)
 *
 * Bileşenlerin dışa aktarım adı, className ve dosya yolu DEĞİŞMEZ — projedeki
 * payload.config.ts, custom.scss ve testler bunlara bağlıdır. Değişen yalnızca
 * içerideki geometridir.
 *
 * Elle düzenlemeyin: logo değişirse bu script yeniden çalıştırılır ve bileşenler
 * asıl logodan bir daha ayrışamaz.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const brandDir = join(here, '..')
const root = join(brandDir, '..')
const logoDir = join(brandDir, 'assets', 'logo')
const componentsDir = join(root, 'src', 'components', 'admin')
const publicDir = join(root, 'public')

/** SVG dosyasından viewBox, path verisi, fill-rule ve varsa clipPath'i çıkarır. */
async function readLogoSvg(name) {
  const svg = await readFile(join(logoDir, `${name}.svg`), 'utf8')
  const viewBox = (svg.match(/viewBox="([^"]+)"/) ?? [])[1]
  const path = (svg.match(/<path d="([^"]+)"/) ?? [])[1]
  const fillRule = (svg.match(/fill-rule="([^"]+)"/) ?? [])[1] ?? 'nonzero'
  const clipRect = svg.match(/<clipPath id="[^"]+"><rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"\/><\/clipPath>/)
  if (!viewBox || !path) throw new Error(`${name}.svg ayrıştırılamadı`)
  return {
    viewBox,
    path,
    fillRule,
    clip: clipRect
      ? { x: clipRect[1], y: clipRect[2], width: clipRect[3], height: clipRect[4] }
      : null,
  }
}

/**
 * SVG'nin İÇ İÇERİĞİNİN TAMAMINI JSX'e çevirir.
 *
 * `readLogoSvg` yalnızca ilk <path>'i alır; ana kilit ve monogram tek yollu
 * olduğu için orada yeterlidir. Yatay kilit ise ÜÇ öğeden oluşur:
 *   <path>      <Brand> harfleri
 *   <rect>      dikey ayraç çubuğu
 *   <g><path>   MARBLE yazısı
 *
 * Tek yol alınırsa "MARBLE" sessizce kaybolur ve geniş viewBox içinde sağı
 * boş bir logo kalır — hata vermez, yalnızca eksik çizer.
 */
async function readLogoInner(name) {
  const svg = await readFile(join(logoDir, `${name}.svg`), 'utf8')
  const viewBox = (svg.match(/viewBox="([^"]+)"/) ?? [])[1]
  if (!viewBox) throw new Error(`${name}.svg — viewBox bulunamadı`)

  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    // <title> ve <desc> bileşende elle yazılıyor; iki kez çıkmasınlar.
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<desc>[\s\S]*?<\/desc>/g, '')
    // JSX kebab-case öznitelik kabul etmez: fill-rule → fillRule
    .replace(/\s([a-z]+)-([a-z])([a-z]*)=/g, (_, a, b, c) => ` ${a}${b.toUpperCase()}${c}=`)
    .trim()

  if (!inner.includes('<path')) throw new Error(`${name}.svg — içerik ayrıştırılamadı`)
  return { viewBox, inner }
}

/**
 * Ürün kategorisi ikonlarını tek bir React bileşenine toplar.
 *
 * SATIR İÇİ olmalarının sebebi somut: ikonlar `stroke="currentColor"`
 * kullanıyor (brand/08-grafik-dil.md). Dosya olarak <img> ile servis
 * edilseydi currentColor sayfadan miras almaz, siyaha düşerdi — panelin
 * koyu temasında ikonlar görünmez olurdu.
 */
async function readIcons() {
  const iconDir = join(brandDir, 'assets', 'icons')
  const dizin = JSON.parse(await readFile(join(iconDir, 'index.json'), 'utf8'))

  const ikonlar = []
  for (const { key, tr, en } of dizin.icons) {
    const svg = await readFile(join(iconDir, `${key}.svg`), 'utf8')
    const inner = svg
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>[\s\S]*$/, '')
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/\s([a-z]+)-([a-z])([a-z]*)=/g, (_, a, b, c) => ` ${a}${b.toUpperCase()}${c}=`)
      .trim()
    // Her ikon <path> içermez: yuvarlak-eviye yalnızca <circle>'lardan oluşur,
    // başkaları <rect> kullanır. Yalnızca <path> aransaydı bu ikonlar sessizce
    // boş çıkardı — kontrol tüm çizim öğelerini kapsar.
    if (!/<(path|circle|rect|line|ellipse|polyline|polygon)\b/.test(inner)) {
      throw new Error(`${key}.svg — çizim öğesi bulunamadı`)
    }
    ikonlar.push({ key, tr, en, inner })
  }
  return { ikonlar, grid: dizin.grid, strokeWidth: dizin.strokeWidth }
}

function iconSetComponent({ ikonlar, grid, strokeWidth }) {
  const girdiler = ikonlar
    .map(({ key, tr, en, inner }) => `  '${key}': {
    ad: { tr: '${tr}', en: '${en}' },
    cizim: (
      <>${inner}</>
    ),
  },`)
    .join('\n')

  return `${HEADER}
import React from 'react'

/**
 * Ürün kategorisi ikonları — ${ikonlar.length} adet.
 *
 * Çizim dili marka kitabından gelir (brand/08-grafik-dil.md):
 * ${grid}×${grid} ızgara, ${strokeWidth} çizgi, KARE uç, KESKİN köşe.
 * Yuvarlak uç markayı yumuşatır ve kullanılmaz.
 *
 * Renk \`currentColor\`: ikon bulunduğu yerin metin rengini alır, böylece
 * açık ve koyu temada ayrı dosya gerekmez.
 */
const IKONLAR: Record<string, { ad: { tr: string; en: string }; cizim: React.ReactNode }> = {
${girdiler}
}

export type KategoriIkonAdi = keyof typeof IKONLAR

/** Tanımlı ikon anahtarları — koleksiyon seçenekleriyle karşılaştırmak için. */
export const KATEGORI_IKON_ANAHTARLARI = Object.keys(IKONLAR)

export const KategoriIkonu: React.FC<{ ad?: string | null; boyut?: number }> = ({
  ad,
  boyut = ${grid},
}) => {
  const ikon = ad ? IKONLAR[ad] : undefined
  if (!ikon) return null

  return (
    <svg
      aria-label={ikon.ad.tr}
      className="${PREFIX}-kategori-ikon"
      fill="none"
      height={boyut}
      role="img"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth={${strokeWidth}}
      viewBox="0 0 ${grid} ${grid}"
      width={boyut}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{ikon.ad.tr}</title>
      {ikon.cizim}
    </svg>
  )
}

export default KategoriIkonu
`
}

const HEADER = `/* OTOMATİK ÜRETİLDİ — elle düzenlemeyin.
 * Kaynak : brand/logo-beyaz.png (markanın asıl logosu)
 * Generator: brand/scripts/build-components.mjs
 * Komut  : npm run brand:components
 */`

function logoComponent({ viewBox, path, fillRule }) {
  return `${HEADER}
import React from 'react'

/**
 * Ana kilit — giriş ekranında kullanılır.
 *
 * Kontur, markanın ASIL logosundan (brand/logo-beyaz.png) vektörleştirilmiştir;
 * bir yazı tipinden türetilmemiştir. Logo yeniden dizilmez, harfleri değiştirilmez,
 * oranı bozulmaz.
 *
 * \`fill="currentColor"\` olduğu için renk CSS'ten yönetilir: petrol zemin üzerinde
 * beyaz, açık zeminde petrol (bkz. brand/07-logo-sistemi.md).
 */
export const Logo: React.FC = () => (
  <svg
    aria-label="BİEV MARBLE"
    className="${PREFIX}-logo ${PREFIX}-logo--primary"
    role="img"
    viewBox="${viewBox}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>BİEV MARBLE</title>
    <path d="${path}" fill="currentColor" fillRule="${fillRule}" />
  </svg>
)

export default Logo
`
}

function logoHorizontalComponent({ viewBox, inner }) {
  return `${HEADER}
import React from 'react'

/**
 * Yatay kilit — geniş ve alçak alanlar için.
 *
 * Marka kuralı: "Yatay kilit — geniş ve alçak alanlar: web başlığı, e-posta
 * imzası, araç yan yüzeyi" (brand/07-logo-sistemi.md). Site alt bilgisindeki
 * bant tam olarak bu tanıma girer; ana kilit orada gereğinden yüksek durur.
 *
 * Minimum yükseklik 24 px — ana kilidin 32 px'i değil.
 *
 * \`fill="currentColor"\`: renk CSS'ten yönetilir. Petrol zemin üzerinde beyaz
 * kullanılır, açık zeminde petrol (brand/07-logo-sistemi.md).
 */
export const LogoHorizontal: React.FC = () => (
  <svg
    aria-label="BİEV MARBLE"
    className="${PREFIX}-logo ${PREFIX}-logo--horizontal"
    role="img"
    viewBox="${viewBox}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>BİEV MARBLE</title>
    ${inner}
  </svg>
)

export default LogoHorizontal
`
}

function iconComponent({ viewBox, path, fillRule, clip }) {
  const clipId = `${PREFIX}-monogram-clip`
  return `${HEADER}
import React from 'react'

/**
 * Monogram — kenar çubuğu başlığında ve dar alanlarda kullanılır.
 *
 * Bu B çizilmemiş, asıl logodan KESİLMİŞTİR: kesim sınırı, logoda ölçülen ilk
 * derzin (harfleri ayıran ince çizgi) başlangıcıdır. Böylece monogramdaki B ile
 * wordmark'taki B birebir aynı harftir. Minimum boyut 16 px.
 */
export const Icon: React.FC = () => (
  <svg
    aria-label="BİEV"
    className="${PREFIX}-logo ${PREFIX}-logo--monogram"
    role="img"
    viewBox="${viewBox}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>BİEV</title>
    <clipPath id="${clipId}">
      <rect height="${clip.height}" width="${clip.width}" x="${clip.x}" y="${clip.y}" />
    </clipPath>
    <path
      clipPath="url(#${clipId})"
      d="${path}"
      fill="currentColor"
      fillRule="${fillRule}"
    />
  </svg>
)

export default Icon
`
}

/** Favicon seti ve OG görselini public/ altına kopyalar. */
async function syncPublic() {
  await mkdir(publicDir, { recursive: true })
  const faviconDir = join(brandDir, 'assets', 'favicon')
  const copied = []
  for (const f of await readdir(faviconDir)) {
    await copyFile(join(faviconDir, f), join(publicDir, f))
    copied.push(f)
  }
  await copyFile(join(brandDir, 'assets', 'og', 'og-image.png'), join(publicDir, 'og-image.png'))
  copied.push('og-image.png')
  return copied
}

async function main() {
  await mkdir(componentsDir, { recursive: true })

  const primary = await readLogoSvg(`${PREFIX}-logo-primary-current`)
  const horizontal = await readLogoInner(`${PREFIX}-logo-horizontal-current`)
  const mono = await readLogoSvg(`${PREFIX}-monogram-current`)
  const ikonSeti = await readIcons()
  if (!mono.clip) throw new Error('Monogram SVG içinde clipPath bulunamadı')

  await writeFile(join(componentsDir, 'Logo.tsx'), logoComponent(primary), 'utf8')
  await writeFile(
    join(componentsDir, 'LogoHorizontal.tsx'),
    logoHorizontalComponent(horizontal),
    'utf8',
  )
  await writeFile(join(componentsDir, 'Icon.tsx'), iconComponent(mono), 'utf8')
  await writeFile(
    join(componentsDir, 'KategoriIkonlari.tsx'),
    iconSetComponent(ikonSeti),
    'utf8',
  )

  const copied = await syncPublic()

  console.log(`✓ src/components/admin/Logo.tsx   (.${PREFIX}-logo--primary)`)
  console.log(`    viewBox ${primary.viewBox}`)
  console.log(`✓ src/components/admin/LogoHorizontal.tsx (.${PREFIX}-logo--horizontal)`)
  console.log(`    viewBox ${horizontal.viewBox}`)
  console.log(`✓ src/components/admin/Icon.tsx   (.${PREFIX}-logo--monogram)`)
  console.log(`    viewBox ${mono.viewBox} · cut x=${mono.clip.x} w=${mono.clip.width}`)
  console.log(`✓ src/components/admin/KategoriIkonlari.tsx — ${ikonSeti.ikonlar.length} icons`)
  console.log(`✓ public/ — ${copied.length} files updated`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
