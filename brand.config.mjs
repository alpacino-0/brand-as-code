/**
 * The one file you edit.
 *
 * Every generated asset — CSS custom properties, file names, SVG element ids,
 * Tailwind keys — derives its naming from `prefix`. Change it once here and the
 * whole output renames itself on the next `npm run brand:all`.
 */
export const brand = {
  /** Lowercase, no spaces. Used as the file-name and CSS-variable prefix. */
  prefix: 'acme',

  /** Display name. Appears in the generated brand book and documentation. */
  name: 'Acme',

  /** Full legal or display name for document covers. */
  fullName: 'Acme Stone Co.',

  /** Wordmark that follows the logo in the horizontal lock-up. Empty to omit. */
  descriptor: 'STONE',

  /**
   * Source artwork. A transparent PNG of the wordmark, ink on alpha.
   * `brand:analyze` measures this file — every geometry number in the brand
   * book comes from it, so it should be the highest-resolution original you have.
   */
  sourceLogo: 'brand/source/logo.png',

  /** Typefaces fetched by `brand:fonts`. Both must be Google Fonts families. */
  fonts: {
    display: 'Cinzel',
    text: 'Inter',
  },

  /** Locale used for generated documentation and the brand book. */
  locale: 'en',
}

export const PREFIX = brand.prefix
export default brand
