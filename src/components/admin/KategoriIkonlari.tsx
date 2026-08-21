/* OTOMATİK ÜRETİLDİ — elle düzenlemeyin.
 * Kaynak : brand/logo-beyaz.png (markanın asıl logosu)
 * Generator: brand/scripts/build-components.mjs
 * Komut  : npm run brand:components
 */
import React from 'react'

/**
 * Ürün kategorisi ikonları — 10 adet.
 *
 * Çizim dili marka kitabından gelir (brand/08-grafik-dil.md):
 * 24×24 ızgara, 1.5 çizgi, KARE uç, KESKİN köşe.
 * Yuvarlak uç markayı yumuşatır ve kullanılmaz.
 *
 * Renk `currentColor`: ikon bulunduğu yerin metin rengini alır, böylece
 * açık ve koyu temada ayrı dosya gerekmez.
 */
const IKONLAR: Record<string, { ad: { tr: string; en: string }; cizim: React.ReactNode }> = {
  'yuvarlak-eviye': {
    ad: { tr: 'Yuvarlak Eviye', en: 'Round Sink' },
    cizim: (
      <><circle cx="12" cy="12" r="8.75"/><circle cx="12" cy="12" r="5.25"/><circle cx="12" cy="12" r="1.5"/></>
    ),
  },
  'profil': {
    ad: { tr: 'Profil', en: 'Profile' },
    cizim: (
      <><path d="M2.75 21.25V14.5h4.5V10h4.5V5.5h9"/><path d="M2.75 21.25h18.5"/></>
    ),
  },
  'havuz-izgarasi': {
    ad: { tr: 'Havuz Izgarası', en: 'Pool Grille' },
    cizim: (
      <><rect x="2.75" y="5.25" width="18.5" height="13.5"/><path d="M2.75 8.75h18.5M2.75 12h18.5M2.75 15.25h18.5"/></>
    ),
  },
  'sus': {
    ad: { tr: 'Süs', en: 'Ornament' },
    cizim: (
      <><path d="M12 2.75c3 3.5 3 6 0 9.25-3-3.25-3-5.75 0-9.25z"/><path d="M21.25 12c-3.5 3-6 3-9.25 0 3.25-3 5.75-3 9.25 0z"/><path d="M12 21.25c-3-3.5-3-6 0-9.25 3 3.25 3 5.75 0 9.25z"/><path d="M2.75 12c3.5-3 6-3 9.25 0-3.25 3-5.75 3-9.25 0z"/></>
    ),
  },
  'nis': {
    ad: { tr: 'Niş', en: 'Niche' },
    cizim: (
      <><path d="M3.25 21.25V11a8.75 8.75 0 0 1 17.5 0v10.25"/><path d="M7 21.25v-10a5 5 0 0 1 10 0v10"/></>
    ),
  },
  'mozaik': {
    ad: { tr: 'Mozaik', en: 'Mosaic' },
    cizim: (
      <><rect x="3.00" y="3.00" width="5" height="5"/><rect x="9.25" y="3.00" width="5" height="5"/><rect x="15.50" y="3.00" width="5" height="5"/><rect x="3.00" y="9.25" width="5" height="5"/><rect x="9.25" y="9.25" width="5" height="5"/><rect x="15.50" y="9.25" width="5" height="5"/><rect x="3.00" y="15.50" width="5" height="5"/><rect x="9.25" y="15.50" width="5" height="5"/><rect x="15.50" y="15.50" width="5" height="5"/></>
    ),
  },
  'ayna': {
    ad: { tr: 'Ayna', en: 'Mirror' },
    cizim: (
      <><path d="M12 2.75c-4.55 0-8.25 3.3-8.25 7.5v11h16.5v-11c0-4.2-3.7-7.5-8.25-7.5z"/><path d="M7.75 10.25c0-2.2 1.9-4 4.25-4"/></>
    ),
  },
  'madalyon': {
    ad: { tr: 'Madalyon', en: 'Medallion' },
    cizim: (
      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3.25M12 17.75V21M3 12h3.25M17.75 12H21"/><path d="M5.64 5.64l2.3 2.3M16.06 16.06l2.3 2.3M18.36 5.64l-2.3 2.3M7.94 16.06l-2.3 2.3"/></>
    ),
  },
  'somine': {
    ad: { tr: 'Şömine', en: 'Fireplace' },
    cizim: (
      <><path d="M2 6.25h20"/><path d="M4.25 6.25v15h15.5v-15"/><path d="M8 21.25v-6.5a4 4 0 0 1 8 0v6.5"/></>
    ),
  },
  'dekoratif-lavabo': {
    ad: { tr: 'Dekoratif Lavabo', en: 'Decorative Basin' },
    cizim: (
      <><path d="M3 8.25h18l-2.5 5h-13z"/><path d="M10.5 13.25v6.25M13.5 13.25v6.25"/><path d="M8 19.5h8"/><path d="M12 3.5v4.75"/></>
    ),
  },
}

export type KategoriIkonAdi = keyof typeof IKONLAR

/** Tanımlı ikon anahtarları — koleksiyon seçenekleriyle karşılaştırmak için. */
export const KATEGORI_IKON_ANAHTARLARI = Object.keys(IKONLAR)

export const KategoriIkonu: React.FC<{ ad?: string | null; boyut?: number }> = ({
  ad,
  boyut = 24,
}) => {
  const ikon = ad ? IKONLAR[ad] : undefined
  if (!ikon) return null

  return (
    <svg
      aria-label={ikon.ad.tr}
      className="acme-kategori-ikon"
      fill="none"
      height={boyut}
      role="img"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      width={boyut}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{ikon.ad.tr}</title>
      {ikon.cizim}
    </svg>
  )
}

export default KategoriIkonu
