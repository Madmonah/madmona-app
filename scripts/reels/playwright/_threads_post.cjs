// 🧵 نشر ريل على ثريدز من كروم السوشيال (CDP 9223). argv: <slug> [mp4]
const { chromium } = require('playwright')
const fs = require('fs')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2]
const mp4 = process.argv[3] || D + 'output/reel-' + slug + '.mp4'
const cap = fs.readFileSync(D + 'output/caption-' + slug + '-threads.txt', 'utf8').replace(/\r/g, '').trim()
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 20000 }),
    (async () => {
      await page.getByText('New thread', { exact: true }).first().click().catch(async () => { await page.locator('[aria-label="Create"]').first().click() })
      await page.waitForTimeout(2500)
      const att = page.locator('[role=dialog] [aria-label*="Attach"], [role=dialog] svg[aria-label*="Attach"]').first()
      if (await att.count()) await att.click(); else await page.locator('[role=dialog] input[type=file]').first().evaluate(i => i.click())
    })(),
  ]).catch(async () => { await page.locator('[role=dialog] input[type=file]').first().setInputFiles(mp4); return [null] })
  if (chooser) await chooser.setFiles(mp4)
  await page.waitForTimeout(6000)
  const box = page.locator('[role=dialog] [contenteditable=true]').first()
  await box.click(); await page.keyboard.type(cap, { delay: 4 })
  await page.waitForTimeout(1500)
  const hasVideo = await page.locator('[role=dialog] video').count()
  await page.screenshot({ path: 'output/_threads_before.jpg', type: 'jpeg', quality: 55 })
  const btns = await page.locator('[role=dialog] [role=button], [role=dialog] button').evaluateAll(els => els.map(e => e.innerText.trim()).filter(Boolean))
  console.log('dialog buttons:', JSON.stringify(btns))
  const post = page.locator('[role=dialog] [role=button], [role=dialog] button').filter({ hasText: /^Post$/ }).last()
  console.log('post btn count', await post.count(), 'disabled', await post.getAttribute('aria-disabled'))
  await post.click()
  await page.waitForTimeout(4000); await page.screenshot({ path: 'output/_threads_after.jpg', type: 'jpeg', quality: 55 })
  await page.waitForTimeout(12000)
  const t = await page.evaluate(() => document.body.innerText)
  console.log(JSON.stringify({ hasVideo, posted: /Posted|Post shared|View/i.test(t), dialog: await page.locator('[role=dialog]').count() }))
  await page.goto('https://www.threads.com/@madmona.cairo', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000)
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('a[href*="/post/"]')].map(a => a.href.replace(/\?.*/, '')).filter((v, i, s) => s.indexOf(v) === i).slice(0, 3))))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
