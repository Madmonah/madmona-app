import type { SupabaseClient } from '@supabase/supabase-js'
import { sendText, resolveSessionForConversation } from '@/lib/whatsapp'

// =====================================================================
// 📩 رد ترحيب الدخول على واتساب — *رد* على رسالة الكود (مش رسالة باردة)
// -----------------------------------------------------------------
// العميل بعتلنا كود (MADxxxxx) عشان يدخل/يوثّق رقمه. الرد على رسالته
// ده *رد* مسموح ومابيسببش حظر (عكس الرسالة المتولّدة زي الـOTP). نستفيد
// إنه كلّمنا: نرحّب + نبعت اللينك اللي كان رايحه + لينك شات المارد.
//
// بنلاقي رسالة الكود الواردة في whatsapp_messages، ناخد منها المحادثة
// عشان نرد على *نفس الـ JID* اللي جت منه (يوصل حتى للرقم المخفي/LID).
// best-effort بالكامل — أي فشل هنا مايأثرش على الدخول/التوثيق نفسه.
//
// بيتستخدم في مكانين: مسار دخول الواتساب (api/auth/wa) وتوثيق رقم
// حساب جوجل (api/auth/complete-phone) — نفس الرسالة، مصدر واحد.
// =====================================================================
export async function sendLoginWelcome(
  sb: SupabaseClient,
  opts: { code: string; verifiedPhone: string; fullName?: string | null; next?: string | null },
): Promise<void> {
  try {
    const code = (opts.code || '').toUpperCase()
    if (!code) return
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
    if (!convId) return

    const { data: conv } = await sb
      .from('whatsapp_conversations')
      .select('metadata, session_id, contact_phone')
      .eq('id', convId)
      .maybeSingle()
    const c = conv as {
      metadata?: { wa_jid?: string } | null
      session_id?: string | null
      contact_phone?: string | null
    } | null

    const jid = c?.metadata?.wa_jid || undefined
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.madmonacairo.com').replace(/\/$/, '')
    const next = String(opts.next || '').trim()
    const dest = next.startsWith('/') ? next : next ? '/' + next : ''
    const nm = opts.fullName ? ` يا ${opts.fullName}` : ''
    const lines = [`أهلاً بيك${nm} في مضمونة 🧞`, `دخلت بنجاح ✅`]
    if (dest) lines.push('', 'كمّل اللي كنت بتعمله من هنا 👇', `${site}${dest}`)
    lines.push('', 'وأنا المارد — في خدمتك ٢٤/٧، اسألني أي حاجة من هنا 👇', `${site}/chat/marid`)

    if (jid || c?.contact_phone) {
      await sendText({
        to: c?.contact_phone || opts.verifiedPhone,
        jid,
        // إرسال لاحق مش رد لحظي — الرقم من آخر رسالة واردة فعلًا،
        // مش من صف المحادثة المتغيّر (شوف resolveSessionForConversation).
        session: (await resolveSessionForConversation(convId)) || c?.session_id || undefined,
        body: lines.join('\n'),
        conversationId: convId,
        agentName: 'المارد',
        aiGenerated: false,
      })
    }
  } catch (e) {
    console.error('[wa-welcome] reply failed (best-effort):', e)
  }
}
