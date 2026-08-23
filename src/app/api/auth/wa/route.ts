import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import { sendLoginWelcome } from '@/lib/wa-welcome'
import { rateLimitOk, clientIp } from '@/lib/rate-limit'

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

// (30 Jul 2026) رقم اللوجين اتغيّر 9982 -> 337 (البيزنس الموثّق). التأكيد
// session-agnostic: المخ في /api/whatsapp/baileys بيأكّد كود MADxxxxx مهما
// كان الرقم المستقبِل وبيرد على نفس الجلسة.
const LOGIN_WA_PRIMARY = '201002229982' // 982 — البراند/المارد (الأساسي)
const LOGIN_WA_FALLBACK = '201026222337' // 337 — البيزنس الموثّق (الاحتياطي)

// بيختار رقم اللوجين لحظيًا: 982 طالما مش متعطّل، وإلا يرجع لـ337. الإشارة من
// wa_number_configs.enabled (نفس الفلاج اللي بيوقّف المارد على الرقم) — Supabase
// دايمًا متاح للتطبيق. أي عطل نادر في القراءة → نفضّل الأساسي 982. يأتمت سويتش 30 يوليو.
async function pickLoginWa(sb: ReturnType<typeof admin>): Promise<string> {
  try {
    const { data } = await sb
      .from('wa_number_configs')
      .select('session_id, enabled')
      .in('session_id', [LOGIN_WA_PRIMARY, LOGIN_WA_FALLBACK])
    const rows = (data ?? []) as Array<{ session_id: string; enabled: boolean | null }>
    const primary = rows.find((r) => (r.session_id || '').replace(/\D/g, '') === LOGIN_WA_PRIMARY)
    return !primary || primary.enabled !== false ? LOGIN_WA_PRIMARY : LOGIN_WA_FALLBACK
  } catch {
    return LOGIN_WA_PRIMARY
  }
}
// من غير حروف/أرقام لبس (0/O · 1/I/L) — العميل ممكن يكتبه بإيده
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function genCode(): string {
  const a = new Uint32Array(5)
  crypto.getRandomValues(a)
  return 'MAD' + Array.from(a, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

/** 👤 اسم العرض بتاع العميل من واتساب.
 *
 *  (٢٥ يوليو ٢٠٢٦ — محمد: «أي حد يسجل دخول من واتساب ومعندوش أكونت نعمله أكونت»)
 *  الحساب كان بيتعمل فعلاً، بس **من غير اسم خالص** (`full_name` = NULL).
 *  مثال حي: العميلة اللي دخلت ٢١:٠٣:٣٠ اتعمل ليها حساب واسمها فاضي، رغم إن
 *  واتساب مدّينا «Eman Ali» وإحنا مخزّنينه في `whatsapp_conversations`.
 *  النتيجة إن التطبيق كله بينادي العميل بـ«يا » فاضية.
 *
 *  ⚠️ الرقم بيتخزّن بأكتر من صيغة (`201…` · `01…` · LID) فبندوّر بكلهم،
 *     وبنرفض أي «اسم» طالع رقم تليفون (واتساب بيحط الرقم كاسم لما يكون
 *     الشخص مش في جهات الاتصال).
 */
async function lookupWaName(
  sb: ReturnType<typeof admin>,
  keys: string[],
): Promise<string | null> {
  // filter بدل [...new Set] — التارجت هنا ماعندوش downlevelIteration
  const uniq = keys.filter((k, i) => k && keys.indexOf(k) === i)
  if (!uniq.length) return null
  try {
    const { data } = await sb
      .from('whatsapp_conversations')
      .select('contact_name, last_message_at')
      .in('contact_phone', uniq)
      // 🐞 (١٦ أغسطس ٢٠٢٦) نفس بق الـNULLS FIRST — كان ممكن ياخد الاسم
      //    من محادثة فاضية بدل أحدث محادثة فيها كلام فعلي.
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(5)
    const rows = (data ?? []) as Array<{ contact_name?: string | null }>
    return (
      rows
        .map((r) => (r.contact_name || '').trim())
        .find((n) => n.length > 1 && !/^\+?[\d\s()-]+$/.test(n)) || null
    )
  } catch {
    return null // الاسم تحسين — عمره ما يوقف تسجيل الدخول
  }
}

/** رقم واتساب (2010xxxxxxxx) → Supabase session عبر magiclink hash.
 *  بيلاقي المستخدم أو يعمله، ويضمن صف profiles برقمه واسمه. */
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

  // 👤 الاسم: اللي الواجهة بعتته له الأولوية، وبعده اسم واتساب.
  const waName = await lookupWaName(sb, [normalized, local, lid].filter(Boolean) as string[])
  const displayName = (fullNameHint || waName || '').trim() || null

  // اعمل المستخدم لو مش موجود (لو موجود بيرجع email_exists وده تمام)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email, email_confirm: true,
    user_metadata: {
      ...(local ? { phone: local, via: 'whatsapp' } : { via: 'whatsapp_lid', lid }),
      ...(displayName ? { full_name: displayName } : {}),
    },
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
    const { data: prof } = await sb.from('profiles').select('id, phone, full_name').eq('id', userId).maybeSingle()
    if (!prof) {
      await sb.from('profiles').insert({
        id: userId, phone: local, full_name: displayName, role: 'customer',
      } as never)
    } else {
      // بنكمّل الناقص بس — عمرنا ما ندهس اسم أو رقم العميل كتبه بنفسه.
      const patch: Record<string, string> = {}
      if (!prof.phone && local) patch.phone = local
      if (!prof.full_name && displayName) patch.full_name = displayName
      if (Object.keys(patch).length) {
        await sb.from('profiles').update(patch as never).eq('id', userId)
      }
    }
  }

  // 🔗 (17 Jul 2026) توحيد 100%: نفس الدخلة تطلع كمان madmona_token
  // (جلسة madmona_sessions) — عشان /me و/my-projects والحجوزات القديمة
  // اللي بتعتمد عليه تشتغل من غير دخول تاني. best-effort.
  let madmonaToken: string | null = null
  let fullName: string | null = null
  if (normalized) { // التوكن القديم محتاج رقم — لو الحساب مربوط بـLID بنتخطاه
    try {
      const { data: mint } = await sb.rpc('wa_login_mint', { p_phone: normalized, p_full_name: displayName } as never)
      const m = mint as { success?: boolean; token?: string; full_name?: string } | null
      if (m?.success && m.token) { madmonaToken = m.token; fullName = m.full_name || null }
    } catch { /* التوكن القديم إضافة — مش شرط */ }
  }

  return {
    token_hash: linkData.properties.hashed_token, email,
    // الاسم اللي بيرجع للواجهة ولرسالة الترحيب — اسم واتساب لو التوكن القديم
    // مارجّعش حاجة (ده بيحصل مع الحسابات المربوطة بـLID).
    madmona_token: madmonaToken, phone: local, full_name: fullName || displayName,
  }
}

// ---------------------------------------------------------------- GET (poll)
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').toUpperCase()
  if (!/^MAD[A-Z0-9]{5}$/.test(code)) {
    return NextResponse.json({ error: 'bad_code' }, { status: 400 })
  }
  const sb = admin()
  // 🔒 (١٢ أغسطس ٢٠٢٦) حد معدل: الـpoll الشرعي = كود واحد كل ~ثانيتين
  // (~450 نداء في الـ15 دقيقة). 900/15د بيسمح بده ويقطع مسح الأكواد الجماعي.
  // 🏢 (٢٣ أغسطس ٢٠٢٦) مرفوع عشان المكتب المشترك — ١٠ موظفين بيعملوا poll كل
  //    ثانيتين لمدة ٥ دقايق = ~١٥٠٠ نداء من نفس الـIP، والحد القديم ٩٠٠.
  if (!(await rateLimitOk(sb, `wa-poll:${clientIp(req)}`, 5000, 900))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
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

  // 🐞 (٢٣ أغسطس ٢٠٢٦) كان `&& !data.session_minted_at` — يعني أول ما السيرفر
  //    يصك توكن، الكود بيموت. فلو المتصفح فشل بعد كده (اللي حصل مع نورا)
  //    الـpolling بيفضل يرجّع verified:false للأبد والمستخدم قافل عليه.
  //    دلوقتي finish بقى بيعيد الصك، فالـpoll لازم يفضل يقول verified.
  return NextResponse.json({ verified: !!data.verified, expired })
}

// ---------------------------------------------------------------- POST
export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const sb = admin()

  // ---- start: ولّد كود يبعته العميل للمارد
  if (body.action === 'start') {
    // 🔒 حد معدل: الإغراق بيملى الجدول.
    // 🏢 (٢٣ أغسطس ٢٠٢٦ — محمد: «نورا وعبير لسه مش عارفين يدخلوا») الحد كان
    //    ١٥/ساعة **لكل IP**، ومكتب مضمونة كله ورا راوتر واحد (197.37.176.158).
    //    يعني أول ٤-٥ موظفين بيدخلوا بيخلّصوا حصة المكتب كله، واللي بعدهم
    //    بياخد 429 وبيشوف «حصلت مشكلة — جرب تاني» ويفضل في اللوب ده للأبد.
    //    شفناها بالأرقام: wa-start عدّاد ١٤/١٥ و wa-finish ٩/١٠ ساعة ما سألنا.
    //    الكود نفسه عشوائي ومرة واحدة، فالحماية الحقيقية منه مش من الـIP.
    if (!(await rateLimitOk(sb, `wa-start:${clientIp(req)}`, 120, 3600))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    const code = genCode()
    const { error } = await sb.from('wa_inbound_verifications').insert({
      code, purpose: 'app_login', expected_phone: null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    } as never)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const text = encodeURIComponent(code)
    return NextResponse.json({
      code,
      wa_url: `https://wa.me/${await pickLoginWa(sb)}?text=${text}`,
    })
  }

  // ---- finish: الكود اتأكد من الويبهوك → سيشن
  if (body.action === 'finish') {
    // 🔒 حد معدل: finish هو اللي بيصك سيشن — ده الهدف الحقيقي لأي brute
    // force على الأكواد. مستخدم شرعي بيندهها مرة (أو مرتين لو الشبكة قطعت).
    // 🏢 (٢٣ أغسطس ٢٠٢٦) الحد بقى **على الكود** مش على الـIP. الـbrute force
    //    بيجرّب أكواد كتير مختلفة، فالحد على الكود هو اللي بيوقّفه فعلاً —
    //    أما الحد على الـIP فكان بيعاقب مكتب مضمونة كله (كل الموظفين ورا
    //    راوتر واحد) وبيمنع اللي بيدخل خامس. سايبين حد IP واسع كشبكة أمان.
    const code = (body.code || '').toUpperCase()
    if (!(await rateLimitOk(sb, `wa-finish-code:${code}`, 6, 600))
      || !(await rateLimitOk(sb, `wa-finish:${clientIp(req)}`, 120, 600))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
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
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 })
    }
    // 🐞 (٢٣ أغسطس ٢٠٢٦ — الجذر بتاع «نورا وعبير مش عارفين يدخلوا»)
    //
    //    الـpolling في WhatsAppLogin.tsx ممكن ينده finish **مرتين** لو نداء
    //    الـpoll خد أكتر من ثانيتين (نت موبايل بطيء) — التيك التاني بيبدأ قبل
    //    ما الأول يعمل clearInterval.
    //    اتأكدنا بالتجربة على البرودكشن إن نداء generateLink تاني لنفس
    //    الإيميل **بيبطّل التوكن الأول**:
    //        التوكن الأول بعد نداء تاني → 403 Email link is invalid or has expired
    //    فكانت النتيجة واحدة من اتنين، والاتنين بيرموا دخول صح في الزبالة:
    //      • التاني ياخد `already_used` → الواجهة تقول «حصلت مشكلة» وترمي
    //        التوكن الأول اللي كان **شغال**.
    //      • الاتنين يعدّوا → التوكن الأول يتبطّل → verifyOtp يفشل.
    //    بصمة نورا في الداتابيز مطابقة بالظبط: session_minted_at اتسجّل
    //    ٠٨:٤٤:٠٧ ومحصلش دخول، وبعدها بـ١٩ ثانية كود جديد (هي دايسة «جرب تاني»).
    //
    //    الحل: مانرفضش النداء التاني. طول ما الكود لسه مأكّد وماخلصش،
    //    بنصك توكن جديد ونرجّعه. الكود نفسه عمره ١٥ دقيقة ومربوط برقم
    //    اتأكد من مصدر رسالة الواتساب، فإعادة الصك مش بتفتح أي ثغرة —
    //    وحد الـ٦ نداءات على الكود فوق بيقفل الإغراق.
    const reMint = !!row.session_minted_at
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
      // مابنبعتش الترحيب تاني لو دي إعادة صك — العميل واخده خلاص
      if (!reMint) {
        await sendLoginWelcome(sb, {
          code,
          verifiedPhone: row.verified_phone,
          fullName: minted.full_name,
          next: body.next,
        })
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
    // 🔒 حد معدل: فتح لينك ممغنط = نداء واحد. التخمين الجماعي للتوكنات ممنوع.
    if (!(await rateLimitOk(sb, `wa-magic:${clientIp(req)}`, 30, 600))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
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
