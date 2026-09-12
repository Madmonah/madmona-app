// src/app/api/events/track/route.ts
// Lightweight event tracking endpoint — frontend posts here on page views/actions
// AI agents read from site_events to score leads and identify opportunities.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

interface TrackEventBody {
  event_type: string
  session_id: string
  visitor_id?: string
  profile_id?: string
  page_url?: string
  page_referrer?: string
  listing_id?: string
  category?: string
  search_query?: string
  device_type?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  metadata?: Record<string, unknown>
}

const VALID_EVENT_TYPES = new Set([
  'page_view', 'listing_view', 'search', 'cart_add', 'checkout_start',
  'checkout_complete', 'phone_click', 'whatsapp_click', 'signup_start', 'signup_complete',
  'wizard_step_view', 'wizard_submit'
])

export async function POST(request: NextRequest) {
  let body: TrackEventBody
  try {
    body = (await request.json()) as TrackEventBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.event_type || !VALID_EVENT_TYPES.has(body.event_type)) {
    return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
  }
  if (!body.session_id || body.session_id.length < 5) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  // 🤖 (١٢/٩/٢٠٢٦) محمد: «شوف الناس دي ضاعت ليه» — طلع إن ٤٩ من ٨٥ «زائر يوتيوب» لصفحة /pro اتسجّلوا في نفس الساعة
  //    اللي اتنشرت فيها كومنتات اللينك (١٣:٠٠) وكلهم صفحة واحدة وصفر ثواني = زاحف يوتيوب بيفتح اللينك ببراوزر بيشغّل JS.
  //    الحل: نسجّل الـUser-Agent ونعلّم البوت في metadata.is_bot عشان التقارير تستبعده. مفيش UA اتسجّل قبل النهارده.
  const ua = request.headers.get('user-agent') || ''
  const isBot = /bot|crawl|spider|slurp|headless|preview|fetch|scan|monitor|curl|python|wget|Google-Safety|YouTube|facebookexternalhit|Twitterbot|WhatsApp|TelegramBot|Discordbot|LinkedInBot|Pinterest|Applebot|Bytespider|GPTBot|ClaudeBot|Lighthouse|PageSpeed|HeadlessChrome/i.test(ua) || ua.length < 20
  const meta = { ...(body.metadata ?? {}), ua: ua.slice(0, 300), is_bot: isBot, ip_country: request.headers.get('x-vercel-ip-country') || null }

  try {
    await supabaseAdmin.from('site_events').insert({
      session_id: body.session_id,
      visitor_id: body.visitor_id ?? null,
      profile_id: body.profile_id ?? null,
      event_type: body.event_type,
      page_url: body.page_url ?? null,
      page_referrer: body.page_referrer ?? null,
      listing_id: body.listing_id ?? null,
      category: body.category ?? null,
      search_query: body.search_query ?? null,
      device_type: body.device_type ?? null,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      metadata: meta,
    } as never)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Track event error:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
