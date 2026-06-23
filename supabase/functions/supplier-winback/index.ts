// supplier-winback v2 (14 Jun 2026) — حملة «المارد بيرشحك» per Mohamed.
//  v2 CHANGE: ممنوع نهائيًا ذكر الضرايب أو الرقم القومي — حتى بالنفي. ذكرها بيزرع القلق.
//  التركيز كله على الإيجابي: المارد بيرشحك + التسجيل دقيقتين سهل. بدون أي إشارة للتسجيل القديم أو أسباب التردد.
//  POST {dry_run:true} → preview. POST {limit:10} → enqueue. POST {phones:[...]} → target. POST {scheduled_at:'ISO'} → schedule.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SERVICE_KEY)
const SITE = 'https://madmonacairo.com'

async function getAnthropicKey(): Promise<string> {
  const { data } = await sb.rpc('get_anthropic_key')
  if (!data) throw new Error('no anthropic key')
  return data as string
}

function catContext(cat: string): { ar: string; demand: string } {
  const c = (cat || '').toLowerCase()
  if (c.includes('propert')) return { ar: 'عقارات', demand: 'ناس بتدور على شقق للإيجار والبيع كل يوم' }
  if (c.includes('vehicle')) return { ar: 'سيارات', demand: 'ناس بتسأل على عربيات للإيجار والبيع' }
  if (c.includes('medical') || c.includes('clinic')) return { ar: 'عيادات', demand: 'مرضى بيدوروا على دكاترة وعيادات قريبة' }
  if (c.includes('beauty')) return { ar: 'تجميل وبيوتي', demand: 'ستات بتدور على سنترات تجميل وعروض' }
  if (c.includes('tourism')) return { ar: 'سياحة ورحلات', demand: 'ناس بتدور على رحلات وبرامج سياحية' }
  if (c.includes('restaurant') || c.includes('food')) return { ar: 'مطاعم', demand: 'ناس جعانة بتدور على أكل وطلبات' }
  if (c.includes('workspace')) return { ar: 'مساحات عمل', demand: 'ناس بتدور على مكاتب وقاعات اجتماعات' }
  if (c.includes('media')) return { ar: 'معدات وميديا', demand: 'ناس بتدور على تصوير ومعدات' }
  if (c.includes('recreation')) return { ar: 'ترفيه', demand: 'ناس بتدور على حاجات ترفيهية' }
  if (c.includes('service')) return { ar: 'خدمات', demand: 'ناس بتدور على خدمات موثوقة' }
  if (c.includes('shop')) return { ar: 'منتجات', demand: 'ناس بتدور على منتجات تشتريها' }
  return { ar: 'منتجات وخدمات', demand: 'ناس بتدور على اللي بتقدمه' }
}

async function craftMessage(apiKey: string, name: string, cat: string): Promise<string> {
  const ctx = catContext(cat)
  const system = `إنت كاتب رسايل واتساب لمنصة «مضمونة» (بالضاد). عامية مصرية دافية، راقية، مختصرة (4-6 أسطر).
الرسالة لمورّد كلّمنا قبل كده وماكمّلش تسجيل — إحنا بندعيه يرجع يسجل.

الفكرة المحورية (إلزامي): «مضمونة عندها المارد — مساعد ذكي بيحقق أحلام المصريين، أي حاجة حد يطلبها بيلاقيها، ولمّا حد يسأل على حاجة في مجالك المارد بيرشحك إنت بالاسم». ده عرض فرصة.

سهولة التسجيل تتقال بإيجابية: «التسجيل دقيقتين — اسم ورقم وصور اللي بتقدمه، وخلاص».

⛔ ممنوع منعًا باتًا (حتى بالنفي أو التلميح): أي ذكر لـ «ضرايب» أو «رقم قومي» أو «بطاقة» أو «أوراق» أو «تعقيد» أو «التسجيل القديم كان صعب» أو «اتخضيت» أو أي سبب تردد. ماتفتحش المواضيع دي خالص — خلي الرسالة إيجابية 100٪ وبس عن الفرصة وسهولة التسجيل.

قواعد: مفيش «2019» ولا «أكبر منصة». السلوجان «معاملاتك مضمونة». اللينك ${SITE}/add-listing. ماتطلبش اسم أو إيميل. بلاش إيموجي كتير (2-3 كحد أقصى).
ارجع بالرسالة بس من غير أي مقدمات.`
  const user = `المورّد: ${name || 'صاحب البزنس'} · المجال: ${ctx.ar} · الطلب الحقيقي اللي على المنصة: ${ctx.demand}. اكتب الرسالة واذكر المجال والطلب بوضوح. فاكر: ممنوع تذكر ضرايب أو رقم قومي أو أي سبب تردد خالص.`
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 500, system, messages: [{ role: 'user', content: user }] })
  })
  const d = await r.json()
  let msg = d?.content?.[0]?.text?.trim() || ''
  msg = msg.replace(/مدمون[ةه]/g, 'مضمونة').replace(/2019|٢٠١٩/g, '').replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com)\/?\S*/gi, '')
  // صمام أمان: لو الموديل ذكر ضرايب/رقم قومي غصب عنه، نشيل السطر
  msg = msg.split('\n').filter(line => !/ضرايب|ضريب|رقم قومي|البطاقة|أوراق رسمي/.test(line)).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!/add-listing/.test(msg)) msg += `\n\n👉 ${SITE}/add-listing`
  return msg
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dry_run === true
    const limit = Math.min(Number(body.limit) || 10, 50)
    const phones: string[] | null = Array.isArray(body.phones) ? body.phones : null
    const scheduledAt: string | null = typeof body.scheduled_at === 'string' ? body.scheduled_at : null

    let q = sb.from('whatsapp_conversations')
      .select('contact_phone, contact_name, first_category, contact_type, last_inbound_at, metadata')
      .eq('contact_type', 'supplier_lead')
      .gte('last_inbound_at', new Date(Date.now() - 20 * 86400000).toISOString())
      .not('contact_phone', 'in', '("+201026222337","+201002229982")')
      .order('last_inbound_at', { ascending: false })

    if (phones) q = sb.from('whatsapp_conversations')
      .select('contact_phone, contact_name, first_category, contact_type, last_inbound_at, metadata')
      .in('contact_phone', phones)

    const { data: leads } = await q.limit(phones ? 50 : limit)
    const rows = (leads || []) as Array<any>
    if (!rows.length) return json({ ok: true, count: 0, note: 'no matching supplier leads' })

    const apiKey = await getAnthropicKey()
    const results: Array<any> = []
    for (const L of rows) {
      if (!dryRun) {
        const { data: dup } = await sb.from('whatsapp_outbound_queue')
          .select('id').eq('campaign', 'supplier_winback')
          .eq('recipient_phone', L.contact_phone)
          .in('status', ['pending', 'sending', 'sent'])
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(1)
        if (dup && dup.length) { results.push({ phone: L.contact_phone, skip: 'already_contacted' }); continue }
      }

      const msg = await craftMessage(apiKey, L.contact_name || '', L.first_category || '')
      if (!dryRun) {
        await sb.from('whatsapp_outbound_queue').insert({
          recipient_phone: L.contact_phone,
          recipient_name: L.contact_name || 'صاحب البزنس',
          message: msg, campaign: 'supplier_winback', agent_name: 'supplier-winback',
          status: 'pending',
          scheduled_at: scheduledAt,
          metadata: { category: L.first_category, reason: 'genie_winback', the_genie: true }
        })
      }
      results.push({ phone: L.contact_phone, name: L.contact_name, cat: L.first_category, msg })
    }
    return json({ ok: true, dry_run: dryRun, scheduled_at: scheduledAt, sent: results.filter(r => !r.skip).length, results })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
