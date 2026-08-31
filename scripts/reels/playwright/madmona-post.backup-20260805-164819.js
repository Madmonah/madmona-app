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
const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 20)
const SUPA = 'https://mjhflxpxunwycbiquoig.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
const BOT = '8731129863:AAFGr152JDqX0_mtnMv3e9BtIlYouy5SRX4'
const TG_CHANNEL = '@madmona_cairo'
const DIAG = path.join(__dirname, 'diag')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const now = () => new Date().toISOString()

async function shot(page, tag) {
  const dir = path.join(DIAG, tag); fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, Date.now() + '.png') }).catch(() => {})
}

// Reuse tab on same host but FORCE-navigate to target URL every time.
// (Previously kept old URL, so /reels/ tab would be reused when we wanted /)
async function getOrOpenTab(browser, url) {
  const host = new URL(url).hostname
  const pages = await browser.pages()
  for (const p of pages) {
    try {
      const u = p.url()
      if (u && u.includes(host)) {
        await p.bringToFront()
        if (u !== url) { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }) }
        return p
      }
    } catch {}
  }
  for (const p of pages) {
    const u = p.url()
    if (!u || u === 'about:blank' || u.startsWith('chrome://new-tab-page')) {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await p.bringToFront()
      return p
    }
  }
  const p = await browser.newPage()
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.bringToFront()
  return p
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

// ─── SUPABASE ────────────────────────────────────────────────────────────
async function readNext() {
  const local = process.env.MP4_PATH
  if (local) return { mp4: local, caption: process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com', videoUrl: null }
  const res = await fetch(SUPA + '/rest/v1/design_clips?select=id,slug,video_url,caption_text,title&active=eq.true&order=last_used_at.asc.nullsfirst,times_used.asc&limit=1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  const [c] = await res.json()
  if (!c) throw new Error('no active clips')
  const mp4 = path.join(os.tmpdir(), 'reel-' + c.slug + '.mp4')
  fs.writeFileSync(mp4, Buffer.from(await (await fetch(c.video_url)).arrayBuffer()))
  return { id: c.id, slug: c.slug, title: c.title, mp4, caption: c.caption_text, videoUrl: c.video_url }
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
  await clickText(p, ['Post', 'Publish', 'Share', 'نشر']); await sleep(15000)
  await shot(p, 'facebook-02'); return p.url()
}

async function postIG(br, c) {
  const p = await getOrOpenTab(br, 'https://www.instagram.com/')
  await sleep(5000); await shot(p, 'instagram-00')
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
  await clickText(p, ['Share', 'نشر']); await sleep(12000)
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
  await f.uploadFile(c.mp4); await sleep(20000); await shot(p, 'twitter-01')
  const post = await p.$('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]')
  if (post) { await post.click().catch(() => {}); await sleep(8000) }
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
    // Approach 1: SVG icons
    const svgs = document.querySelectorAll('svg[data-test-icon="image-medium"], svg[data-test-icon="videocamera-medium"], li-icon[type="image"], li-icon[type="videocamera"]')
    for (const svg of svgs) {
      let el = svg
      while (el && el.tagName !== 'BUTTON') el = el.parentElement
      if (el) { el.click(); return }
    }
    // Approach 2: any button with icon-only that comes before the schedule/plus buttons
    const btns = Array.from(document.querySelectorAll('.share-creation-state__additional-toolbar button, [data-artdeco-is-focused] button'))
    if (btns.length) { btns[0].click(); return }
    // Approach 3: any button in the modal with aria-label containing photo/image/video
    const all = Array.from(document.querySelectorAll('button'))
    const media = all.find(x => {
      const a = (x.getAttribute('aria-label')||'').toLowerCase()
      return a.includes('add') || a.includes('media') || a.includes('photo') || a.includes('image') || a.includes('video')
    })
    if (media) media.click()
  }); await sleep(3000); await shot(p, 'linkedin-01b')
  const f = await waitFileInput(p, 15000); if (!f) throw new Error('no file input')
  await f.uploadFile(c.mp4); await sleep(25000); await shot(p, 'linkedin-02')
  await clickText(p, ['Done', 'Next']); await sleep(3000)
  const cap = await p.$('div[role="textbox"], div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption); await sleep(2000) }
  await clickText(p, ['Post']); await sleep(10000)
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
  if (done) { await done.click().catch(() => {}); await sleep(10000) }
  await shot(p, 'youtube-02'); return p.url()
}

async function postTT(br, c) {
  const p = await getOrOpenTab(br, 'https://www.tiktok.com/upload')
  await sleep(8000); await shot(p, 'tiktok-00')
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
  await f.uploadFile(c.mp4); await sleep(30000); await shot(p, 'tiktok-01')
  // Caption
  const cap = await p.$('div[contenteditable="true"]')
  if (cap) { await cap.click(); await p.keyboard.type(c.caption.slice(0, 300)); await sleep(1500) }
  await clickText(p, ['Post', 'نشر']); await sleep(15000)
  await shot(p, 'tiktok-02'); return p.url()
}

async function postThreads(br, c) {
  const p = await getOrOpenTab(br, 'https://www.threads.net/')
  await sleep(5000); await shot(p, 'threads-00')
  await clickText(p, ['New thread', 'Post', 'Create', 'إنشاء']); await sleep(2500)
  const tb = await p.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await p.keyboard.type(c.caption.slice(0, 500)); await sleep(1500) }
  const f = await waitFileInput(p, 10000)
  if (f) { await f.uploadFile(c.mp4); await sleep(15000) }
  await shot(p, 'threads-01')
  await clickText(p, ['Post', 'نشر']); await sleep(8000)
  await shot(p, 'threads-02'); return p.url()
}

async function postBS(br, c) {
  const p = await getOrOpenTab(br, 'https://bsky.app/')
  await sleep(5000); await shot(p, 'bluesky-00')
  await clickText(p, ['New post', 'Compose', 'Post']); await sleep(2500)
  const tb = await p.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await p.keyboard.type(c.caption.slice(0, 280)); await sleep(1500) }
  const f = await waitFileInput(p, 10000)
  if (f) { await f.uploadFile(c.mp4); await sleep(20000) }
  await shot(p, 'bluesky-01')
  await clickText(p, ['Post']); await sleep(8000)
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
  await clickText(p, ['Publish', 'Save']); await sleep(10000)
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
  { key: 'telegram',  fn: postTG,      browser: false },
  { key: 'facebook',  fn: postFB,      browser: true,  cdp: PORT_A },
  { key: 'instagram', fn: postIG,      browser: true,  cdp: PORT_B },
  { key: 'twitter',   fn: postX,       browser: true,  cdp: PORT_B },
  { key: 'linkedin',  fn: postLI,      browser: true,  cdp: PORT_B },
  { key: 'youtube',   fn: postYT,      browser: true,  cdp: PORT_B },
  { key: 'tiktok',    fn: postTT,      browser: true,  cdp: PORT_B },
  { key: 'threads',   fn: postThreads, browser: true,  cdp: PORT_B },
  { key: 'bluesky',   fn: postBS,      browser: true,  cdp: PORT_B },
  { key: 'pinterest', fn: postPN,      browser: true,  cdp: PORT_B },
]

async function oneCycle() {
  console.log('\n════ ' + now() + ' — cycle ════')
  const clip = await readNext()
  console.log('[cycle] ' + (clip.slug||'local') + '  ' + clip.mp4)

  const browsers = {}
  const results = []
  for (const p of PLATFORMS) {
    console.log('\n--- ' + p.key.toUpperCase() + (p.cdp?'  ['+p.cdp+']':'') + ' ---')
    const t0 = Date.now()
    try {
      let br = null
      if (p.browser) {
        if (!browsers[p.cdp] || browsers[p.cdp].connected === false) {
          console.log('[cycle] connecting to ' + p.cdp)
          browsers[p.cdp] = await puppeteer.connect({ browserURL: p.cdp, defaultViewport: null })
        }
        br = browsers[p.cdp]
      }
      const url = p.browser ? await p.fn(br, clip) : await p.fn(clip)
      console.log('[' + p.key + '] ✓ ' + (url||'ok') + '  (' + Math.round((Date.now()-t0)/1000) + 's)')
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
  for (const r of results) console.log((r.ok?'✓':'✗') + ' ' + r.platform + '  ' + (r.url||r.error||''))
}

async function main() {
  console.log('[madmona-post] ' + PLATFORMS.length + ' platforms, ' + INTERVAL_MIN + 'min interval')
  console.log('[madmona-post] Chrome A: ' + PORT_A + '   Chrome B: ' + PORT_B)
  while (true) {
    try { await oneCycle() } catch (e) { console.error('[cycle] ERROR: ' + e.message) }
    console.log('\n[madmona-post] sleeping ' + INTERVAL_MIN + ' min…')
    await sleep(INTERVAL_MIN * 60 * 1000)
  }
}
main()
