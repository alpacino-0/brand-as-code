/**
 * Renk matematiği. Kitteki hiçbir kontrast oranı veya CMYK değeri elle yazılmaz —
 * hepsi bu fonksiyonlarla hesaplanır.
 */

/** '#RRGGBB' → { r, g, b } (0–255) */
export function hexToRgb(hex) {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Geçersiz HEX: ${hex}`)
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** sRGB kanalını doğrusal ışığa çevirir (WCAG 2.1 tanımı). */
function channelToLinear(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG 2.1 bağıl parlaklık (relative luminance), 0–1. */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  )
}

/** İki renk arasındaki WCAG kontrast oranı (1–21). */
export function contrastRatio(fg, bg) {
  const a = relativeLuminance(fg)
  const b = relativeLuminance(bg)
  const light = Math.max(a, b)
  const dark = Math.min(a, b)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Bir kontrast oranını WCAG 2.1 seviyelerine göre değerlendirir.
 * normal: 16px altı gövde metni. large: ≥24px veya ≥18.66px bold.
 */
export function wcagGrade(ratio) {
  return {
    ratio: Math.round(ratio * 100) / 100,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    uiComponent: ratio >= 3,
  }
}

/** Kontrast sonucu için kısa etiket: 'AAA' | 'AA' | 'AA-large' | 'Yetersiz' */
export function gradeLabel(ratio, lang = 'tr') {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return lang === 'tr' ? 'AA (büyük punto)' : 'AA (large only)'
  return lang === 'tr' ? 'Yetersiz' : 'Fail'
}

/**
 * Naif HEX → CMYK dönüşümü.
 *
 * DİKKAT: Bu, ICC profili kullanmayan matematiksel bir yaklaşımdır. Baskıya gitmeden
 * önce matbaanın kendi profiliyle prova alınmalıdır. Kitte bu değerler "yaklaşık"
 * ibaresiyle sunulur.
 */
export function hexToCmyk(hex) {
  const { r, g, b } = hexToRgb(hex)
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const k = 1 - Math.max(rf, gf, bf)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = (1 - rf - k) / (1 - k)
  const m = (1 - gf - k) / (1 - k)
  const y = (1 - bf - k) / (1 - k)
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

/** CMYK nesnesini '92 / 55 / 30 / 55' biçiminde yazar. */
export function formatCmyk(cmyk) {
  return `${cmyk.c} / ${cmyk.m} / ${cmyk.y} / ${cmyk.k}`
}

/** HEX → HSL (derece, yüzde, yüzde). Tonal skala kontrolü için. */
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6
  else if (max === gf) h = ((bf - rf) / d + 2) / 6
  else h = ((rf - gf) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** HEX → RGB dizesi: '0 / 56 / 81' */
export function formatRgb(hex) {
  const { r, g, b } = hexToRgb(hex)
  return `${r} / ${g} / ${b}`
}
