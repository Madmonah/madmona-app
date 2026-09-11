// 🔓 تيك توك: تغيير خصوصية فيديو من «Only me» لـ«Everyone» من Studio (CDP 9223). argv: <videoId>
// (١٢/٩) الكودك نزل «Only me» رغم إن السكريبت نشر عادي — الفحص من قايمة Studio: زرار الخصوصية جنب كل فيديو.
const { chromium } = require('playwright')
const id = process.argv[2]
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = await ctx.newPage()
  await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(12000)
  const row = page.locator(`a[href*="/video/${id}"]`).first()
  if (!(await row.count())) throw new Error('row not found')
  const rb = await (await row.elementHandle()).boundingBox()
  // زرار الخصوصية = أقرب button في نفس الصف نصه Only me/Friends/Everyone
  const btns = await page.$$('button')
  let target = null
  for (const bt of btns) {
    const bb = await bt.boundingBox().catch(() => null); if (!bb) continue
    const t = (await bt.innerText().catch(() => '')).trim()
    if (Math.abs(bb.y - rb.y) < 90 && /^(Only me|Friends|Everyone|أنا فقط|الجميع)$/i.test(t)) { target = { bt, t }; break }
  }
  if (!target) throw new Error('privacy button not found')
  console.log('current:', target.t)
  if (/^Everyone$/i.test(target.t)) { console.log('already Everyone'); await b.close(); return }
  await target.bt.click()
  await page.waitForTimeout(1500)
  const opt = page.locator('text=/^Everyone$/').last()
  if (!(await opt.count())) throw new Error('Everyone option not found')
  await opt.click()
  await page.waitForTimeout(3000)
  const after = await page.evaluate((id) => { const a = document.querySelector(`a[href*="/video/${id}"]`); let r = a; for (let i = 0; i < 6 && r; i++) { r = r.parentElement; const bt = r && [...r.querySelectorAll('button')].find(x => /^(Only me|Friends|Everyone)$/.test(x.innerText.trim())); if (bt) return bt.innerText.trim() } return '?' }, id)
  console.log('after:', after)
  await page.close().catch(() => {}); await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
