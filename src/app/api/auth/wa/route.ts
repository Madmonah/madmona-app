import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import { sendText } from '@/lib/whatsapp'

// =====================================================================
// 🔑 الدخول بالواتساب — «ابعت الكود للمارد» (عكس الـOTP)
// ليه معكوس؟ التمبلتس مبلوكة من ميتا (131042) فمفيش كود بيوصل للعميل.
// هنا العميل هو اللي بيبعت — والوارد شغال دايماً، ورقمه بيتأكد من
// مصدر الرسالة نفسها (مفيش حد يقدر يبعت من رقم غيره).
//
// POST { action: 'start' }            → { code, wa_url }
// GET  ?code=MADxxxxx                 → { verified, expired }
// POST { action: 'finish', code }     → { token_hash, email }  → verifyOtp في المتصفح
// POST { action: 'magic', token }     → { token_hash, email, next } (لينكات المارد /l/)
//
// الويبهوك (whatsapp-webhook) بيأكّد الأكواد أصلاً — صيغة MADxxxxx
// بتاعة wa_inbound_verifications نفسها. صفر تعديل مطلوب هناك للدخول.
// =====================================================================

export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const MARID_WA = '201002229982'
// من غير حروف/أرقام لبس (0/O · 1/I/L) — العميل ممكن يكتبه بإيده
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function genCode(): string {
  const a = new Uint32Array(5)
  crypto.getRandomValues(a)
  return 'MAD' + Array.from(a, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

/** رقم واتساب (2010xxxxxxxx) → Supabase session عبر magiclink hash.
 *  بيلاقي المستخدم أو يعمله، ويضمن صف profiles برقمه. */
async function mintSession(rawPhone: string, fullNameHint: string | null = null) {
  const sb = admin()
  let normalized = normalizePhone(rawPhone)
  let lid: string | null = null
  // 🔗 الجذر: لو اللي وصلنا مُعرّف مخفي (LID) مش رقم حقيقي — نحاول نحلّه من
  //    wa_lid_map الأول. لو مفيش تطابق، بنعمل الحساب مربوط بالـLID نفسه:
  //    الـLID هوية واتساب ثابتة ومتأكدة من *مصدر الرسالة* (محدش يقدر يبعت
  //    بهوية غيره)، فالدخول بيه آمن زي الرقم بالظبط — واللي رقمه مخفي بيدخل
  //    فعلًا بدل ما يتوقف. (يكمّل رقمه بعدين من صفحة complete-phone.)
  if (!normalized) {
    const digits = String(rawPhone || '').replace(/\D/g, '')
    if (digits.length >= 10) {
      const { data: map } = await sb.from('wa_lid_map').select('phone').eq('lid', digits).maybeSingle()
      const mapped = (map as { phone?: string } | null)?.phone
      if (mapped) normalized = normalizePhone(mapped)
      else lid = digits
    }
  }
  if (!normalized && !lid) throw new Error('bad_identifier')

  // الإيميل الداخلي (مُعرّف الحساب في Supabase): من الرقم لو موجود، أو من الـLID
  // لو الرقم مخفي. المستخدم بيدخل بالواتساب كل مرة فالإيميل ده داخلي بحت.
  const email = normalized ? phoneToEmail(normalized) : `wa-lid-${lid}@lid.madmona.eg`
  const local = normalized ? '0' + normalized.slice(3) : null // +2010... → 010...

  // اعمل المستخدم لو مش موجود (لو موجود بيرجع email_exists وده تمام)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email, email_confirm: true,
    user_metadata: local ? { phone: local, via: 'whatsapp' } : { via: 'whatsapp_lid', lid },
  })
  let userId = created?.user?.id
  if (createErr && !/already|exists/i.test(createErr.message)) throw createErr

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink', email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) throw (linkErr || new Error('no_token_hash'))
  userId = userId || linkData.user?.id

  // profiles: كمّل الرقم لو ناقص من غير ما تلمس اسم/دور موجودين
  if (userId) {
    const { data: prof } = await sb.from('profiles').select('id, phone').eq('id', userId).maybeSingle()
    if (!prof) {
      await sb.from('profiles').insert({ id: userId, phone: local, role: 'customer' } as never)
    } else if (!prof.phone && local) {
      await sb.from('profiles').update({ phone: local } as never).eq('id', userId)
    }
  }

  // 🔗 (17 Jul 2026) توحيد 100%: نفس الدخلة تطلع كمان madmona_token
  // (جلسة madmona_sessions) — عشان /me و/my-projects والحجوزات القديمة
  // اللي بتعتمد عليه تشتغل من غير دخول تاني. best-effort.
  let madmonaToken: string | null = null
  let fullName: string | null = null
  if (normalized) { // التوكن القديم محتاج رقم — لو الحساب مربوط بـLID بنتخطاه
    try {
      const { data: mint } = await sb.rpc('wa_login_mint', { p_phone: normalized, p_full_name: fullNameHint } as never)
      const m = mint as { success?: boolean; token?: string; full_name?: string } | null
      if (m?.success && m.token) { madmonaToken = m.token; fullName = m.full_name || null }
    } catch { /* التوكن القديم إضافة — مش شرط */ }
  }

  return {
    token_hash: linkData.properties.hashed_token, email,
    madmona_token: madmonaToken, phone: local, full_name: fullName,
  }
}

// ---------------------------------------------------------------- GET (poll)
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').toUpperCase()
  if (!/^MAD[A-Z0-9]{5}$/.test(code)) {
    return NextResponse.json({ error: 'bad_code' }, { status: 400 })
  }
  const sb = admin()
  const { data } = await sb
    .from('wa_inbound_verifications')
    .select('id, verified, expires_at, session_minted_at')
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return NextResponse.json({ verified: false, expired: true })
  const expired = new Date(data.expires_at) < new Date()

  // 🔑 (تحقق صامد للحظر) لو الويبهوك ماأكّدش الكود لأي سبب، بندوّر على رسالة
  // inbound فيها الكود في whatsapp_messages — الوارد بيوصل ويتسجّل حتى تحت
  // الحظر (الحظر بيمنع الإرسال بس). لو لقيناها، ناخد رقم صاحبها ونأكّده.
  if (!data.verified && !expired) {
    try {
      const since = new Date(Date.now() - 20 * 60 * 1000).toISOString()
      const { data: msg } = await sb
        .from('whatsapp_messages')
        .select('conversation_id')
        .eq('direction', 'inbound')
        .ilike('body', `%${code}%`)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const convId = (msg as { conversation_id?: string } | null)?.conversation_id
      if (convId) {
        const { data: conv } = await sb.from('whatsapp_conversations').select('contact_phone').eq('id', convId).maybeSingle()
        const senderPhone = (conv as { contact_phone?: string } | null)?.contact_phone || ''
        if (senderPhone && normalizePhone(senderPhone)) {
          await sb.from('wa_inbound_verifications')
            .update({ verified: true, verified_phone: senderPhone } as never)
            .eq('id', data.id)
          return NextResponse.json({ verified: true, expired: false })
        }
      }
    } catch { /* نرجع لحالة الويبهوك العادية */ }
  }

  return NextResponse.json({
    verified: !!data.verified && !data.session_minted_at,
    expired,
  })
}

// ---------------------------------------------------------------- POST
export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const sb = admin()

  // ---- start: ولّد كود يبعته العميل للمارد
  if (body.action === 'start') {
    const code = genCode()
    const { error } = await sb.from('wa_inbound_verifications').insert({
      code, purpose: 'app_login', expected_phone: null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    } as never)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const text = encodeURIComponent(code)
    return NextResponse.json({
      code,
      wa_url: `https://wa.me/${MARID_WA}?text=${text}`,
    })
  }

  // ---- finish: الكود اتأكد من الويبهوك → سيشن
  if (body.action === 'finish') {
    const code = (body.code || '').toUpperCase()
    const { data: row } = await sb
      .from('wa_inbound_verifications')
      .select('id, verified, verified_phone, expires_at, session_minted_at')
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!row?.verified || !row.verified_phone) {
      return NextResponse.json({ error: 'not_verified' }, { status: 400 })
    }
    if (row.session_minted_at) {
      return NextResponse.json({ error: 'already_used' }, { status: 400 })
    }
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 })
    }
    try {
      const minted = await mintSession(row.verified_phone, (body.full_name || '').trim() || null)
      await sb.from('wa_inbound_verifications')
        .update({ session_minted_at: new Date().toISOString() } as never)
        .eq('id', row.id)

      // 📩 رد ترحيب على رسالة الدخول — ده *رد* على رسالة العميل (مش رسالة باردة
      //    متولّدة زي الـOTP)، فمسموح ومابيسببش حظر. نستفيد إنه كلّمنا: نرحّب +
      //    نبعت اللينك اللي كان رايحه + لينك شات المارد. بنبعت لنفس الـ JID اللي
      //    جت منه رسالة الكود (يوصل حتى للرقم المخفي). best-effort بالكامل — لو
      //    فشل الدخول بيكمّل عادي والمتصفح بيوديه لوجهته.
      try {
        const code = (body.code || '').toUpperCase()
        const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const { data: msg } = await sb
          .from('whatsapp_messages')
          .select('conversation_id')
          .eq('direction', 'inbound')
          .ilike('body', `%${code}%`)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const convId = (msg as { conversation_id?: string } | null)?.conversation_id
        if (convId) {
          const { data: conv } = await sb
            .from('whatsapp_conversations')
            .select('metadata, session_id, contact_phone')
            .eq('id', convId)
            .maybeSingle()
          const c = conv as { metadata?: { wa_jid?: string } | null; session_id?: string | null; contact_phone?: string | null } | null
          const jid = c?.metadata?.wa_jid || undefined
          const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.madmonacairo.com').replace(/\/$/, '')
          const next = String(body.next || '').trim()
          const dest = next.startsWith('/') ? next : next ? '/' + next : ''
          const nm = minted.full_name ? ` يا ${minted.full_name}` : ''
          const lines = [`أهلاً بيك${nm} في مضمونة 🧞`, `دخلت بنجاح ✅`]
          if (dest) lines.push('', 'كمّل اللي كنت بتعمله من هنا 👇', `${site}${dest}`)
          lines.push('', 'وأنا المارد — في خدمتك ٢٤/٧، اسألني أي حاجة من هنا 👇', `${site}/chat/marid`)
          if (jid || c?.contact_phone) {
            await sendText({
              to: c?.contact_phone || row.verified_phone,
              jid,
              session: c?.session_id || undefined,
              body: lines.join('\n'),
              conversationId: convId,
              agentName: 'المارد',
              aiGenerated: false,
            })
          }
        }
      } catch (e) {
        console.error('[wa-auth] welcome reply failed (best-effort):', e)
      }

      return NextResponse.json(minted)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      console.error('[wa-auth] mint error:', e)
      // رقم مخفي (LID) بلا تطابق — نرجّع خطأ واضح توجّه بيه الواجهة لجوجل
      return NextResponse.json(
        { error: msg === 'lid_no_phone' ? 'lid_no_phone' : 'mint_failed' },
        { status: msg === 'lid_no_phone' ? 400 : 500 },
      )
    }
  }

  // ---- magic: لينك المارد المُغلّف /l/<token>
  if (body.action === 'magic') {
    const token = body.token || ''
    if (!/^[0-9a-f-]{36}$/.test(token)) {
      return NextResponse.json({ error: 'bad_token' }, { status: 400 })
    }
    const { data: row } = await sb
      .from('wa_login_tokens')
      .select('token, phone, next_path, expires_at, use_count, max_uses')
      .eq('token', token)
      .maybeSingle()
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (new Date(row.expires_at) < new Date() || row.use_count >= row.max_uses) {
      // اللينك خلص — نوصله لوجهته برضه بس من غير دخول (أحسن من صفحة خطأ)
      return NextResponse.json({ error: 'expired', next: row.next_path }, { status: 410 })
    }
    try {
      const minted = await mintSession(row.phone)
      await sb.from('wa_login_tokens')
        .update({ use_count: row.use_count + 1 } as never)
        .eq('token', token)
      return NextResponse.json({ ...minted, next: row.next_path || '/' })
    } catch (e) {
      console.error('[wa-auth] magic mint error:', e)
      return NextResponse.json({ error: 'mint_failed', next: row.next_path }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
