// src/lib/wa-ack-gate.ts
// ============================================================================
// 🚦 بوابة تأكيد الوصول — البروتوكول المعتمد للإرسال الجماعي (محمد)
//
// القاعدة: **مايتبعتش أي رسالة جديدة قبل ما اللي قبلها تتأكد إنها وصلت فعلًا.**
//
// إزاي؟ OpenWA بيبعت حدث `message.ack` على الويبهوك
// (1 = وصلت السيرفر · 2 = اتسلّمت للجهاز · 3 = اتقريت)، والهاندلر في
// `/api/whatsapp/openwa` بيحوّل صف الحملة من `sent` لـ `delivered`/`read`.
// يعني أي صف لسه `sent` = **لسه ماوصلش**.
//
// الكلام ده كان متطبّق في `/api/cron/wa-paced-send` بس. الملف ده بيطلّعه
// لمكان واحد عشان أي مُرسِل تاني يستخدم نفس البوابة بدل ما يبعت على عماه.
//
// المنطق (متعلَّم من تشغيل حقيقي — التعليقات في wa-paced-send فيها التفاصيل):
//   · لسه في رسايل مستنية جوه المهلة  → استنى، ماتبعتش.
//   · كلهم عدّوا المهلة، بس الرقم سلّم أي حاجة في آخر ٦ ساعات
//     → المتأخرين دول موبايلاتهم مقفولة، كمّل عادي.
//   · كلهم عدّوا المهلة و**الرقم مسلّمش ولا حاجة** → الرقم ميت (بيقبل من
//     الـAPI ويرمي في الفراغ — اللي حصل مع 1551) → قِف واتقفل.
// ============================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'

export type AckGateResult =
  | { proceed: true }
  | {
      proceed: false
      halted: boolean
      reason: string
      waiting?: number
      waited_sec?: number
    }

export interface AckGateOptions {
  /** جلسة OpenWA اللي بتبعت منها (بتتقاس لوحدها — مش على مستوى الحملة) */
  session: string
  /** استنى الإيصال كام ملي‑ثانية قبل ما تعتبر الرسالة متأخرة */
  ackWaitMs: number
  /** يشوف حملة واحدة بس */
  onlyCampaign?: string
  /** يشوف كل الحملات ما عدا دول (للمُرسِل العام) */
  excludeCampaigns?: string[]
  /**
   * (١٧ أغسطس ٢٠٢٦) المسار ده هو الافتراضي؟ — رسايل `session` الفاضي بتتحسب عليه.
   * لما اتعمل «كل رقم بمسار» فضلت استعلام الانتظار **عالمي**: رسالة معلّقة
   * على رقم كانت بتوقف كل الأرقام، وقياس مسار بيتلوث برسايل مسار تاني.
   */
  sessionIsDefault?: boolean
  /** بيتنادى لما البوابة تقرر توقف الإرسال — المُرسِل هو اللي بيكتب الفلاج */
  onHalt: (reason: string) => Promise<void>
}

/** آخر كام رسالة نبص عليها في الشباك */
const WINDOW_LIMIT = 20
/** الشباك الزمني اللي بندوّر فيه على رسايل مستنية إيصال */
const LOOKBACK_MS = 60 * 60 * 1000
/** لو الرقم سلّم أي حاجة خلال الفترة دي يبقى سليم */
const HEALTH_WINDOW_MS = 6 * 60 * 60 * 1000

export async function ackGate(opts: AckGateOptions): Promise<AckGateResult> {
  const { session, ackWaitMs, onlyCampaign, excludeCampaigns, onHalt } = opts

  // ── الرسايل اللي اتبعتت ولسه مجاش لها إيصال ─────────────────────────
  let q = supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id, whatsapp_msg_id, sent_at')
    .eq('status', 'sent')
    // صف من غير معرّف رسالة **مستحيل** يجيله ack (اتبعت قبل إصلاح التقاط
    // الـid) — لو استنينا عليه البوابة بتتقفل للأبد على ماضٍ ميت.
    .not('whatsapp_msg_id', 'is', null)
    .gte('sent_at', new Date(Date.now() - LOOKBACK_MS).toISOString())
    .order('sent_at', { ascending: false })
    .limit(WINDOW_LIMIT)

  if (onlyCampaign) {
    q = q.eq('template_vars->>campaign_name', onlyCampaign)
  } else if (excludeCampaigns?.length) {
    q = q.not('template_vars->>campaign_name', 'in', `(${excludeCampaigns.join(',')})`)
  }

  // 🛣️ البوابة بتقيس **المسار بتاعها بس** — رسايل رقم تاني مش شغلتها
  q = opts.sessionIsDefault
    ? q.or(`session.eq.${session},session.is.null`)
    : q.eq('session' as never, session)

  const { data } = await q
  const waiting = (data ?? []) as Array<{ id: string; whatsapp_msg_id: string | null; sent_at: string }>
  if (!waiting.length) return { proceed: true }

  // ① لسه جوه المهلة → استنى
  const fresh = waiting.filter((w) => Date.now() - new Date(w.sent_at).getTime() <= ackWaitMs)
  if (fresh.length) {
    const newest = fresh.reduce((a, b) => (a.sent_at > b.sent_at ? a : b))
    return {
      proceed: false,
      halted: false,
      reason: 'مستني تأكيد وصول الرسالة اللي فاتت',
      waiting: fresh.length,
      waited_sec: Math.round((Date.now() - new Date(newest.sent_at).getTime()) / 1000),
    }
  }

  // ② عدّوا المهلة — الرقم ده بالذات سلّم أي حاجة؟
  const { count: delivered } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'outbound')
    .eq('session_id', session)
    .in('status', ['delivered', 'read'])
    .gte('created_at', new Date(Date.now() - HEALTH_WINDOW_MS).toISOString())

  if (!delivered) {
    const reason =
      `${waiting.length} رسالة من غير أي تأكيد تسليم خلال ` +
      `${Math.round(ackWaitMs / 60000)} دقيقة، ومفيش ولا إيصال في آخر 6 ساعات — الجلسة ${session}`
    await onHalt(reason)
    return { proceed: false, halted: true, reason, waiting: waiting.length }
  }

  // ③ الرقم بيسلّم → المتأخرين موبايلاتهم مقفولة، مايوقفوش الطابور
  return { proceed: true }
}
