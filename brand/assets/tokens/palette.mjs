/**
 * Example palette — the single source of truth for colour.
 *
 * colors.css, tailwind.colors.js and tokens.json are GENERATED from this file.
 * Never edit those; edit this and re-run `npm run brand:tokens`.
 *
 * Replace everything below with your own colours. The shape is what matters:
 * every colour carries its role, and — where it has one — its constraint.
 */

/** Core brand colours. These appear on the palette page of the brand book. */
export const core = [
  {
    key: 'brand',
    tr: 'Brand',
    en: 'Brand',
    hex: '#1F3A5F',
    role_tr: 'Primary brand colour',
    role_en: 'Primary brand colour',
    story_tr: 'The anchor of the system. Used for surfaces that must read as the brand.',
    story_en: 'The anchor of the system. Used for surfaces that must read as the brand.',
  },
  {
    key: 'brand-light',
    tr: 'Brand Light',
    en: 'Brand Light',
    hex: '#2E5A8A',
    role_tr: 'Interaction — links, hover, focus',
    role_en: 'Interaction — links, hover, focus',
    story_tr: 'A lighter step of the brand, reserved for state rather than decoration.',
    story_en: 'A lighter step of the brand, reserved for state rather than decoration.',
  },
  {
    key: 'accent',
    tr: 'Accent',
    en: 'Accent',
    hex: '#C08A2E',
    role_tr: 'Accent — graphic only',
    role_en: 'Accent — graphic only',
    story_tr: 'Used sparingly, and never as a ground.',
    story_en: 'Used sparingly, and never as a ground.',
    constraint_tr:
      'MUST NOT be used as text on light surfaces (2,81:1 — fails). Free for fills, rules and icons >= 24 px. For accent-toned text on light, use accent-text (#7A5720).',
    constraint_en:
      'MUST NOT be used as text on light surfaces (2,81:1 — fails). Free for fills, rules and icons >= 24 px. For accent-toned text on light, use accent-text (#7A5720).',
  },
  {
    key: 'surface',
    tr: 'Surface',
    en: 'Surface',
    hex: '#F7F6F3',
    role_tr: 'Primary surface',
    role_en: 'Primary surface',
    story_tr: 'The default ground for documents, print and web.',
    story_en: 'The default ground for documents, print and web.',
  },
  {
    key: 'surface-alt',
    tr: 'Surface Alt',
    en: 'Surface Alt',
    hex: '#E8E4DC',
    role_tr: 'Secondary surface',
    role_en: 'Secondary surface',
    story_tr: 'Separates zones without introducing a new hue.',
    story_en: 'Separates zones without introducing a new hue.',
  },
  {
    key: 'border',
    tr: 'Border',
    en: 'Border',
    hex: '#8E9499',
    role_tr: 'Rules, dividers, borders',
    role_en: 'Rules, dividers, borders',
    story_tr: 'Structural only.',
    story_en: 'Structural only.',
    constraint_tr:
      'MUST NOT be used as text on light surfaces (2,84:1 — fails). Rules and borders only.',
    constraint_en:
      'MUST NOT be used as text on light surfaces (2,84:1 — fails). Rules and borders only.',
  },
  {
    key: 'text',
    tr: 'Text',
    en: 'Text',
    hex: '#1B1F23',
    role_tr: 'Primary text',
    role_en: 'Primary text',
    story_tr: 'Body copy on light surfaces.',
    story_en: 'Body copy on light surfaces.',
  },
]

/** Tint scales. A key that matches a core key gets DEFAULT = that core hex. */
export const scales = {
  brand: {
    50: '#DCE4EC',
    100: '#B9C8D8',
    200: '#96ACC4',
    300: '#7491B1',
    400: '#51769E',
    500: '#2E5A8A',
    600: '#2A527F',
    700: '#264A74',
    800: '#23426A',
    900: '#1F3A5F',
  },
  accent: {
    50: '#F4ECDC',
    100: '#EAD8B9',
    200: '#E0C496',
    300: '#D5B174',
    400: '#CA9E51',
    500: '#C08A2E',
    600: '#AE7D2A',
    700: '#9D7027',
    800: '#8C6424',
    900: '#7A5720',
  },
  neutral: {
    50: '#ECEDEE',
    100: '#D9DBDD',
    200: '#C6CACC',
    300: '#B4B8BB',
    400: '#A1A6AA',
    500: '#8E9499',
    600: '#7D8388',
    700: '#6C7276',
    800: '#5B6165',
    900: '#4A5054',
  },
}

/** Semantic aliases — what the product actually references. */
export const semantic = {
  'surface': '#F7F6F3',
  'surface-alt': '#E8E4DC',
  'surface-inverse': '#1F3A5F',
  'text': '#1B1F23',
  'text-muted': '#5A6165',
  'text-inverse': '#F7F6F3',
  'brand': '#1F3A5F',
  'brand-hover': '#2E5A8A',
  'accent': '#C08A2E',
  'accent-text': '#7A5720',
  'accent-on-brand': '#D9B87A',
  'border': '#CFD3D6',
  'border-strong': '#8E9499',
  'focus': '#2E5A8A',
}

/** Documented usage split, rendered into the brand book. */
export const ratio = [
  { key: 'surface', pct: 60, tr: 'Ground', en: 'Ground' },
  { key: 'brand', pct: 25, tr: 'Brand', en: 'Brand' },
  { key: 'surface-alt', pct: 10, tr: 'Separation', en: 'Separation' },
  { key: 'accent', pct: 5, tr: 'Accent', en: 'Accent' },
]

/** Pairs whose contrast is computed and graded on every build. */
export const contrastPairs = [
  { fg: '#1B1F23', bg: '#F7F6F3', intent: 'text', tr: 'Text / Surface', en: 'Text / Surface' },
  { fg: '#1B1F23', bg: '#E8E4DC', intent: 'text', tr: 'Text / Surface Alt', en: 'Text / Surface Alt' },
  { fg: '#1B1F23', bg: '#FFFFFF', intent: 'text', tr: 'Text / White', en: 'Text / White' },
  { fg: '#5A6165', bg: '#F7F6F3', intent: 'text', tr: 'Muted text / Surface', en: 'Muted text / Surface' },
  { fg: '#F7F6F3', bg: '#1F3A5F', intent: 'text', tr: 'Inverse text / Brand', en: 'Inverse text / Brand' },
  { fg: '#FFFFFF', bg: '#1F3A5F', intent: 'text', tr: 'White / Brand', en: 'White / Brand' },
  { fg: '#FFFFFF', bg: '#2E5A8A', intent: 'text', tr: 'White / Brand Light', en: 'White / Brand Light' },
  { fg: '#1F3A5F', bg: '#F7F6F3', intent: 'text', tr: 'Brand / Surface', en: 'Brand / Surface' },
  { fg: '#2E5A8A', bg: '#F7F6F3', intent: 'text', tr: 'Brand Light / Surface', en: 'Brand Light / Surface' },
  { fg: '#7A5720', bg: '#F7F6F3', intent: 'text', tr: 'Accent text / Surface', en: 'Accent text / Surface' },
  { fg: '#D9B87A', bg: '#1F3A5F', intent: 'text', tr: 'Accent on brand / Brand', en: 'Accent on brand / Brand' },
  { fg: '#C08A2E', bg: '#1F3A5F', intent: 'large', tr: 'Accent / Brand', en: 'Accent / Brand' },
  { fg: '#C08A2E', bg: '#F7F6F3', intent: 'graphic', tr: 'Accent / Surface', en: 'Accent / Surface' },
  { fg: '#8E9499', bg: '#F7F6F3', intent: 'graphic', tr: 'Border / Surface', en: 'Border / Surface' },
]

/** Optional print references. Approximate — always confirm on a physical swatch. */
export const pantoneApprox = {
  'brand': '',
  'brand-light': '',
  'accent': '',
  'surface': '',
  'surface-alt': '',
  'border': '',
  'text': '',
}
