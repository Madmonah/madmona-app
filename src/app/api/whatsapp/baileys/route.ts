// src/app/api/whatsapp/baileys/route.ts
// يستقبل الرسايل الواردة من خدمة المارد (Baileys على Railway).
//
// ⚠️ كل نداء هنا متحقق من توقيعه الفعلي في lib/whatsapp.ts و lib/anthropic.ts

import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio as sharedTranscribe } from '@/lib/marid-media'
import { waitUntil } from '@vercel/functions'
import { supabase as supabaseAdmin, supabaseUntyped } from '@/lib/supabase'
import {
  upsertConversation,
  logInboundMessage,
  sendText,
  getConversationHistory,
  normalizePhone,
} from '@/lib/whatsapp'
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from '@/lib/anthropic'
import { MARID_TOOLS, runMaridTool, MADMONA_LINKS, recordLead } from '@/lib/marid-tools'
import {
  ADMIN_TOOLS,
  runAdminTool,
  isAdmin,
  logDirective,
  ADMIN_PROMPT,
} from '@/lib/marid-admin'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'
// 🏪 (٤ سبتمبر ٢٠٢٦) بوت البيزنس — رقم مربوط ببيزنس بيرد من كتالوجه هو بس
import { buildBusinessPrompt, type BusinessChannelContext } from '@/lib/agent-prompts/business-concierge'
// 💰 (١٦ أغسطس ٢٠٢٦) أرقام العمولة بتتحقن من الداتابيز وقت الرد — مش مكتوبة في البرومبت.
import { withLiveCommission } from '@/lib/commission'
import { getNumberConfig, numberPromptSection, maridSkipReason, maridSkipLabel } from '@/lib/wa-number-config'
import { notifyAdminsMaridReply, notifyAdminsPausedInbound } from '@/lib/admin-notify'
// 🧞 مخ المارد **المشترك** — كان فيه نسخة متكرّرة من الدالة دي هنا، واتشالت.
//    نسخة واحدة بس دلوقتي، فأي تعليمة جديدة تسري على كل الماردة على طول
//    (واتساب · المارد الرسمي على الموقع · أي مارد جديد).
import { callMaridWithTools } from '@/lib/marid-brain'

export const runtime = 'nodejs'
// ⏱️ (٢٨ يوليو) رفعناها من ٦٠ لـ٣٠٠ (Vercel Pro). رسايل الصوت/الصور كانت
// بتعدّي الـ٦٠ث (تفريغ صوت + رؤية صورة + حلقة الأدوات) فـVercel كان بيقطع
// الطلب قبل ما الرد يخرج — فالنص بيرد والميديا لأ. ٣٠٠ث تدّي مساحة كافية.
export const maxDuration = 300

interface BaileysMedia {
  mimetype: string
  filename: string | null
  seconds: number | null
  is_voice_note: boolean
  size_bytes: number
  data_base64: string
}

interface BaileysPayload {
  /** رقم المارد اللي الرسالة جت عليه — الرد لازم يخرج من نفس الرقم */
  session_id?: string
  reply_jid?: string
  is_lid?: boolean
  from: string
  name?: string | null
  message_id: string
  timestamp: number
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  text: string
  is_group?: boolean
  group_jid?: string | null
  media?: BaileysMedia | null
}

interface ConciergeReply {
  reply?: string
  /** 🤖 (٦/٩/٢٠٢٦) وضع بوت البيزنس بس — بيتسجّل في CRM البيزنس */
  lead?: { name?: string | null; interest?: string | null; intent?: string | null; wants_human?: boolean | null } | null
  intent_detected?: string
  needs_human_handoff?: boolean
  next_action?: string
  should_track_as_lead?: boolean
}

// ── تفريغ الصوت (Claude مابيسمعش — لازم مزود خارجي) ──────────────────────
// 🎙️ (٢ سبتمبر ٢٠٢٦) النسخة اللي كانت هنا اتشالت — كانت **أسوأ** من
//    اللي في marid-media.ts بتلات حاجات:
//      • whisper-large-v3-turbo (أقل دقة في العربي)
//      • اسم الملف ثابت 'voice.ogg' مهما كان النوع الحقيقي — وده بالظبط
//        الباج اللي marid-media بيحذّر منه: «الامتداد لازم يطابق النوع
//        الحقيقي — ده كان أصل البق كله». الملف m4a باسم .ogg = Whisper
//        بيفك تشفير ضوضاء ويطلّع كلام عربي مالوش معنى.
//      • مفيش temperature=0 ولا فلتر هلوسة
//    مصدر واحد بس دلوقتي: sharedTranscribe من @/lib/marid-media.
async function transcribeAudio(media: BaileysMedia): Promise<string | null> {
  return sharedTranscribe({ data_base64: media.data_base64, mimetype: media.mimetype })
}

// ── نداء Claude مع صور/PDF ────────────────────────────────────────────────
// callClaude بتاخد نص بس، فالحالة دي بننادي العميل مباشرة.
async function callClaudeWithMedia(
  systemPrompt: string,
  userText: string,
  blocks: Array<Record<string, unknown>>
): Promise<string> {
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: [...blocks, { type: 'text', text: userText }] as never }],
  })
  const first = res.content[0]
  return first && first.type === 'text' ? first.text : ''
}

// ── حفظ الميديا في الستوريدج ─────────────────────────────────────────────
//
// كنا بنبعت الملف لـClaude **وبنرميه**. النتيجة: صفر ملفات محفوظة،
// والمسودات بتتعمل من غير صور — والداتابيز بترفض نشر إعلان من غير صورة.
// فكل اللي بيبعتوا صور منتجاتهم كان شغلهم بيضيع.
//
// النظام القديم كان بيحفظ (whatsapp-webhook:401-474) وضاع في الترحيل.
//
// بيرجّع الرابط العام، ولو فشل بيرجّع null — الحفظ مايوقفش الرد أبدًا.
async function saveMedia(
  media: BaileysMedia,
  type: string,
  phone: string
): Promise<string | null> {
  try {
    const bucket =
      type === 'image' ? 'content-images' : type === 'video' ? 'project-media' : 'project-media'

    const ext =
      (media.filename?.split('.').pop() || '').toLowerCase() ||
      (media.mimetype.split('/')[1] || 'bin').split(';')[0]

    // 🆕 (4 Aug 2026) Add day-scoped sub-folder → `wa/{phone}/{YYYYMMDD}/{filename}`.
    // Sender-level isolation was already here (nice!). The date bucket adds finer
    // grouping so photos from the same sender's DIFFERENT projects/sessions can be
    // separated by the publish pipeline (e.g. HDP sending Talda on Mon + coastal on Tue
    // = two folders, so the intake never mixes them into one listing).
    // See wa-inbound-photo-mismatch.md — this is the fix for the intra-supplier case
    // that plain sender-scoping alone couldn't catch (Talda listing bug).
    const safePhone = (phone || 'unknown').replace(/\D/g, '') || 'unknown'
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const path = `wa/${safePhone}/${day}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

    const { error } = await supabaseUntyped.storage
      .from(bucket)
      .upload(path, Buffer.from(media.data_base64, 'base64'), {
        contentType: media.mimetype || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[save-media]', error.message)
      return null
    }

    const { data } = supabaseUntyped.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (err) {
    console.error('[save-media]', err instanceof Error ? err.message : err)
    return null
  }
}

// ── اللينكات الممغنطة ────────────────────────────────────────────────────
//
// أي لينك مضمونة في الرد بيتحوّل لـ /l/<token> يدخّل العميل تلقائي.
// من غيرها العميل بيوصل لصفحة الحجز وهو مش مسجّل دخول، فيسيبها —
// وده كان بيلغي أوردرات فعليًا.
//
// النظام القديم كان بيعمل ده (whatsapp-webhook:295-323) وضاع في الترحيل.
//
// ⚠️ لو التحويل فشل، بنرجّع اللينك العادي. الرد لازم يوصل.
const SITE_HOST = 'www.madmonacairo.com'

async function magnetizeLinks(text: string, phone: string): Promise<string> {
  if (!phone || !text.includes(SITE_HOST)) return text

  // مانحوّلش صفحات الدخول والتسجيل — دي المفروض تفضل زي ما هي
  const SKIP = ['/auth/', '/l/', '/supplier/login']

  const all: string[] = text.match(/https?:\/\/[^\s)]+/g) ?? []
  const urls = all.filter(
    (u, i) => all.indexOf(u) === i && u.includes(SITE_HOST) && !SKIP.some((s) => u.includes(s))
  )
  if (!urls.length) return text

  let out = text
  for (const url of urls.slice(0, 3)) {
    try {
      const nextPath = new URL(url).pathname + new URL(url).search
      const { data, error } = await supabaseUntyped
        .from('wa_login_tokens')
        .insert({
          phone,
          next_path: nextPath,
          expires_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          max_uses: 5,
        })
        .select('token')
        .maybeSingle()

      if (error || !data?.token) continue
      out = out.split(url).join(`https://${SITE_HOST}/l/${data.token}`)
    } catch {
      // اللينك يفضل زي ما هو
    }
  }
  return out
}


/* 📸→📝 (٢٤ أغسطس ٢٦) محمد: «يتم تفريغ الميديا أول بأول».
   الصوت متفرّغ فعلاً (Groq فوق). ده بيكمّل الصورة والـPDF: نداء هايكو
   صغير (سطر واحد، ~٩٠ توكن إخراج ≈ أجزاء من القرش) بيوصّف الميديا
   ويتكتب الوصف جوّه سجل الرسالة نفسه: «[صورة] لينك» ← «[صورة: شقة
   ١٢٠م بالمنيو والأسعار] لينك». getConversationHistory مش بتضغط
   الصف اللي فيه وصف — فسياق آخر ٣ رسايل بيبقى ليه معنى حتى لو كله
   ميديا. fire-and-forget: مايأخّرش الرد ولا يكسره لو فشل. */
async function enrichMediaTranscript(waMessageId: string, blocks: Array<Record<string, unknown>>) {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 90,
      system:
        'وصّف محتوى الميديا في سطر واحد قصير بالعربي — اللي يفيد البيع: ' +
        'نوع الحاجة، مواصفات ظاهرة، أسعار أو أرقام مكتوبة. من غير مقدمات خالص.',
      messages: [{ role: 'user', content: [...blocks, { type: 'text', text: 'الوصف:' }] as never }],
    })
    const t = res.content.find((c) => c.type === 'text')
    const desc = (t && t.type === 'text' ? t.text : '').replace(/\s+/g, ' ').trim().slice(0, 160)
    if (!desc) return
    const { data: row } = await supabaseUntyped
      .from('whatsapp_messages').select('id, body')
      .eq('wa_message_id', waMessageId).maybeSingle()
    if (!row) return
    const oldBody = String((row as { body?: string }).body || '')
    const newBody = oldBody.replace(/^\[(صورة|فيديو|ملف[^\]]*)\]/, (m) => m.slice(0, -1) + ': ' + desc + ']')
    if (newBody !== oldBody) {
      await supabaseUntyped.from('whatsapp_messages')
        .update({ body: newBody } as never)
        .eq('id', (row as { id: string }).id)
    }
  } catch { /* best-effort — التفريغ مايوقفش حاجة */ }
}

export async function POST(request: NextRequest) {
  // بنقبل السرّين الداخليين — نفس حدود الثقة (الاتنين على السيرفر بس).
  // WA_SERVICE_SECRET هو اللي Railway بيبعت بيه.
  // EDGE_GATEWAY_SECRET بيدّينا مسار اختبار بدل ما نستنى رسالة حقيقية
  // عشان نتأكد إن التعديل شغال — التخمين بيضيّع وقت.
  const secret = request.headers.get('x-madmona-secret')?.trim()
  const accepted = [process.env.WA_SERVICE_SECRET, process.env.EDGE_GATEWAY_SECRET]
    .map((s) => s?.trim())
    .filter(Boolean)

  if (!accepted.length || !secret || !accepted.includes(secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: BaileysPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  // ── ربط مُعرّف مخفي برقم حقيقي ──────────────────────────────────────
  // واتساب بيبعت الربط ده بنفسه (chats.phoneNumberShare / Contact.lid).
  // ده المصدر الرسمي — أدق بكتير من التخمين بالاسم.
  // ⚠️ (٢٥ يوليو ٢٠٢٦) بقى بيستقبل **دفعة**. wa-service كان بيبعت طلب لكل
  //    جهة اتصال، وأول ما رقم يتربط من جديد واتساب بيصبّ كل جهات الاتصال —
  //    آلاف الطلبات في ثواني، والخدمة بتغرق فالإرسال الحقيقي بيتزنق.
  //    بنقبل الشكلين: `{lid, phone}` (القديم) و`{batch:[{lid,phone}]}` (الجديد)
  //    عشان النشر مايكسرش أي طرف لو اتنشر واحد قبل التاني.
  if ((body as { kind?: string }).kind === 'lid_map') {
    const m = body as unknown as {
      lid?: string; phone?: string; sessionId?: string
      batch?: Array<{ lid?: string; phone?: string }>
    }
    const items = (m.batch?.length ? m.batch : [{ lid: m.lid, phone: m.phone }])
      .filter((x): x is { lid: string; phone: string } => !!x?.lid && !!x?.phone)

    if (items.length) {
      const now = new Date().toISOString()
      // إزالة تكرار على مستوى الدفعة — upsert بيرمي لو نفس المفتاح اتكرر جواها
      const seen = new Set<string>()
      const rows = items
        .filter((x) => !seen.has(x.lid) && seen.add(x.lid))
        .map((x) => ({
          lid: x.lid,
          phone: normalizePhone(x.phone),
          session_id: m.sessionId ?? null,
          updated_at: now,
        }))
      await supabaseUntyped.from('wa_lid_map').upsert(rows, { onConflict: 'lid' })
      console.log('[lid-map]', rows.length, 'مُعرّف من', m.sessionId ?? '—')

      // 🔗 (٢٥ يوليو ٢٠٢٦ — محمد): إصلاح رجعي فوري. أي محادثات قديمة اتسجّلت
      //    بالـLID كمفتاح (قبل ما الماب يوصل) بنرجّع مفتاحها للرقم الحقيقي —
      //    عشان ذاكرة العميل تتوحّد مع شات مضمونة وباقي الأرقام التلاتة.
      //    من غير الخطوة دي، العميل اللي واتسابه بيبان LID بيبقى «شخص تاني»
      //    عند المارد في كل قناة. الدالة آمنة: rekey بس، من غير حذف أو دمج.
      for (const r of rows) {
        if (!r.phone) continue
        try {
          await supabaseUntyped.rpc('wa_rekey_lid_conversations', {
            p_lid: r.lid,
            p_phone: r.phone,
          })
        } catch (e) {
          console.error('[lid-map] rekey فشل', r.lid, e)
        }
      }
    }
    return NextResponse.json({ ok: true, kind: 'lid_map', count: items.length })
  }

  // ── تحديث حالة رسالة صادرة (✓ اتبعت / ✓✓ اتسلّمت / seen اتقرت) ────────
  // wa-service بيبعت ده من messages.update. بنرفع الحالة بس (ماننزّلهاش —
  // تسلّم متأخر مايمسحش «اتقرت») عشان تبان في اللوحة وتساعدنا نعرف الرسالة
  // وصلت فعلًا ولا اتقطعت (مهم مع مشكلة التسليم على الرقم).
  if ((body as { kind?: string }).kind === 'status') {
    const s = body as unknown as { message_id?: string; status?: string }
    const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3 }
    if (s.message_id && s.status && rank[s.status]) {
      const { data: cur } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('status')
        .eq('wa_message_id', s.message_id)
        .limit(1)
        .maybeSingle()
      const curRank = rank[((cur as { status?: string } | null)?.status ?? '')] ?? 0
      if (rank[s.status] > curRank) {
        await supabaseUntyped
          .from('whatsapp_messages')
          .update({ status: s.status, status_updated_at: new Date().toISOString() } as never)
          .eq('wa_message_id', s.message_id)
      }
    }
    return NextResponse.json({ ok: true, kind: 'status' })
  }

  let phone = normalizePhone(body.from)

  // ⚠️ الـ JID الأصلي — ده اللي بنرد عليه.
  // واتساب بيبعت مُعرّف مخفي (`xxx@lid`) بدل الرقم لبعض المستخدمين.
  // لو رجّعنا تركيب رقم من الـ LID بنبعت لرقم مش موجود والرسالة بتضيع.
  const replyJid = body.reply_jid || undefined
  if (!phone && !replyJid) return NextResponse.json({ ok: true, skipped: 'invalid_sender' })

  // 🔗 حلّ الـLID → الرقم الحقيقي من wa_lid_map أول ما الرسالة تدخل.
  //    من غير كده كان الـLID بيتخزّن كـ contact_phone في المحادثة والمسودات،
  //    فالمسودات كانت تعلق (مطعم زي Rino) لأن ماينفعش نعمل حساب مورّد بـLID.
  //    دلوقتي المحادثة والمسودات والأدوات كلها بتشتغل بالرقم الحقيقي.
  //    (فشل الحل مايوقفش المعالجة — بنكمّل بالـLID زي ما هو.)
  if (body.is_lid) {
    try {
      const lid = (body.from || '').replace(/\D/g, '') || (replyJid || '').split('@')[0]
      if (lid) {
        const { data: m } = await supabaseUntyped
          .from('wa_lid_map')
          .select('phone')
          .eq('lid', lid)
          .maybeSingle()
        const mapped = (m as { phone?: string } | null)?.phone
        if (mapped) phone = normalizePhone(mapped)
      }
    } catch { /* نكمّل بالـLID */ }
  }

  try {
    // ── ٠أ) قاعدة السكوت — مين المارد مايردّش عليه ───────────────────────
    //
    // محمد (٢٤ أغسطس ٢٠٢٦): «أي رسالة تيجي للمارد من الفريق بتاعنا مش عايزه
    // يتعامل معاها أبدًا يعديها عادي، وأي رسالة تيجي من مارد لمارد نفس
    // الكلام، وأي رقم اتربط مارد قبل كده برضو مش عايز المارد يرد عليه»
    //
    // القرار كله في `marid_should_skip()` في الداتابيز — التفاصيل والأسباب
    // في `src/lib/wa-number-config.ts`. الرسالة **بتتسجّل زي ما هي** عشان
    // تفضل ظاهرة في مراجعة الواتساب، بس مفيش رد ومفيش نداء لكلود.
    //
    // ⚠️ الاستثناء اللي كان للأدمن (`&& !isAdmin(phone)`) **اتشال** بناءً
    //    على التعليمة دي — يعني أوامر الأدمن من واتساب من ٠١٠٠٢٢٢٩٩٨٢ وقفت.
    //    ترجع من غير نشر: صف في `marid_skip_exceptions` بالرقم.
    // 🔐 (٥ سبتمبر ٢٠٢٦) كود الدخول بيتأكّد **قبل** قاعدة سكوت المارد —
    //    عارض معرض أو موظف مسكّت كان بيبعت الكود ويتبلع بصمت.
    // ── ٠) كود تسجيل الدخول MADxxxxx ────────────────────────────────────
    const loginCode = (body.text || '').toUpperCase().match(/\bMAD[A-Z0-9]{5}\b/)?.[0]
    if (loginCode) {
      const { data: rowRaw } = await supabaseAdmin
        .from('wa_inbound_verifications')
        .select('id, verified, expires_at')
        .eq('code', loginCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const row = rowRaw as { id: string; verified: boolean; expires_at: string } | null

      if (!row) {
        await sendText({ to: phone, jid: replyJid, session: body.session_id, body: 'الكود ده مش موجود. ارجع للموقع واطلب كود جديد 🙏' })
        return NextResponse.json({ ok: true, login: 'unknown_code' })
      }
      if (new Date(row.expires_at) < new Date()) {
        await sendText({ to: phone, jid: replyJid, session: body.session_id, body: 'الكود ده انتهت صلاحيته. اطلب كود جديد من الموقع 🙏' })
        return NextResponse.json({ ok: true, login: 'expired' })
      }

      await supabaseAdmin
        .from('wa_inbound_verifications')
        .update({ verified: true, verified_phone: phone, verified_at: new Date().toISOString() } as never)
        .eq('id', row.id)

      await sendText({ to: phone, jid: replyJid, session: body.session_id, body: '✅ تم التأكيد! ارجع للموقع، هتلاقي نفسك دخلت.' })
      return NextResponse.json({ ok: true, login: 'verified' })
    }

    const skipReason = await maridSkipReason(phone)
    if (skipReason) {
      console.warn('[wa] رسالة اتسجّلت ومفيش رد', {
        from: phone, to: body.session_id, reason: skipReason, why: maridSkipLabel(skipReason),
      })
      const cid = await upsertConversation({
        phone,
        name: body.name ?? undefined,
        agentName: 'المارد',
        session: body.session_id,
      })
      if (cid) {
        await logInboundMessage({
          conversationId: cid,
          wa_message_id: body.message_id,
          body: body.text || `[${body.type}]`,
          messageType: body.type,
          session: body.session_id,
        })
      }
      return NextResponse.json({ ok: true, skipped: skipReason })
    }

    // ── ٠ح) 🤝 موظف بشري بيتعامل مع المحادثة؟ (٢٨/٨) ──────────────────
    //    الرسالة بتتسجّل عادي، بس المارد مايردّش عشان مايقاطعش الموظف.
    {
      const cid = await upsertConversation({
        phone, name: body.name ?? undefined, agentName: 'المارد', session: body.session_id,
      })
      if (cid) {
        let humanBusy = false
        let why = ''
        try {
          const { data: gate } = await (supabaseAdmin.rpc as unknown as (
            f: string, a: Record<string, unknown>,
          ) => Promise<{ data: unknown }>)('marid_should_reply', { p_conversation_id: cid })
          const g = gate as { should_reply?: boolean; reason?: string } | null
          if (g && g.should_reply === false
              && (g.reason === 'human_handling' || g.reason === 'human_recently_active')) {
            humanBusy = true
            why = g.reason || ''
          }
        } catch { /* لو الفحص فشل، المارد يرد عادي — السكوت أوحش */ }

        if (humanBusy) {
          console.warn('[wa] موظف بشري بيتعامل مع المحادثة — المارد ساكت', { from: phone, why })
          await logInboundMessage({
            conversationId: cid,
            wa_message_id: body.message_id,
            body: body.text || `[${body.type}]`,
            messageType: body.type,
            session: body.session_id,
          })
          return NextResponse.json({ ok: true, skipped: 'human_handling' })
        }
      }
    }

    // ── ٠ق) مفتاح الطوارئ ──────────────────────────────────────────────
    // إيقاف كامل للرد. **ماينفعش يتشغّل إلا في حالة قصوى** —
    // العميل بيستنى رد ومش بيوصله حاجة.
    //
    // ٢٠ يوليو: شغّلته لما فكرنا إن الرقم متوقف تمامًا. طلع البلوك على
    // **بدء المحادثات بس** والرد شغّال — فالإيقاف الشامل كان ضرر
    // زيادة. الحارس الصح هو MARID_REPLY_ONLY في مسار الإرسال:
    // بيرد على اللي بيكلّمنا، وبيمنع البدء مع اللي ماكلّمناش.
    const sendPaused = process.env.MARID_SEND_PAUSED === '1'
    // 🐛 (١٢ أغسطس ٢٠٢٦) كان `sendPaused && body.text` — رسالة ميديا من
    // غير نص (صورة/فويس، شائعة جدًا من الموردين) كانت بتعدّي المفتاح
    // وتتعالج ويترد عليها والمفتاح شغّال. دلوقتي أي رسالة فيها محتوى
    // (نص أو ميديا) بتتسجّل من غير رد.
    if (sendPaused && (body.text || body.media)) {
      const cid = await upsertConversation({
        phone,
        name: body.name ?? undefined,
        agentName: 'المارد',
        session: body.session_id,
      })
      if (cid) {
        await logInboundMessage({
          conversationId: cid,
          wa_message_id: body.message_id,
          body: body.text || `[${body.type}]`,
          messageType: body.type,
          session: body.session_id,
        })
      }
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'send_paused' })
    }

    // ── ٠ص) فلتر الضوضاء ───────────────────────────────────────────────
    // رقم واحد (LID) بعت ~١٨٠ رسالة فاضية في ساعتين — كل دقيقة تقريبًا.
    // مالهاش نص ولا ميديا: إشعارات حالة أو أحداث بروتوكول، مش كلام بني آدم.
    //
    // المارد ماكانش بيرد عليها (فيه حارس تحت)، بس كانت بتتسجّل كلها
    // في الداتابيز وبتستهلك استدعاء كامل للويبهوك. بنرميها من الأول.
    //
    // ⚠️ الشرط: **مفيش نص ومفيش ميديا**. أي رسالة فيها صورة أو صوت
    //    أو مستند لازم تعدّي حتى لو نصها فاضي — دي رسالة حقيقية.
    {
      const hasText = typeof body.text === 'string' && body.text.trim().length > 0
      const hasMedia = !!body.media
      const isMediaType = ['image', 'video', 'audio', 'voice', 'ptt', 'document', 'sticker'].includes(
        String(body.type || ''),
      )
      if (!hasText && !hasMedia && !isMediaType) {
        return NextResponse.json({ ok: true, skipped: 'empty', replied: false })
      }
    }

    // ── ٠أ) منع الرد المكرر ─────────────────────────────────────────────
    // Baileys بيعيد تسليم نفس الرسالة أحيانًا (إعادة اتصال، مزامنة أجهزة).
    // شوفنا ده فعليًا يوم ٢٠ يوليو: رد واحد اتبعت مرتين بفارق ثانية.
    // معرّف الرسالة من واتساب ثابت، فبنستخدمه كحارس.
    if (body.message_id) {
      const { data: seen } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id')
        .eq('wa_message_id', body.message_id)
        .limit(1)
        .maybeSingle()

      if (seen) {
        return NextResponse.json({ ok: true, skipped: 'duplicate', replied: false })
      }
    }

    // ── ١) المحادثة ─────────────────────────────────────────────────────
    // 🔀 (٢٥ يوليو ٢٠٢٦ — محمد): «اعمل مسار جديد لكل رقم، كل واحد يرد على
    //    اللي بعت ليه». المفتاح بقى (رقم العميل + رقمنا) — فكل رقم ليه خيطه
    //    ومابيدهسش حالة التاني. العملاء عملاء مضمونة والداتا مشتركة؛
    //    المفصول هو التوجيه بس.
    const conversationId = await upsertConversation({
      phone,
      name: body.name ?? undefined,
      agentName: 'المارد',
      session: body.session_id,
    })
    if (!conversationId) {
      return NextResponse.json({ ok: false, error: 'upsert_failed' }, { status: 500 })
    }

    // 📞 نربط المحادثة بالرقم اللي جت عليه — عشان أي إرسال لاحق
    //    (تذكير ميعاد، لينك استلام، تحويل لجروب) يعرف يخرج من
    //    نفس الرقم. العميل لازم يشوف رد من اللي كلّمه هو.
    //
    // ⚠️ بنحدّثها في *كل* رسالة واردة — مش بس لما تكون فاضية.
    // سامي كلّمنا قبل كده على الرقم القديم، وبعدين بعت على الجديد،
    // والصف كان لسة شايل الرقم القديم (المفصول) فالرد راح في الفراغ.
    // اللي بيحدّد الرقم هو آخر رسالة جت، مش أول واحدة.
    if (body.session_id) {
      await supabaseUntyped
        .from('whatsapp_conversations')
        .update({ session_id: body.session_id })
        .eq('id', conversationId)
    }

    // ── ١·٥) تسجيل مضمون للرسالة الواردة ────────────────────────────────
    // القاعدة (طلب محمد ٢٢ يوليو): «كل رسالة تتسجّل حتى لو الرد واحد».
    //
    // بنسجّلها **دلوقتي** — قبل حارس اللوب، ومعالجة الميديا (رفع + تفريغ)،
    // وانتظار الدفعة (٧ث)، والرد الذكي. كل دول ممكن يفشلوا أو ياخدوا وقت
    // طويل يوصل لـ timeout الدالة (٦٠ث)، وقبل التعديل ده كانت الرسالة
    // بتتسجّل بعدهم — يعني أي فشل قبل خطوة ٣ كان بيبلع الرسالة بصمت،
    // وحارس اللوب كان بيرجع من غير ما يسجّلها خالص.
    //
    // upsert idempotent (قيد فريد على wa_message_id) — فلو اتسجّلت تاني
    // تحت (تخصيب ميديا في خطوة ٣) بتحدّث نفس الصف مش بتتكرّر.
    const inboundLogged = await logInboundMessage({
      conversationId,
      wa_message_id: body.message_id,
      body: body.text || `[${body.type}]`,
      messageType: body.type,
      session: body.session_id,
    })
    if (!inboundLogged) {
      // ماقدرناش نسجّلها — ده عطل داتابيز حقيقي (نادر، لأن الـupsert بيبلع
      // التعارضات). نبلّغ في اللوج بوضوح بدل ما تضيع الرسالة في صمت.
      console.error('[baileys] فشل تسجيل رسالة واردة', body.message_id, phone || replyJid)
    }

    // ── ٠أ+) claim ذرّي للرد (بيكمّل الـpre-check فوق) ───────────────────
    // الـpre-check بالـSELECT فوق (٠أ) بيمسك أغلب المكرّرات، بس فيه سباق
    // TOCTOU: لو إعادتين تسليم لنفس الرسالة وصلوا في نفس اللحظة، الاتنين
    // ممكن يعدّوا (كلاهما شاف null) فيردّوا مرتين. الـclaim الذرّي هنا
    // (INSERT بقيد فريد) بيخلّي **واحد بس** يكمّل للرد. الرسالة اتسجّلت فوق
    // في خطوة ١·٥ فمفيش رسالة بتضيع — بس الرد بيطلع مرة واحدة.
    if (body.message_id) {
      const { data: claimedReply } = await supabaseUntyped.rpc('wa_claim_reply', {
        p_message_id: body.message_id,
      })
      if (claimedReply === false) {
        return NextResponse.json({
          ok: true,
          logged: true,
          replied: false,
          reason: 'duplicate_claimed',
        })
      }
    }

    // ✅ (٣١ يوليو ٢٠٢٦ — محمد اشتكى: بيبعت ردّين مختلفين على رسالة واحدة):
    // المعالجة الكاملة (انتظار الدفعة ١٢ث + استدعاء الذكاء الاصطناعي +
    // الأدوات) بتاخد وقت أطول من مهلة الـHTTP client بتاع OpenWA على
    // Railway، فهو بيعتبرها فشلت ويعيد إرسال نفس الرسالة بمعرّف تاني —
    // وكل استدعاء AI بيطلع صياغة مختلفة، فالعميل يشوف ردّين مختلفين فعليًا.
    // claim فوق (wa_claim_reply) بيمنع تكرار على نفس message_id بس مش
    // على إعادة بمعرّف جديد. الحل: نأكّد الاستلام لـOpenWA فورًا هنا
    // (بعد ما ملكنا حق الرد بالـclaim)، والمعالجة الحقيقية تكمل في
    // الخلفية بـwaitUntil — من غير ما تنتظر رد الـHTTP خالص.
    // 🐛 (١٩ أغسطس ٢٠٢٦ — محمد: «شوف الاعلانات كلها... مش عايز الاخطاء دي تاني»)
    //    اكتشفنا محادثة بعتت ٢٤ رسالة (صور+فيديوهات+نص كامل بسعر) واستدعت
    //    المارد فعلًا (سجّل في ai_usage_log)، لكن حصل استثناء (exception) في
    //    مكان ما بعد كده — قبل الإرسال أو أثناءه — ومفيش رد وصل للعميل
    //    خالص، ومفيش أي أثر في whatsapp_messages، ومفيش تنبيه لمحمد.
    //    الـcatch القديم كان بيعمل console.error بس — وده مش مرئي من غير
    //    لوج Vercel. لو حصل استثناء تاني، العميل يفضل ساكت وماحدش يعرف.
    //    الحل: نتتبّع هل رد فعلي اتبعت (repliedToCustomerThisRun)، ولو
    //    وقعنا قبل ما نبعت، نجرّب رد صادق بسيط + تنبيه لمحمد — كل واحد
    //    فيهم بمحاولة خاصة بيه عشان فشل واحد مايمنعش التاني.
    let repliedToCustomerThisRun = false
    waitUntil((async () => {
      try {
    // ── ٠ج·٥) حفظ وتخصيب الميديا — قبل فحص الإيقاف عمدًا ─────────────────
    // 🐛 (١١ أغسطس ٢٠٢٦): كانت الميديا بتترفع وتتخصّب (خطوة ٢/٣ الأصلية)
    // **بعد** فحص "المحادثة موقوفة؟" تحت. يعني أي عميل بيبعت صورة/صوت/فيديو
    // في محادثة status='paused' أو 'blocked'، الميديا مكانتش بترفع خالص على
    // Storage ولا بتتسجّل بالرابط — كانت بتتسجّل خام (`[image]` أو رقم سعر
    // مجرّد لو مفيش نص) من خطوة ١·٥ فوق، والصورة نفسها ضايعة تمامًا.
    // اتأكد من الداتا: محادثة 201125080210 (paused) — 11 صورة اتسجّلت
    // كأرقام أسعار من غير رابط بين 11:05–11:07.
    //
    // الحل: نرفع الميديا ونخصّب التسجيل **قبل** فحص الإيقاف. المارد لسه
    // مش بيرد لو المحادثة موقوفة (الفحص تحت باقي زي ما هو) — بس دلوقتي
    // الصورة/الصوت/الفيديو بيتحفظوا ويبان رابطهم في السجل حتى لو مافيش
    // رد، عشان الأدمن يقدر يرجع يشوفهم لما يفعّل المحادثة تاني.
    let userText = body.text || ''
    const mediaBlocks: Array<Record<string, unknown>> = []
    let savedMediaUrl: string | null = null
    /* 📸 (٢٤ أغسطس ٢٠٢٦) نتيجة لزق الصورة على الإعلان المستنّيها — بتتحقن
       في برومبت المارد عشان كلامه يبقى وصف للي حصل فعلًا. شوف تحت. */
    let photoAttach: Record<string, unknown> | null = null

    if (body.media) {
      const mt = body.media.mimetype || ''

      // نحفظ الأول — الملف بيضيع لو ماحفظناهوش دلوقتي
      savedMediaUrl = await saveMedia(body.media, body.type, phone)

      const isAudioType = body.type === 'audio' || mt.startsWith('audio/') ||
        ['voice', 'ptt'].includes(String(body.type || ''))

      if (isAudioType) {
        // ⏱️ (٢٨ يوليو) time-box التفريغ بـ٢٠ث — لو Groq بطيء/واقع مايعلّقش الطلب كله
        const transcript = await Promise.race([
          transcribeAudio(body.media),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 20000)),
        ])
        userText = transcript || body.text || '[رسالة صوتية — مش قادر أفرّغها دلوقتي]'
      } else if (body.type === 'image' && mt.startsWith('image/')) {
        mediaBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: body.media.data_base64 } })
        if (!userText.trim()) userText = 'العميل بعت الصورة دي — شوفها ورد عليه.'
      } else if (mt === 'application/pdf') {
        mediaBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.media.data_base64 } })
        if (!userText.trim()) userText = 'العميل بعت الملف ده — اقراه ورد عليه.'
      } else {
        userText = body.text || `[${body.type} — ${body.media.filename || mt}]`
      }

      // نخصّب سجل الرسالة فورًا بالرابط المحفوظ — بغض النظر هيرد المارد
      // ولا لأ. (upsert idempotent على wa_message_id.)
      const mtLog = body.media.mimetype || ''
      const isAudioLog = isAudioType
      const logBody = [
        isAudioLog
          ? '[صوت]'
          : body.type === 'image'
          ? '[صورة]'
          : body.type === 'video'
          ? '[فيديو]'
          : `[ملف: ${body.media.filename || mtLog}]`,
        userText.startsWith('العميل بعت') ? '' : userText,
        savedMediaUrl ?? '',
      ]
        .filter(Boolean)
        .join(' ')

      await logInboundMessage({
        conversationId,
        wa_message_id: body.message_id,
        body: logBody,
        messageType: body.type,
        session: body.session_id,
      })

      // 📸→📝 تفريغ فوري للصورة/الملف — fire-and-forget
      if (mediaBlocks.length > 0 && body.message_id) {
        void enrichMediaTranscript(body.message_id, mediaBlocks)
      }

      /* ── 📸 الصورة بتتلزق على الإعلان المستنّيها — **هنا، مش بأداة** ──
         محمد (٢٤ أغسطس ٢٠٢٦): «ولما يبعت الصور الاعلان ينزل باسمه وصورته
         … بس فعلا يكون الداتا بتاعت الاعلان محفوظة عندنا».

         ليه في الكود مش أداة للمارد؟ درس ١٨ و١٩ أغسطس: أي حاجة لازم تحصل
         فعلًا مايصحّش تكون معلّقة على إن النموذج «يفتكر» ينادي أداة. هنا
         الصورة بتتحفظ في الداتابيز الأول، وبعدين المارد بيتقاله اللي حصل.

         ⚠️ ومكانه هنا **قبل** حارس التجميع تحت عن قصد: لما العميل يبعت
            ١٩ صورة، الحارس بيرمي كل واحدة غير الأخيرة قبل ما توصل
            للنموذج — بس كلهم بيعدّوا من السطر ده، فالـ١٩ بيتلزقوا كلهم.

         `listing_attach_photos` بتلزق على المسودة اللي **إحنا طلبنا صورها**
         بس، وبتنشر الإعلان باسم صاحب الرقم (مش باسم الموظف اللي سجّله).
         أي عطل فيها مايوقفش الرد على العميل. */
      if (savedMediaUrl && body.type === 'image') {
        try {
          const { data: att, error: attErr } = await supabaseUntyped.rpc(
            'listing_attach_photos', { p_phone: phone, p_urls: [savedMediaUrl] },
          )
          if (attErr) console.warn('[wa] listing_attach_photos:', attErr.message)
          else if (att && (att as { matched?: boolean }).matched) {
            photoAttach = att as Record<string, unknown>
            console.log('[wa] صورة اتلزقت على إعلان', JSON.stringify(photoAttach).slice(0, 200))
          }
        } catch (e) {
          console.warn('[wa] listing_attach_photos وقعت:', e instanceof Error ? e.message : String(e))
        }
      }
    }

    // ── ٠ج) المحادثة موقوفة؟ ────────────────────────────────────────────
    // لو الأدمن أوقف المحادثة، المارد يسكت خالص. النظام القديم كان
    // بيعمل كده وضاع في الترحيل — فأي محادثة محمد أوقفها كان المارد
    // بيرجع يرد فيها من ورا ظهره.
    {
      const { data: conv } = await supabaseUntyped
        .from('whatsapp_conversations')
        .select('status, metadata, contact_name')
        .eq('id', conversationId)
        .maybeSingle()

      if (conv?.status === 'paused' || conv?.status === 'blocked') {
        // 🔔 (١٢ أغسطس ٢٠٢٦) محادثة موقوفة لسه بتستقبل رسايل = «ثقب أسود»:
        // العميل بيبعت والمارد ساكت ومحدش واخد باله. حصلت فعلًا مع مورد ضاحي
        // (201125080210): المحادثة اتقفلت ٧ أغسطس وفضل يبعت منتجات لحد ١١
        // أغسطس من غير رد ولا تنبيه — واتكشفت بالصدفة بعدها بيوم.
        // بننبّه محمد (واتساب + بوش) مرة كل ٦ ساعات كحد أقصى لكل محادثة
        // (الطابع الزمني في metadata عبر wa_meta_merge الذرّي — نفس أسلوب
        // wa_jid فوق، مايمسحش مفاتيح تانية). التنبيه best-effort ومايغيّرش
        // السلوك: المارد يفضل ساكت لحد ما محمد يفعّل المحادثة بنفسه.
        try {
          const meta = (conv.metadata ?? {}) as Record<string, unknown>
          const lastAlert = Date.parse(String(meta.paused_inbound_alert_at ?? '')) || 0
          if (Date.now() - lastAlert > 6 * 3600_000) {
            await supabaseUntyped.rpc('wa_meta_merge', {
              p_conv: conversationId,
              p_patch: { paused_inbound_alert_at: new Date().toISOString() },
            })
            const owner = process.env.OWNER_PHONE || '201002229982'
            const who = (conv.contact_name || '').trim() || phone || replyJid || 'عميل'
            const statusLabel = conv.status === 'blocked' ? 'محظورة' : 'موقوفة'
            await sendText({
              to: owner,
              // 📞 (١٢ أغسطس ٢٠٢٦) من غير session الإرسال بيقع على WA_SERVICE_URL
              // (جسر Baileys القديم — جلساته كلها مقطوعة) والتنبيه يضيع في صمت.
              // بنبعت من نفس الرقم اللي استقبل الرسالة (متسجّل في OpenWA أكيد).
              session: body.session_id || owner,
              body:
                `⏸️ *محادثة ${statusLabel} بتستقبل رسايل*\n\n` +
                `${who} بعت رسالة والمارد ساكت لأن المحادثة ${statusLabel} (${conv.status}).\n\n` +
                `«${(body.text || `[${body.type}]`).slice(0, 120)}»\n\n` +
                `الرسايل والميديا بتتسجّل عادي — بس مفيش رد. ` +
                `لو المفروض يرد، فعّل المحادثة من لوحة الأدمن:\n` +
                `https://${SITE_HOST}/admin/wa-review`,
            }).catch(() => {})
            void notifyAdminsPausedInbound({
              customerName: conv.contact_name,
              customerPhone: phone,
              status: conv.status,
              preview: body.text || `[${body.type}]`,
            })
          }
        } catch {
          // التنبيه مايوقفش حاجة — الرسالة اتسجّلت فوق وده الأهم
        }
        // الرسالة اتسجّلت فوق (خطوة ١·٥ + الميديا اتخصّبت فوق كمان) —
        // بنكتفي بإننا مانردّش
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: conv.status })
      }
    }

    // ── ٠ه) إعداد الرقم — سياق/تشغيل مستقل لكل رقم ───────────────────────
    // كل رقم (session_id) ممكن يكون ليه سياق خاص (persona) بيتحقن في برومبت
    // الدماغ، أو يتقفل بالكامل (enabled=false). القراءة آمنة: أي عطل → الافتراضي
    // (شغّال، بلا سياق إضافي) عشان الإعداد مايوقفش الرد أبدًا.
    // الأدمن مستثنى من الإيقاف — محمد لازم يقدر يوصل من أي رقم.
    const numberCfg = await getNumberConfig(body.session_id)
    if (!numberCfg.enabled && !isAdmin(phone)) {
      // الرسالة اتسجّلت فوق (خطوة ١·٥) — الرقم متوقّف فبنكتفي بإننا مانردّش
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'number_disabled' })
    }

    /* 💰 (٢٤ أغسطس ٢٦) محمد: «شوفلي حل في موضوع رسايل المارد اللي بفلوس كتير —
       اعمل تمبليت — أنا مش هقدر أدفع الفلوس دي كلها».

       سويتش عام يقطع مكالمات Claude تمامًا للردود الجايّة على واتساب.
       - `marid_reply_mode = 'off'`         → مانبعتش أي رد (المحادثة اتسجّلت فوق)
       - `marid_reply_mode = 'template'`    → نبعت رسالة تعريف قصيرة ثابتة وخلاص
       - غير كده                            → المارد يشتغل زي ما كان
       الأدمن مستثنى دايمًا — محمد لازم يقدر يجرّب من رقمه.

       ⚠️ ده الحلّ الرخيص الفوري لحد ما نبني تمبليتس مبنية على نيّة الرسالة. */
    if (!isAdmin(phone)) {
      const { data: modeRow } = await supabaseUntyped
        .from('whatsapp_config').select('value').eq('key', 'marid_reply_mode').maybeSingle()
      const mode = ((modeRow as { value?: string } | null)?.value || '').trim().toLowerCase()

      if (mode === 'off') {
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'marid_ai_off' })
      }
      if (mode === 'template') {
        const { data: tplRow } = await supabaseUntyped
          .from('whatsapp_config').select('value').eq('key', 'marid_reply_template').maybeSingle()
        const tpl = ((tplRow as { value?: string } | null)?.value || '').trim()
          || 'أهلاً 👋\nوصلت رسالتك لمضمونة. مندوبنا هيرد عليك في أقرب وقت — شكرًا لصبرك 🌿'
        try {
          const { data: cRow } = await supabaseUntyped
            .from('whatsapp_conversations').select('metadata').eq('id', conversationId).maybeSingle()
          const savedJid = ((cRow as { metadata: { wa_jid?: string } | null } | null)?.metadata || {})?.wa_jid
          await sendText({
            to: phone, jid: savedJid, session: body.session_id || undefined,
            body: tpl, conversationId, agentName: 'قالب', aiGenerated: false,
          })
        } catch { /* ماينفعش نوقّف كل حاجة عشان قالب فشل — الرسالة اتسجّلت */ }
        return NextResponse.json({ ok: true, logged: true, replied: true, reason: 'marid_template' })
      }
    }

    // ── ٠د) حارس اللوب ──────────────────────────────────────────────────
    // لو المارد بعت أكتر من الحد في ساعة على نفس المحادثة، يبقى فيه
    // دوران — بيوقف المحادثة وينبّه بدل ما يفضل يبعت.
    // الرقم اللي بيبعت كتير في وقت قصير بيتقفل من واتساب.
    // الأدمن مستثنى — محمد ممكن يبعت ٢٠ أمر ورا بعض وده طبيعي
    //
    // 🐞 (١٧ أغسطس ٢٠٢٦ — محمد: «إيه اللي كان مخلي الإعلانات متنزلش؟»)
    //    الحارس كان بيعد **كل** رسايل المارد في الساعة — من غير ما يفرّق
    //    بين لوب حقيقي وعميل نشيط. البايع 201061241199 بعت ٤ شقق ورا بعض،
    //    والمارد رد ١٢ رد طبيعي (أسئلة وتأكيدات نشر) في ٣٩ دقيقة — الحارس
    //    حسبهم لوب ووقف المحادثة، وكل الإعلانات اللي جت بعدها (سابا باشا
    //    وذا وان) وقعت في الصمت ليوم كامل.
    //
    //    الصح: اللوب الحقيقي بيبعت **أضعاف** ما بيستقبل. فالشرط بقى
    //    اتنين مع بعض: عدّى الحد، **و**صادره ٣ أضعاف وارد العميل أو
    //    أكتر. البايع النشيط (رسالة بترد على رسالة — النسبة ≈١) عمره
    //    ما هيتمسك، واللوب (٢٠ رسالة على رسالتين) هيتمسك زي الأول.
    const LOOP_LIMIT = Number(process.env.MARID_LOOP_LIMIT || 12)
    if (!isAdmin(phone)) {
      const hourAgo = new Date(Date.now() - 3600_000).toISOString()
      const { data: recentDirs } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('direction, created_at')
        .eq('conversation_id', conversationId)
        .gte('created_at', hourAgo)
        .order('created_at', { ascending: false })
        .limit(500)

      let count = 0
      let inboundCount = 0
      let lastOutboundAt: number | null = null
      for (const r of ((recentDirs ?? []) as Array<{ direction: string; created_at: string }>)) {
        if (r.direction === 'outbound') {
          count++
          if (lastOutboundAt === null) lastOutboundAt = new Date(r.created_at).getTime()
        } else inboundCount++
      }

      // ── ⏳ التهدئة التصاعدية (١٨ أغسطس ٢٠٢٦ — محمد: «خسرتني كتير النهاردة.
      //    عايزك تبعّد الرد: ٢٠ ثانية أول ٣ ردود، اتنين بعد كده دقيقة،
      //    وبعد كده دقيقتين وهكذا») — وقالها قبل كده أكتر من مرة.
      //
      //    القاعدة: كل ما المارد يرد أكتر على نفس المحادثة في الساعة،
      //    المسافة الإجبارية بين الرد والرد بتكبر:
      //      الردود ١–٣  → ٢٠ ثانية
      //      الردود ٤–٥  → دقيقة
      //      الردود ٦–٧  → دقيقتين
      //      وبعدها بتتضاعف كل ردّين (٤ دقايق، ٨...) بسقف ١٥ دقيقة.
      //
      //    💰 الفحص هنا **قبل نداء كلود خالص** — وقت التهدئة مفيش أي صرف:
      //    لا نداء ذكاء ولا رسالة. البوت اللي بيرد في ثانية بيلاقي سكوت،
      //    فاللوب بيموت جعان بعد ٣ ردود بدل ٣٥٢ (اللي حصلت مع 201552111468
      //    وكل رد فيها كان نداء كلود مدفوع). العميل البشري الطبيعي عمره
      //    ما بيحس بيها — محدش بيكتب أسرع من رد كل ٢٠ ثانية لمدة ساعة.
      //    (قاطع الفيضان في الداتابيز فوقها كضمانة أخيرة عند ٢٠/ساعة.)
      if (lastOutboundAt !== null && count >= 1) {
        const minGapMs =
          count < 3 ? 20_000
          : count < 5 ? 60_000
          : Math.min(60_000 * Math.pow(2, Math.floor((count - 3) / 2)), 15 * 60_000)
        const sinceLast = Date.now() - lastOutboundAt
        if (sinceLast < minGapMs) {
          console.log('[backoff] تهدئة تصاعدية — مش هنرد دلوقتي', {
            conversationId, count, sinceLast_s: Math.round(sinceLast / 1000),
            required_s: Math.round(minGapMs / 1000),
          })
          // الرسالة اتسجّلت فوق — لما العميل يبعت تاني بعد المهلة بنرد طبيعي
          return NextResponse.json({
            ok: true, replied: false, reason: 'backoff',
            replies_last_hour: count, wait_s: Math.round((minGapMs - sinceLast) / 1000),
          })
        }
      }

      if (count >= LOOP_LIMIT && count >= 3 * Math.max(inboundCount, 1)) {
        await supabaseUntyped
          .from('whatsapp_conversations')
          .update({ status: 'paused' })
          .eq('id', conversationId)

        console.error('[loop-guard] وقفت المحادثة', conversationId, 'بعد', count, 'رسالة')

        // تنبيه محمد — السكوت هنا أخطر من العطل
        const owner = process.env.OWNER_PHONE || '201002229982'
        await sendText({
          to: owner,
          // 📞 نفس إصلاح session بتاع تنبيه المحادثة الموقوفة (١٢ أغسطس ٢٠٢٦)
          session: body.session_id || owner,
          body:
            `⚠️ *حارس اللوب*\n\n` +
            `وقفت محادثة ${phone || replyJid} تلقائيًا — المارد بعت ${count} رسالة في ساعة.\n\n` +
            `شوف المحادثة، ولو تمام شيل الإيقاف من لوحة الأدمن.`,
        }).catch(() => {})

        return NextResponse.json({ ok: true, replied: false, reason: 'loop_guard' })
      }
    }

    // ── ٠ب) رد واحد للدفعة الواحدة ──────────────────────────────────────
    // الناس بتبعت كذا حاجة ورا بعض (٤ صور + وصف). لو ردّينا على كل
    // واحدة، بيوصله ٤ رسايل شبه متطابقة في دقيقة — وده بيطفّش.
    //
    // شفنا ده فعليًا يوم ٢٠ يوليو مع مورد بعت صور مشروعه.
    // النظام القديم كان فيه القاعدة دي واتفقدت في الترحيل.
    //
    // ⚠️ ده الحارس الحقيقي. النسختين اللي قبله فشلوا:
    //
    // (١) منع أي رد خلال ٤٥ث من آخر رد → منع ردود حقيقية على عملاء
    //     ردّوا بسرعة.
    // (٢) مقارنة وقت الرسالة بوقت آخر رد → فشل لما ٤ رسايل وصلوا في
    //     ثانية واحدة: اتفتحت ٤ عمليات **بالتوازي**، وكل واحدة شافت
    //     إن مفيش رد قبلها، فكلهم ردّوا. أربع رسايل في ٢١ ثانية،
    //     وأول رد تجاهل المنيو اللي وصل بعده بنص ثانية.
    //
    // الحل (زي النظام القديم): **استنى الأول، وبعدين اتأكد**.
    // بنستنى شوية، وبعدين نشوف: فيه رسالة أحدث مني وصلت؟
    //   • أيوة → اسكت. العملية بتاعتها هي اللي هترد وهتشوف كلامي في التاريخ.
    //   • لأ   → أنا آخر واحد في الدفعة → أرد، والرد يغطّي الدفعة كلها.
    //
    // الانتظار بيحل سباق التوازي لأن الفحص بيحصل **بعده** مش قبله.
    // ⚠️ الانتظار نفسه مكانه **بعد** ما الرسالة تتسجّل في الداتابيز
    //    (تحت، بعد `logInboundMessage`). لو استنينا قبل التسجيل،
    //    كل عملية بتدوّر على إخواتها وماتلاقيش حاجة — وده بالظبط
    //    اللي خلّى أول محاولة تفشل وترد أربع مرات تاني.

    {
      const { data: lastOut } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('created_at')
        .eq('conversation_id', conversationId)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // ⏱️ وقت وصول الرسالة على **ساعة السيرفر** (من تسجيلها في خطوة ١·٥) —
      //    نفس ساعة lastOutAt عشان المقارنة تبقى صح. قبل كده كنا بنستخدم
      //    body.timestamp من واتساب (ساعة تانية)، وأي فرق بين الساعتين كان
      //    ممكن يعتبر رسالة جديدة «متغطّية» فيسقّطها بصمت. للـredelivery:
      //    الـupsert بيحافظ على created_at الأصلي، فالمنطق يفضل صح.
      const { data: thisMsg } = body.message_id
        ? await supabaseUntyped
            .from('whatsapp_messages')
            .select('created_at')
            .eq('wa_message_id', body.message_id)
            .limit(1)
            .maybeSingle()
        : { data: null }
      const msgAt = thisMsg?.created_at ? new Date(thisMsg.created_at).getTime() : Date.now()
      const lastOutAt = lastOut?.created_at ? new Date(lastOut.created_at).getTime() : 0

      // 🔧 (#26ب — ٢٤ يوليو) الهامش اتقلّل من ٢٠٠٠ لـ٥٠٠ مللي ثانية.
      // نافذة الـ٢ث كانت بتبلع رسائل المتابعة الحقيقية: العميل يقرا رد المارد
      // ويبعت رسالة تانية بسرعة (خلال ثانية-اتنين) → الرسالة بتتسجّل في التاريخ
      // بس المارد مايردّش عليها (reason: debounced) = «بعت أكتر من رسالة مش بتوصل».
      // تجميع الدفعة الحقيقي بيتعامل معاه فحص hasNewer تحت (بعد BATCH_WAIT)، مش هنا.
      // ٥٠٠مللي بتكفي للريدليفري (الـupsert بيحافظ على created_at الأصلي < آخر رد
      // فبيتمسك برضه) وللسباق اللحظي بين تسجيل الرسالة وكتابة الرد — من غير ما
      // تبلع متابعة بني آدم (محدش بيقرا ويرد في نص ثانية).
      const alreadyCovered = lastOutAt > 0 && msgAt < lastOutAt + 500

      if (alreadyCovered) {
        // ريدليفري أو رسالة وصلت في نفس اللحظة اللي بعتنا فيها الرد — متغطّية
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'debounced' })
      }
    }

    // لو الراسل بمُعرّف مخفي — نحفظ الـ JID بتاعه.
    // ده الفرصة الوحيدة: مفيش طريقة نوصله بعد كده غير بالـ JID ده،
    // فلو ماحفظناهوش دلوقتي، أي رسالة إحنا نبدأها ليه هتضيع.
    if (body.is_lid && replyJid) {
      // دمج ذرّي — العمود فيه مفاتيح تانية (زي supplier_kind) والدمج بيحافظ
      // عليها. read-modify-write القديم كان ممكن يمسح wa_jid لو بلوك تاني
      // (الليد السخن) كتب metadata في نفس اللحظة → العميل يبقى غير قابل للوصول.
      await supabaseUntyped.rpc('wa_meta_merge', {
        p_conv: conversationId,
        p_patch: { wa_jid: replyJid, is_lid: true },
      })
    }

    // ── ١ب) ليد سخن ─────────────────────────────────────────────────────
    // رقم إحنا كلّمناه قبل كده (حملة أو تواصل) ورد علينا = فرصة حقيقية.
    // القديم كان بينبّه محمد فورًا وضاع في الترحيل.
    // بنبعت التنبيه مرة واحدة كل ٢٤ ساعة عشان مانغرقهوش.
    void (async () => {
      try {
        const { data: conv } = await supabaseUntyped
          .from('whatsapp_conversations')
          .select('message_count, contact_name')
          .eq('id', conversationId)
          .maybeSingle()

        if ((conv?.message_count ?? 0) > 6) return

        const { data: firstMsg } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('direction')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        // لو أول رسالة في المحادثة كانت مننا → يبقى إحنا اللي بدأنا
        if (firstMsg?.direction !== 'outbound') return

        // claim ذرّي — واحد بس من إخوة الدفعة المتزامنين بياخد حق الإرسال
        // (compare-and-swap على hot_lead_alerted)، فمفيش تنبيه مكرّر،
        // والدمج الذرّي مش بيمسح wa_jid.
        const { data: claimed } = await supabaseUntyped.rpc('wa_claim_hot_lead', {
          p_conv: conversationId,
        })
        if (!claimed) return

        const owner = process.env.OWNER_PHONE || '201002229982'
        await sendText({
          to: owner,
          // 📞 نفس إصلاح session بتاع تنبيه المحادثة الموقوفة (١٢ أغسطس ٢٠٢٦)
          session: body.session_id || owner,
          body:
            `🔥 *ليد سخن*\n\n` +
            `${conv?.contact_name || phone} رد على المارد.\n\n` +
            `«${(body.text || `[${body.type}]`).slice(0, 150)}»\n\n` +
            `المحادثة: ${MADMONA_LINKS.لوحة_المورد.replace('/supplier/dashboard', '/admin/wa-review')}`,
        })
      } catch {
        // التنبيه مايوقفش الرد أبدًا
      }
    })()

    // ── ١أ) الأدمن ──────────────────────────────────────────────────────
    // كل أمر من محمد بيتسجّل **قبل** أي معالجة.
    // حتى لو المارد فهم غلط أو التنفيذ وقع، الأمر محفوظ في
    // admin_directives ومحمد يقدر يراجع. مفيش أمر بيضيع.
    const senderIsAdmin = isAdmin(phone)
    if (senderIsAdmin && (body.text || '').trim()) {
      void logDirective(phone, body.text, body.type)
    }

    // ── ١ج) تسجيل الليد ─────────────────────────────────────────────────
    // كل رقم بيكلّمنا = عميل محتمل. القديم كان بيسجّله ويقيّمه وضاع.
    // بيشتغل في الخلفية — مايوقفش الرد.
    void recordLead({
      phone,
      name: body.name,
      isSupplier: false, // بيتحدّث لو who_is_this طلّعه مورد
      intent: null,
    })

    // ── ٢/٣) فهم المحتوى والتسجيل ────────────────────────────────────────
    // 🐛 (١١ أغسطس ٢٠٢٦): انتقل لفوق (خطوة ٠ج·٥) — قبل فحص "المحادثة
    // موقوفة؟" — عشان الميديا تترفع وتتسجّل بالرابط حتى لو المارد
    // مش هيرد. userText / mediaBlocks / savedMediaUrl محسوبين فوق بالفعل.

    // ── جمع الدفعة ────────────────────────────────────────
    // دلوقتي بس — بعد ما الرسالة اتسجّلت — نقدر نستنى ونشوف إخواتها.
    //
    // الناس بتبعت على دفعات: سلام، وبعده المنيو، وبعده الأسعار، وبعده
    // السؤال. لو كل رسالة ردّت لوحدها، بيطلع أربع ردود وأولهم أعمى
    // عن اللي جه بعده. ده اللي حصل مع Yuri Sushi: أربع ردود في ٢١ث،
    // وأول واحد قال «أقدر أساعدك في إيه» والمنيو كان واصل قبله بنص ثانية.
    //
    // بنستنى شوية وبعدين نشوف: فيه رسالة أحدث **منّي أنا** (مش من
    // وقت عشوائي)؟
    //   • أيوة → أسكت، هي اللي هترد وهتشوف كلامي في التاريخ
    //   • لأ   → أنا آخر واحد في الدفعة → أرد رد واحد يغطّيها كلها
    //
    // ⚠️ المقارنة لازم تكون بوقت رسالتي أنا. لو قارنّا بنافذة زمنية،
    //    كل واحد هيلاقي إخواته جوّه النافذة وهيسكت — ومحدش يرد خالص.
    //    بوقتي أنا، بالظبط **واحد** هو اللي مالقاش حد أحدث منه.
    //
    // والفحص **بعد** الانتظار مش قبله — وده اللي بيحل سباق التوازي.
    {
      const BATCH_WAIT_MS = Number(process.env.MARID_BATCH_WAIT_MS || 12000)

      const { data: mine } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('id, created_at')
        .eq('conversation_id', conversationId)
        .eq('wa_message_id', body.message_id)
        .maybeSingle()

      // 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «الراجل بعت ومحدش رد عليه» + «تكلفة
      //    المارد عالية شوية»)
      //
      //    الانتظار كان **من غير أي فحص قبله**. يعني بايع يبعت ١٩ صورة =
      //    ١٩ نداء ويبستهوك، كل واحد بيفضل نايم ١٢ ثانية جوّه فانكشن
      //    سيرفرلس. ده ٢٢٨ ثانية تنفيذ عشان رد **واحد**.
      //
      //    البايع ده بعت ٦٠+ صورة النهاردة في تلات دفعات. في ساعة ٤ العصر
      //    وصل ١٢ رسالة وطلع رد **واحد**، ومن ١٥:٤٢ لـ١٧:١٥ مفيش ولا نداء
      //    واحد للموديل (اتأكدت من `ai_usage_log`) — الويبهوكس كانت بتتخنق
      //    على بعضها والرسايل بتضيع من غير أي أثر.
      //
      //    الحل: **نبص قبل ما ننام**. اللي لاقى حد أحدث منه خلاص يرجع
      //    فورًا (صفر ثانية بدل ١٢). واللي ممكن يكون آخر واحد بس هو اللي
      //    ينام ويعيد الفحص. في دفعة ١٩ صورة ده بيوفّر ١٨ × ١٢ث = ٢١٦ ثانية.
      //
      // ⚠️ الفحص التاني **بعد** النوم لازم يفضل موجود: هو اللي بيحل سباق
      //    التوازي لما رسالتين يوصلوا في نفس اللحظة. ده فحص **زيادة**
      //    قبله، مش بديل عنه.
      const newerThanMine = async (): Promise<boolean> => {
        const { data: sibs } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('id, created_at')
          .eq('conversation_id', conversationId)
          .eq('direction', 'inbound')
          .gte('created_at', mine!.created_at)
        const mineT = new Date(mine!.created_at as string).getTime()
        const mineId = String(mine!.id)
        return (sibs || []).some((s: { id: string; created_at: string }) => {
          const t = new Date(s.created_at).getTime()
          return t > mineT || (t === mineT && String(s.id) > mineId)
        })
      }

      if (mine?.created_at) {
        // فحص رخيص قبل النوم — بيقصّ الدفعة كلها ما عدا آخر واحد
        if (await newerThanMine()) {
          return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'batched_early' })
        }

        await new Promise((r) => setTimeout(r, BATCH_WAIT_MS))

        // 🔧 (٢٤ يوليو) كسر تعادل حاسم لمنع «رسالتين ورا بعض»:
        // الفحص كان `.gt(created_at)` بس. لو رسالتين وصلوا في نفس الجزء من
        // الثانية (نفس created_at بالظبط) ولا واحدة تشوف التانية «أحدث» →
        // الاتنين يردّوا. دلوقتي «أحدث مني» = وقت أكبر، أو نفس الوقت و id أكبر
        // → بالظبط واحد (الأكبر) هو اللي يرد، والباقي يسكت. المقارنة في JS
        // أأمن من فلتر توقيت في الكويري.
        if (await newerThanMine()) {
          return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'batched' })
        }
      }
    }

    if (!userText.trim() && mediaBlocks.length === 0) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٤) الرد الذكي ───────────────────────────────────────────────────
    // getConversationHistory بترجع {role, content} جاهزة — بنحوّلها نص
    // لأن callClaude بتاخد رسالة واحدة بس.
    /* 💰 (٢٤ أغسطس ٢٦) محمد: «عايزه يقرا آخر ٣ محادثات فقط لا غير — سواء
       مبعوتين من عندنا أو من عنده، وبريف الرسالة لو مبعوت من عنده هيبيّن
       سياق المحادثة».

       - ٣ رسايل بس بدل ١٠. لسه كافية إن المارد يفتكر آخر تبادل.
       - كل رسالة بتترجّع للسياق بريف قصير (١٨٠ حرف) بدل النص الكامل —
         عشان لو العميل بعت مقال، مانبعتش المقال كله في كل رد بعده. */
    const HIST_TURNS = 3
    const PREVIEW_LEN = 180
    const history = await getConversationHistory(conversationId, HIST_TURNS + 1)
    const preview = (t: string) => {
      const one = (t || '').replace(/\s+/g, ' ').trim()
      return one.length > PREVIEW_LEN ? one.slice(0, PREVIEW_LEN) + '…' : one
    }
    const historyText = history
      .slice(0, -1) // آخر واحدة هي الرسالة الحالية
      .slice(-HIST_TURNS)
      .map((h) => `${h.role === 'user' ? 'العميل' : 'المارد'}: ${preview(h.content)}`)
      .join('\n')

    const userMessage = historyText
      ? `سياق المحادثة السابقة:\n${historyText}\n\n---\nرسالة العميل الحالية:\n${userText}`
      : userText

    // 📚 (٢٨/٨) محمد: «خليه يتعامل مع محادثة جديدة بدل ما يقول عطل فني».
    //    أخطاء الرصيد والضغط بتروح للمكتبة هنا — مابتوصلش للـcatch الخارجي.
    // 🏪 (٤ سبتمبر ٢٠٢٦) الرقم المستقبِل بتاع بيزنس مربوط؟ (supplier_wa_channels)
    //    لو أيوه: برومبت مقفول على كتالوجه، وصفر أدوات. أرقام مضمونة مش في
    //    الجدول → null → السلوك القديم بالظبط. أي عطل في القراية = مش بيزنس.
    let biz: BusinessChannelContext | null = null
    try {
      const { data: bizCtx } = await (supabaseUntyped.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('business_channel_context', { p_session: body.session_id ?? '' })
      if (bizCtx && typeof bizCtx === 'object' && (bizCtx as { supplier_id?: string }).supplier_id) {
        biz = bizCtx as BusinessChannelContext
      }
    } catch { biz = null }

    let maridApiFailed = false
    let raw = ''
    try {
      raw = await callMaridWithTools({
        // البرومبت الأساسي + سياق الرقم (لو موجود) — كل رقم بشخصيته/سياقه
        systemPrompt: biz
          ? buildBusinessPrompt(biz)
          : (await withLiveCommission(CUSTOMER_CONCIERGE_PROMPT)) + numberPromptSection(numberCfg),
        businessMode: !!biz,
        userMessage,
        mediaBlocks,
        senderPhone: phone,
        senderName: body.name ?? null,
        savedMediaUrl,
        photoAttach,
        admin: senderIsAdmin,
        // 📊 للقياس بس (٣ أغسطس ٢٠٢٦) — مالهمش أي أثر على البرومبت ولا الرد
        channel: 'whatsapp',
        conversationId,
      })
      // 🧠 (٢٨/٨) الرد نجح؟ نعلّمه للمكتبة — كنسخة احتياطية للمرة
      //    الجاية لو الدماغ مش متاح. محمد: «أي رد متفعّل يتضاف
      //    للمكتبة».
      try {
        const parsed = JSON.parse(raw || '{}') as { reply?: string }
        // 🤖 (٦/٩/٢٠٢٦) رد بوت البيزنس مايدخلش مكتبة المارد — كتالوج بيزنس واحد مش معرفة عامة
        if (!biz && parsed?.reply && parsed.reply.length > 15) {
          void (supabaseAdmin.rpc as unknown as (
            f: string, a: Record<string, unknown>,
          ) => Promise<unknown>)('marid_learn', {
            p_question: userMessage,
            p_reply: parsed.reply,
            p_source: 'brain',
          })
        }
      } catch { /* التعلّم تحسين مش شرط */ }
    } catch (brainErr) {
      maridApiFailed = true
      const em = brainErr instanceof Error ? brainErr.message : String(brainErr)
      // 🔍 الرصيد · الحد · الضغط · الانقطاع — كلها بتتعالج بنفس الطريقة
      console.warn('[marid] الدماغ مش متاح — بنرد من المكتبة:', em.slice(0, 140))
      try {
        const { data: lib } = await (supabaseAdmin.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }>)('marid_offline_reply', { p_text: body.text || '', p_phone: phone })
        raw = (typeof lib === 'string' && lib.trim())
          ? JSON.stringify({ reply: lib.trim() })
          : ''
      } catch { raw = '' }
      if (!raw) {
        raw = JSON.stringify({ reply:
          'أنا معاك 🌟\nمضمونة فيها عقارات · سيارات · مطاعم · خدمات · أثاث — ومعاملاتك مضمونة.\n'
          + 'قولّي محتاج إيه بالظبط وأنا أساعدك: https://madmonacairo.com/marketplace' })
      }
      // 🔔 تنبيه محمد — العميل ماشافش أي عطل، بس إحنا لازم نعرف
      try {
        await supabaseAdmin.rpc('fire_admin_alert', {
          p_title: '🧞 المارد رد من المكتبة (الدماغ مش متاح)',
          p_body: em.slice(0, 300),
          p_severity: 'warning',
        })
      } catch { /* التنبيه مايوقفش الرد */ }
    }

    // البرومبت بيطلب JSON — بنفك بأمان ولو فشل نستخدم النص كما هو
    let parsed: ConciergeReply = {}
    try {
      parsed = parseJsonResponse<ConciergeReply>(raw)
    } catch {
      parsed = { reply: raw }
    }

    // إنقاذ الرد: لو الـJSON اتقطع، بنستخرج النص الخام بدل ما نسكت.
    // السكوت أوحش حاجة — العميل بيفتكر إننا مش موجودين.
    let reply = (parsed.reply || '').trim()
    if (!reply && raw.trim().length > 15) {
      reply = raw.trim().replace(/^\s*\{[\s\S]*?"reply"\s*:\s*"/, '').replace(/"[\s\S]*$/, '')
      if (reply.length < 15) reply = raw.trim().slice(0, 900)
    }

    if (!reply) {
      // آخر خط دفاع — بلاغ لمحمد بدل ما العميل يتساب في السكوت
      console.error('[empty-reply]', conversationId, raw.slice(0, 120))
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'empty_reply' })
    }

    // ── تنسيق واتساب ─────────────────────────────────────────────────
    // واتساب بيعمل عريض بنجمة واحدة `*كده*`. النموذج بيكتب `**كده**`
    // (تنسيق ماركداون)، فالعميل بيشوف النجوم حرفيًا على الشاشة —
    // وده شكل مكسور بيوحي إن اللي بيرد آلة. بنصلّحه قبل الإرسال
    // بدل ما نعتمد على إن النموذج يفتكر.
    reply = reply
      .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '*$1*')
      .replace(/\*\*([\s\S]+?)\*\*/g, '*$1*')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // 💬 دعوة لإكمال المحادثة على شات مضمونة — قناة مملوكة وتوصيلها مضمون
    //    (رقم الواتساب ممكن يكون متحفّظ فمش كل رسالة بتوصّل). اللينك بيتمغنط
    //    تحت لـ /l/<token> فبيسجّل دخول العميل بضغطة واحدة ويفتحله الشات بهويته.
    //
    // ⚠️ (٢٥ يوليو ٢٠٢٦) كانت بتتلزق **من غير شرط**. النموذج نفسه بيكتب نفس
    //    الجملة أحيانًا في رده، فالعميل كان بيشوفها **مرتين ورا بعض بلينكين
    //    مختلفين**. الحل ساعتها: نلزقها بس لو مش مكتوبة أصلاً.
    //
    // 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «شيل موضوع كمل كلامك مع المارد وحط لينك
    //    الموقع وقول إن المارد متفعّل على الموقع، وشيل التكرار»)
    //
    //    الشرط القديم كان بيمنع التكرار **جوّه الرسالة الواحدة** بس —
    //    مش عبر المحادثة. فكل رسالة كانت بتاخد نسخة. الأرقام من آخر
    //    أسبوعين: ٩٠٠ رد، **٥٩٪** منهم فيهم اللينك، و**٥٠ محادثة من ٩٨**
    //    وصلها ٣ مرات أو أكتر، وواحدة وصلها **١٤ مرة**. بايع واحد شاف
    //    نفس السطر ٨ مرات في ١٠ دقايق — ده بيقرا كـسبام آلي، مش كخدمة.
    //
    //    التغييرين: (١) الصيغة بقت «المارد متفعّل على الموقع» ولينك
    //    الموقع نفسه بدل /chat/marid، و(٢) بتتبعت **مرة واحدة بس في
    //    عمر المحادثة**.
    //
    // ⚠️ بنسأل الداتابيز مش الذاكرة: السيرفرلس بيقوم وينام، وأي كاش
    //    في الرام معناه إن اللينك يرجع يتكرر بعد أول cold start.
    // ⚠️ بندوّر على **الجملة** مش على اللينك. لو دوّرنا على اسم الموقع
    //    هنلاقيه في كل رسالة فيها لينك إعلان منشور (وده بيحصل كتير)،
    //    فالدعوة مكانتش هتتبعت ولا مرة. الجملة دي مالهاش مصدر تاني.
    const CTA_MARK = '/?utm=wa' // للقياس — منين جه اللي دخل الموقع
    const CTA_SENTENCE = 'المارد متفعّل على موقع مضمونة'
    const alreadyInvited = await (async () => {
      try {
        const { data } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('direction', 'outbound')
          .ilike('body', `%${CTA_SENTENCE}%`)
          .limit(1)
        return !!(data && data.length)
      } catch {
        // لو الاستعلام وقع، الأأمن إننا **مانبعتش** — تكرار اللينك ضرره
        // أكبر من إن حد يفوته مرة.
        return true
      }
    })()

    // ولو الرد نفسه فيه لينك خلاص (لينك إعلان مثلاً) مابنكوّمش لينكين
    // ورا بعض — الدعوة تستنى الرسالة الجاية.
    // 🤖 (٦/٩/٢٠٢٦) بوت البيزنس بيمثّل البيزنس مش مضمونة — مفيش دعوة لشات مضمونة
    if (!biz && !alreadyInvited && !reply.includes(SITE_HOST)) {
      reply += `\n\nومتنساش إن ${CTA_SENTENCE} كمان — تقدر تكمّل معايا من هناك في أي وقت 👇\nhttps://${SITE_HOST}${CTA_MARK}`
    }

    // اللينكات تتمغنط قبل الإرسال — العميل يدخل بضغطة واحدة
    reply = await magnetizeLinks(reply, phone)
    if (biz) {
      // 🔎 (٦/٩/٢٠٢٦) تشخيص مؤقت: إيه اللي الموديل رجّعه في lead بالظبط
      console.warn('[business-lead] parsed', JSON.stringify({ keys: Object.keys(parsed), lead: parsed.lead ?? null, head: raw.slice(0, 160) }))
    }

    // 📇 (٦/٩/٢٠٢٦) محمد: «يظبط ليه الليد» — كل عميل بيكلّم رقم البيزنس بيتسجّل في
    //    CRM البيزنس (biz_customers) + إشعار لصاحب البيزنس. مايوقفش الرد لو فشل.
    // بيتسجّل لو فيه أي اهتمام — «none» بس لما مفيش اسم ولا طلب (سلام وخلاص)
    if (biz && parsed.lead && ((parsed.lead.intent ?? 'warm') !== 'none' || parsed.lead.interest || parsed.lead.name)) {
      try {
        await (supabaseAdmin.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<unknown>)('business_bot_record_lead', {
          p_supplier_id: biz.supplier_id, p_phone: phone, p_name: parsed.lead.name ?? null,
          p_interest: parsed.lead.interest ?? null, p_intent: parsed.lead.intent ?? 'warm',
          p_wants_human: parsed.lead.wants_human === true, p_message: userMessage.slice(0, 300),
        })
      } catch (e) { console.warn('[business-lead]', e instanceof Error ? e.message : e) }
    }

    const sent = await sendText({
      to: phone,
      jid: replyJid,
      // 📞 الرد يخرج من نفس الرقم اللي الرسالة جت عليه.
      //    من غير كده اللي كلّم الرقم التاني ممكن يجيله رد من الأول.
      session: body.session_id,
      body: reply,
      conversationId,
      agentName: 'المارد',
      aiGenerated: true,
    })
    // محاولة إرسال حقيقية حصلت (نجحت أو فشلت بوضوح) — الرد بقى مسجّل
    // في الـresponse مش استثناء صامت. الـcatch تحت مايبعتش رد احتياطي تاني.
    repliedToCustomerThisRun = true

    // إشعار بوش للأدمن على كل رد من المارد (best-effort) — بعد الإرسال فمايأخّرش
    // رد العميل. إلا لو المتكلّم نفسه أدمن.
    if (sent.ok && !senderIsAdmin) {
      await notifyAdminsMaridReply({ customerName: body.name, customerPhone: phone, preview: reply, channel: 'whatsapp' })
    }

    return NextResponse.json({
      ok: true,
      logged: true,
      replied: sent.ok,
      intent: parsed.intent_detected,
      handoff: parsed.needs_human_handoff ?? false,
      error: sent.error,
    })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        console.error('[baileys webhook bg]', msg)

        // 📚 (٢٨/٨) رد من المكتبة بدل إعلان العطل — العميل ياخد قيمة
        //    والمحادثة تكمل. بنعرف السبب من الرسالة عشان التنبيه بس.
        let offlineReply: string | null = null
        try {
          const { data: lib } = await (supabaseAdmin.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }>)('marid_offline_reply', { p_text: body.text || '', p_phone: phone })
          if (typeof lib === 'string' && lib.trim()) offlineReply = lib.trim()
        } catch { /* المكتبة نفسها فشلت — تحت فيه رد أخير */ }

        // 🛟 شبكة أمان — استثناء غير متوقع حصل قبل ما نرد على العميل خالص.
        //    بدون كده العميل بيفضل ساكت من غير أي أثر ومحمد ماعندوش أي فكرة
        //    (السبب اللي اكتشفناه في محادثة ٩٠٠٢٦٥٦c يوم ١٩ أغسطس). كل
        //    محاولة هنا لوحدها في try/catch — فشل واحدة مايمنعش التانية.
        if (!repliedToCustomerThisRun) {
          try {
            await sendText({
              to: phone,
              jid: replyJid,
              session: body.session_id,
              // 📚 المكتبة أولًا — ولو فشلت، رد عام مفيد **من غير ذكر أي عطل**
              body: offlineReply
                || 'أنا معاك 🌟\nمضمونة فيها عقارات · سيارات · مطاعم · خدمات · أثاث — ومعاملاتك مضمونة.\n'
                 + 'قولّي محتاج إيه بالظبط وأنا أساعدك، أو اتفرج على المعروض من هنا:\nhttps://madmonacairo.com/marketplace',
              conversationId,
              agentName: 'المارد',
              aiGenerated: false,
            })
          } catch { /* لو الرد الاحتياطي نفسه فشل، على الأقل التنبيه تحت هيوصل */ }

          try {
            await supabaseAdmin.rpc('fire_admin_alert', {
              p_title: '⚠️ المارد وقع من غير ما يرد',
              p_body: `محادثة ${conversationId} (${phone}) — استثناء: ${msg.slice(0, 300)}`,
              p_url: '/admin/wa-review',
              p_severity: 'warning',
              p_source: 'baileys-webhook-guard',
            })
          } catch { /* التنبيه نفسه مايوقفش أي حاجة */ }
        }
      }
    })())

    return NextResponse.json({ ok: true, accepted: true, logged: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[baileys webhook]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'madmona baileys webhook' })
}
