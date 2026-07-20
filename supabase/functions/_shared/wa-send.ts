// supabase/functions/_shared/wa-send.ts
//
// 🎯 مساعد الإرسال الموحّد لدوال Supabase Edge.
//
// دوال Deno مابتقدرش تستورد من src/lib، فبتنادي البوابة الداخلية
// في تطبيق Next.js بدل ما تنادي Graph API مباشرة.
//
// ليه؟ قبل ٢٠ يوليو ٢٠٢٦ كان فيه ١٨ مكان بينفّذ الإرسال بنفسه.
// لما القناة اتغيّرت من Cloud API للمارد، كلهم وقعوا مع بعض.
// دلوقتي القناة بتتغيّر في مكان واحد والكل بيمشي وراها.
//
// الاستخدام:
//   import { waSend } from '../_shared/wa-send.ts'
//   const r = await waSend({ to: '201002229982', text: 'أهلاً' })
//
// المتغيرات المطلوبة في الدالة:
//   APP_BASE_URL      = https://www.madmonacairo.com
//   EDGE_GATEWAY_SECRET = نفس اللي في Vercel (سر مخصّص للبوابة)

interface WaSendArgs {
  to: string
  text: string
  conversationId?: string
  agentName?: string
  aiGenerated?: boolean
  /** رقم المارد اللي هيخرج منه الرد — لازم يبقى نفس اللي العميل كلّمه */
  session?: string
}

interface WaSendResult {
  ok: boolean
  wa_message_id?: string | null
  error?: string
}

export async function waSend(args: WaSendArgs): Promise<WaSendResult> {
  // @ts-ignore Deno
  const base = (Deno.env.get('APP_BASE_URL') || 'https://www.madmonacairo.com').replace(/\/$/, '')
  // @ts-ignore Deno
  const secret =
    Deno.env.get('EDGE_GATEWAY_SECRET') ||
    Deno.env.get('WA_SERVICE_SECRET') ||
    Deno.env.get('CRON_SECRET') ||
    ''

  if (!secret) {
    return { ok: false, error: 'EDGE_GATEWAY_SECRET ناقص في أسرار الدالة' }
  }

  try {
    const res = await fetch(`${base}/api/internal/wa-send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({
        to: args.to,
        text: args.text,
        conversation_id: args.conversationId,
        agent_name: args.agentName ?? 'المارد',
        ai_generated: args.aiGenerated ?? false,
        session: args.session,
      }),
    })
    const data = await res.json().catch(() => ({}))
    return {
      ok: !!data?.ok,
      wa_message_id: data?.wa_message_id ?? null,
      error: data?.error,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بالبوابة' }
  }
}
