/**
 * Logo system geometry.
 *
 * The wordmark is never derived from a typeface. Its outline is vectorised from
 * the alpha channel of the source artwork (brand/scripts/vectorize-logo.mjs) and
 * used as-is: letters are not substituted, re-spaced or re-proportioned.
 *
 * Only the descriptor line is typeset — that is not the logo, it is text placed
 * beside it, set in the brand's text typeface.
 */
import { PREFIX, brand } from '../../brand.config.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import opentype from 'opentype.js'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(here, '..', 'assets', 'logo', '_source')
export const FONT_PATH = join(here, '..', '.cache', `${brand.fonts.text.replace(/\s+/g, '')}-var.ttf`)

/** Vektörleştirilmiş asıl wordmark. */
export const WORDMARK = JSON.parse(readFileSync(join(SOURCE_DIR, 'wordmark.json'), 'utf8'))
/** Kaynak PNG'den ölçülmüş geometri. */
export const MEASURED = JSON.parse(readFileSync(join(SOURCE_DIR, 'geometry.json'), 'utf8'))

export const SPEC = {
  /** Tüm koordinatlar cap yüksekliği = 100 birim ölçeğindedir. */
  capHeight: 100,
  /** Wordmark'ın ölçülmüş genişliği. Bu oran asla değiştirilmez. */
  width: WORDMARK.width,
  aspect: WORDMARK.aspect,

  /** Tanımlayıcı alt satır — logo değil, dizilen metin. */
  descriptor: { text: brand.descriptor, weight: 500, opsz: 32, tracking: 0.3 },
  /** Alt satırın cap yüksekliği, wordmark cap'ine oran olarak. */
  descriptorCapRatio: 0.2,
  /** Wordmark taban çizgisi ile tanımlayıcı cap üstü arasındaki boşluk. */
  descriptorGap: 0.26,

  /**
   * Monogram: the first glyph, cut out of the real artwork. It is never a
   * synthesised letter — the cut is a measured boundary.
   *
   * Preference order:
   *   1. the first joint, where two letterforms meet (connected wordmarks)
   *   2. the first true letter separation — a valley whose coverage reaches
   *      zero. Valleys that keep some ink are counters (the inside of an A),
   *      not separations, so they are skipped.
   *   3. a quarter of the width, for a single connected shape with neither.
   */
  monogramCutUnits: (() => {
    const joint = MEASURED.joints?.[0]
    if (joint) return joint.atUnits - joint.widthUnits / 2

    const gap = (MEASURED.gaps ?? []).find((g) => g.minCoverage === 0)
    if (gap) return gap.atUnits - gap.widthUnits / 2

    return WORDMARK.width * 0.25
  })(),
}

let _font = null
function fontInstance(weight, opsz) {
  const f = opentype.parse(readFileSync(FONT_PATH).buffer)
  // Variable faces expose an axis setter; static faces do not. A static face is
  // used as delivered, which is correct when the family ships fixed weights.
  if (typeof f.variation?.set === 'function') f.variation.set({ wght: weight, opsz })
  return f
}

function bbox(commands) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  const put = (x, y) => {
    if (x < x1) x1 = x
    if (y < y1) y1 = y
    if (x > x2) x2 = x
    if (y > y2) y2 = y
  }
  for (const c of commands) {
    if (c.type === 'Z') continue
    put(c.x, c.y)
    if (c.x1 !== undefined) put(c.x1, c.y1)
    if (c.x2 !== undefined) put(c.x2, c.y2)
  }
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 }
}

function transform(commands, { scale = 1, dx = 0, dy = 0 }) {
  return commands.map((c) => {
    if (c.type === 'Z') return { type: 'Z' }
    const o = { type: c.type, x: c.x * scale + dx, y: c.y * scale + dy }
    if (c.x1 !== undefined) {
      o.x1 = c.x1 * scale + dx
      o.y1 = c.y1 * scale + dy
    }
    if (c.x2 !== undefined) {
      o.x2 = c.x2 * scale + dx
      o.y2 = c.y2 * scale + dy
    }
    return o
  })
}

function toPathData(commands, precision = 3) {
  const n = (v) => {
    const r = Number(v.toFixed(precision))
    return Object.is(r, -0) ? 0 : r
  }
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M': return `M${n(c.x)} ${n(c.y)}`
        case 'L': return `L${n(c.x)} ${n(c.y)}`
        case 'C': return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
        case 'Q': return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
        case 'Z': return 'Z'
        default: return ''
      }
    })
    .join('')
}

/** MARBLE satırını glif glif dizer (harf aralığı denetimi için). */
function layoutDescriptor() {
  const { text, weight, opsz, tracking } = SPEC.descriptor
  const f = fontInstance(weight, opsz)
  const em = f.unitsPerEm
  const size = 1000
  const track = tracking * size
  let x = 0
  const all = []
  for (const ch of [...text]) {
    const g = f.charToGlyph(ch)
    all.push(...g.getPath(x, 0, size, {}, f).commands)
    x += (g.advanceWidth / em) * size + track
  }
  const capPath = f.charToGlyph('E').getPath(0, 0, size, {}, f)
  return { commands: all, bb: bbox(all), capHeight: Math.abs(bbox(capPath.commands).y1) }
}

/**
 * Ana kilit = ASIL wordmark, olduğu gibi.
 * Koordinat sistemi: sol üst (0,0), cap yüksekliği 100.
 */
export function buildPrimary() {
  return {
    H: SPEC.capHeight,
    path: WORDMARK.path,
    fillRule: WORDMARK.fillRule,
    bb: { x1: 0, y1: 0, x2: WORDMARK.width, y2: SPEC.capHeight, w: WORDMARK.width, h: SPEC.capHeight },
  }
}

/**
 * Kilit + tanımlayıcı: wordmark üstte, MARBLE altta, genişliği optik eşitlenmiş.
 * Wordmark'a dokunulmaz; yalnızca altına metin yerleştirilir.
 */
export function buildLockup() {
  const H = SPEC.capHeight
  const d = layoutDescriptor()
  const targetWidth = WORDMARK.width
  const scale = targetWidth / d.bb.w
  const capFinal = d.capHeight * scale
  const baseline = H + SPEC.descriptorGap * H + capFinal
  const commands = transform(d.commands, { scale, dx: -d.bb.x1 * scale, dy: baseline })
  return {
    H,
    wordmarkPath: WORDMARK.path,
    fillRule: WORDMARK.fillRule,
    descriptorPath: toPathData(commands),
    descriptorCap: +capFinal.toFixed(3),
    totalHeight: +baseline.toFixed(3),
    width: targetWidth,
  }
}

/**
 * Monogram = asıl logodan kesilen B.
 * Yol değiştirilmez; yalnızca viewBox ilk derzin başlangıcında kırpılır.
 */
export function buildMonogram() {
  const cut = SPEC.monogramCutUnits
  return {
    H: SPEC.capHeight,
    path: WORDMARK.path,
    fillRule: WORDMARK.fillRule,
    cutAt: +cut.toFixed(3),
    bb: { x1: 0, y1: 0, x2: cut, y2: SPEC.capHeight, w: cut, h: SPEC.capHeight },
  }
}

export { toPathData, bbox }
