/**
 * Proje entegrasyonu denetimi.
 * Çalıştır: node brand/scripts/verify-integration.mjs
 *
 * src/components/admin/ ve public/ altındaki HER dosyanın markanın güncel
 * çıktısıyla eşleştiğini doğrular. Eski logo, artık dosya veya elle yapılmış
 * bir değişiklik varsa hata verir.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const brandDir = join(here, '..')
const root = join(brandDir, '..')

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12)

/** public/ altında bulunması BEKLENEN dosyalar ve kaynakları. */
const PUBLIC_EXPECTED = {
  'favicon.ico': ['assets', 'favicon', 'favicon.ico'],
  'favicon-16x16.png': ['assets', 'favicon', 'favicon-16x16.png'],
  'favicon-32x32.png': ['assets', 'favicon', 'favicon-32x32.png'],
  'favicon-48x48.png': ['assets', 'favicon', 'favicon-48x48.png'],
  'apple-touch-icon.png': ['assets', 'favicon', 'apple-touch-icon.png'],
  'icon-192.png': ['assets', 'favicon', 'icon-192.png'],
  'icon-512.png': ['assets', 'favicon', 'icon-512.png'],
  'icon-maskable-512.png': ['assets', 'favicon', 'icon-maskable-512.png'],
  'safari-pinned-tab.svg': ['assets', 'favicon', 'safari-pinned-tab.svg'],
  'site.webmanifest': ['assets', 'favicon', 'site.webmanifest'],
  'og-image.png': ['assets', 'og', 'og-image.png'],
}

const problems = []
const ok = []

async function checkPublic() {
  const dir = join(root, 'public')
  let files
  try {
    files = await readdir(dir)
  } catch {
    problems.push('public/ klasörü yok')
    return
  }

  for (const [name, src] of Object.entries(PUBLIC_EXPECTED)) {
    if (!files.includes(name)) {
      problems.push(`public/${name} EKSİK`)
      continue
    }
    const a = await readFile(join(dir, name))
    const b = await readFile(join(brandDir, ...src))
    if (!a.equals(b)) {
      problems.push(`public/${name} marka çıktısıyla AYNI DEĞİL (eski dosya olabilir)`)
    } else {
      ok.push(`public/${name.padEnd(24)} ${sha(a)} · ${(a.length / 1024).toFixed(1)} KB`)
    }
  }

  /**
   * Marka çıktısı OLMAYAN ama meşru public varlıkları.
   *
   * Bu denetimin amacı eski logo kalıntısı yakalamak; üçüncü taraf varlıkları
   * kapsamı dışında. Liste dar tutulur — buraya eklenen her ad denetimden
   * çıkmış olur, yani "artık dosya" uyarısı o yol için susar.
   */
  const MARKA_DISI = new Set([
    // Ödeme altyapısı işareti (PayTR). ŞU AN HİÇBİR YERDE KULLANILMIYOR —
    // alt bilgiden kaldırıldı. Dosya duruyor çünkü tahsilat açıldığında
    // ödeme adımında yeri var; marka çıktısı olmadığı için burada muaf.
    'payments',
  ])

  for (const f of files) {
    if (MARKA_DISI.has(f)) continue
    if (!(f in PUBLIC_EXPECTED)) {
      const s = await stat(join(dir, f))
      problems.push(`public/${f} — marka build'inin üretmediği ARTIK dosya (${s.isDirectory() ? 'klasör' : (s.size / 1024).toFixed(1) + ' KB'})`)
    }
  }
}

async function checkComponents() {
  const dir = join(root, 'src', 'components', 'admin')
  const wordmark = JSON.parse(await readFile(join(brandDir, 'assets', 'logo', '_source', 'wordmark.json'), 'utf8'))
  const files = await readdir(dir)

  // Logo bilesenleri: icerikleri asil wordmark yolunu tasimali.
  const logoDosyalari = ['Logo.tsx', 'LogoHorizontal.tsx', 'Icon.tsx']
  // Ikon seti ayri denetlenir: kategori ikonlari wordmark tasimaz.
  const expected = [...logoDosyalari, 'KategoriIkonlari.tsx']
  for (const f of files) {
    if (!expected.includes(f)) {
      problems.push(`src/components/admin/${f} — beklenmeyen dosya`)
    }
  }

  for (const f of expected) {
    if (!files.includes(f)) {
      problems.push(`src/components/admin/${f} EKSİK`)
      continue
    }
    const src = await readFile(join(dir, f), 'utf8')

    if (!src.includes('OTOMATİK ÜRETİLDİ')) {
      problems.push(`${f} — üretilmiş dosya değil (elle düzenlenmiş olabilir)`)
    }
    if (f === 'KategoriIkonlari.tsx') {
      // Kendi denetimi: index.json'daki her ikon bilesende bulunmali.
      const dizin = JSON.parse(
        await readFile(join(brandDir, 'assets', 'icons', 'index.json'), 'utf8'),
      )
      const eksik = dizin.icons.filter((i) => !src.includes(`'${i.key}'`)).map((i) => i.key)
      if (eksik.length) {
        problems.push(`${f} — EKSIK ikon: ${eksik.join(', ')}`)
      } else {
        ok.push(`${('src/components/admin/' + f).padEnd(32)} ${dizin.icons.length} icons`)
      }
      continue
    }

    if (!src.includes(wordmark.path)) {
      problems.push(`${f} — içindeki logo yolu GÜNCEL DEĞİL (asıl logodan üretilen path ile eşleşmiyor)`)
    } else {
      ok.push(`${('src/components/admin/' + f).padEnd(32)} current path · ${(src.length / 1024).toFixed(1)} KB`)
    }

    // Projenin bağlı olduğu sözleşme: sınıf adları ve dışa aktarım
    const siniflar = {
      'Logo.tsx': `${PREFIX}-logo--primary`,
      'LogoHorizontal.tsx': `${PREFIX}-logo--horizontal`,
      'Icon.tsx': `${PREFIX}-logo--monogram`,
    }
    const cls = siniflar[f]
    if (!src.includes(cls)) problems.push(`${f} — "${cls}" sınıfı yok (custom.scss ve testler buna bağlı)`)
    const name = f.replace('.tsx', '')
    if (!src.includes(`export const ${name}`)) problems.push(`${f} — "export const ${name}" yok`)
    if (!src.includes(`export default ${name}`)) problems.push(`${f} — "export default ${name}" yok`)
  }
}

/** Eski logodan kalmış olabilecek izler. */
async function checkStaleReferences() {
  const suspects = [
    { dir: join(root, 'src'), label: 'src' },
    { dir: join(root, 'public'), label: 'public' },
  ]
  const badWords = [`${PREFIX}-kerf`, 'kerf-login', 'kerf-monogram']
  for (const { dir, label } of suspects) {
    const walk = async (d) => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) {
          await walk(p)
        } else if (/\.(tsx?|jsx?|s?css|json|svg|webmanifest)$/.test(e.name)) {
          const t = await readFile(p, 'utf8')
          for (const w of badWords) {
            if (t.includes(w)) problems.push(`${label}/${e.name} — eski logo kalıntısı: "${w}"`)
          }
        }
      }
    }
    try {
      await walk(dir)
    } catch {}
  }
}

async function main() {
  await checkPublic()
  await checkComponents()
  await checkStaleReferences()

  console.log('INTEGRITY CHECK\n')
  for (const line of ok) console.log('  ✓ ' + line)

  if (problems.length) {
    console.log('')
    for (const p of problems) console.error('  ✗ ' + p)
    console.error(`\n✗ ${problems.length} sorun bulundu.`)
    process.exitCode = 1
  } else {
    console.log(`\n✓ ${ok.length} files are current; no stale or leftover files found.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
