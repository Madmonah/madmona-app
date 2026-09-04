import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { phoneToEmail } from '@/lib/auth-helpers'

// =====================================================================
// 🤝 قبول دعوة صاحب — النسخة اللي بتشتغل جوّه شات مضمونة
// (٣٠ يوليو ٢٠٢٦ — محمد: «كله جوّه الشات»)
//
// ليه راوت سيرفر بدل ما الصفحة تنده الـRPC على طول؟
// لأن chat_invite_accept شغالة بـ auth.uid() يعني عايزة جلسة Supabase،
// وشات مضمونة بيدخل بـ madmona_token (madmona_accounts) اللي مالوش أي
// ربط بـ auth.users — الربط الوحيد هو التليفون.
//
// وأهم من كده: ١٠ من أصل ١٠٥ حساب شات مالهمش profile خالص، وكل جداول
// الأصحاب (chat_contacts / chat_friends / chat_room_members) شغالة بـ
// profiles.id. من غير provision الناس دي مكنش ممكن تتضاف كأصحاب أبداً —
// فشل صامت لواحد من كل عشرة. هنا بنعملهم profile وقت الحاجة.
//
// POST { token, madmona_token? }  +  Authorization: Bearer <supabase jwt> (اختياري)
//   → { ok, friend_name, room_id }
// =====================================================================

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Sb = ReturnType<typeof admin>

/** رقم بأي صيغة → 201XXXXXXXXX (١٢ رقم، من غير +) */
function digits20(raw: string): string | null {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  // 🌍 (٤ سبتمبر ٢٠٢٦) كانت بترفض أي رقم مش مصري (^20\d{10}$) — قبول الدعوة
  //    كان مستحيل لرقم إماراتي. مصر = 01…/1… بس؛ غير كده E.164 دولي (١٠–١٥ رقم).
  if (d.startsWith('01') && d.length === 11) d = '20' + d.slice(1)
  else if (d.length === 10 && d.startsWith('1')) d = '20' + d
  if (/^20\d{10}$/.test(d)) return d
  return /^[1-9]\d{9,14}$/.test(d) ? d : null
}

/** لاقي profile بالرقم، واعمله واحد لو مش موجود. */
async function ensureProfile(
  sb: Sb,
  phone20: string,
  fullName: string | null,
): Promise<string | null> {
  // ١) دوّر — المطابقة في SQL بـ chat_norm_phone لأن صيغ الأرقام مختلطة
  const { data: found } = await sb.rpc('chat_profile_for_phone', { p_phone: phone20 } as never)
  if (found) return found as unknown as string

  // ٢) مفيش → اعمل حساب auth + profile (نفس نمط mintSession في /api/auth/wa)
  const canonical = '+' + phone20            // +201XXXXXXXXX
  const local = '0' + phone20.slice(2)       // 01XXXXXXXXX
  const email = phoneToEmail(canonical)

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone: phone20, via: 'chat_invite' },
  })

  let userId = created?.user?.id || null

  if (createErr) {
    // الحساب موجود بالإيميل ده بس من غير profile — هاته بالبحث
    if (!/already|exists/i.test(createErr.message)) throw createErr
    const { data: link } = await sb.auth.admin.generateLink({ type: 'magiclink', email })
    userId = link?.user?.id || null
  }
  if (!userId) return null

  // profiles: صف جديد لو مش موجود. بنخزّن الصيغة الرسمية +20…
  const { data: prof } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!prof) {
    await sb.from('profiles').insert({
      id: userId, phone: canonical, full_name: fullName, role: 'customer',
    } as never)
  }
  return userId
}

export async function POST(req: NextRequest) {
  try {
    let body: { token?: string; madmona_token?: string }
    try { body = await req.json() } catch {
      return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
    }

    const inviteToken = (body.token || '').trim().toUpperCase()
    if (inviteToken.length < 6) {
      return NextResponse.json({ ok: false, error: 'bad_token' }, { status: 400 })
    }

    const sb = admin()
    let profileId: string | null = null

    // ── الطريق ١: جلسة Supabase (الموقع الرئيسي) ──────────────────────
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (bearer) {
      const { data: u } = await sb.auth.getUser(bearer)
      if (u?.user?.id) profileId = u.user.id
    }

    // ── الطريق ٢: madmona_token (شات مضمونة) ─────────────────────────
    if (!profileId && body.madmona_token) {
      const { data: res } = await sb.rpc('madmona_resolve', { p_token: body.madmona_token } as never)
      const r = res as { authenticated?: boolean; phone?: string; full_name?: string } | null
      if (r?.authenticated && r.phone) {
        const p20 = digits20(r.phone)
        if (p20) profileId = await ensureProfile(sb, p20, r.full_name || null)
      }
    }

    if (!profileId) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const { data, error } = await sb.rpc('chat_invite_accept_as', {
      p_profile: profileId, p_token: inviteToken,
    } as never)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'error' },
      { status: 500 },
    )
  }
}
