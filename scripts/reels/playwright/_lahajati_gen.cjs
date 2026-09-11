// 🎙️ توليد صوت بهجت V2 (المصرية القاهرية · احترافي) من حساب لهجتي المفتوح في كروم السوشيال (CDP 9223)
// argv: <slug> [voiceName=بهجت]  → يقرا output/vo-<slug>.txt ويكتب vo-<slug>-lahajati.mp3 (+ فحص md5 إن الملف جديد فعلًا)
const { chromium } = require('playwright')
const fs = require('fs'), crypto = require('crypto'), { spawnSync } = require('child_process')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2], voice = process.argv[3] || 'بهجت'
const TXT = fs.readFileSync(D + 'output/vo-' + slug + '.txt', 'utf8').trim()
;(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = browser.contexts()[0]
  let page = ctx.pages().find(p => p.url().includes('lahajati.ai')) || await ctx.newPage()
  await page.goto('https://lahajati.ai/en/tools/text-to-speech-superior-v2', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('#simple-text-input', { timeout: 30000 })
  const before = await page.evaluate(() => (document.body.innerText.match(/ID:\s*(\d+)/) || ['', '?'])[1])
  // 🐞 (١٢/٩) الضغط على الكارت بيعيد بناء قايمة اللهجة بعد لحظة → لو ظبطناها في نفس التِك بترجع «تلقائية» والطلب يطلع من غير dialect_id.
  // الصح: كليك الكارت → استنى → ظبّط اللهجة والأسلوب → اتأكد إن القيمة فضلت ٧ قبل التوليد.
  await page.evaluate((voice) => { const c = [...document.querySelectorAll('.voice-card')].find(c => c.innerText.trim().startsWith(voice)); c && c.click() }, voice)
  await page.waitForTimeout(3000)
  await page.evaluate(() => {
    for (const s of document.querySelectorAll('select')) {
      if ([...s.options].some(o => o.value === '7')) { s.value = '7'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })) }
      if ([...s.options].some(o => o.value === 'professional')) { s.value = 'professional'; s.dispatchEvent(new Event('change', { bubbles: true })) }
    }
  })
  await page.waitForTimeout(1500)
  const dial = await page.evaluate(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === '7')); return s ? s.value + ':' + (s.options[s.selectedIndex]?.text || '').slice(0, 30) : 'no-select' })
  console.log('dialect select →', dial)
  if (!dial.startsWith('7:')) throw new Error('dialect not set to 7 — aborting before spending points')
  const setup = await page.evaluate(({ TXT, voice }) => {
    const el = document.querySelector('#simple-text-input')
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, TXT); el.dispatchEvent(new Event('input', { bubbles: true }))
    window.__toasts = []
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 1) { const t = (n.innerText || '').trim(); if (t && t.length < 300) window.__toasts.push(t) } } }).observe(document.body, { childList: true, subtree: true })
    return { sel: document.querySelector('.voice-card.selected')?.innerText.trim().split('\n')[0], len: el.value.length }
  }, { TXT, voice })
  console.log('acct', before, 'voice', setup.sel, 'chars', setup.len)
  if (setup.sel !== voice) throw new Error('voice not selected')
  // التقط طلب التوليد للتأكد من dialect_id=7
  const reqP = page.waitForRequest(r => r.method() === 'POST' && /generate|speech|tts/i.test(r.url()), { timeout: 20000 }).catch(() => null)
  await page.click('#generate-btn')
  const req = await reqP
  if (req) {
    const body = req.postData() || ''
    const i = body.indexOf('dialect_id')
    console.log('req', req.url().slice(0, 80), 'dialect snippet:', i >= 0 ? JSON.stringify(body.slice(i, i + 40)) : 'NO dialect_id in body', '| voice:', (body.match(/id_voice"?\r?\n?\r?\n?(\d+)/) || ['', '?'])[1])
  }
  // استنى لحد ما يظهر عنصر audio أو توست خطأ (حد ١٢٠ ث)
  let ok = false, toast = ''
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000)
    const st = await page.evaluate(() => ({ audio: document.querySelectorAll('audio').length, toasts: window.__toasts.slice(-3) }))
    toast = (st.toasts || []).find(t => /خطأ|error|نقاط/i.test(t)) || ''
    if (toast) break
    if (st.audio > 0) { ok = true; break }
  }
  if (toast) throw new Error('lahajati toast: ' + toast.replace(/\n/g, ' | '))
  if (!ok) console.log('no <audio> appeared — checking archive anyway')
  await page.waitForTimeout(3000)
  await page.goto('https://lahajati.ai/en/audio-archive', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('a[href*="audio_file"]', { timeout: 30000 })
  const href = await page.evaluate(() => document.querySelector('a[href*="audio_file"]').href)
  const resp = await ctx.request.get(href)
  const buf = Buffer.from(await resp.body())
  const raw = D + 'output/_lah_' + slug + '.bin'
  fs.writeFileSync(raw, buf)
  const out = D + 'vo-' + slug + '-lahajati.mp3'
  const prevMd5 = fs.existsSync(out) ? crypto.createHash('md5').update(fs.readFileSync(out)).digest('hex') : ''
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:a', 'copy', out], { encoding: 'utf8' })
  if (r.status !== 0) { spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:a', 'libmp3lame', '-q:a', '2', out]) }
  const md5 = crypto.createHash('md5').update(fs.readFileSync(out)).digest('hex')
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out], { encoding: 'utf8' }).stdout.trim()
  const after = await page.evaluate(() => (document.body.innerText.match(/ID:\s*(\d+)/) || ['', '?'])[1])
  console.log(JSON.stringify({ slug, href: href.slice(0, 120), bytes: buf.length, dur, newFile: md5 !== prevMd5, acct: after }))
  await page.goto('https://lahajati.ai/en/tools/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await browser.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
