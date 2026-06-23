// demand-matchmaker v1 (13 Jun 2026) — owner order: when a customer asks for something we don't have,
// look at cold leads + WhatsApp history (suppliers we already talked to) and reach out so the deal lands on Madmona.
// Flow per NEW customer_demand_requests row:
//   1. extract keywords from requested_item (+ category_guess)
//   2. find candidate suppliers:
//      a. whatsapp_conversations (supplier_lead / restaurant_supplier) whose history matches keywords — warm, talked before
//      b. cold_leads matching category/business_name/notes — colder, scraped/known
//   3. queue up to 3 outreach messages in whatsapp_outbound_queue (campaign 'demand_match') —
//      existing queue sender + trg_enforce_whatsapp_policy handle delivery & template policy
//   4. mark request status='matching' with candidates in notes; digest to Mohamed's admin number
// Cron: every 15 min. Also callable on-demand from admin-command.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE = 'https://madmonacairo.com'
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const STOPWORDS = new Set(['عايز', 'عاوز', 'عايزة', 'محتاج', 'محتاجة', 'في', 'من', 'على', 'اللي', 'ده', 'دي', 'لو', 'مع', 'أو', 'و', 'يا', 'عند', 'عندكم', 'متاح', 'موجود', 'حاجة', 'ال'])

function normAr(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function keywords(item: string): string[] {
  return normAr(item).split(' ')
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 5)
}

function digitsTail(p: string): string { return (p || '').replace(/\D/g, '').slice(-10) }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const { data: demands } = await sb.from('customer_demand_requests')
      .select('id, contact_phone, contact_name, requested_item, category_guess, conversation_id, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(10)
    const rows = (demands || []) as Array<any>
    if (rows.length === 0) return json({ ok: true, processed: 0 })

    const { data: adminCfg } = await sb.from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
    const adminPhone = (adminCfg as { value?: string } | null)?.value || ''

    const digestLines: string[] = []
    let processed = 0

    for (const d of rows) {
      const kws = keywords(String(d.requested_item || ''))
      if (kws.length === 0) {
        await sb.from('customer_demand_requests').update({ status: 'no_keywords', updated_at: new Date().toISOString() }).eq('id', d.id)
        continue
      }
      const customerTail = digitsTail(d.contact_phone)
      type Cand = { phone: string; name: string; source: string; score: number }
      const cands: Cand[] = []

      // (a) WARM: موردين كلمناهم قبل كده على الواتساب وكلامهم فيه الكلمات دي
      try {
        const orFilter = kws.map(k => `body.ilike.%${k}%`).join(',')
        const { data: msgs } = await sb.from('whatsapp_messages')
          .select('conversation_id, body')
          .or(orFilter)
          .order('created_at', { ascending: false })
          .limit(200)
        const convIds = [...new Set(((msgs || []) as Array<any>).map(m => m.conversation_id))].slice(0, 40)
        if (convIds.length > 0) {
          const { data: convs } = await sb.from('whatsapp_conversations')
            .select('id, contact_phone, contact_name, contact_type, first_category')
            .in('id', convIds)
            .in('contact_type', ['supplier_lead', 'restaurant_supplier'])
          for (const c of ((convs || []) as Array<any>)) {
            if (digitsTail(c.contact_phone) === customerTail) continue // مش هنبعت للعميل نفسه
            cands.push({ phone: c.contact_phone, name: c.contact_name || 'مورد', source: 'whatsapp_history', score: 10 })
          }
        }
      } catch (_e) { /* keep going */ }

      // (b) COLD LEADS: مطابقة بالكاتيجوري/الاسم/الملاحظات
      try {
        const parts = kws.map(k => `business_name.ilike.%${k}%,notes.ilike.%${k}%,category.ilike.%${k}%`).join(',')
        const { data: cl } = await sb.from('cold_leads')
          .select('business_name, phone, category, status, contact_count')
          .or(parts)
          .not('phone', 'is', null)
          .neq('status', 'do_not_contact')
          .limit(20)
        for (const l of ((cl || []) as Array<any>)) {
          if (!l.phone || digitsTail(l.phone) === customerTail) continue
          cands.push({ phone: l.phone, name: l.business_name || 'مورد', source: 'cold_leads', score: 5 - Math.min(Number(l.contact_count || 0), 4) })
        }
        // لو فيه category_guess ومفيش نتايج كفاية، جرب بالكاتيجوري
        if (cands.length < 2 && d.category_guess) {
          const { data: cl2 } = await sb.from('cold_leads')
            .select('business_name, phone, category, status, contact_count')
            .ilike('category', `%${d.category_guess}%`)
            .not('phone', 'is', null)
            .neq('status', 'do_not_contact')
            .limit(10)
          for (const l of ((cl2 || []) as Array<any>)) {
            if (!l.phone || digitsTail(l.phone) === customerTail) continue
            cands.push({ phone: l.phone, name: l.business_name || 'مورد', source: 'cold_leads_category', score: 3 })
          }
        }
      } catch (_e) { /* keep going */ }

      // dedupe by phone tail, rank, take top 3
      const seen = new Set<string>()
      const top = cands
        .filter(c => { const t = digitsTail(c.phone); if (!t || seen.has(t)) return false; seen.add(t); return true })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

      if (top.length === 0) {
        await sb.from('customer_demand_requests').update({ status: 'no_match', updated_at: new Date().toISOString() }).eq('id', d.id)
        digestLines.push(`• «${String(d.requested_item).slice(0, 50)}» — مفيش مورد مطابق حالياً ❌`)
        continue
      }

      // رسالة الأوتريتش — من غير بيانات العميل، من غير طلب اسم/إيميل، اللينك madmonacairo.com بس
      for (const c of top) {
        const msg = `أهلاً 👋 معاك فريق مضمونة — منصة المعاملات المضمونة.\n\nعندنا عميل جاهز دلوقتي بيدور على: ${String(d.requested_item).slice(0, 120)}\n\nلو الخدمة/المنتج ده متاح عندك، ضيف الليستنج بتاعك في دقايق على:\n${SITE}/add-listing\n\nسجّل مرة واحدة وحط كل التفاصيل (صور وأسعار ومواصفات) — وفريقنا هيوصّلك بالعميل فوراً. معاملاتك مضمونة ✅`
        await sb.from('whatsapp_outbound_queue').insert({
          recipient_phone: c.phone.startsWith('+') ? c.phone : '+' + digitsTail(c.phone).padStart(12, '2'),
          recipient_name: c.name,
          message: msg,
          campaign: 'demand_match',
          agent_name: 'demand-matchmaker',
          status: 'pending',
          metadata: { demand_id: d.id, requested_item: String(d.requested_item).slice(0, 200), source: c.source, customer_conversation_id: d.conversation_id }
        }).then(() => {}, () => {})
        // حدّث سجل الـ cold lead لو من هناك
        if (c.source.startsWith('cold_leads')) {
          await sb.from('cold_leads')
            .update({ last_contacted: new Date().toISOString(), status: 'contacted' })
            .eq('phone', c.phone)
            .then(() => {}, () => {})
        }
      }

      await sb.from('customer_demand_requests').update({
        status: 'matching',
        notes: `matched ${top.length}: ` + top.map(t => `${t.name}(${t.source})`).join(', '),
        updated_at: new Date().toISOString()
      }).eq('id', d.id)
      digestLines.push(`• «${String(d.requested_item).slice(0, 50)}» → اتبعت لـ ${top.length} مورد (${top.map(t => t.name).join('، ').slice(0, 80)}) ✅`)
      processed++
    }

    // دايجست لمحمد لو فيه حاجة اتعملت
    if (digestLines.length > 0 && adminPhone) {
      const { data: creds } = await sb.from('whatsapp_config').select('key, value').in('key', ['phone_number_id', 'access_token'])
      const m = Object.fromEntries((creds || []).map((r: { key: string; value: string }) => [r.key, r.value]))
      const body = `🎯 مطابقة الطلبات الغير متوفرة:\n${digestLines.join('\n')}`
      await fetch(`https://graph.facebook.com/v21.0/${m.phone_number_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${m.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: adminPhone.replace(/\D/g, ''), type: 'text', text: { body, preview_url: false } })
      }).catch(() => {})
    }

    return json({ ok: true, processed, digest: digestLines })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
