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
  transport: 'baileys' | 'web'
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

function defaults(sessionId: string): WaNumberConfig {
  return {
    session_id: sessionId, label: null, persona: null,
    enabled: true, prefer_phone_jid: false, transport: 'baileys',
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
      transport: (data.transport as 'baileys' | 'web' | null) ?? 'baileys',
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
