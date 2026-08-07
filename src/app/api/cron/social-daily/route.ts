// src/app/api/cron/social-daily/route.ts
// ============================================================================
// 📅 محتوى القناة اليومي — إعلانات ومشاريع حقيقية بالتناوب
//
// (٧ أغسطس ٢٠٢٦ — محمد: «الاسكدجوال بيعيد نفس الريل كل مرة، عايزه يبعت صور
//  إعلانات أو مشاريع حقيقية أو حتى تكست، والريل مرة واحدة بس في اليوم»)
//
// المشكلة: سكريبت الباورشيل المحلي بيشتغل كل 45 دقيقة وعنده **كليبين بس**،
// فأي حاجة بينشرها بتبقى نفس الفيديو. الحل مش إننا نخلي الريل أذكى — الحل
// إن الريل يفضل **مرة واحدة في اليوم** (متحقق بحارس postedToday في السكريبت
// المحلي)، وباقي اليوم ينزل **محتوى حقيقي من الداتا**: 304 إعلان بصور
// و140 مشروع.
//
// بينشر بالتناوب: مشروع → إعلان، وبيعدّي أي حاجة اتنشرت قبل كده
// (`telegram_channel_posts`) فمفيش تكرار.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const CHANNEL = process.env.TELEGRAM_CHANNEL || '@madmona_cairo'
const SITE = 'https://www.madmonacairo.com'

interface ProjectRow {
  id: string
  title: string | null
  area: string | null
  city: string | null
  developer: string | null
  price_from: number | null
  cover_url: string | null
}

interface ListingRow {
  id: string
  title: string | null
  city: string | null
  district: string | null
  price_egp: number | null
  price_on_request: boolean | null
}

async function botToken(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN
  const { data } = await supabaseUntyped
    .from('whatsapp_config')
    .select('value')
    .eq('key', 'telegram_bot_token')
    .maybeSingle()
  return (data as { value?: string } | null)?.value ?? null
}

function money(v: number | null): string {
  if (!v) return 'السعر عند الطلب'
  return new Intl.NumberFormat('ar-EG').format(v) + ' جنيه'
}

async function sendPhoto(token: string, photo: string, caption: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHANNEL, photo, caption, parse_mode: 'HTML' }),
  })
  return (await r.json()) as {
    ok?: boolean
    result?: { message_id?: number }
    description?: string
  }
}

async function alreadyPosted(): Promise<Set<string>> {
  const { data } = await supabaseUntyped.from('telegram_channel_posts').select('listing_id')
  const rows = (data ?? []) as Array<{ listing_id: string | null }>
  return new Set(rows.map((r) => r.listing_id).filter((x): x is string => !!x))
}

async function markPosted(id: string, messageId: number | null) {
  await supabaseUntyped
    .from('telegram_channel_posts')
    .insert({ listing_id: id, message_id: messageId })
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = request.headers.get('x-madmona-secret')
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET
  if (!isCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const token = await botToken()
  if (!token) return NextResponse.json({ ok: false, error: 'مفيش توكن تليجرام' })

  const used = await alreadyPosted()
  const preferProject = Math.floor(Date.now() / 86400000) % 2 === 1
  const order: Array<'project' | 'listing'> = preferProject
    ? ['project', 'listing']
    : ['listing', 'project']

  for (const kind of order) {
    if (kind === 'project') {
      const { data } = await supabaseUntyped
        .from('property_market_items')
        .select('id, title, area, city, developer, price_from, cover_url')
        .eq('is_active', true)
        .not('cover_url', 'is', null)
        .limit(200)
      const fresh = ((data ?? []) as ProjectRow[]).filter((p) => !used.has(p.id) && !!p.cover_url)
      if (!fresh.length) continue
      const p = fresh[Math.floor(Math.random() * fresh.length)]
      const where = [p.city, p.area].filter(Boolean).join(' — ')
      const caption =
        `🏗️ <b>${p.title ?? 'مشروع جديد'}</b>\n` +
        (where ? `📍 ${where}\n` : '') +
        (p.developer ? `🏢 ${p.developer}\n` : '') +
        (p.price_from ? `💰 يبدأ من ${money(p.price_from)}\n` : '') +
        `\n🧞 اسأل المارد عن التفاصيل: https://t.me/Madmona_bot\n` +
        `👇 التفاصيل كاملة\n${SITE}/borsa?utm_source=telegram&utm_medium=channel`
      const j = await sendPhoto(token, p.cover_url as string, caption)
      if (j.ok) {
        await markPosted(p.id, j.result?.message_id ?? null)
        return NextResponse.json({ ok: true, kind, id: p.id, message_id: j.result?.message_id })
      }
      continue
    }

    const { data } = await supabaseUntyped
      .from('listings')
      .select('id, title, city, district, price_egp, price_on_request')
      .eq('status', 'published')
      .limit(400)
    const fresh = ((data ?? []) as ListingRow[]).filter((l) => !used.has(l.id))
    if (!fresh.length) continue

    const shuffled = fresh.sort(() => Math.random() - 0.5).slice(0, 25)
    for (const l of shuffled) {
      const { data: ph } = await supabaseUntyped
        .from('listing_photos')
        .select('url')
        .eq('listing_id', l.id)
        .limit(1)
      const photo = ((ph ?? []) as Array<{ url: string }>)[0]?.url
      if (!photo) continue

      const where = [l.city, l.district].filter(Boolean).join(' — ')
      const caption =
        `🛍️ <b>${l.title ?? 'عرض جديد'}</b>\n` +
        (where ? `📍 ${where}\n` : '') +
        `💰 ${l.price_on_request ? 'السعر عند الطلب' : money(l.price_egp)}\n` +
        `\n🧞 اسأل المارد: https://t.me/Madmona_bot\n` +
        `👇 اشتري أو احجز\n${SITE}/listing/${l.id}?utm_source=telegram&utm_medium=channel`
      const j = await sendPhoto(token, photo, caption)
      if (j.ok) {
        await markPosted(l.id, j.result?.message_id ?? null)
        return NextResponse.json({ ok: true, kind, id: l.id, message_id: j.result?.message_id })
      }
    }
  }

  return NextResponse.json({ ok: true, skipped: 'مفيش محتوى جديد ينفع ينشر النهاردة' })
}
