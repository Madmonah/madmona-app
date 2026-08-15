// src/app/api/admin/reattribute/route.ts
// ============================================================================
// 🏷️ رجّع الإعلانات لأصحابها — الإعلانات المسجّلة باسم «مضمونة — وكيل
//    الليستنجات» بينما رقم صاحبها الحقيقي مكتوب في `listings.contact_phone`.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «وكيل الليستنج لما يجي يرفع اعلان من الواتساب
//    لازم الاعلان يتسجل بالرقم الي باعت»)
//    دالة `publish_unclaimed_draft` كانت حاطة رقم الوكيل **ثابت في السطر**،
//    مهما كان الرقم اللي بعت. اتصلّحت في الداتابيز (بتنادي دلوقتي
//    `resolve_supplier_by_phone`) — فالإعلانات الجديدة بقت بتتسجل صح.
//    الملف ده للـ**باك-فيل**: اللي اتسجل غلط قبل الإصلاح.
//
// ⚠️ ليه راوت وإنت بتدوسه بنفسك مش كرون؟ لأن الخطوة دي بتعمل **حساب**
//    لطرف تالت حقيقي (بروفايل + مورد + مالك). ده قرارك إنت مش قرار أوتوماتيك.
//    GET = معاينة بس (مش بيغيّر حاجة). POST = التنفيذ لرقم واحد.
//
// 🔒 نفس بوابة /api/admin/leads و/api/admin/sending: ADMIN_PASSWORD.
// ============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** المورد الوسيط اللي الإعلانات اليتيمة بتتسجل تحته */
const TRUSTEE_ID = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Auth gate: isAdminRequest (see src/lib/adminGate.ts, 15 Aug 2026).
// Was comparing to process.env.ADMIN_PASSWORD, removed in the 12 Aug
// security migration -> `if (!expected) return false` = always 401.

interface ListingRow {
  id: string
  title: string
  contact_phone: string | null
  created_at: string
}

interface Group {
  /** الرقم زي ما هو في الداتا */
  raw_phone: string
  /** +20XXXXXXXXXX — أو null لو مش موبايل مصري (آي دي صفحة فيسبوك مثلًا) */
  phone: string | null
  listings: number
  sample_title: string
  /** موجود بالفعل؟ */
  profile_id: string | null
  supplier_id: string | null
  business_name: string | null
  /** إيه اللي محتاجينه عشان ننقله */
  action: 'ready' | 'needs_supplier' | 'needs_account' | 'no_phone'
}

/** بيجمّع إعلانات الوكيل حسب الرقم، وبيقول كل مجموعة محتاجة إيه */
async function buildGroups(supa: ReturnType<typeof sb>): Promise<Group[]> {
  const { data, error } = await supa
    .from('listings')
    .select('id, title, contact_phone, created_at')
    .eq('supplier_id', TRUSTEE_ID)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)

  const rows = (data as ListingRow[] | null) ?? []
  const byPhone = new Map<string, ListingRow[]>()
  for (const r of rows) {
    const key = (r.contact_phone || '(بدون رقم)').trim()
    if (!byPhone.has(key)) byPhone.set(key, [])
    byPhone.get(key)!.push(r)
  }

  const groups: Group[] = []
  for (const [raw, list] of Array.from(byPhone.entries())) {
    const phone = normalizePhone(raw)
    let profileId: string | null = null
    let supplierId: string | null = null
    let bizName: string | null = null

    if (phone) {
      const local = '0' + phone.slice(3)
      const bare = phone.slice(1)
      const { data: prof } = await supa
        .from('profiles')
        .select('id')
        .or(`phone.eq.${local},phone.eq.${bare},phone.eq.${phone}`)
        .limit(1)
      if (prof && prof.length) {
        profileId = (prof[0] as { id: string }).id
        const { data: ms } = await supa
          .from('marketplace_suppliers')
          .select('id, business_name')
          .eq('profile_id', profileId)
          .limit(1)
        if (ms && ms.length) {
          supplierId = (ms[0] as { id: string }).id
          bizName = (ms[0] as { business_name: string | null }).business_name
        }
      }
    }

    groups.push({
      raw_phone: raw,
      phone,
      listings: list.length,
      sample_title: list[0]?.title ?? '—',
      profile_id: profileId,
      supplier_id: supplierId,
      business_name: bizName,
      action: !phone
        ? 'no_phone'
        : supplierId
          ? 'ready'
          : profileId
            ? 'needs_supplier'
            : 'needs_account',
    })
  }

  groups.sort((a, b) => b.listings - a.listings)
  return groups
}

/** معاينة — مش بيغيّر أي حاجة */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const groups = await buildGroups(sb())
    return NextResponse.json({
      trustee_id: TRUSTEE_ID,
      total_listings: groups.reduce((s, g) => s + g.listings, 0),
      groups,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}

/**
 * التنفيذ لرقم واحد:
 *   1) بروفايل (لو مش موجود — بيتعمل حساب)
 *   2) marketplace_supplier + المالك في business_employees
 *   3) نقل إعلانات الوكيل اللي بالرقم ده — مع تخطّي المكرر
 *
 * ⚠️ الإعلان المكرر (المالك عنده إعلان بنفس العنوان) **مابيتنقلش ومابيتمسحش** —
 *    بيترجع في `skipped_duplicates` عشان تقرر إنت. تريجر `prevent_duplicate_listing`
 *    بيرفضه أصلًا، ولو نقلناه الباتش كله كان هيقع.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { phone?: string; business_name?: string; dry_run?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const phone = normalizePhone(body.phone || '')
  if (!phone) {
    return NextResponse.json(
      { error: 'رقم موبايل مصري غير صالح', got: body.phone ?? null },
      { status: 400 },
    )
  }

  const supa = sb()
  const local = '0' + phone.slice(3)
  const bare = phone.slice(1)

  try {
    // ① الإعلانات اللي هتتنقل — بنجيبها الأول عشان نعرف الاسم ونعدّ
    const { data: mine, error: le } = await supa
      .from('listings')
      .select('id, title')
      .eq('supplier_id', TRUSTEE_ID)
      .in('contact_phone', [phone, bare, local, phone.replace('+', '')])
    if (le) throw new Error('listings: ' + le.message)
    const listings = (mine as Array<{ id: string; title: string }> | null) ?? []
    if (!listings.length) {
      return NextResponse.json({ error: 'مفيش إعلانات باسم الوكيل بالرقم ده', phone }, { status: 404 })
    }

    const bizName = (body.business_name || '').trim() || `مورد ${local}`

    if (body.dry_run) {
      return NextResponse.json({
        dry_run: true, phone, business_name: bizName,
        would_move: listings.length,
        titles: listings.map((l) => l.title),
      })
    }

    // ② بروفايل
    let profileId: string | null = null
    let createdAccount = false
    const { data: prof } = await supa
      .from('profiles')
      .select('id')
      .or(`phone.eq.${local},phone.eq.${bare},phone.eq.${phone}`)
      .limit(1)
    if (prof && prof.length) {
      profileId = (prof[0] as { id: string }).id
    } else {
      const email = phoneToEmail(phone)
      const { data: created, error: ce } = await supa.auth.admin.createUser({
        email, email_confirm: true,
        user_metadata: { phone: local, via: 'admin-reattribute' },
      })
      profileId = created?.user?.id ?? null
      if (ce && /already|exists/i.test(ce.message)) {
        // الحساب موجود بإيميل صناعي بس البروفايل مش مربوط — بنجيب الـid منه
        const { data: link } = await supa.auth.admin.generateLink({ type: 'magiclink', email })
        profileId = link?.user?.id ?? null
      } else if (ce) {
        throw new Error('auth: ' + ce.message)
      }
      if (!profileId) throw new Error('auth: مقدرناش نجيب معرّف الحساب')
      createdAccount = true
      await supa
        .from('profiles')
        .upsert({ id: profileId, phone: local, role: 'customer' } as never, { onConflict: 'id' })
    }

    // ③ المورد — upsert بـprofile_id عشان مايقعش duplicate key لو موجود
    let supplierId: string | null = null
    const { data: msRows } = await supa
      .from('marketplace_suppliers')
      .select('id')
      .eq('profile_id', profileId)
      .limit(1)
    if (msRows && msRows.length) {
      supplierId = (msRows[0] as { id: string }).id
    } else {
      const { data: up, error: se } = await supa
        .from('marketplace_suppliers')
        .upsert(
          {
            profile_id: profileId, account_type: 'business', business_name: bizName,
            kyc_status: 'approved', kyc_reviewed_at: new Date().toISOString(), commission_rate: 10,
          } as never,
          { onConflict: 'profile_id' },
        )
        .select('id')
        .single()
      if (!up) throw new Error('supplier: ' + (se?.message || 'unknown'))
      supplierId = (up as { id: string }).id
    }

    // ④ المالك في business_employees
    const { data: be } = await supa
      .from('business_employees')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('auth_user_id', profileId)
      .limit(1)
    if (!be || !be.length) {
      await supa.from('business_employees').insert({
        supplier_id: supplierId, auth_user_id: profileId, full_name: bizName,
        phone: local, role: 'owner', role_ar: 'مالك', status: 'active', employee_type: 'human',
      } as never)
    }

    // ⑤ النقل — واحد واحد، والمكرر بيتسجّل مش بيوقّف الباقي
    const { data: existing } = await supa
      .from('listings')
      .select('title')
      .eq('supplier_id', supplierId)
    const taken = new Set(
      ((existing as Array<{ title: string }> | null) ?? []).map((r) => r.title.trim().toLowerCase()),
    )

    const moved: string[] = []
    const skipped: string[] = []
    for (const l of listings) {
      if (taken.has(l.title.trim().toLowerCase())) { skipped.push(l.title); continue }
      const { error: ue } = await supa
        .from('listings')
        .update({ supplier_id: supplierId, updated_at: new Date().toISOString() } as never)
        .eq('id', l.id)
      if (ue) skipped.push(`${l.title} — ${ue.message}`)
      else { moved.push(l.title); taken.add(l.title.trim().toLowerCase()) }
    }

    return NextResponse.json({
      ok: true, phone, business_name: bizName,
      profile_id: profileId, supplier_id: supplierId,
      created_account: createdAccount,
      moved: moved.length, skipped_duplicates: skipped.length,
      moved_titles: moved, skipped_titles: skipped,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
