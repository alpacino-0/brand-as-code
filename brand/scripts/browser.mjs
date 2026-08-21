/**
 * Ortak tarayıcı başlatıcı.
 *
 * Playwright'ın kendi indirdiği Chromium sürümü ile paket sürümü uyuşmayabildiği için
 * (npx playwright install gerektirir), sistemde kurulu Chrome'a düşebilen bir zincir
 * kullanılır. Böylece marka build'i ek indirme gerektirmeden çalışır.
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const SYSTEM_CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

export async function launch(options = {}) {
  /**
   * Sıralama önemlidir. Tam Chromium ("yeni headless") web fontlarını PDF'e
   * gerçek TrueType olarak gömer. Eski chrome-headless-shell ise glifleri Type3
   * font olarak, yani çizim komutu şeklinde yazar — dosya yine kendi kendine
   * yeter ama baskı öncesi süreçlerde sorun çıkarabilir.
   */
  const attempts = [
    { label: "channel 'chromium' (yeni headless)", opts: { ...options, channel: 'chromium' } },
    { label: 'bundled headless shell', opts: { ...options } },
    { label: "channel 'chrome'", opts: { ...options, channel: 'chrome' } },
  ]

  for (const path of SYSTEM_CHROME) {
    if (existsSync(path)) {
      attempts.push({ label: `system chrome (${path})`, opts: { ...options, executablePath: path } })
    }
  }

  const errors = []
  for (const a of attempts) {
    try {
      return await chromium.launch(a.opts)
    } catch (e) {
      errors.push(`${a.label}: ${String(e.message).split('\n')[0]}`)
    }
  }

  throw new Error(
    'Tarayıcı başlatılamadı. Denenenler:\n  ' +
      errors.join('\n  ') +
      '\n\nÇözüm: npx playwright install chromium',
  )
}
