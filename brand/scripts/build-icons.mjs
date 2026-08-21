/**
 * Ürün ikon seti + grafik motifler.
 * Çalıştır: node brand/scripts/build-icons.mjs
 *
 * İkon ızgarası: 24×24, çizgi kalınlığı 1.5, kare uç, currentColor.
 * Kare uç ve keskin köşe seçimi bilinçlidir — kesilmiş taşın diline uyar,
 * yuvarlak uçlar markayı yumuşatır ve kullanılmaz.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const iconDir = join(here, '..', 'assets', 'icons')
const patternDir = join(here, '..', 'assets', 'patterns')

/**
 * <Brand> grafik dilinin temel açısı — ASIL logonun V harfinden ÖLÇÜLMÜŞTÜR.
 * (brand/scripts/analyze-logo.mjs · brand/assets/logo/_source/geometry.json)
 *
 * V'nin sol kolu tam dikeydir (90°), sağ kolu yataydan 59,64°'dir.
 * Yani dikeyden 30,36°. Tüm diyagonal motifler bu açıyı taşır.
 */
export const CUT_ANGLE_FROM_HORIZONTAL = 59.64
export const CUT_ANGLE_FROM_VERTICAL = +(90 - CUT_ANGLE_FROM_HORIZONTAL).toFixed(2)
/** Geriye dönük ad — dikeyden ölçülen açı. */
export const CUT_ANGLE = CUT_ANGLE_FROM_VERTICAL

export const ICONS = [
  {
    key: 'yuvarlak-eviye',
    tr: 'Yuvarlak Eviye',
    en: 'Round Sink',
    body: `<circle cx="12" cy="12" r="8.75"/><circle cx="12" cy="12" r="5.25"/><circle cx="12" cy="12" r="1.5"/>`,
  },
  {
    key: 'profil',
    tr: 'Profil',
    en: 'Profile',
    body: `<path d="M2.75 21.25V14.5h4.5V10h4.5V5.5h9"/><path d="M2.75 21.25h18.5"/>`,
  },
  {
    key: 'havuz-izgarasi',
    tr: 'Havuz Izgarası',
    en: 'Pool Grille',
    body: `<rect x="2.75" y="5.25" width="18.5" height="13.5"/><path d="M2.75 8.75h18.5M2.75 12h18.5M2.75 15.25h18.5"/>`,
  },
  {
    key: 'sus',
    tr: 'Süs',
    en: 'Ornament',
    body: `<path d="M12 2.75c3 3.5 3 6 0 9.25-3-3.25-3-5.75 0-9.25z"/><path d="M21.25 12c-3.5 3-6 3-9.25 0 3.25-3 5.75-3 9.25 0z"/><path d="M12 21.25c-3-3.5-3-6 0-9.25 3 3.25 3 5.75 0 9.25z"/><path d="M2.75 12c3.5-3 6-3 9.25 0-3.25 3-5.75 3-9.25 0z"/>`,
  },
  {
    key: 'nis',
    tr: 'Niş',
    en: 'Niche',
    body: `<path d="M3.25 21.25V11a8.75 8.75 0 0 1 17.5 0v10.25"/><path d="M7 21.25v-10a5 5 0 0 1 10 0v10"/>`,
  },
  {
    key: 'mozaik',
    tr: 'Mozaik',
    en: 'Mosaic',
    body: [0, 1, 2]
      .flatMap((r) => [0, 1, 2].map((c) => `<rect x="${(3 + c * 6.25).toFixed(2)}" y="${(3 + r * 6.25).toFixed(2)}" width="5" height="5"/>`))
      .join(''),
  },
  {
    key: 'ayna',
    tr: 'Ayna',
    en: 'Mirror',
    body: `<path d="M12 2.75c-4.55 0-8.25 3.3-8.25 7.5v11h16.5v-11c0-4.2-3.7-7.5-8.25-7.5z"/><path d="M7.75 10.25c0-2.2 1.9-4 4.25-4"/>`,
  },
  {
    key: 'madalyon',
    tr: 'Madalyon',
    en: 'Medallion',
    body: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3.25M12 17.75V21M3 12h3.25M17.75 12H21"/><path d="M5.64 5.64l2.3 2.3M16.06 16.06l2.3 2.3M18.36 5.64l-2.3 2.3M7.94 16.06l-2.3 2.3"/>`,
  },
  {
    key: 'somine',
    tr: 'Şömine',
    en: 'Fireplace',
    body: `<path d="M2 6.25h20"/><path d="M4.25 6.25v15h15.5v-15"/><path d="M8 21.25v-6.5a4 4 0 0 1 8 0v6.5"/>`,
  },
  {
    key: 'dekoratif-lavabo',
    tr: 'Dekoratif Lavabo',
    en: 'Decorative Basin',
    body: `<path d="M3 8.25h18l-2.5 5h-13z"/><path d="M10.5 13.25v6.25M13.5 13.25v6.25"/><path d="M8 19.5h8"/><path d="M12 3.5v4.75"/>`,
  },
]

function iconSvg({ tr, en, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" role="img" aria-label="${tr}">
<title>${tr} / ${en}</title>
${body}
</svg>
`
}

/** Kesim hattı motifi — 30° tekrarlayan çizgi. Zemin dokusu ve ayrım için. */
function cutPattern() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Kesim hattı motifi">
<title>BİEV kesim hattı — yataydan ${CUT_ANGLE_FROM_HORIZONTAL}°</title>
<defs>
<!-- Donus isareti POZITIF: dikey cizgi (90 derece) saat yonunde 30,36 derece
     dondurulunce yataydan 59,64 dereceye gelir ve logonun V kolunu yansitir.
     Negatif isaret aynalanmis (120 derece) bir desen uretir. -->
<pattern id="${PREFIX}-kesim" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(${CUT_ANGLE_FROM_VERTICAL})">
<line x1="0" y1="0" x2="0" y2="18" stroke="currentColor" stroke-width="1.5"/>
</pattern>
</defs>
<rect width="200" height="200" fill="url(#${PREFIX}-kesim)"/>
</svg>
`
}

/**
 * Damar dokusu — mermerin içindeki damarın soyutlanmış hâli.
 * Zemin üzerinde düşük opaklıkta kullanılır; asla metnin altında tam opaklıkta değil.
 */
function veinPattern() {
  const veins = [
    'M-10 52 C 30 34, 62 74, 104 50 S 176 26, 214 48',
    'M-10 96 C 26 84, 54 118, 96 96 S 168 72, 214 92',
    'M-10 140 C 34 126, 58 160, 102 142 S 172 118, 214 138',
    'M-10 20 C 40 10, 70 34, 118 18 S 180 2, 214 14',
    'M-10 176 C 30 166, 66 192, 110 178 S 178 158, 214 172',
  ]
  const thin = [
    'M-10 66 C 40 58, 74 82, 120 66 S 180 50, 214 62',
    'M-10 112 C 36 104, 66 128, 112 112 S 178 96, 214 108',
    'M-10 156 C 30 148, 70 170, 116 156 S 180 142, 214 152',
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Damar dokusu">
<title>BİEV damar dokusu</title>
<g fill="none" stroke="currentColor" stroke-linecap="square">
${veins.map((d) => `<path d="${d}" stroke-width="1.6" opacity="0.55"/>`).join('\n')}
${thin.map((d) => `<path d="${d}" stroke-width="0.8" opacity="0.32"/>`).join('\n')}
</g>
</svg>
`
}

/** Açı işareti — tekil grafik eleman (sayfa köşesi, ayraç, madde imi). */
function angleMark() {
  const rad = (CUT_ANGLE_FROM_HORIZONTAL * Math.PI) / 180
  const len = 22
  const dx = Math.cos(rad) * len
  const dy = Math.sin(rad) * len
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Açı işareti">
<title>BİEV açı işareti — yataydan ${CUT_ANGLE_FROM_HORIZONTAL}°</title>
<path d="M${(12 - dx / 2).toFixed(2)} ${(12 + dy / 2).toFixed(2)}L${(12 + dx / 2).toFixed(2)} ${(12 - dy / 2).toFixed(2)}" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
</svg>
`
}

async function main() {
  await mkdir(iconDir, { recursive: true })
  await mkdir(patternDir, { recursive: true })

  for (const icon of ICONS) {
    await writeFile(join(iconDir, `${icon.key}.svg`), iconSvg(icon), 'utf8')
  }
  await writeFile(
    join(iconDir, 'index.json'),
    JSON.stringify(
      { grid: 24, strokeWidth: 1.5, cap: 'square', join: 'miter', icons: ICONS.map(({ key, tr, en }) => ({ key, tr, en })) },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  await writeFile(join(patternDir, 'kesim-hatti.svg'), cutPattern(), 'utf8')
  await writeFile(join(patternDir, 'damar.svg'), veinPattern(), 'utf8')
  await writeFile(join(patternDir, 'aci-isareti.svg'), angleMark(), 'utf8')

  console.log(`✓ ${ICONS.length} icons → brand/assets/icons/`)
  console.log(`✓ 3 motifs → brand/assets/patterns/ (cut line, vein, angle mark — from horizontal ${CUT_ANGLE_FROM_HORIZONTAL}°)`)
}

// Yalnızca doğrudan çalıştırıldığında üret — render.mjs bu modülden ICONS'u
// import ettiği için import sırasında dosya yazılmamalı.
if (process.argv[1] && process.argv[1].endsWith('build-icons.mjs')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
