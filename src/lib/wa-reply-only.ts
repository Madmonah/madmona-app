// src/lib/wa-reply-only.ts
// ============================================================================
// 🚨 حارس «رد بس» — بيمنع بدء محادثات جديدة مع ناس ماكلّموناش.
//
// ── ليه الحارس موجود أصلًا ───────────────────────────────────────────────
// ٢٠ يوليو ٢٠٢٦: واتساب حط بلوك على الرقم. البلوك كان على **بدء محادثات
// جديدة** بالتحديد — الرد على اللي بيكلّمنا فضل شغّال عادي. السبب: ٥٠ جروب
// و٣٥ رسالة استلام في يوم واحد. الحارس مش إجراء مؤقت — ده اللي كان
// المفروض يكون موجود من الأول.
//
// ── إيه اللي اتغيّر النهاردة (١٥ أغسطس ٢٠٢٦ — محمد: «شيل الحارس») ────────
// كان `process.env.MARID_REPLY_ONLY === '1'` — يعني:
//   ① تغييره محتاج Vercel + إعادة نشر، فمش ممكن تفتحه لحملة وتقفله بعدها.
//   ② **كله أو لا شيء**: لما يتشال بيتشال على كل مسارات الإرسال — الوكلاء،
//      إشعارات الحجز، الردود الآلية، كل حاجة. يعني عشان تبعت ٤٣ دعوة
//      عيادات كنت لازم تفتح الباب لكل شيء تاني في نفس اللحظة.
//
// دلوقتي في `whatsapp_config` بـ٣ أوضاع، والوسط هو المهم:
//   on        → امنع أي بدء محادثة (الافتراضي، وده السلوك القديم بالظبط)
//   campaigns → اسمح للحملات المكتوبة بالاسم بس — الباقي يفضل محمي
//   off       → مفيش حارس (زي ما كان قبل ٢٠ يوليو)
//
// ⚠️ لو الصفوف مش موجودة في الداتابيز بنقع على `MARID_REPLY_ONLY` القديم،
//    فالسلوك مايتغيرش لو حد مسح الإعدادات.
// ============================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'

export type ReplyOnlyMode = 'on' | 'campaigns' | 'off'

export interface ReplyOnlyConfig {
  mode: ReplyOnlyMode
  /** أسماء الحملات المسموح لها تبدأ محادثات — يخص وضع `campaigns` بس */
  campaigns: string[]
  /** جِه من الداتابيز ولا من متغيّر البيئة القديم */
  source: 'db' | 'env'
}

export const REPLY_ONLY_KEYS = {
  mode: 'reply_only_mode',
  campaigns: 'reply_only_campaigns',
} as const

/** السلوك القديم: `MARID_REPLY_ONLY=1` معناها امنع كل بدء محادثة. */
function envMode(): ReplyOnlyMode {
  return process.env.MARID_REPLY_ONLY === '1' ? 'on' : 'off'
}

function parseCampaigns(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function getReplyOnly(): Promise<ReplyOnlyConfig> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('key, value')
      .in('key', [REPLY_ONLY_KEYS.mode, REPLY_ONLY_KEYS.campaigns])

    const cfg: Record<string, string> = {}
    for (const r of ((data ?? []) as Array<{ key: string; value: string }>)) cfg[r.key] = r.value

    const raw = (cfg[REPLY_ONLY_KEYS.mode] ?? '').trim().toLowerCase()
    if (raw !== 'on' && raw !== 'campaigns' && raw !== 'off') {
      // مفيش صف، أو قيمة مش مفهومة → السلوك القديم. قيمة غلط **مابتفتحش**
      // الباب: `envMode()` بيرجع 'on' طول ما المتغيّر القديم = '1'.
      return { mode: envMode(), campaigns: [], source: 'env' }
    }

    return {
      mode: raw,
      campaigns: parseCampaigns(cfg[REPLY_ONLY_KEYS.campaigns]),
      source: 'db',
    }
  } catch {
    // الداتابيز مش راضية ترد؟ نرجع للسلوك القديم — الأأمن.
    return { mode: envMode(), campaigns: [], source: 'env' }
  }
}

/**
 * هل مسموح نبدأ محادثة جديدة مع حد ماكلّمناش؟
 * `campaign` = `template_vars->>'campaign_name'` بتاع الرسالة، لو موجود.
 */
export async function coldStartAllowed(campaign?: string | null): Promise<boolean> {
  const cfg = await getReplyOnly()
  if (cfg.mode === 'off') return true
  if (cfg.mode === 'on') return false
  // campaigns: مطابقة بالاسم بالظبط بعد trim — من غير حساسية لحالة الحروف.
  const name = (campaign ?? '').trim().toLowerCase()
  if (!name) return false
  return cfg.campaigns.some((c) => c.toLowerCase() === name)
}

/** بيحفظ الوضع والحملات. بيتجاهل أي وضع مش معروف. */
export async function saveReplyOnly(patch: {
  mode?: string
  campaigns?: string[] | string
}): Promise<ReplyOnlyConfig> {
  const rows: Array<{ key: string; value: string }> = []

  const m = (patch.mode ?? '').trim().toLowerCase()
  if (m === 'on' || m === 'campaigns' || m === 'off') {
    rows.push({ key: REPLY_ONLY_KEYS.mode, value: m })
  }

  if (patch.campaigns !== undefined) {
    const list = Array.isArray(patch.campaigns)
      ? patch.campaigns
      : parseCampaigns(String(patch.campaigns))
    rows.push({
      key: REPLY_ONLY_KEYS.campaigns,
      value: list.map((s) => s.trim()).filter(Boolean).join(','),
    })
  }

  if (rows.length > 0) {
    await supabaseAdmin.from('whatsapp_config').upsert(rows as never, { onConflict: 'key' })
  }

  return getReplyOnly()
}
