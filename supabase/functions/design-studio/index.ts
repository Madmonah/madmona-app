// design-studio v3 (13 Jun 2026) — الشياكة per Mohamed: official LOGO + MASCOT (المارد default) embedded in every design.
// Assets fetched from Cloudinary (duxfgqioc) and inlined as base64 data URIs (librsvg-safe — external hrefs are blocked by wsrv).
// New param: mascot = genie|zizo|mero|hag|teta|none (default genie). Logo replaces the text wordmark (text fallback if fetch fails).
// v2: glass card + layered bg. v1: first version.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const CLD = 'https://res.cloudinary.com/duxfgqioc/image/upload'
const MASCOTS = ['genie', 'zizo', 'mero', 'hag', 'teta']
const B = {
  cream: '#FAFAF7', greenDark: '#1F6F5F', greenLight: '#2FA084',
  gold: '#d4a017', goldSoft: '#E8C766', ink: '#0F2E27', inkSoft: '#143D34'
}
const FONT = "'Cairo','Noto Sans Arabic','DejaVu Sans',sans-serif"

// module-level asset cache (base64 data URIs) — survives warm invocations
const assetCache = new Map<string, string>()
async function fetchAssetB64(url: string): Promise<string | null> {
  if (assetCache.has(url)) return assetCache.get(url)!
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const buf = new Uint8Array(await r.arrayBuffer())
    let bin = ''
    const CHUNK = 0x8000
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK))
    const dataUri = `data:image/png;base64,${btoa(bin)}`
    assetCache.set(url, dataUri)
    return dataUri
  } catch { return null }
}

function escapeXml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function sanitize(s: string): string {
  return (s || '')
    .replace(/م[دذظت]مون[ةاه]/g, 'مضمونة')
    .replace(/[اإأآa]حنا بتوع ال[إا]يجار/g, 'معاملاتك مضمونة')
    .replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com)\/?[^\s]*/gi, '')
    .trim()
}

function wrap(text: string, maxChars: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w }
    else cur = cur ? cur + ' ' + w : w
  }
  if (cur) lines.push(cur)
  return lines
}

function diamond(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${fill}" opacity="${opacity}" transform="rotate(45 ${cx} ${cy})"/>`
}

async function buildSVG(headline: string, subtext: string, cta: string, style: string, format: string, mascot: string): Promise<string> {
  const dims = format === 'story' ? { W: 1080, H: 1920 } : format === 'square' ? { W: 1080, H: 1080 } : { W: 1080, H: 1350 }
  const { W, H } = dims
  const dark = style !== 'light'
  const bgTop = dark ? B.greenDark : B.cream
  const bgBot = dark ? B.ink : '#EFEDE2'
  const txt = dark ? B.cream : B.inkSoft
  const cardFill = dark ? '#FFFFFF' : B.greenDark
  const cardOp = dark ? 0.07 : 0.05
  const cardStroke = dark ? B.gold : B.greenDark

  // assets
  const logoUri = await fetchAssetB64(`${CLD}/h_240,c_fit,f_png/madmona/logo-official.png`)
  const wantMascot = mascot !== 'none' && MASCOTS.includes(mascot)
  const mascotUri = wantMascot ? await fetchAssetB64(`${CLD}/h_700,c_fit,f_png/madmona/mascots/${mascot}.png`) : null

  // layout
  const cardX = 70, cardW = W - 140
  const headerH = logoUri ? 200 : 150
  const cardY = Math.round(headerH + H * 0.015)
  const cardH = Math.round(H * (format === 'story' ? 0.44 : 0.47))
  const hLines = wrap(headline, 16).slice(0, 3)
  const sLines = wrap(subtext, 30).slice(0, format === 'story' ? 8 : 6)
  const hSize = hLines.length === 1 ? 82 : hLines.length === 2 ? 68 : 56
  const hLineH = Math.round(hSize * 1.38)
  const contentH = 56 + hLines.length * hLineH + (sLines.length ? 46 + sLines.length * 52 : 0)
  const contentTop = cardY + Math.max(64, Math.round((cardH - contentH) / 2))
  const divY = contentTop
  const hStart = divY + 40 + hSize
  const sStart = hStart + (hLines.length - 1) * hLineH + 90
  const ctaY = cardY + cardH + Math.round(H * 0.05)
  const footY = H - Math.round(H * 0.075)

  // mascot geometry: bottom-left, overlapping card corner; CTA shifts right to make room
  const mH = Math.round(H * (format === 'story' ? 0.26 : 0.32))
  const mW = Math.round(mH * 0.78)
  const mX = -Math.round(mW * 0.10)
  const mY = footY - 40 - mH
  const ctaCX = mascotUri ? Math.min(W / 2 + 100, W - 300) : W / 2

  const headlineTexts = hLines.map((l, i) =>
    `<text x="${W / 2}" y="${hStart + i * hLineH}" font-family="${FONT}" font-size="${hSize}" font-weight="700" fill="${txt}" text-anchor="middle" direction="rtl">${escapeXml(l)}</text>`).join('\n')
  const subTexts = sLines.map((l, i) =>
    `<text x="${W / 2}" y="${sStart + i * 52}" font-family="${FONT}" font-size="33" fill="${txt}" fill-opacity="0.88" text-anchor="middle" direction="rtl">${escapeXml(l)}</text>`).join('\n')

  const header = logoUri
    ? `<image href="${logoUri}" x="${W / 2 - 110}" y="36" width="220" height="130" preserveAspectRatio="xMidYMid meet"/>`
    : `${diamond(W / 2 - 130, 96, 7, B.gold, 0.9)}${diamond(W / 2 + 130, 96, 7, B.gold, 0.9)}\n  <text x="${W / 2}" y="114" font-family="${FONT}" font-size="52" font-weight="700" fill="${B.gold}" text-anchor="middle" direction="rtl">مضمونة</text>`

  const mascotBlock = mascotUri ? `
  <ellipse cx="${mX + mW / 2}" cy="${mY + mH - 8}" rx="${Math.round(mW * 0.42)}" ry="22" fill="${dark ? '#000000' : B.inkSoft}" opacity="0.22"/>
  <circle cx="${mX + mW / 2}" cy="${mY + Math.round(mH * 0.45)}" r="${Math.round(mH * 0.50)}" fill="${B.goldSoft}" opacity="${dark ? 0.10 : 0.16}"/>
  <image href="${mascotUri}" x="${mX}" y="${mY}" width="${mW}" height="${mH}" preserveAspectRatio="xMidYMax meet"/>` : ''

  const ctaBlock = cta ? `
  <rect x="${ctaCX - 266}" y="${ctaY + 8}" width="532" height="96" rx="48" fill="${dark ? '#000000' : B.inkSoft}" opacity="0.25"/>
  <rect x="${ctaCX - 270}" y="${ctaY}" width="540" height="96" rx="48" fill="url(#ctaGrad)"/>
  <rect x="${ctaCX - 270}" y="${ctaY}" width="540" height="48" rx="24" fill="#FFFFFF" opacity="0.14"/>
  <text x="${ctaCX}" y="${ctaY + 62}" font-family="${FONT}" font-size="38" font-weight="700" fill="#FFFFFF" text-anchor="middle" direction="rtl">${escapeXml(cta)}</text>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBot}"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="20%" r="55%"><stop offset="0%" stop-color="${B.goldSoft}" stop-opacity="${dark ? 0.16 : 0.22}"/><stop offset="100%" stop-color="${B.goldSoft}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${B.gold}"/><stop offset="100%" stop-color="${B.greenLight}"/></linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${B.gold}"/><stop offset="100%" stop-color="${B.greenLight}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="${W + 60}" cy="-40" r="330" fill="none" stroke="url(#ringGrad)" stroke-width="2.5" opacity="0.35"/>
  <circle cx="${W + 60}" cy="-40" r="260" fill="none" stroke="${B.goldSoft}" stroke-width="1.5" opacity="0.25"/>
  <circle cx="-70" cy="${H + 40}" r="300" fill="none" stroke="url(#ringGrad)" stroke-width="2.5" opacity="0.30"/>
  <circle cx="${W - 130}" cy="${Math.round(H * 0.60)}" r="9" fill="${B.goldSoft}" opacity="0.5"/>
  <circle cx="120" cy="${Math.round(H * 0.28)}" r="6" fill="${B.greenLight}" opacity="0.55"/>

  ${header}

  <rect x="${cardX + 5}" y="${cardY + 7}" width="${cardW}" height="${cardH}" rx="40" fill="${dark ? '#000000' : B.inkSoft}" opacity="0.18"/>
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="40" fill="${cardFill}" fill-opacity="${cardOp}" stroke="${cardStroke}" stroke-opacity="0.45" stroke-width="1.5"/>
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${Math.round(cardH * 0.45)}" rx="40" fill="#FFFFFF" opacity="${dark ? 0.04 : 0.30}"/>

  <line x1="${W / 2 - 90}" y1="${divY}" x2="${W / 2 - 18}" y2="${divY}" stroke="${B.gold}" stroke-width="3" opacity="0.85"/>
  ${diamond(W / 2, divY, 8, B.gold)}
  <line x1="${W / 2 + 18}" y1="${divY}" x2="${W / 2 + 90}" y2="${divY}" stroke="${B.gold}" stroke-width="3" opacity="0.85"/>
${headlineTexts}
${subTexts}
${mascotBlock}
${ctaBlock}

  <line x1="${W / 2 - 200}" y1="${footY - 60}" x2="${W / 2 + 200}" y2="${footY - 60}" stroke="${B.gold}" stroke-width="1.5" opacity="0.5"/>
  <text x="${W / 2}" y="${footY}" font-family="${FONT}" font-size="44" font-weight="700" fill="${B.gold}" text-anchor="middle" direction="rtl">معاملاتك مضمونة</text>
  <text x="${W / 2}" y="${footY + 50}" font-family="'DejaVu Sans',sans-serif" font-size="25" letter-spacing="1" fill="${txt}" fill-opacity="0.8" text-anchor="middle">madmonacairo.com</text>
</svg>`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const body = await req.json().catch(() => ({}))
    const headline = sanitize(String(body.headline || 'مضمونة'))
    const subtext = sanitize(String(body.subtext || ''))
    const cta = sanitize(String(body.cta ?? 'ضيف الليستنج دلوقتي'))
    const style = body.style === 'light' ? 'light' : 'dark'
    const format = ['story', 'square', 'post'].includes(body.format) ? body.format : 'post'
    const mascot = body.mascot === 'none' ? 'none' : (MASCOTS.includes(body.mascot) ? body.mascot : 'genie')

    const svg = await buildSVG(headline, subtext, cta, style, format, mascot)
    const fileName = `design-studio/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.svg`
    const { error: upErr } = await sb.storage.from('content-images')
      .upload(fileName, new TextEncoder().encode(svg), { contentType: 'image/svg+xml', upsert: true })
    if (upErr) throw new Error('upload: ' + upErr.message)
    const { data: urlData } = sb.storage.from('content-images').getPublicUrl(fileName)
    const dims = format === 'story' ? 'w=1080&h=1920' : format === 'square' ? 'w=1080&h=1080' : 'w=1080&h=1350'
    const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(urlData.publicUrl)}&output=png&${dims}`
    return new Response(JSON.stringify({ ok: true, png_url: pngUrl, svg_url: urlData.publicUrl, format, style, mascot }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 250) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
