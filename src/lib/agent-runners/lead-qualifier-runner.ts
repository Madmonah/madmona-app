// src/lib/agent-runners/lead-qualifier-runner.ts
// Lead Qualifier — دوره الحقيقي: تصنيف leads جداد بالأولوية.
//
// التصنيف الرقمي (score 0-100) شغال بالفعل عبر دالة SQL موجودة
// compute_lead_score(phone) — بتحسب السكور من رد فعل العميل، مصدره،
// الكاتيجوري، وتاريخ الإضافة (شوف تعريفها في migration `compute_lead_score`).
// شغل الـagent هنا: يمشي على cold_leads الجداد، يجيب السكور الحقيقي من
// نفس الدالة (مش يعيد اختراع منطق التصنيف)، ولو السكور عالي (70+) يستخدم
// Claude يكتب توصية/سبب مختصر يتسجل في agent_insights عشان فريق المبيعات
// يعرف يبدأ بمين.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { LEAD_QUALIFIER_PROMPT } from '@/lib/agent-prompts/lead-qualifier'

const HOT_THRESHOLD = 70
const WARM_THRESHOLD = 40

export async function runLeadQualifierReal(): Promise<Record<string, unknown>> {
  type Lead = {
    id: string
    business_name: string
    phone: string
    category: string | null
    city: string | null
    source: string | null
    rating: number | null
    review_count: number | null
    notes: string | null
  }

  const { data: leads } = await supabaseAdmin
    .from('cold_leads')
    .select('id, business_name, phone, category, city, source, rating, review_count, notes')
    .eq('status', 'new')
    .limit(25)

  const targets = (leads ?? []) as Lead[]
  if (targets.length === 0) return { qualified: 0, found: 0 }

  let qualified = 0
  let scored = 0
  const errors: string[] = []

  for (const lead of targets) {
    try {
      // السكور الرسمي — نفس الدالة اللي بتغذي lead_intelligence_view في اللوحة.
      const { data: scoreData, error: scoreErr } = await supabaseAdmin.rpc('compute_lead_score', {
        p_phone: lead.phone,
      })
      if (scoreErr) {
        errors.push(`${lead.id}: ${scoreErr.message}`)
        continue
      }
      const score = (scoreData as number | null) ?? 0
      scored++

      const verdict = score >= HOT_THRESHOLD ? 'hot' : score >= WARM_THRESHOLD ? 'warm' : 'cold'

      // ملاحظة: مبنحدّثش status هنا لكل الـleads اللي اتقيّمت — لو حدّثناه
      // لـ'contacted' لمجرد إننا حسبنا السكور، الـlead هيختفي من فلتر
      // status='new' فوق للأبد من غير ما حد يتواصل معاه فعلاً (خصوصًا
      // الـcold اللي عمرها ما بتاخد أي إجراء). التحديث بس بيحصل لما فعلاً
      // نبعت توصية تواصل (hot) — شوف تحت.

      // للـleads العالية بس (70+) — Claude يكتب توصية اتصال مختصرة مش سكور
      // (السكور مش شغل Claude، ده شغل الدالة اللي فوق).
      if (score >= HOT_THRESHOLD) {
        const text = await callClaude({
          systemPrompt: LEAD_QUALIFIER_PROMPT,
          userMessage: JSON.stringify({
            source: lead.source,
            contact_phone: lead.phone,
            contact_name: lead.business_name,
            interested_category: lead.category,
            city: lead.city,
            rating: lead.rating,
            review_count: lead.review_count,
            notes: lead.notes,
            computed_score: score,
          }),
          maxTokens: 400,
          temperature: 0.3,
        })
        const out = parseJsonResponse<{
          reasoning?: string
          suggested_agent?: string
          priority?: string
        }>(text)

        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'lead-qualifier',
          insight_type: 'lead_score',
          title: `${lead.business_name} — hot (${score})`,
          description: out.reasoning ?? `سكور ${score} — يستاهل تواصل فوري`,
          priority: 'high',
          recommended_action: out.suggested_agent ?? 'booking-closer',
          data_points: { lead_id: lead.id, score, verdict, ...out },
        } as never)

        // الـlead ده فعلاً اتاخد فيه إجراء (توصية تواصل اتسجلت) — دلوقتي
        // نعلّمه contacted عشان مايترجعش يتقيّم تاني كل مرة.
        await supabaseAdmin
          .from('cold_leads')
          .update({ status: 'contacted' } as never)
          .eq('id', lead.id)

        qualified++
      } else if (verdict === 'warm') {
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'lead-qualifier',
          insight_type: 'lead_score',
          title: `${lead.business_name} — warm (${score})`,
          description: `سكور ${score} — يستاهل متابعة عادية`,
          priority: 'medium',
          recommended_action: 'monitor',
          data_points: { lead_id: lead.id, score, verdict },
        } as never)
      }
    } catch (err) {
      errors.push(`${lead.id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  return { qualified, scored, found: targets.length, errors: errors.length > 0 ? errors.slice(0, 3) : undefined }
}
