// generate-post-images v2 (13 Jun 2026) — CRITICAL BRAND FIX:
//  • removed dead slogan «احنا بتوع الإيجار» → «معاملاتك مضمونة» (May 24 brand kill — never resurrect)
//  • corrected brand colors (#1F6F5F/#2FA084/#d4a017/#FAFAF7), Arabic wordmark مضمونة
//  • foreignObject → <text> elements (librsvg ignores foreignObject; text was rendering BLANK before)
// v1: original SVG generator for social-pack-builder scheduled posts.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BRAND = { cream: '#FAFAF7', greenDark: '#1F6F5F', greenLight: '#2FA084', gold: '#d4a017', ink: '#143D34' }
const FONT = "'Cairo','Noto Sans Arabic','DejaVu Sans',sans-serif"

function sanitize(s: string): string {
  return (s || '')
    .replace(/م[دذظت]مون[ةاه]/g, 'مضمونة')
    .replace(/[اإأآa]حنا بتوع ال[إا]يجار/g, 'معاملاتك مضمونة')
    .replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com)\/?[^\s]*/gi, '')
    .trim()
}

function wrapText(text: string, maxChars: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) { if (current) lines.push(current); current = word }
    else current = current ? current + ' ' + word : word
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildPostSVG(titleRaw: string, bodyRaw: string): string {
  const W = 1080, H = 1350
  const title = sanitize(titleRaw)
  const body = sanitize(bodyRaw)
  const titleLines = wrapText(title, 20).slice(0, 3)
  const bodyLines = wrapText(body, 36).slice(0, 9)
  const tSize = titleLines.length <= 2 ? 62 : 52
  const tStart = 280
  const tLineH = tSize * 1.4
  const bStart = tStart + titleLines.length * tLineH + 80
  const titleTexts = titleLines.map((l, i) =>
    `<text x="${W / 2}" y="${tStart + i * tLineH}" font-family="${FONT}" font-size="${tSize}" font-weight="700" fill="${BRAND.cream}" text-anchor="middle" direction="rtl">${escapeXml(l)}</text>`).join('\n')
  const bodyTexts = bodyLines.map((l, i) =>
    `<text x="${W / 2}" y="${bStart + i * 50}" font-family="${FONT}" font-size="31" fill="${BRAND.cream}" fill-opacity="0.93" text-anchor="middle" direction="rtl">${escapeXml(l)}</text>`).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${BRAND.greenDark}"/><stop offset="100%" stop-color="${BRAND.ink}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 100}" cy="100" r="200" fill="${BRAND.gold}" opacity="0.08"/>
  <circle cx="100" cy="${H - 100}" r="150" fill="${BRAND.greenLight}" opacity="0.10"/>
  <text x="${W / 2}" y="110" font-family="${FONT}" font-size="44" font-weight="700" fill="${BRAND.gold}" text-anchor="middle" direction="rtl">مضمونة</text>
  <line x1="${W / 2 - 80}" y1="145" x2="${W / 2 + 80}" y2="145" stroke="${BRAND.gold}" stroke-width="3" opacity="0.7"/>
${titleTexts}
${bodyTexts}
  <rect x="0" y="${H - 160}" width="${W}" height="160" fill="${BRAND.gold}" opacity="0.15"/>
  <text x="${W / 2}" y="${H - 90}" font-family="${FONT}" font-size="44" font-weight="700" fill="${BRAND.gold}" text-anchor="middle" direction="rtl">معاملاتك مضمونة</text>
  <text x="${W / 2}" y="${H - 38}" font-family="'DejaVu Sans',sans-serif" font-size="24" fill="${BRAND.cream}" fill-opacity="0.85" text-anchor="middle">madmonacairo.com</text>
</svg>`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  try {
    const { data: posts } = await supabase
      .from('content_calendar')
      .select('id, title, body')
      .eq('agent_name', 'social-pack-builder')
      .eq('status', 'scheduled')
      .order('created_at', { ascending: true })

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: 'no scheduled posts' }), { headers: { 'content-type': 'application/json' } })
    }

    const results: Array<{ id: string; ok: boolean; image_url?: string; error?: string }> = []

    for (const post of posts as { id: string; title: string; body: string }[]) {
      try {
        const bodyPreview = (post.body || '').split('\n')[0].slice(0, 200)
        const svg = buildPostSVG(post.title, bodyPreview)
        const fileName = `social-pack/${post.id}.svg`
        const { error: uploadErr } = await supabase.storage
          .from('content-images')
          .upload(fileName, new TextEncoder().encode(svg), { contentType: 'image/svg+xml', upsert: true })
        if (uploadErr) { results.push({ id: post.id, ok: false, error: `upload: ${uploadErr.message}` }); continue }
        const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(fileName)
        const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(urlData.publicUrl)}&output=png&w=1080&h=1350`
        await supabase.from('content_calendar')
          .update({ image_url: pngUrl, image_source: 'generated-brand-svg' })
          .eq('id', post.id)
        results.push({ id: post.id, ok: true, image_url: pngUrl })
      } catch (e) {
        results.push({ id: post.id, ok: false, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      sample_image_url: results.find((r) => r.ok)?.image_url,
    }, null, 2), { headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 })
  }
})
