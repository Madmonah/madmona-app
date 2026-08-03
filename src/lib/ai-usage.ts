// src/lib/ai-usage.ts
//
// 📊 قياس تكلفة كل نداء Claude (٣ أغسطس ٢٠٢٦).
//
// قبل الملف ده كل كلام التكلفة كان تقدير من أحجام الملفات — مفيش توكن واحد
// حقيقي متسجّل في أي مكان. دلوقتي كل نداء بيتسجّل بتوكنزه الفعلية.
//
// ⚠️ fire-and-forget بالكامل: بيتنادى **بعد** ما الرد يتبعت، ومابيرميش أي
//    استثناء لبرّه. لو الداتابيز وقعت، المارد بيكمّل شغل عادي والعميل
//    مايحسّش بحاجة. القياس عمره ما يعطّل الخدمة.
//
// التكلفة نفسها بتتحسب في الداتابيز: public.v_ai_usage_cost
// والملخص اليومي في: public.v_ai_cost_per_message
import { supabaseUntyped as db } from './supabase'

type ClaudeUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export function logAiUsage(row: {
  agentName: string
  channel?: string | null
  conversationId?: string | null
  model: string
  turn?: number
  isFinal?: boolean
  cacheTtl?: '5m' | '1h'
  latencyMs?: number
  usage?: ClaudeUsage | null
}): void {
  if (!row.usage) return
  try {
    Promise.resolve(
      db.from('ai_usage_log').insert({
        agent_name: row.agentName,
        channel: row.channel ?? null,
        conversation_id: row.conversationId ?? null,
        model: row.model,
        turn: row.turn ?? 0,
        is_final: row.isFinal ?? false,
        cache_ttl: row.cacheTtl ?? '5m',
        latency_ms: row.latencyMs ?? null,
        input_tokens: row.usage.input_tokens ?? 0,
        output_tokens: row.usage.output_tokens ?? 0,
        cache_creation_input_tokens: row.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: row.usage.cache_read_input_tokens ?? 0,
      }),
    ).catch((e: unknown) => {
      console.warn('[ai-usage] اللوج فشل (متجاهل):', e instanceof Error ? e.message : String(e))
    })
  } catch {
    // حتى لو الكلاينت نفسه رمى — ساكتين. القياس مايوقّفش المارد.
  }
}
