// src/app/api/admin/leads/route.ts
// ============================================================================
// 🐞 (١٤ أغسطس ٢٠٢٦) الملف ده كان بيقرا من جدول اسمه `booking_leads`
//    **مش موجود في الداتابيز خالص**. النتيجة: الصفحة بترمي «حصل خطأ في جلب
//    البيانات» مهما كتبت كلمة السر صح — ومحمد فاكر إنه مش عارف يدخل.
//
//    الليدز الحقيقية ٣٬٥٥١ صف موزّعين على ٥ جداول بأشكال مختلفة:
//      cold_leads (٢٬٤١٦) · sales_leads (٦٣٨) · restaurant_leads (٣٧١)
//      clinic_leads (١٠١) · fnb_marketing_leads (٢٥)
//
//    وحّدناهم في ڤيو `v_all_leads`، والراوت ده بيقرا منه.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// كلمة السر من ADMIN_PASSWORD — عمرها ما بتتبعت للعميل.
// الصفحة بتبعتها في هيدر X-Admin-Password.
function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false // مفيش كلمة سر متظبطة = مقفول تمامًا
  return request.headers.get('x-admin-password') === expected
}

// نوع الليد → الجدول الأصلي وعمود الحالة (للتعديل)
const KIND_MAP: Record<string, { table: string; statusCol: string; allowed: string[] }> = {
  cold:       { table: 'cold_leads',          statusCol: 'status',         allowed: ['new', 'contacted', 'converted', 'dead', 'do_not_contact'] },
  sales:      { table: 'sales_leads',         statusCol: 'intent',         allowed: ['new', 'inquire', 'qualified'] },
  restaurant: { table: 'restaurant_leads',    statusCol: 'status',         allowed: ['new', 'contacted', 'replied', 'unclaimed_listing_created'] },
  clinic:     { table: 'clinic_leads',        statusCol: 'status',         allowed: ['new', 'contacted', 'converted', 'dead'] },
  fnb:        { table: 'fnb_marketing_leads', statusCol: 'connect_status', allowed: ['pending', 'sent', 'skipped'] },
}

interface LeadQuery {
  eq: (c: string, v: unknown) => LeadQuery
  or: (s: string) => LeadQuery
  order: (c: string, o: Record<string, unknown>) => LeadQuery
  limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') || ''
  const q = (url.searchParams.get('q') || '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 1000)

  const sb = supabase as unknown as {
    from: (t: string) => { select: (c: string) => LeadQuery }
  }

  let query = sb
    .from('v_all_leads')
    .select('id, kind, kind_ar, name, phone, city, category, status, notes, source, created_at')

  if (kind && KIND_MAP[kind]) query = query.eq('kind', kind)
  // بنهرب % و_ عشان مايتحوّلوش لـwildcards في ilike
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ')
    query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('[admin/leads] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch leads', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [], kinds: Object.keys(KIND_MAP) })
}

// تعديل حالة ليد — بيروح للجدول الأصلي حسب النوع
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, kind, status } = body as Record<string, unknown>
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  if (typeof kind !== 'string' || !KIND_MAP[kind]) {
    return NextResponse.json({ error: 'kind required (cold/sales/restaurant/clinic/fnb)' }, { status: 400 })
  }

  const map = KIND_MAP[kind]
  // ⚠️ الحالات المسموحة بتختلف من جدول للتاني — الليستة مقفولة عن قصد
  if (typeof status !== 'string' || !map.allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status', allowed: map.allowed }, { status: 400 })
  }

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  const { error } = await sb.from(map.table).update({ [map.statusCol]: status }).eq('id', id)
  if (error) {
    console.error('[admin/leads] update error:', error.message)
    return NextResponse.json({ error: 'Failed to update lead', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
