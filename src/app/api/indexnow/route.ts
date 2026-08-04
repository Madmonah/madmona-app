import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// IndexNow: إخطار فوري لمحركات البحث (Bing/Yandex/Seznam..) بكل صفحاتنا
// GET /api/indexnow → يجمع كل اللينكات (إعلانات + صفحات pSEO) ويبعتها دفعة واحدة
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOST = 'madmonacairo.com'
const SITE = `https://${HOST}`
const KEY = '8f4a2d7c1e9b4356a0d8e2f7c4b1a693'

export async function GET() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const urls = new Set<string>([SITE, `${SITE}/marketplace`, `${SITE}/browse`])
  try {
    const [{ data: listings }, { data: combos }] = await Promise.all([
      db.from('listings').select('slug').eq('status', 'published').limit(10000),
      db.rpc('seo_combos'),
    ])
    for (const l of listings || []) if (l?.slug) urls.add(`${SITE}/marketplace/${l.slug}`)
    for (const c of (Array.isArray(combos) ? combos : []) as any[]) {
      if (c?.cat && c?.city) urls.add(`${SITE}/browse/${encodeURIComponent(c.cat)}/${encodeURIComponent(String(c.city).trim())}`)
    }
  } catch {}
  const urlList = Array.from(urls).slice(0, 10000)
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  })
  return NextResponse.json({ ok: res.ok, engine_status: res.status, submitted: urlList.length })
}
