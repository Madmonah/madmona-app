// 🔗 يفتح Edit profile في تيك توك ويطلّع الحقول (probe) أو يحدّث البايو/الويبسايت. argv: probe | set
const { chromium } = require('playwright')
const mode = process.argv[2] || 'probe'
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.tiktok.com/@madmonacairo', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  await page.locator('[data-e2e="edit-profile-entrance"]').first().click({ timeout: 15000 })
  await page.waitForTimeout(3000)
  const fields = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] input, [role=dialog] textarea')].map(i => ({ tag: i.tagName, e2e: i.getAttribute('data-e2e'), ph: i.placeholder, val: (i.value || '').slice(0, 80), max: i.maxLength })))
  const labels = await page.evaluate(() => (document.querySelector('[role=dialog]') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 500))
  console.log(JSON.stringify({ fields, labels }))
  if (mode === 'set') {
    const bio = page.locator('[data-e2e="edit-profile-bio-input"]').first()
    await bio.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(process.argv[3], { delay: 5 })
    const web = page.locator('[role=dialog] input[data-e2e*="website"], [role=dialog] input[placeholder*="ebsite"], [role=dialog] input[placeholder*="URL"]').first()
    if (await web.count() && process.argv[4]) { await web.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(process.argv[4], { delay: 5 }) }
    await page.waitForTimeout(800)
    const save = page.getByRole('button', { name: 'Save', exact: true }).last(); console.log('save buttons', await page.getByRole('button', { name: 'Save', exact: true }).count())
    console.log('save enabled', await save.isEnabled())
    page.on('response', r => { if (/profile|user\/update|passport|aweme\/v1\/commit/.test(r.url()) && r.request().method() === 'POST') r.text().then(t => console.log('resp', r.status(), r.url().slice(0, 90), t.slice(0, 200))).catch(() => {}) })
    if (await save.isEnabled()) { const bb = await save.boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(4000); await page.screenshot({ path: 'output/_tt_bio_after.jpg', type: 'jpeg', quality: 60 }); console.log('after save:', await page.evaluate(() => { const d = [...document.querySelectorAll('h1,h2,div')].find(x => x.children.length === 0 && x.textContent.trim() === 'Edit profile'); let m = d; for (let i = 0; i < 8 && m && m.innerText.length < 400; i++) m = m.parentElement; return JSON.stringify({ editOpen: !!d, text: m ? m.innerText.replace(/\s+/g, ' ').slice(0, 700) : '', toast: (document.body.innerText.match(/.{0,40}(saved|updated|error|try again|violat).{0,60}/i) || [''])[0] }) })) }
    await page.goto('https://www.tiktok.com/@madmonacairo', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(5000)
    console.log(JSON.stringify(await page.evaluate(() => ({ bio: (document.querySelector('[data-e2e="user-bio"]') || {}).innerText, link: (document.querySelector('[data-e2e="user-link"]') || {}).innerText }))))
  }
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
