// src/app/api/admin/campaigns/route.ts
// ============================================================================
// 🚀 تشغيل ووقف الحملات من الشاشة.
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «كل مرة أبدأ حملة لازم أبعتلك هنا؟»)
//
// الإجابة كانت: لأ، وماكانش المفروض. تلات حاجات من أربعة كانوا موجودين
// في الشاشة خلاص (الحارس · الحدود · اختيار الرقم)، والناقص الوحيد كان
// «ابدأ دلوقتي» — وده اللي كان بيتعمل بـSQL يدوي كل مرة.
//
// الراوت ده بيدّي:
//   GET  → كل حملة ليها رسايل في الطابور: كام فاضل، إمتى، من أنهي رقم،
//          والأهم: **هل الحارس هيرفضها** لو دوست ابدأ.
//   POST → start_now | defer | hold  (+ فتح الحارس للحملة اختياريًا)
//
// ⚠️ الفواصل بتتقري من `getSafety()` — نفس القيم اللي بانية الطابور
//    بتستعملها. يعني لو محمد غيّر الفاصل من الكارت، «ابدأ دلوقتي» بيمشي
//    عليه فورًا من غير ما نكرّر الرقم هنا.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'
import { getSafety } from '@/lib/wa-safety'
import { getReplyOnly, saveReplyOnly } from '@/lib/wa-reply-only'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface QueuedRow {
  scheduled_for: string
  session: string | null
  template_vars: { campaign_name?: string } | null
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [{ data }, guard, safety] = await Promise.all([
      supabaseAdmin
        .from('whatsapp_campaign_messages')
        .select('scheduled_for, session, template_vars')
        .eq('status', 'queued')
        .limit(5000),
      getReplyOnly(),
      getSafety(),
    ])

    const rows = (data ?? []) as unknown as QueuedRow[]
    const byName = new Map<
      string,
      { name: string; queued: number; first: string; last: string; sessions: Set<string> }
    >()

    for (const r of rows) {
      const name = (r.template_vars?.campaign_name ?? '').trim() || '(بدون اسم)'
      const cur = byName.get(name)
      if (!cur) {
        byName.set(name, {
          name,
          queued: 1,
          first: r.scheduled_for,
          last: r.scheduled_for,
          sessions: new Set(r.session ? [r.session] : []),
        })
      } else {
        cur.queued++
        if (r.scheduled_for < cur.first) cur.first = r.scheduled_for
        if (r.scheduled_for > cur.last) cur.last = r.scheduled_for
        if (r.session) cur.sessions.add(r.session)
      }
    }

    const allowed = new Set(guard.campaigns.map((c) => c.toLowerCase()))
    const campaigns = Array.from(byName.values())
      .sort((a, b) => b.queued - a.queued)
      .map((c) => ({
        name: c.name,
        queued: c.queued,
        first: c.first,
        last: c.last,
        sessions: Array.from(c.sessions),
        // الحارس هيرفض الحملة دي لو حاولت تبدأها دلوقتي؟ (بالنسبة للناس
        // اللي ماكلّموناش — اللي كلّمنا بيعدّي في كل الأحوال)
        blocked_by_guard:
          guard.mode === 'on' ||
          (guard.mode === 'campaigns' && !allowed.has(c.name.toLowerCase())),
      }))

    return NextResponse.json({ campaigns, guard, safety })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}

type Action = 'start_now' | 'defer' | 'hold'

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { campaign?: string; action?: Action; open_guard?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 })
  }

  const campaign = (body.campaign ?? '').trim()
  const action = body.action
  if (!campaign) return NextResponse.json({ error: 'اسم الحملة مطلوب' }, { status: 400 })
  if (action !== 'start_now' && action !== 'defer' && action !== 'hold') {
    return NextResponse.json({ error: 'أمر غير معروف' }, { status: 400 })
  }

  try {
    const safety = await getSafety()

    // الرسايل المستنية بترتيبها الحالي — بنحافظ على الترتيب ونعيد توزيع
    // المواعيد بس، عشان اللي كان الأول يفضل الأول.
    const { data, error } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select('id, scheduled_for')
      .eq('status', 'queued')
      .eq('template_vars->>campaign_name', campaign)
      .order('scheduled_for', { ascending: true })
      .limit(5000)

    if (error) throw new Error(error.message)
    const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'مفيش رسايل مستنية في الحملة دي' }, { status: 400 })
    }

    // نقطة البداية حسب الأمر
    const now = Date.now()
    let cursor: number
    if (action === 'start_now') {
      cursor = now + 30_000
    } else if (action === 'defer') {
      cursor = nextWindowStart(safety.startHour)
    } else {
      cursor = now + 7 * 86_400_000 // وقّف: بعيد لحد ما يقرر
    }

    // الفاصل من نفس إعدادات الأمان — عشوائي بين الأقل والأكبر زي بناء الطابور
    const span = Math.max(0, safety.maxGapSec - safety.minGapSec)
    const updates: Array<{ id: string; at: string }> = []
    for (const id of ids) {
      updates.push({ id, at: new Date(cursor).toISOString() })
      cursor += (safety.minGapSec + Math.floor(Math.random() * (span + 1))) * 1000
    }

    // تحديث على دفعات — 5000 صف في نداء واحد بيوقّع الاتصال
    for (let i = 0; i < updates.length; i += 200) {
      const chunk = updates.slice(i, i + 200)
      await Promise.all(
        chunk.map((u) =>
          supabaseAdmin
            .from('whatsapp_campaign_messages')
            .update({ scheduled_for: u.at } as never)
            .eq('id', u.id),
        ),
      )
    }

    // فتح الحارس للحملة دي بس — من غير ما نلمس باقي المسارات
    let guard = await getReplyOnly()
    if (body.open_guard && action === 'start_now') {
      const list = new Set(guard.campaigns)
      list.add(campaign)
      guard = await saveReplyOnly({ mode: 'campaigns', campaigns: Array.from(list) })
    }

    return NextResponse.json({
      ok: true,
      campaign,
      action,
      moved: updates.length,
      first: updates[0]?.at ?? null,
      last: updates[updates.length - 1]?.at ?? null,
      guard,
    })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}

/** أول لحظة جوّه نافذة الإرسال — النهاردة لو لسه بدري، وإلا بكرة. */
function nextWindowStart(startHour: number): number {
  // ⚠️ لازم يتحسب بتوقيت القاهرة مش السيرفر. ده كان مصدر بق قديم:
  //    `cursor.setHours(10)` على تاريخ UTC معناها ١٠ بجرينتش = ١ الظهر
  //    بالقاهرة — فالرسايل كانت بتتجدول بعد بداية النافذة بساعتين.
  const now = new Date()
  const c = cairoParts(now)
  const offset = cairoOffsetMs(now)
  const addDay = c.hour >= startHour ? 1 : 0
  return Date.UTC(c.year, c.month - 1, c.day + addDay, startHour, 0, 0) - offset
}

interface CairoParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

function cairoParts(d: Date): CairoParts {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0)
  // `hour12:false` بيدّي ٢٤ لمنتصف الليل في بعض البيئات — بنرجّعها صفر.
  const h = g('hour')
  return { year: g('year'), month: g('month'), day: g('day'), hour: h === 24 ? 0 : h, minute: g('minute'), second: g('second') }
}

/** الفرق بين القاهرة وجرينتش في اللحظة دي — بيتحسب مش متكتوب (توقيت صيفي). */
function cairoOffsetMs(d: Date): number {
  const c = cairoParts(d)
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second)
  // بنقرّب لأقرب ثانية عشان الملي ثانية مش موجودة في الأجزاء
  return asUtc - Math.floor(d.getTime() / 1000) * 1000
}
