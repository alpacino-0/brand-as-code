/**
 * Geliştirme yardımcısı: SVG'leri tek bir kontrol sayfasında PNG olarak render eder.
 * Çalıştır: node brand/scripts/preview.mjs [çıktı.png]
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { launch } from './browser.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const logoDir = join(here, '..', 'assets', 'logo')
const out = process.argv[2] ?? join(here, '..', '.cache', 'logo-preview.png')

const files = (await readdir(logoDir)).filter((f) => f.endsWith('.svg')).sort()

const cards = []
for (const f of files) {
  const svg = await readFile(join(logoDir, f), 'utf8')
  const dark = f.includes('-white') || f.includes('-current')
  cards.push(`<figure class="${dark ? 'dark' : ''}">
    <div class="art">${svg}</div>
    <figcaption>${f}</figcaption>
  </figure>`)
}

const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; padding:24px; background:#e9e9e9; font:12px/1.4 -apple-system,Segoe UI,sans-serif; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  figure { margin:0; background:#F5F3EE; border:1px solid #ccc; padding:16px; }
  figure.dark { background:#003851; color:#fff; }
  figure.dark svg { color:#F5F3EE; }
  .art { display:flex; align-items:center; justify-content:center; height:150px; }
  .art svg { max-width:100%; max-height:100%; width:auto; height:auto; }
  figcaption { margin-top:10px; text-align:center; font-family:ui-monospace,monospace; font-size:10px; opacity:.75; }
  h2 { font:600 13px sans-serif; margin:24px 0 8px; }
  .sizes { display:flex; gap:20px; align-items:flex-end; background:#F5F3EE; padding:16px; border:1px solid #ccc; }
  .sizes div { text-align:center; }
  .sizes svg { display:block; }
</style>
<h2>Tüm varyantlar</h2>
<div class="grid">${cards.join('\n')}</div>
<h2>Küçük boyut testi — ana kilit (yükseklik px)</h2>
<div class="sizes">
  ${[16, 20, 24, 32, 48, 64].map((h) => `<div><span style="display:block;height:${h}px">${
    ''
  }</span></div>`).join('')}
</div>
<div class="sizes" id="scaletest"></div>
<script>
  const primary = ${JSON.stringify(await readFile(join(logoDir, `${PREFIX}-logo-primary-petrol.svg`), 'utf8'))};
  const mono = ${JSON.stringify(await readFile(join(logoDir, `${PREFIX}-monogram-petrol.svg`), 'utf8'))};
  const el = document.getElementById('scaletest');
  for (const h of [16,20,24,32,48,64,96]) {
    const d = document.createElement('div');
    d.innerHTML = primary;
    d.querySelector('svg').setAttribute('height', h);
    d.querySelector('svg').removeAttribute('width');
    const c = document.createElement('div');
    c.appendChild(d.querySelector('svg'));
    const cap = document.createElement('div'); cap.textContent = h + 'px'; cap.style.fontSize='9px'; cap.style.marginTop='6px';
    c.appendChild(cap);
    el.appendChild(c);
  }
  for (const h of [16,24,32,48]) {
    const d = document.createElement('div');
    d.innerHTML = mono;
    const s = d.querySelector('svg');
    s.setAttribute('height', h); s.setAttribute('width', h);
    const c = document.createElement('div');
    c.appendChild(s);
    const cap = document.createElement('div'); cap.textContent = 'mono ' + h; cap.style.fontSize='9px'; cap.style.marginTop='6px';
    c.appendChild(cap);
    el.appendChild(c);
  }
</script>
`

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'load' })
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('✓ ' + out)
