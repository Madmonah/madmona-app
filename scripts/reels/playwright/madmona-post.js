/**
 * madmona-post.js — ONE FILE. Everything.
 * - Connects to Chrome A (9222) and Chrome B (9223) already running
 * - Reuses existing tabs when possible (matches by URL host)
 * - Cycles every 20 min through 10 platforms
 * - Screenshots to diag/<platform>/ so we can debug what's on screen
 *
 * Usage:  node madmona-post.js
 * Env:    CDP_URL_A, CDP_URL_B, INTERVAL_MIN, MP4_PATH (override clip), CAPTION
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs'), path = require('path'), os = require('os')

const PORT_A = process.env.CDP_URL_A || 'http://localhost:9222'   // Personal: Claude + FB
const PORT_B = process.env.CDP_URL_B || 'http://localhost:9223'   // Madmona: rest
const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 45)
const SUPA = 'https://mjhflxpxunwycbiquoig.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
const BOT = '8731129863:AAFGr152JDqX0_mtnMv3e9BtIlYouy5SRX4'
const TG_CHANNEL = '@madmona_cairo'
const DIAG = path.join(__dirname, 'diag')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const now = () => new Date().toISOString()

// ─── لوج مباشر للملف (stdout redirection كان بيتبفّر ويضيع) ─────────────
const LOG_FILE = path.join(__dirname, 'madmona-post.log')
;(() => {
  const olog = console.log, oerr = console.error
  const tee = (fn) => (...a) => { try { fs.appendFileSync(LOG_FILE, a.join(' ') + '\n') } catch {}; fn(...a) }
  console.log = tee(olog); console.error = tee(oerr)
})()

// بداية اليوم بتوقيت القاهرة (UTC+3) — عشان قاعدة «مرة واحدة يوميًا لكل منصة»
function cairoDayStartISO() {
  const d = new Date(Date.now() + 3 * 3600e3)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 3 * 3600e3).toISOString()
}
// فلاجات محلية — عشان لو نداء Supabase فلك ماننشرش مرتين في نفس اليوم
const FLAGS = path.join(__dirname, 'flags')
function flagPath(platform) {
  const d = new Date(Date.now() + 3 * 3600e3)
  return path.join(FLAGS, platform + '-' + d.toISOString().slice(0, 10) + '.done')
}
function hasLocalFlag(p) { try { return fs.existsSync(flagPath(p)) } catch { return false } }
function setLocalFlag(p) { try { fs.mkdirSync(FLAGS, { recursive: true }); fs.writeFileSync(flagPath(p), now()) } catch {} }

async function postedToday(platform) {
  if (hasLocalFlag(platform)) return true
  try {
    const r = await fetch(SUPA + '/rest/v1/design_clip_posts?select=id&platform=eq.' + platform + '&posted_at=gte.' + encodeURIComponent(cairoDayStartISO()) + '&limit=1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
    const rows = await r.json()
    return Array.isArray(rows) && rows.length > 0
  } catch { return false }
}

async function shot(page, tag) {
  const dir = path.join(DIAG, tag); fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, Date.now() + '.png') }).catch(() => {})
}

// Auto-accept any native browser dialog (confirm/alert/beforeunload "Leave site?")
// on a page. Without this, a "Leave site?" prompt freezes the tab forever —
// every future evaluate()/click() on it just hangs, which is what was making
// Facebook look "stuck" and causing duplicate tabs to pile up (the old tab
// never finished navigating, so the next cycle couldn't find/reuse it and
// opened a brand new one instead).
function wireDialogHandler(page) {
  if (page.__dialogWired) return
  page.__dialogWired = true
  page.on('dialog', async (dialog) => {
    console.log('[dialog] auto-accepting ' + dialog.type() + ': ' + dialog.message().slice(0, 80))
    try { await dialog.accept() } catch { try { await dialog.dismiss() } catch {} }
  })
}

// Reuse tab on same host but FORCE-navigate to target URL every time.
// (Previously kept old URL, so /reels/ tab would be reused when we wanted /)
// Also closes any DUPLICATE tabs already open on the same host so tabs don't
// pile up across cycles (this was the "opening more than one window" bug).
async function getOrOpenTab(browser, url) {
  const host = new URL(url).hostname
  const pages = await browser.pages()
  for (const pg of pages) wireDialogHandler(pg)

  const matches = []
  for (const p of pages) {
    try { const u = p.url(); if (u && u.includes(host)) matches.push(p) } catch {}
  }
  if (matches.length > 1) {
    console.log('[tabs] closing ' + (matches.length - 1) + ' duplicate ' + host + ' tab(s)')
    for (let i = 0; i < matches.length - 1; i++) { try { await matches[i].close() } catch {} }
  }
  if (matches.length) {
    const p = matches[matches.length - 1]
    await p.bringToFront()
    if (p.url() !== url) { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}) }
    return p
  }

  for (const p of pages) {
    const u = p.url()
    if (!u || u === 'about:blank' || u.startsWith('chrome://new-tab-page')) {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      await p.bringToFront()
      return p
    }
  }
  const p = await browser.newPage()
  wireDialogHandler(p)
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await p.bringToFront()
  return p
}

// Junk tabs pile up over cycles from ad/recaptcha iframes that Chrome opens
// as real top-level tabs, plus duplicate platform tabs from earlier failed
// navigations. Run once right after connecting to a browser each cycle.
const JUNK_URL_PATTERNS = [
  /recaptcha/i, /doubleclick/i, /googlesyndication/i, /safeframe/i,
  /adtrafficquality/i, /googleadservices/i, /\bns1p\.net/i, /protechts\.net/i,
  /demdex\.net/i, /merchantpool/i, /^blob:/i, /^chrome:\/\/omnibox-popup/i,
  /google\.com\/search/i, /google\.com\/recaptcha/i,
]
const PLATFORM_HOSTS = ['facebook.com', 'instagram.com', 'x.com', 'linkedin.com', 'studio.youtube.com', 'tiktok.com', 'threads.net', 'threads.com', 'bsky.app', 'pinterest.com']

async function cleanupBrowser(browser) {
  let pages
  try { pages = await browser.pages() } catch { return }
  let closed = 0
  for (const p of pages) {
    let u = ''
    try { u = p.url() } catch { continue }
    if (JUNK_URL_PATTERNS.some(rx => rx.test(u))) {
      try { await p.close(); closed++ } catch {}
    }
  }
  try { pages = await browser.pages() } catch { return }
  const byHost = {}
  for (const p of pages) {
    let u = ''
    try { u = p.url() } catch { continue }
    const host = PLATFORM_HOSTS.find(h => u.includes(h))
    if (!host) continue
    ;(byHost[host] = byHost[host] || []).push(p)
  }
  for (const host of Object.keys(byHost)) {
    const list = byHost[host]
    if (list.length > 1) {
      for (let i = 0; i < list.length - 1; i++) { try { await list[i].close(); closed++ } catch {} }
    }
  }
  if (closed) console.log('[cleanup] closed ' + closed + ' junk/duplicate tab(s)')
}

async function waitFileInput(page, timeout = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const inputs = await page.$$('input[type="file"]')
    if (inputs.length) return inputs[0]
    await sleep(500)
  }
  return null
}

async function clickText(page, texts) {
  for (const t of (Array.isArray(texts) ? texts : [texts])) {
    const h = await page.evaluateHandle((needle) => {
      const nodes = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], a, [role="menuitem"]'))
      return nodes.find(n => n.innerText && n.innerText.trim() === needle) || null
    }, t)
    const el = h.asElement()
    if (el) { await el.click().catch(() => {}); return true }
  }
  return false
}

// ─── ROBUST "PRESS THE FINAL POST BUTTON" HELPERS ─────────────────────────
// Finds a clickable node matching any of `texts` (exact OR contains, checked
// against both innerText and aria-label), searching the main frame + all
// iframes, optionally scoped to a container (e.g. the open dialog).
async function findClickable(page, texts, rootSelector) {
  const frames = [page, ...page.frames()]
  for (const frame of frames) {
    for (const t of (Array.isArray(texts) ? texts : [texts])) {
      let h
      try {
        h = await frame.evaluateHandle((needle, root) => {
          let scope = document
          if (root) {
            // Pick the topmost VISIBLE dialog matching root, not just the first
            // one in DOM order — sites like Facebook keep several hidden
            // [role="dialog"] elements around at all times.
            const candidates = Array.from(document.querySelectorAll(root)).filter(d => {
              const r = d.getBoundingClientRect()
              return r.width > 0 && r.height > 0
            })
            if (candidates.length) scope = candidates[candidates.length - 1]
          }
          const nodes = Array.from(scope.querySelectorAll('button, div[role="button"], span[role="button"], a, [role="menuitem"]'))
          const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase()
          const target = norm(needle)
          if (!target) return null
          const visible = n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
          // Exact match only (on visible text OR aria-label) — substring/"includes"
          // matching is too loose for short generic words like "Next"/"Post" and
          // was matching unrelated controls (e.g. a story carousel's "Next items").
          return nodes.find(n => {
            if (!visible(n)) return false
            const txt = norm(n.innerText || n.textContent)
            const aria = norm(n.getAttribute && n.getAttribute('aria-label'))
            return txt === target || aria === target
          }) || null
        }, t, rootSelector || null)
      } catch { continue }
      const el = h && h.asElement ? h.asElement() : null
      if (el) return { el, frame }
    }
  }
  return null
}

async function isDisabled(el) {
  return await el.evaluate(n => {
    return n.disabled === true || n.getAttribute('aria-disabled') === 'true' || n.getAttribute('disabled') !== null
  }).catch(() => false)
}

// Polls until the Post/Share/Publish button exists AND is enabled (social
// sites keep it disabled while the video is still uploading/processing),
// clicks it, then VERIFIES the click actually did something — the dialog
// closed, the button was removed from the DOM, or the URL changed. If not
// confirmed, retries once. Throws if nothing can be confirmed, instead of
// silently reporting success like the old fire-and-forget clickText did.
async function clickPostButton(page, texts, { waitEnabledMs = 60000, verifyMs = 20000, rootSelector } = {}) {
  const t0 = Date.now()
  let target = null
  while (Date.now() - t0 < waitEnabledMs) {
    target = await findClickable(page, texts, rootSelector)
    if (target) {
      const disabled = await isDisabled(target.el)
      if (!disabled) break
      target = null
    }
    await sleep(1500)
  }
  if (!target) return false

  const attemptOnce = async () => {
    const beforeUrl = page.url()
    const dialogBefore = rootSelector ? await page.$(rootSelector).catch(() => null) : null
    await target.el.click().catch(async () => {
      await target.el.evaluate(n => n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))).catch(() => {})
    })
    const v0 = Date.now()
    while (Date.now() - v0 < verifyMs) {
      await sleep(1000)
      const stillThere = await target.el.evaluate(n => document.body.contains(n)).catch(() => false)
      const urlChanged = page.url() !== beforeUrl
      const dialogGone = dialogBefore ? !(await page.$(rootSelector).catch(() => null)) : false
      if (!stillThere || urlChanged || dialogGone) return true
    }
    return false
  }

  if (await attemptOnce()) return true
  // one retry: re-find the button (it may have re-rendered) and click again
  target = await findClickable(page, texts, rootSelector)
  if (!target) return false
  return await attemptOnce()
}

// Wraps a platform's post() call so one truly stuck platform (e.g. a CDP
// call that never resolves) can't block the whole cycle forever.
function withTimeout(promise, ms, label) {
  let to
  const timeout = new Promise((_, rej) => { to = setTimeout(() => rej(new Error(label + ' timed out after ' + Math.round(ms / 1000) + 's')), ms) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(to))
}

// ─── SUPABASE ────────────────────────────────────────────────────────────
async function readNext() {
  const local = process.env.MP4_PATH
  if (local) return { mp4: local, caption: process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com', videoUrl: null }
  const res = await fetch(SUPA + '/rest/v1/design_clips?select=id,slug,video_url,caption_text,title&active=eq.true&order=last_used_at.asc.nullsfirst,times_used.asc&limit=1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  const [c] = await res.json()
  if (!c) throw new Error('no active clips')
  const mp4 = path.join(os.tmpdir(), 'reel-' + c.slug + '.mp4')
  fs.writeFileSync(mp4, Buffer.from(await (await fetch(c.video_url)).arrayBuffer()))
  // حارس ضد \n الحرفية لو رجعت تاني من أي إدخال قديم
  const cleanCaption = (c.caption_text || '').replace(/\\n/g, '\n')
  return { id: c.id, slug: c.slug, title: c.title, mp4, caption: cleanCaption, videoUrl: c.video_url }
}
async function markUsed(clip, platform, url) {
  if (!clip.id) return
  await fetch(SUPA + '/rest/v1/design_clip_posts', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ clip_id: clip.id, platform, target_url: url || '' }) }).catch(() => {})
}
async function bumpClip(clip) {
  if (!clip.id) return
  const r = await fetch(SUPA + `/rest/v1/design_clips?select=times_used&id=eq.${clip.id}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  const [{ times_used }] = await r.json()
  await fetch(SUPA + '/rest/v1/design_clips?id=eq.' + clip.id, { method: 'PATCH', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ last_used_at: new Date().toISOString(), times_used: times_used + 1 }) }).catch(() => {})
}

// ─── POSTERS ─────────────────────────────────────────────────────────────
async function postFB(br, c) {
  // Personal profile flow: home page → click "What's on your mind" → Photo/video → pick file
  // تاب فيسبوك اللي اتجمّد قبل كده بيفضل مجمّد — نقفل أي تابات FB قديمة ونبدأ نضيف
  try {
    for (const pg of await br.pages()) {
      const u = pg.url() || ''
      if (u.includes('facebook.com')) await pg.close().catch(() => {})
    }
  } catch {}
  const p = await getOrOpenTab(br, 'https://www.facebook.com/')
  await sleep(6000); await shot(p, 'facebook-00')
  // Click "What's on your mind" composer
  await p.evaluate(() => {
    const el = document.querySelector('div[role="button"][aria-label*="mind"i], div[role="button"][aria-label*="فكرك"i], div[aria-label*="Create a post"i]')
    if (el) el.click()
  })
  await sleep(3000); await shot(p, 'facebook-00b')
  // Click "Photo/video" button in the composer modal
  await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div[role="button"], span'))
    const t = items.find(x => /photo\/?video|photo.?video|صور\/?فيديو|صورة\/?فيديو/i.test(x.innerText || ''))
    if (t) t.click()
  })
  await sleep(3000); await shot(p, 'facebook-00c')
  const f = await waitFileInput(p, 15000); if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(25000); await shot(p, 'facebook-01')
  const cap = await p.$('div[contenteditable="true"][aria-label*="mind"i], div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption); await sleep(2000) }
  await shot(p, 'facebook-01b')
  // Facebook's reel/video composer often inserts one or more "Next" screens
  // (crop/cover picker, settings) before the final Post button ever appears —
  // click through them. Loop stops naturally once no more "Next" button shows.
  for (let i = 0; i < 3; i++) {
    const clickedNext = await clickPostButton(p, ['Next'], { waitEnabledMs: 8000, verifyMs: 8000, rootSelector: '[role="dialog"]' })
    if (!clickedNext) break
    await sleep(2000); await shot(p, 'facebook-01c-' + i)
  }
  // Post button stays disabled while FB is still processing the video —
  // poll until enabled, click, and verify the composer dialog actually closed.
  const posted = await clickPostButton(p, ['Post', 'Share', 'نشر', 'Publish'], { waitEnabledMs: 90000, verifyMs: 20000, rootSelector: '[role="dialog"]' })
  if (!posted) throw new Error('post button click not confirmed (facebook)')
  await sleep(4000)
  await shot(p, 'facebook-02'); return p.url()
}

async function postIG(br, c) {
  const p = await getOrOpenTab(br, 'https://www.instagram.com/')
  await sleep(5000); await shot(p, 'instagram-00')
  // لو فيه مودال «Discard post?» متعلّق من محاولة قديمة — دوس Discard الأول
  // (ده كان سبب فشل «no file input» المتكرر)
  await clickText(p, ['Discard', 'تجاهل']); await sleep(2500)
  await p.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="New post"], svg[aria-label*="Create"], svg[aria-label*="إنشاء"]')
    if (svg) {
      let el = svg
      while (el && !['A','BUTTON'].includes(el.tagName) && !el.getAttribute('role')) el = el.parentElement
      const target = el || svg
      // SVG elements don't have .click(); dispatch a real click event
      if (typeof target.click === 'function') target.click()
      else target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    }
  }); await sleep(3000)
  await clickText(p, ['Post', 'Reel', 'ريل', 'منشور']); await sleep(2000)
  const f = await waitFileInput(p, 20000); if (!f) { await shot(p, 'instagram-noinput'); throw new Error('no file input') }
  await f.uploadFile(c.mp4); await sleep(25000); await shot(p, 'instagram-01')
  for (let i = 0; i < 3; i++) { if (!await clickText(p, ['Next', 'التالي'])) break; await sleep(3500) }
  const cap = await p.$('div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption); await sleep(2000) }
  // Share بتحقق فعلي — المودال لازم يقفل، مش ضغطة وخلاص
  const posted = await clickPostButton(p, ['Share', 'نشر'], { waitEnabledMs: 90000, verifyMs: 25000, rootSelector: '[role="dialog"]' })
  if (!posted) throw new Error('share click not confirmed (instagram)')
  await sleep(5000)
  await shot(p, 'instagram-02'); return p.url()
}

async function postX(br, c) {
  const p = await getOrOpenTab(br, 'https://x.com/home')
  await sleep(5000); await shot(p, 'twitter-00')
  // Click the compose button (pen icon in sidebar)
  const posted = await p.evaluate(() => {
    const link = document.querySelector('a[href="/compose/post"], a[data-testid="SideNav_NewTweet_Button"], button[data-testid="SideNav_NewTweet_Button"]')
    if (link) { link.click(); return true }
    return false
  })
  if (!posted) { console.log('[x] no compose button — trying keyboard shortcut'); await p.keyboard.press('n') }
  await sleep(4000); await shot(p, 'twitter-00b')
  const tb = await p.waitForSelector('div[role="textbox"][data-testid^="tweetTextarea"], div[role="textbox"]', { timeout: 8000 }).catch(() => null)
  if (tb) { await tb.click(); await p.keyboard.type(c.caption.slice(0, 260)); await sleep(1500) }
  const f = await waitFileInput(p, 10000); if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(30000); await shot(p, 'twitter-01')
  // استنى زرار Post يتفعّل بعد رفع الفيديو، دوس، واتأكد إن الكومبوزر قفل فعلًا
  const tx0 = Date.now(); let confirmed = false
  while (Date.now() - tx0 < 240000 && !confirmed) {
    const post = await p.$('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]')
    if (post && !(await isDisabled(post))) {
      await post.click().catch(() => {})
      const v0 = Date.now()
      while (Date.now() - v0 < 20000) {
        await sleep(1000)
        const modalBtn = await p.$('button[data-testid="tweetButton"]')
        if (!modalBtn && !p.url().includes('/compose')) { confirmed = true; break }
      }
      if (!confirmed) break
    } else { await sleep(1500) }
  }
  if (!confirmed) throw new Error('tweet post not confirmed (twitter)')
  await sleep(3000)
  await shot(p, 'twitter-02'); return p.url()
}

async function postLI(br, c) {
  const p = await getOrOpenTab(br, 'https://www.linkedin.com/feed/')
  await sleep(4000); await shot(p, 'linkedin-00')
  // Dismiss any Premium/Upsell popup
  await p.evaluate(() => {
    const closes = document.querySelectorAll('button[aria-label*="Dismiss"], button[aria-label*="Close"], svg[data-test-icon="close-medium"]')
    closes.forEach(c => { let el = c; while (el && el.tagName !== 'BUTTON') el = el.parentElement; if (el) el.click() })
  }); await sleep(1500)
  await clickText(p, ['Start a post', 'ابدأ منشورا']); await sleep(3000); await shot(p, 'linkedin-01')
  // Click the "Add media" button — try multiple approaches:
  // 1) button next to text about "photo/video"
  // 2) SVG icons with data-test-icon for image or video
  // 3) any button whose parent contains an image element
  await p.evaluate(() => {
    const isVis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    // 1) أي زرار ظاهر aria-label فيه media/photo/video (بما فيه [role=button])
    const clickables = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVis)
    const byAria = clickables.find(b => /media|photo|image|video|صور|فيديو|وسائط/i.test(b.getAttribute('aria-label') || ''))
    if (byAria) { byAria.click(); return }
    // 2) أيقونة SVG للصور/الفيديو → أقرب زرار
    const svg = document.querySelector('svg[data-test-icon^="image"], svg[data-test-icon*="photo"], svg[data-test-icon*="video"], li-icon[type="image"], li-icon[type="videocamera"]')
    if (svg) { const b = svg.closest('button, [role="button"]'); if (b) { b.click(); return } }
    // 3) fallback: تاني أيقونة في شريط أدوات الديالوج المفتوح (الأولى إيموجي، التانية الميديا)
    const dlg = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVis).pop()
    if (dlg) { const btns = Array.from(dlg.querySelectorAll('button')).filter(isVis); if (btns.length > 2) btns[2].click() }
  }); await sleep(3000); await shot(p, 'linkedin-01b')
  let f = await waitFileInput(p, 15000)
  if (!f) {
    // fallback: explicitly click a "Video" labelled control, in case the icon-based
    // approaches above missed the real trigger
    await clickText(p, ['Video', 'فيديو']); await sleep(2000)
    f = await waitFileInput(p, 8000)
  }
  if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(25000); await shot(p, 'linkedin-02')
  await clickText(p, ['Done', 'Next']); await sleep(3000)
  const cap = await p.$('div[role="textbox"], div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption); await sleep(2000) }
  await shot(p, 'linkedin-02b')
  // Post button stays aria-disabled until LinkedIn finishes processing the
  // video — poll until enabled, click, and verify the share dialog closed.
  const posted = await clickPostButton(p, ['Post', 'نشر'], { waitEnabledMs: 75000, verifyMs: 20000, rootSelector: '[role="dialog"]' })
  if (!posted) throw new Error('post button click not confirmed (linkedin)')
  await sleep(4000)
  await shot(p, 'linkedin-03'); return p.url()
}

async function postYT(br, c) {
  const p = await getOrOpenTab(br, 'https://studio.youtube.com')
  await sleep(6000); await shot(p, 'youtube-00')
  // Dismiss any "Video published" or other blocking modal from previous run
  await p.evaluate(() => {
    const closeBtns = document.querySelectorAll('ytcp-button[icon="close"] button, button[aria-label*="Close"], ytcp-button#close-button, tp-yt-iron-icon[icon="close"]')
    closeBtns.forEach(b => { try { let el = b; while (el && el.tagName !== 'BUTTON') el = el.parentElement; (el||b).click() } catch {} })
  }); await sleep(2000)
  await p.evaluate(() => {
    const btn = document.querySelector('ytcp-button#create-icon, button[aria-label*="Create"]')
    if (btn) btn.click()
  }); await sleep(2500)
  await clickText(p, ['Upload videos', 'Upload video']); await sleep(3000)
  const f = await waitFileInput(p, 20000); if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(30000); await shot(p, 'youtube-01')
  const nk = await p.$('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if (nk) await nk.click().catch(() => {})
  for (let i = 0; i < 3; i++) {
    const nx = await p.$('#next-button button, ytcp-button#next-button')
    if (!nx) break; await nx.click().catch(() => {}); await sleep(3000)
  }
  const pub = await p.$('tp-yt-paper-radio-button[name="PUBLIC"]'); if (pub) await pub.click().catch(() => {})
  const done = await p.$('ytcp-button#done-button')
  if (!done) throw new Error('no Done button (youtube)')
  await done.click().catch(() => {})
  await sleep(9000); await shot(p, 'youtube-02')
  // حاول تلقط لينك الفيديو من مودال «Video published» — ده الدليل الحقيقي
  const link = await p.evaluate(() => {
    const a = document.querySelector('a[href*="youtu.be"], a[href*="/shorts/"], a[href*="watch?v="]')
    return a ? a.href : null
  })
  await p.evaluate(() => {
    const c = document.querySelector('ytcp-button[aria-label*="Close"] button, #close-button button, ytcp-button#close-button')
    if (c) c.click()
  }).catch(() => {})
  return link || p.url()
}

async function postTT(br, c) {
  // tiktok.com/upload بيعمل ريدايركت لاستوديو تيك توك وبيكسر الـevaluate — نروح للاستوديو مباشرة
  const p = await getOrOpenTab(br, 'https://www.tiktok.com/tiktokstudio/upload')
  await sleep(14000); await shot(p, 'tiktok-00')
  // If we ended up on profile page (not upload), click the Upload sidebar link
  const curUrl = p.url()
  if (!curUrl.includes('/upload')) {
    console.log('[tt] not on upload page, clicking sidebar Upload')
    const clicked = await p.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'))
      const up = links.find(a => (a.getAttribute('href')||'').includes('/upload') || (a.innerText||'').trim() === 'Upload')
      if (up) { up.click(); return true }
      return false
    })
    if (clicked) await sleep(6000)
    await shot(p, 'tiktok-00b')
  }
  // Search for file input in page + all frames
  let f = await waitFileInput(p, 8000)
  if (!f) {
    for (const frame of p.frames()) {
      try {
        const inputs = await frame.$$('input[type="file"]')
        if (inputs.length) { f = inputs[0]; break }
      } catch {}
    }
  }
  if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(20000); await shot(p, 'tiktok-01')
  // Caption
  const cap = await p.$('div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption.slice(0, 300)); await sleep(1500) }
  await shot(p, 'tiktok-01b')
  // TikTok keeps Post disabled until the upload+transcode progress bar hits
  // 100% — poll until enabled (searches iframes too), click, verify the
  // button/dialog actually goes away instead of assuming success.
  const posted = await clickPostButton(p, ['Post', 'نشر'], { waitEnabledMs: 90000, verifyMs: 20000 })
  if (!posted) throw new Error('post button click not confirmed (tiktok)')
  await sleep(4000)
  await shot(p, 'tiktok-02'); return p.url()
}

async function postThreads(br, c) {
  const p = await getOrOpenTab(br, 'https://www.threads.com/')
  await sleep(10000); await shot(p, 'threads-00')
  // زرار الإنشاء أيقونة + من غير نص — ندوّر بالـaria-label
  await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[aria-label]'))
    const t = els.find(e => /^(create|new thread|إنشاء)/i.test(e.getAttribute('aria-label') || ''))
    if (t) {
      const b = t.closest('a, button, [role="button"]') || t
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    }
  }); await sleep(4000); await shot(p, 'threads-00c')
  const tb = await p.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await p.keyboard.type(c.caption.slice(0, 500)); await sleep(1500) }
  let f = await waitFileInput(p, 8000)
  if (!f) {
    // جرب أيقونة إرفاق الميديا جوه الكومبوزر
    await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[aria-label]'))
      const t = els.find(e => /attach|media|photo|صور|وسائط/i.test(e.getAttribute('aria-label') || ''))
      if (t) {
        const b = t.closest('button, [role="button"]') || t
        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      }
    }); await sleep(2500)
    f = await waitFileInput(p, 8000)
  }
  if (!f) throw new Error('no file input (threads)')
  await f.uploadFile(c.mp4); await sleep(15000)
  await shot(p, 'threads-01')
  const posted = await clickPostButton(p, ['Post', 'نشر'], { waitEnabledMs: 60000, verifyMs: 20000 })
  if (!posted) throw new Error('post click not confirmed (threads)')
  await sleep(4000)
  await shot(p, 'threads-02'); return p.url()
}

async function postBS(br, c) {
  const p = await getOrOpenTab(br, 'https://bsky.app/')
  await sleep(6000); await shot(p, 'bluesky-00')
  // زرار الكتابة أيقونة قلم من غير نص — بالـaria-label
  await p.evaluate(() => {
    const btn = document.querySelector('[aria-label*="new post" i], [aria-label*="compose" i]')
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  }); await sleep(3000); await shot(p, 'bluesky-00b')
  const tb = await p.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await p.keyboard.type(c.caption.slice(0, 280)); await sleep(1500) }
  let f = await waitFileInput(p, 8000)
  if (!f) {
    // أيقونة الفيديو/الصور جوه الكومبوزر
    await p.evaluate(() => {
      const btn = document.querySelector('[aria-label*="video" i], [aria-label*="image" i], [aria-label*="media" i]')
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    }); await sleep(2500)
    f = await waitFileInput(p, 8000)
  }
  if (!f) throw new Error('no file input (bluesky)')
  await f.uploadFile(c.mp4); await sleep(20000)
  await shot(p, 'bluesky-01')
  const posted = await clickPostButton(p, ['Post'], { waitEnabledMs: 60000, verifyMs: 20000 })
  if (!posted) throw new Error('post click not confirmed (bluesky)')
  await sleep(3000)
  await shot(p, 'bluesky-02'); return p.url()
}

async function postPN(br, c) {
  const p = await getOrOpenTab(br, 'https://www.pinterest.com/pin-builder/')
  await sleep(6000); await shot(p, 'pinterest-00')
  const f = await waitFileInput(p, 15000); if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(25000); await shot(p, 'pinterest-01')
  const title = await p.$('input[placeholder*="title"i]')
  if (title) { await title.click(); await p.keyboard.type((c.title||'مضمونة').slice(0,100)); await sleep(1500) }
  const desc = await p.$('div[data-test-id="pin-draft-description"] div[contenteditable="true"]')
  if (desc) { await desc.click(); await p.keyboard.type(c.caption.slice(0,500)); await sleep(1500) }
  const posted = await clickPostButton(p, ['Publish', 'Save', 'حفظ'], { waitEnabledMs: 60000, verifyMs: 25000 })
  if (!posted) throw new Error('publish click not confirmed (pinterest)')
  await sleep(4000)
  await shot(p, 'pinterest-02'); return p.url()
}

async function postTG(c) {
  if (!c.videoUrl) return null
  const res = await fetch(`https://api.telegram.org/bot${BOT}/sendVideo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHANNEL, video: c.videoUrl, caption: c.caption, width: 1080, height: 1920, supports_streaming: true }),
  })
  const j = await res.json()
  if (!j.ok) throw new Error(JSON.stringify(j))
  return 'https://t.me/madmona_cairo/' + j.result.message_id
}

const PLATFORMS = [
  { key: 'telegram',  fn: postTG,      browser: false, timeoutMs: 60000 },
  { key: 'facebook',  fn: postFB,      browser: true,  cdp: PORT_A, timeoutMs: 240000 },
  { key: 'instagram', fn: postIG,      browser: true,  cdp: PORT_B, timeoutMs: 240000 },
  { key: 'twitter',   fn: postX,       browser: true,  cdp: PORT_B, timeoutMs: 360000 },
  { key: 'linkedin',  fn: postLI,      browser: true,  cdp: PORT_B, timeoutMs: 240000 },
  { key: 'youtube',   fn: postYT,      browser: true,  cdp: PORT_B, timeoutMs: 240000 },
  { key: 'tiktok',    fn: postTT,      browser: true,  cdp: PORT_B, timeoutMs: 240000 },
  { key: 'threads',   fn: postThreads, browser: true,  cdp: PORT_B, timeoutMs: 180000 },
  { key: 'bluesky',   fn: postBS,      browser: true,  cdp: PORT_B, timeoutMs: 180000 },
  { key: 'pinterest', fn: postPN,      browser: true,  cdp: PORT_B, timeoutMs: 180000 },
]

async function oneCycle() {
  console.log('\n════ ' + now() + ' — cycle ════')
  const clip = await readNext()
  console.log('[cycle] ' + (clip.slug||'local') + '  ' + clip.mp4)

  const browsers = {}
  const results = []
  for (const p of PLATFORMS) {
    console.log('\n--- ' + p.key.toUpperCase() + (p.cdp?'  ['+p.cdp+']':'') + ' ---')
    // قاعدة «مرة واحدة يوميًا لكل منصة» — لو المنصة دي خدت بوست النهارده نعدّيها
    if (await postedToday(p.key)) {
      console.log('[' + p.key + '] ⏭ اتنشر النهارده خلاص — سكيب')
      results.push({ platform: p.key, ok: true, skipped: true })
      continue
    }
    const t0 = Date.now()
    try {
      let br = null
      if (p.browser) {
        if (!browsers[p.cdp] || browsers[p.cdp].connected === false) {
          console.log('[cycle] connecting to ' + p.cdp)
          browsers[p.cdp] = await puppeteer.connect({ browserURL: p.cdp, defaultViewport: null, protocolTimeout: 300000 })
          await cleanupBrowser(browsers[p.cdp])
        }
        br = browsers[p.cdp]
      }
      // Bound every platform with a hard timeout so one genuinely stuck
      // page (e.g. TikTok's transcode step) can't hang the whole cycle —
      // it just gets marked failed and the loop moves on.
      const url = p.browser
        ? await withTimeout(p.fn(br, clip), p.timeoutMs || 240000, p.key)
        : await withTimeout(p.fn(clip), p.timeoutMs || 60000, p.key)
      console.log('[' + p.key + '] ✓ ' + (url||'ok') + '  (' + Math.round((Date.now()-t0)/1000) + 's)')
      setLocalFlag(p.key)
      await markUsed(clip, p.key, url)
      results.push({ platform: p.key, ok: true, url })
    } catch (e) {
      console.log('[' + p.key + '] ✗ ' + e.message.slice(0, 250))
      results.push({ platform: p.key, ok: false, error: e.message.slice(0, 200) })
      if (p.cdp && browsers[p.cdp] && browsers[p.cdp].connected === false) delete browsers[p.cdp]
    }
    await sleep(3000)
  }
  for (const b of Object.values(browsers)) { try { b.disconnect() } catch {} }
  await bumpClip(clip)

  console.log('\n═══ summary ═══')
  for (const r of results) console.log((r.ok?'✓':'✗') + ' ' + r.platform + '  ' + (r.skipped ? '(سكيب — اتنشر النهارده)' : (r.url||r.error||'')))
  return results
}

async function main() {
  console.log('[madmona-post] ' + PLATFORMS.length + ' platforms, ' + INTERVAL_MIN + 'min interval' + (process.env.ONE_SHOT ? ' (one-shot)' : ''))
  console.log('[madmona-post] Chrome A: ' + PORT_A + '   Chrome B: ' + PORT_B)
  while (true) {
    let results = []
    try { results = await oneCycle() || [] } catch (e) { console.error('[cycle] ERROR: ' + e.message) }
    if (process.env.ONE_SHOT) { console.log('[madmona-post] one-shot done'); process.exit(0) }
    const allDone = results.length === PLATFORMS.length && results.every(r => r.ok)
    console.log('\n[madmona-post] ' + (allDone ? 'كل المنصات خلصت النهارده — ' : '') + 'sleeping ' + INTERVAL_MIN + ' min…')
    await sleep(INTERVAL_MIN * 60 * 1000)
  }
}
main()
