// cycle-all.js v3 — puppeteer, wait-for-input, reconnect on drop, diagnostic screenshots
const puppeteer = require('puppeteer-core')
const fs = require('fs'), path = require('path')

const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 20)
const PORT_A = process.env.CDP_URL_A || 'http://localhost:9222'
const PORT_B = process.env.CDP_URL_B || 'http://localhost:9223'
const SUPA = 'https://mjhflxpxunwycbiquoig.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
const BOT = '8731129863:AAFGr152JDqX0_mtnMv3e9BtIlYouy5SRX4'
const TG_CHANNEL = '@madmona_cairo'
const DIAG = path.join(__dirname, 'diag')

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function shot(page, tag) {
  const dir = path.join(DIAG, tag); fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, Date.now() + '.png') }).catch(() => {})
}

// Wait for file input to appear (polling) — up to timeout ms
async function waitFileInput(page, timeout = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const inputs = await page.$$('input[type="file"]')
    if (inputs.length) return inputs[0]
    await sleep(500)
  }
  return null
}

async function readNext() {
  const local = process.env.MP4_PATH
  if (local) return { mp4: local, caption: process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com', videoUrl: null }
  const res = await fetch(SUPA + '/rest/v1/design_clips?select=id,slug,video_url,caption_text,title&active=eq.true&order=last_used_at.asc.nullsfirst,times_used.asc&limit=1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  const [c] = await res.json()
  if (!c) throw new Error('no active clips')
  const os = require('os'), mp4 = path.join(os.tmpdir(), 'reel-' + c.slug + '.mp4')
  fs.writeFileSync(mp4, Buffer.from(await (await fetch(c.video_url)).arrayBuffer()))
  return { id: c.id, slug: c.slug, title: c.title, mp4, caption: c.caption_text, videoUrl: c.video_url }
}
async function markUsed(clip, platform, url) {
  await fetch(SUPA + '/rest/v1/design_clip_posts', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ clip_id: clip.id, platform, target_url: url || '' }) }).catch(() => {})
}
async function bumpClip(clip) {
  const r = await fetch(SUPA + `/rest/v1/design_clips?select=times_used&id=eq.${clip.id}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
  const [{ times_used }] = await r.json()
  await fetch(SUPA + '/rest/v1/design_clips?id=eq.' + clip.id, { method: 'PATCH', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ last_used_at: new Date().toISOString(), times_used: times_used + 1 }) }).catch(() => {})
}

async function clickText(page, texts) {
  for (const t of (Array.isArray(texts) ? texts : [texts])) {
    const el = await page.evaluateHandle((needle) => {
      const nodes = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], a, [role="menuitem"]'))
      return nodes.find(n => n.innerText && n.innerText.trim() === needle) || null
    }, t)
    const h = el.asElement()
    if (h) { await h.click().catch(() => {}); return true }
  }
  return false
}

// ─── POSTERS ─────────────────────────────────────────────────────────────
async function postFB(browser, clip) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 900 })
  await page.bringToFront()
  await page.goto('https://www.facebook.com/reel/create/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(6000)
  await shot(page, 'facebook-00-landing')
  // Sometimes FB shows "Add video" button first
  await clickText(page, ['Add video', 'Upload', 'رفع', 'إضافة فيديو']); await sleep(2000)
  const input = await waitFileInput(page, 20000)
  if (!input) throw new Error('no file input after 20s')
  await input.uploadFile(clip.mp4); await sleep(25000)
  await shot(page, 'facebook-01-uploaded')
  for (let i = 0; i < 3; i++) { if (!await clickText(page, ['Next', 'التالي'])) break; await sleep(3500) }
  const cap = await page.$('div[contenteditable="true"]')
  if (cap) { await cap.click(); await page.keyboard.type(clip.caption); await sleep(2000) }
  await clickText(page, ['Publish', 'Share', 'نشر']); await sleep(12000)
  await shot(page, 'facebook-02-final')
  const url = page.url(); await page.close(); return url
}

async function postIG(browser, clip) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  await page.bringToFront()
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(5000)
  await shot(page, 'instagram-00-home')
  // Click on Create button — SVG with aria-label
  const created = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="New post"], svg[aria-label*="Create"], svg[aria-label*="إنشاء"]')
    if (svg) {
      let el = svg
      while (el && el.tagName !== 'A' && el.tagName !== 'BUTTON' && !el.getAttribute('role')) el = el.parentElement
      if (el) el.click(); else svg.click()
      return true
    }
    return false
  })
  if (!created) console.log('[ig] no create button — trying direct URL')
  await sleep(3000)
  await shot(page, 'instagram-01-menu')
  // Pick "Post" or "Reel" from popover
  await clickText(page, ['Post', 'Reel', 'ريل', 'منشور']); await sleep(2000)
  const input = await waitFileInput(page, 20000)
  if (!input) { await shot(page, 'instagram-02-no-input'); throw new Error('no file input') }
  await input.uploadFile(clip.mp4); await sleep(25000)
  await shot(page, 'instagram-03-uploaded')
  for (let i = 0; i < 3; i++) { if (!await clickText(page, ['Next', 'التالي'])) break; await sleep(3500) }
  const cap = await page.$('div[contenteditable="true"][aria-label*="caption" i], div[contenteditable="true"]')
  if (cap) { await cap.click(); await page.keyboard.type(clip.caption); await sleep(2000) }
  await clickText(page, ['Share', 'نشر']); await sleep(12000)
  await shot(page, 'instagram-04-final')
  const url = page.url(); await page.close(); return url
}

async function postX(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(5000)
  await shot(page, 'twitter-00')
  const tb = await page.$('div[role="textbox"]')
  if (tb) { await tb.click(); await page.keyboard.type(clip.caption.slice(0, 260)); await sleep(1500) }
  const input = await waitFileInput(page, 10000)
  if (!input) throw new Error('no file input')
  await input.uploadFile(clip.mp4); await sleep(20000)
  await shot(page, 'twitter-01-uploaded')
  const post = await page.$('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]')
  if (post) { await post.click().catch(() => {}); await sleep(8000) }
  await shot(page, 'twitter-02-final')
  const url = page.url(); await page.close(); return url
}

async function postLI(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(4000)
  await shot(page, 'linkedin-00-feed')
  await clickText(page, ['Start a post', 'ابدأ منشورا']); await sleep(3000)
  await shot(page, 'linkedin-01-modal')
  // Video button in the modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const b = btns.find(x => (x.getAttribute('aria-label') || '').toLowerCase().includes('video') || x.innerText.trim().toLowerCase() === 'video')
    if (b) b.click()
  })
  await sleep(3000)
  const input = await waitFileInput(page, 15000)
  if (!input) throw new Error('no file input')
  await input.uploadFile(clip.mp4); await sleep(25000)
  await shot(page, 'linkedin-02-uploaded')
  await clickText(page, ['Done', 'Next']); await sleep(3000)
  const cap = await page.$('div[role="textbox"], div[contenteditable="true"]')
  if (cap) { await cap.click(); await page.keyboard.type(clip.caption); await sleep(2000) }
  await clickText(page, ['Post']); await sleep(10000)
  await shot(page, 'linkedin-03-final')
  const url = page.url(); await page.close(); return url
}

async function postYT(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  // Use studio directly — lighter than /upload redirect
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(6000)
  await shot(page, 'youtube-00-studio')
  // Click CREATE button top right
  await page.evaluate(() => {
    const btn = document.querySelector('ytcp-button#create-icon, button[aria-label*="Create"]')
    if (btn) btn.click()
  })
  await sleep(2500)
  await clickText(page, ['Upload videos', 'Upload video', 'رفع فيديو']); await sleep(3000)
  const input = await waitFileInput(page, 20000)
  if (!input) throw new Error('no file input')
  await input.uploadFile(clip.mp4); await sleep(30000)
  await shot(page, 'youtube-01-uploaded')
  // Not for kids
  const nk = await page.$('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]')
  if (nk) await nk.click().catch(() => {})
  for (let i = 0; i < 3; i++) {
    const nx = await page.$('#next-button button, ytcp-button#next-button')
    if (!nx) break
    await nx.click().catch(() => {}); await sleep(3000)
  }
  const pub = await page.$('tp-yt-paper-radio-button[name="PUBLIC"]'); if (pub) await pub.click().catch(() => {})
  const done = await page.$('ytcp-button#done-button')
  if (done) { await done.click().catch(() => {}); await sleep(10000) }
  await shot(page, 'youtube-02-final')
  const url = page.url(); await page.close(); return url
}

async function postTT(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(6000)
  await shot(page, 'tiktok-00')
  const input = await waitFileInput(page, 15000)
  if (!input) throw new Error('no file input')
  await input.uploadFile(clip.mp4); await sleep(30000)
  await shot(page, 'tiktok-01-uploaded')
  const cap = await page.$('div[contenteditable="true"]')
  if (cap) { await cap.click(); await page.keyboard.type(clip.caption.slice(0, 300)); await sleep(1500) }
  await clickText(page, ['Post', 'نشر']); await sleep(15000)
  await shot(page, 'tiktok-02-final')
  const url = page.url(); await page.close(); return url
}

async function postThreads(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(5000)
  await shot(page, 'threads-00')
  await clickText(page, ['New thread', 'Post', 'Create', 'إنشاء']); await sleep(2500)
  const tb = await page.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await page.keyboard.type(clip.caption.slice(0, 500)); await sleep(1500) }
  const input = await waitFileInput(page, 10000)
  if (input) { await input.uploadFile(clip.mp4); await sleep(15000) }
  await shot(page, 'threads-01-uploaded')
  await clickText(page, ['Post', 'نشر']); await sleep(8000)
  await shot(page, 'threads-02-final')
  const url = page.url(); await page.close(); return url
}

async function postBS(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://bsky.app/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(5000)
  await shot(page, 'bluesky-00')
  await clickText(page, ['New post', 'Compose', 'Post']); await sleep(2500)
  const tb = await page.$('div[contenteditable="true"]')
  if (tb) { await tb.click(); await page.keyboard.type(clip.caption.slice(0, 280)); await sleep(1500) }
  const input = await waitFileInput(page, 10000)
  if (input) { await input.uploadFile(clip.mp4); await sleep(20000) }
  await shot(page, 'bluesky-01-uploaded')
  await clickText(page, ['Post']); await sleep(8000)
  await shot(page, 'bluesky-02-final')
  const url = page.url(); await page.close(); return url
}

async function postPN(browser, clip) {
  const page = await browser.newPage(); await page.bringToFront()
  await page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(6000)
  await shot(page, 'pinterest-00')
  const input = await waitFileInput(page, 15000)
  if (!input) throw new Error('no file input')
  await input.uploadFile(clip.mp4); await sleep(25000)
  await shot(page, 'pinterest-01-uploaded')
  const title = await page.$('input[placeholder*="title"i]')
  if (title) { await title.click(); await page.keyboard.type((clip.title || 'مضمونة').slice(0, 100)); await sleep(1500) }
  const desc = await page.$('div[data-test-id="pin-draft-description"] div[contenteditable="true"]')
  if (desc) { await desc.click(); await page.keyboard.type(clip.caption.slice(0, 500)); await sleep(1500) }
  await clickText(page, ['Publish', 'Save']); await sleep(10000)
  await shot(page, 'pinterest-02-final')
  const url = page.url(); await page.close(); return url
}

async function postTG(clip) {
  if (!clip.videoUrl) return null
  const res = await fetch(`https://api.telegram.org/bot${BOT}/sendVideo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHANNEL, video: clip.videoUrl, caption: clip.caption, width: 1080, height: 1920, supports_streaming: true }),
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

async function connectFresh(cdp) {
  console.log('[cycle] connecting to ' + cdp + '…')
  return puppeteer.connect({ browserURL: cdp, defaultViewport: null })
}

async function oneCycle() {
  console.log('\n════ ' + new Date().toISOString() + ' — cycle ════')
  const clip = await readNext()
  console.log('[cycle] ' + (clip.slug || 'local') + '  ' + clip.mp4)

  const browsers = {}
  const results = []
  for (const p of PLATFORMS) {
    console.log('\n--- ' + p.key.toUpperCase() + (p.cdp ? '  [' + p.cdp + ']' : '') + ' ---')
    const t0 = Date.now()
    try {
      let br = null
      if (p.browser) {
        // Reconnect fresh if not present or previously closed
        if (!browsers[p.cdp] || !browsers[p.cdp].isConnected()) {
          browsers[p.cdp] = await connectFresh(p.cdp)
        }
        br = browsers[p.cdp]
      }
      const url = p.browser ? await p.fn(br, clip) : await p.fn(clip)
      console.log('[' + p.key + '] ✓ ' + (url || 'ok') + '  (' + Math.round((Date.now()-t0)/1000) + 's)')
      if (clip.id) await markUsed(clip, p.key, url)
      results.push({ platform: p.key, ok: true, url })
    } catch (e) {
      console.log('[' + p.key + '] ✗ ' + e.message.slice(0, 250))
      results.push({ platform: p.key, ok: false, error: e.message.slice(0, 200) })
      // If browser died, mark it for reconnect
      if (p.cdp && browsers[p.cdp] && !browsers[p.cdp].isConnected()) {
        console.log('[cycle] browser on ' + p.cdp + ' disconnected — will reconnect on next platform')
        delete browsers[p.cdp]
      }
    }
    await sleep(3000)
  }
  for (const b of Object.values(browsers)) { try { b.disconnect() } catch {} }
  if (clip.id) await bumpClip(clip)

  console.log('\n═══ summary ═══')
  for (const r of results) console.log((r.ok ? '✓' : '✗') + ' ' + r.platform + '  ' + (r.url || r.error || ''))
}

async function main() {
  console.log('[cycle-all v3] ' + PLATFORMS.length + ' platforms, ' + INTERVAL_MIN + 'min interval')
  while (true) {
    try { await oneCycle() } catch (e) { console.error('[cycle] ERROR: ' + e.message) }
    console.log('\n[cycle-all v3] sleeping ' + INTERVAL_MIN + ' min…')
    await sleep(INTERVAL_MIN * 60 * 1000)
  }
}
main()
