const puppeteer = require('E:/madmona-app/scripts/node_modules/puppeteer-core')

const URL = process.argv[2] || 'https://claude.ai/design/p/004b32d9-d907-4765-a1cd-d514533dddcd'
const OUT = 'E:/madmona-app/scripts/reels/playwright/output/design-new-' + Date.now() + '.webm'
const RECORD_MS = 22000

async function main() {
  console.log('[record] connecting to Chrome A (9222)...')
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null, protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1920 })
  console.log('[record] navigating to', URL)
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))
  console.log('[record] starting screencast ->', OUT)
  const recorder = await page.screencast({ path: OUT })
  await new Promise(r => setTimeout(r, RECORD_MS))
  await recorder.stop()
  console.log('[record] DONE:', OUT)
  await page.close()
  browser.disconnect()
}

main().catch(e => { console.error('[record] FAILED:', e.message); process.exit(1) })
