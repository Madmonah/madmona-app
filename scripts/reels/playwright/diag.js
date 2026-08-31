// Diagnostic — connect to Chrome CDP, list open tabs, take a screenshot of each
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const contexts = browser.contexts()
  console.log(`contexts: ${contexts.length}`)
  const outDir = path.join(__dirname, 'diag')
  fs.mkdirSync(outDir, { recursive: true })
  let i = 0
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      i++
      const url = page.url()
      let title = ''; try { title = await page.title() } catch {}
      console.log(`[${i}] ${title}  |  ${url}`)
      try {
        await page.bringToFront()
        await page.screenshot({ path: path.join(outDir, `tab${i}.png`), fullPage: false })
        console.log(`    → screenshot: diag/tab${i}.png`)
      } catch (e) { console.log(`    ✗ screenshot failed: ${e.message}`) }
    }
  }
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
