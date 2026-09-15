// 🎙️ (١٥/٩/٢٠٢٦) بديل لهجتي من كروم السوشيال (CDP 9223) — محمد: «مش عايزك تقف على حاجات إنت عندك ليها بدايل».
// واجهة V2 الجديدة (١٢/٩): اللهجة مودال #dialect-selector → #dialect-options-grid · الأسلوب مودال #voice-style-selector → #voice-style-options-grid.
// الـ<select> القديم مالوش أثر. لو الجلسة خارجة: زرار Google (a[href*=auth/google]) بجلسة جوجل الموجودة — من غير باسورد.
// argv: <slug> [voice=بهجت] → يقرا output/vo-<slug>.txt ويكتب output/vo-<slug>-lahajati.mp3 + نسخة في جذر المجلد.
// بيوقف قبل التوليد لو الطلب مش هيطلع بـdialect_id=7 (مايصرفش نقاط على لهجة غلط).
const { chromium } = require('playwright')
const fs = require('fs'), crypto = require('crypto'), { spawnSync } = require('child_process')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2], voice = process.argv[3] || 'بهجت'
const TXT = fs.readFileSync(D + 'output/vo-' + slug + '.txt', 'utf8').trim()
const log = (...a) => console.log('[lah]', ...a)
;(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const ctx = browser.contexts()[0]
  const page = await ctx.newPage()
  const V2 = 'https://lahajati.ai/en/tools/text-to-speech-superior-v2'
  await page.goto(V2, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  // ── الجلسة ──
  if (!(await page.$('#simple-text-input'))) {
    const g = await page.$('a[href*="auth/google"]')
    log('not logged in; google button:', !!g, 'url', page.url().slice(0, 70))
    if (!g) { await page.goto('https://lahajati.ai/en/login', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(4000) }
    const g2 = await page.$('a[href*="auth/google"]')
    if (!g2) throw new Error('no google login button')
    await g2.click()
    await page.waitForTimeout(12000)
    // شاشة اختيار حساب جوجل: اختار أول حساب موجود (جلسة قائمة، من غير باسورد)
    if (/accounts\.google\.com/.test(page.url())) {
      const acct = await page.$('[data-identifier], div[data-email]')
      log('google chooser; account tile:', !!acct)
      if (acct) { await acct.click(); await page.waitForTimeout(12000) }
      if (/accounts\.google\.com/.test(page.url())) {
        const body = (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\s+/g, ' ')
        throw new Error('google needs interaction (no password entry allowed): ' + body)
      }
    }
    await page.goto(V2, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(6000)
    if (!(await page.$('#simple-text-input'))) throw new Error('still not logged in after google SSO')
  }
  const acct = await page.evaluate(() => { const t = document.body.innerText; return { id: (t.match(/ID:\s*(\d+)/) || ['', '?'])[1], pts: (t.match(/DAYS\s+([\d,]+)/) || t.match(/([\d,]{4,})\s*(?:نقطة|points)/i) || ['', '?'])[1] } })
  log('account', JSON.stringify(acct))

  // ── الصوت ──
  const cardOk = await page.evaluate((voice) => { const c = [...document.querySelectorAll('.voice-card')].find(c => c.innerText.trim().startsWith(voice)); if (c) c.click(); return !!c }, voice)
  if (!cardOk) throw new Error('voice card not found: ' + voice)
  await page.waitForTimeout(4000)
  // ── اللهجة (مودال) ──
  await page.evaluate(() => document.querySelector('#dialect-selector')?.click())
  await page.waitForTimeout(1500)
  const dOk = await page.evaluate(() => { const o = [...document.querySelectorAll('#dialect-options-grid > *')].find(e => e.innerText.includes('المصرية (القاهرية)')); if (o) o.click(); return !!o })
  if (!dOk) throw new Error('dialect option not found')
  await page.waitForTimeout(1500)
  // ── الأسلوب (مودال) ──
  await page.evaluate(() => document.querySelector('#voice-style-selector')?.click())
  await page.waitForTimeout(1500)
  const sOk = await page.evaluate(() => { const o = [...document.querySelectorAll('#voice-style-options-grid > *')].find(e => e.innerText.includes('رسمي ومهني')); if (o) o.click(); return !!o })
  if (!sOk) throw new Error('style option not found')
  await page.waitForTimeout(1500)
  const labels = await page.evaluate(() => ({ dialect: document.querySelector('#dialect-selector')?.innerText.replace(/\s+/g, ' ').trim(), style: document.querySelector('#voice-style-selector')?.innerText.replace(/\s+/g, ' ').trim(), card: document.querySelector('.voice-card.selected')?.innerText.trim().split('\n')[0] }))
  log('labels', JSON.stringify(labels))
  if (!/المصرية \(القاهرية\)/.test(labels.dialect || '')) throw new Error('dialect label not Egyptian — abort before spending points')

  // ── النص + التقاط الطلب ──
  await page.evaluate((TXT) => {
    const el = document.querySelector('#simple-text-input')
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, TXT); el.dispatchEvent(new Event('input', { bubbles: true }))
    window.__lahReq = []; window.__toasts = []
    const grab = (b) => { const k = []; for (const [a, v] of b.entries()) if (a !== '_token' && a !== 'text') k.push(a + '=' + String(v).slice(0, 30)); return k.join(' · ') }
    const of = window.fetch; window.fetch = function (u, o) { try { if (o && o.body instanceof FormData) window.__lahReq.push(grab(o.body)) } catch (e) {} return of.apply(this, arguments) }
    const os = XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send = function (b) { try { if (b instanceof FormData) window.__lahReq.push(grab(b)) } catch (e) {} return os.apply(this, arguments) }
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { const t = (n.innerText || '').trim(); if (t && t.length < 300) window.__toasts.push(t) } }).observe(document.body, { childList: true, subtree: true })
  }, TXT)
  const archiveBefore = await ctx.request.get('https://lahajati.ai/en/audio-archive').then(r => r.text()).then(h => (h.match(/audio_file\?S3=[^"'\s]+/) || [''])[0]).catch(() => '')
  await page.evaluate(() => document.querySelector('#generate-btn').click())
  await page.waitForTimeout(4000)
  const st = await page.evaluate(() => ({ req: window.__lahReq, btn: document.querySelector('#generate-btn')?.innerText.trim().slice(0, 30), toasts: window.__toasts.slice(-3) }))
  log('request', JSON.stringify(st))
  const req = (st.req || []).join(' ')
  if (!/dialect_id=7/.test(req)) throw new Error('request without dialect_id=7: ' + req.slice(0, 200))
  const bad = (st.toasts || []).find(t => /نقاط|خطأ|error|مشتركين/i.test(t))
  if (bad) throw new Error('lahajati toast: ' + bad.replace(/\n/g, ' | '))

  // ── انتظار الملف في الأرشيف (حد ٤ دقايق) ──
  let href = ''
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(10000)
    const h = await ctx.request.get('https://lahajati.ai/en/audio-archive').then(r => r.text()).catch(() => '')
    const first = (h.match(/audio_file\?S3=[^"'\s<]+/) || [''])[0]
    if (first && first !== archiveBefore) { href = 'https://lahajati.ai/' + first.replace(/&amp;/g, '&'); break }
  }
  if (!href) {
    // الأرشيف بيتحمّل بالـJS أحيانًا — نقرأه من الصفحة نفسها
    await page.goto('https://lahajati.ai/en/audio-archive', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
    await page.goto('https://lahajati.ai/en/audio-archive', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
    const got = await page.evaluate(() => { const a = document.querySelector('a[href*="audio_file"]'); if (!a) return null; let e = a; for (let i = 0; i < 6 && e.parentElement; i++) { e = e.parentElement; if (e.innerText && e.innerText.length > 60) break } return { href: a.href, text: e.innerText.replace(/\s+/g, ' ').slice(0, 120) } })
    log('archive dom', JSON.stringify(got))
    const first2line = TXT.split('\n')[0].replace(/[….]/g, '').trim().slice(0, 20)
    if (got && got.text.includes(first2line.slice(0, 12))) href = got.href
  }
  if (!href) throw new Error('generated file not found in archive')
  const resp = await ctx.request.get(href)
  const buf = Buffer.from(await resp.body())
  const raw = D + 'output/_lah_' + slug + '.bin'
  fs.writeFileSync(raw, buf)
  const out = D + 'output/vo-' + slug + '-lahajati.mp3'
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-codec:a', 'libmp3lame', '-b:a', '128k', out], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr || '').slice(0, 200))
  fs.copyFileSync(out, D + 'vo-' + slug + '-lahajati.mp3')
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out], { encoding: 'utf8' }).stdout.trim()
  const md5 = crypto.createHash('md5').update(fs.readFileSync(out)).digest('hex')
  console.log(JSON.stringify({ slug, ok: true, bytes: buf.length, dur, md5: md5.slice(0, 10), href: href.slice(0, 110) }))
  await page.close().catch(() => {})
  await browser.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
