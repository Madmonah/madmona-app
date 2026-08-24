// src/lib/wa-number-config.ts
// إعداد/سياق مستقل لكل رقم واتساب للمارد.
//
// كل رقم (session_id) ممكن يكون ليه:
//   • persona  → سياق/شخصية إضافية تتحقن في برومبت الدماغ لهذا الرقم بس
//   • enabled  → لو false المارد يسجّل الرسالة ويسكت (زي paused بس على مستوى الرقم كله)
//   • label    → اسم ودّي للعرض في لوحة الأدمن
//
// الجدول: public.wa_number_configs (session_id primary key). RLS مفعّل والوصول
// من السيرفر بمفتاح الخدمة بس. لو مفيش صف للرقم → الافتراضي: شغّال بالبرومبت الأساسي.
import { supabaseUntyped } from '@/lib/supabase'

export interface WaNumberConfig {
  session_id: string
  label: string | null
  persona: string | null
  enabled: boolean
  /**
   * 🧪 (٢٥ يوليو ٢٠٢٦) يبعت على `<رقم>@s.whatsapp.net` بدل `<lid>@lid`.
   *
   * كل رسالة فشلت في التشخيص راحت على هوية LID، والرقم الوحيد اللي بيسلّم
   * جلساته اتفتحت **قبل** تحويل واتساب للـLID ومحفوظة على الديسك. ولوج
   * رايلواي بيوري `pendingPreKey` + `Closing session` على كل إرسال — يعني
   * جلسة تشفير جديدة بتتعلّق كل مرة وماتكملش.
   *
   * الفرضية: Baileys ٦.٧.٩ مش قادر يفتح جلسة **جديدة** مع هوية LID.
   * المفتاح ده بيجرّبها لكل رقم على حدة من غير ما نلمس الرقم الشغّال،
   * وبديل الترقية الخطرة. الرجوع = تحديث صف واحد.
   */
  prefer_phone_jid: boolean
  /**
   * 🚚 (٢٥ يوليو ٢٠٢٦) أنهي خدمة بتبعت لهذا الرقم:
   *   `baileys` → `wa-service`  (الرقم الأساسي — مربوط من شهور وبيسلّم، ماينفعش يتلمس)
   *   `web`     → `wa-web`      (whatsapp-web.js — واتساب ويب الرسمي في متصفح مخفي)
   *
   * التوجيه بالإعداد مش بالكود: نقل أي رقم من خدمة للتانية = تحديث صف واحد،
   * من غير نشر ومن غير ما الرقم التاني يتهز.
   */
  transport: 'baileys' | 'web' | 'openwa'
}

// ── حارس اللفة اللانهائية ──────────────────────────────────────────────────
// بقى عندنا أكتر من مارد على أرقام مختلفة. لو رقم مارد كلّم رقم مارد تاني —
// بالغلط أو أثناء اختبار — كل واحد فيهم هيرد على التاني للأبد: سبام على
// الرقمين وحرق توكينز بلا نهاية، ومفيش أي حاجة توقّفه من نفسها.
//
// فأي رسالة جاية من رقم إحنا مشغّلينه: تتسجّل، ومايتردّش عليها.
let maridNumbers: { at: number; set: Set<string> } | null = null

export async function isMaridNumber(phone: string | null | undefined): Promise<boolean> {
  const p = (phone || '').replace(/\D/g, '')
  if (!p) return false

  const now = Date.now()
  if (!maridNumbers || now - maridNumbers.at > 60_000) {
    try {
      const { data } = await supabaseUntyped.from('wa_number_configs').select('session_id')
      const set = new Set(
        ((data as Array<{ session_id: string }> | null) ?? [])
          .map((r) => (r.session_id || '').replace(/\D/g, ''))
          .filter(Boolean),
      )
      // عطل في القراءة مايتخزّنش كإنه الحقيقة — وإلا نفضل عميان دقيقة كاملة
      if (!set.size) return false
      maridNumbers = { at: now, set }
    } catch {
      return false
    }
  }
  return maridNumbers.set.has(p)
}

// ── 🤫 قاعدة السكوت (٢٤ أغسطس ٢٠٢٦) ────────────────────────────────────
// محمد: «أي رسالة تيجي للمارد من الفريق بتاعنا مش عايزه يتعامل معاها أبدًا
//        يعديها عادي، وأي رسالة تيجي من مارد لمارد نفس الكلام، وأي رقم
//        اتربط مارد قبل كده برضو مش عايز المارد يرد عليه»
//
// `isMaridNumber()` فوق كانت بتغطي حالة واحدة بس: الأرقام اللي **لسه**
// في `wa_number_configs`. دي كانت بتسيب تلات ثقوب:
//   • أرقام الفريق (سامية · شهد · عبير · أحمد …) — المارد كان بيردّ عليهم
//     كأنهم عملاء، وبيصرف توكينز ويسجّلهم ليدز.
//   • أرقام اتربطت مارد قبل كده واتشالت من الجدول — لقينا ٢٠١٢٨١٨١٤٦٧٥
//     (١٥ رسالة يوم ١ أغسطس) لسه كان بيترد عليه.
//   • أي رقم نقرّر نسكّته يدويًا.
//
// القرار كله بقى في `marid_should_skip(phone)` في الداتابيز — المطابقة على
// آخر ١٠ أرقام فـ`201…`/`01…`/`+201…` كلهم بيتلمّوا. بيرجّع:
//   'muted' · 'marid_number' · 'ex_marid_number' · 'team' · NULL (رد عادي)
//
// ⚠️ **الاستثناء للأدمن اتشال.** كان `isMaridNumber(phone) && !isAdmin(phone)`
//    عشان محمد يبعت أوامر الأدمن من ٠١٠٠٢٢٢٩٩٨٢. محمد كرّر التعليمة بالحرف
//    من غير أي استثناء، فالرقم بقى مسكّت زي أي رقم مارد — يعني **أوامر
//    الأدمن من واتساب وقفت**. الرجوع من غير نشر: صف في
//    `marid_skip_exceptions` بالرقم، والدالة بترجّع NULL على طول.
//
// ⚠️ مفيش كاش هنا عن قصد: الجدول بيتغيّر من الشاشة ومن التوظيف، ورسالة
//    واردة واحدة = استعلام واحد سريع. الكاش كان هيخلّي موظف جديد يترد عليه
//    دقيقة كاملة بعد ما يتضاف.
export type MaridSkipReason = 'muted' | 'marid_number' | 'ex_marid_number' | 'team'

export async function maridSkipReason(
  phone: string | null | undefined,
): Promise<MaridSkipReason | null> {
  const p = (phone || '').replace(/\D/g, '')
  if (!p) return null
  try {
    const { data, error } = await supabaseUntyped.rpc('marid_should_skip', { p_phone: p })
    if (error) throw new Error(error.message)
    return (data as MaridSkipReason | null) ?? null
  } catch (e) {
    // 🛡️ عطل في القراءة **مايفتحش الباب على البقّ**: بنرجع للحارس القديم
    //    (أرقام المارد بس). ده بيحمي من لفّة مارد↔مارد اللانهائية حتى لو
    //    الداتابيز واقعة، وبيسمح لرسايل العملاء تعدّي عادي.
    console.warn('[wa] marid_should_skip وقعت — بنرجع لحارس أرقام المارد:',
      e instanceof Error ? e.message : String(e))
    return (await isMaridNumber(phone)) ? 'marid_number' : null
  }
}

const SKIP_LABEL: Record<MaridSkipReason, string> = {
  muted: 'رقم مسكّت يدويًا',
  marid_number: 'رقم مارد',
  ex_marid_number: 'رقم كان مربوط مارد قبل كده',
  team: 'رقم من فريق مضمونة',
}
export function maridSkipLabel(r: MaridSkipReason): string {
  return SKIP_LABEL[r] ?? r
}

function defaults(sessionId: string): WaNumberConfig {
  return {
    session_id: sessionId, label: null, persona: null,
    enabled: true, prefer_phone_jid: false,
    // 🚨 (١٥ أغسطس ٢٠٢٦) كان `'baileys'` — وده **لغم**.
    //
    //    أي جلسة مالهاش صف في `wa_number_configs` كانت بتتوجّه لجسر
    //    Baileys **اللي اتشال من رايلواي**، فكل رسايلها بترجع HTTP 404.
    //    وde التناقض: `whatsapp.ts` مكتوب فيه بالنص «طالما OpenWA متظبط،
    //    كل الأرقام تعدّي منه… الافتراض الآمن هو الخدمة الشغالة، مش الصف
    //    الناقص» — والحارس هناك `transport || 'openwa'` عمره ما اشتغل
    //    لأن الافتراضي هنا كان دايمًا نص مش فاضي.
    //
    //    الدليل: صف `madmona-982` في الجدول ليبل مكتوب فيه حرفيًا
    //    «(فيكس 404 حملات)» — يعني حد اتصدم بنفس العطل قبل كده وحلّه
    //    بإضافة صف بدل ما يصلّح الافتراضي. `madmona-337` مالهاش صف،
    //    فوقعت في نفس الحفرة النهاردة: ٥ رسايل كلها HTTP 404.
    //
    //    دلوقتي أي رقم جديد يتربط من لوحة OpenWA بيشتغل على طول.
    transport: 'openwa',
  }
}

/**
 * بيرجّع إعداد الرقم. أي رقم من غير صف → الافتراضي الآمن (شغّال، بلا سياق إضافي).
 * أي عطل في القراءة → نفس الافتراضي، عشان قراءة الإعداد ماتوقفش الرد أبدًا.
 */
export async function getNumberConfig(
  sessionId: string | null | undefined,
): Promise<WaNumberConfig> {
  if (!sessionId) return defaults('')
  try {
    const { data } = await supabaseUntyped
      .from('wa_number_configs')
      .select('session_id, label, persona, enabled, prefer_phone_jid, transport')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!data) return defaults(sessionId)
    return {
      session_id: sessionId,
      label: (data.label as string | null) ?? null,
      persona: (data.persona as string | null) ?? null,
      enabled: (data.enabled as boolean | null) ?? true,
      prefer_phone_jid: (data.prefer_phone_jid as boolean | null) ?? false,
      transport: (data.transport as 'baileys' | 'web' | 'openwa' | null) ?? 'baileys',
    }
  } catch {
    return defaults(sessionId)
  }
}

/**
 * القسم اللي يتحقن في البرومبت لهذا الرقم — بيترجع فاضي لو مفيش سياق.
 * السياق **إضافي**: بيتلزّق فوق البرومبت الأساسي من غير ما يلغي أي قاعدة أساسية.
 */
export function numberPromptSection(cfg: WaNumberConfig): string {
  const persona = (cfg.persona || '').trim()
  if (!persona) return ''
  return `

═══════════════════════════════════════════════════════════
سياق خاص بالرقم ده${cfg.label ? ` — ${cfg.label}` : ''}
═══════════════════════════════════════════════════════════
${persona}

⚠️ ده سياق إضافي مخصوص للرقم ده — التزم بيه، بس من غير ما تكسر أي قاعدة أساسية فوق.`
}
