// src/app/api/admin/campaign-posts/route.ts
// ============================================================================
// 📣 سجل منشورات الحملات الأورجانيك (٧ سبتمبر ٢٠٢٦) — تحت /api/admin/* (كوكي اللوحة).
//    محمد: «عايز أتابع الحملات». كل ريل/بوست اتنشر = صف في campaign_posts (المنصة ·
//    الرابط · التاريخ)، والأرقام (مشاهدات · لايكات · تعليقات · شير) بتتكتب يدوي من
//    الداشبورد — المنصات مابتديناش API للأورجانيك، وممنوع نخترع رقم.
//    GET → آخر ١٠٠ منشور (الأحدث أول) + مجاميع لكل حملة.
//    POST {id, views, likes, comments, shares, url, notes} → تحديث أرقام/رابط منشور.
//    PUT  {campaign, platform, url, title, reel_slug, published_at} → إضافة منشور جديد.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as admin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'youtube', 'threads', 'linkedin', 'x', 'whatsapp', 'other']

type Post = { id: string; campaign: string; platform: string; url: string | null; title: string | null; reel_slug: string | null
  published_at: string; views: number | null; likes: number | null; comments: number | null; shares: number | null; metrics_at: string | null; notes: string | null }

export async function GET() {
  const { data, error } = await admin
    .from('campaign_posts')
    .select('id, campaign, platform, url, title, reel_slug, published_at, views, likes, comments, shares, metrics_at, notes')
    .order('published_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const posts = (data as Post[] | null) ?? []
  const totals: Record<string, { posts: number; views: number; likes: number; comments: number }> = {}
  for (const p of posts) {
    const t = (totals[p.campaign] ||= { posts: 0, views: 0, likes: 0, comments: 0 })
    t.posts++; t.views += p.views ?? 0; t.likes += p.likes ?? 0; t.comments += p.comments ?? 0
  }
  return NextResponse.json({ ok: true, posts, totals })
}

const num = (v: unknown) => (v === '' || v == null ? null : Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  let touchedMetrics = false
  for (const k of ['views', 'likes', 'comments', 'shares'] as const) {
    if (k in body) { patch[k] = num(body[k]); touchedMetrics = true }
  }
  if (touchedMetrics) patch.metrics_at = new Date().toISOString()
  if (typeof body.url === 'string') patch.url = body.url.slice(0, 500) || null
  if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 500) || null
  const { error } = await admin.from('campaign_posts').update(patch).eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const campaign = String(body.campaign || '').trim().slice(0, 40)
  const platform = String(body.platform || '')
  if (!campaign || !PLATFORMS.includes(platform)) return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  const row = {
    campaign, platform,
    url: typeof body.url === 'string' ? body.url.slice(0, 500) || null : null,
    title: typeof body.title === 'string' ? body.title.slice(0, 200) || null : null,
    reel_slug: typeof body.reel_slug === 'string' ? body.reel_slug.slice(0, 80) || null : null,
    published_at: typeof body.published_at === 'string' && !Number.isNaN(Date.parse(body.published_at)) ? body.published_at : new Date().toISOString(),
  }
  const { data, error } = await admin.from('campaign_posts').insert(row).select('id').single()
  return NextResponse.json({ ok: !error, id: (data as { id?: string } | null)?.id, error: error?.message })
}
