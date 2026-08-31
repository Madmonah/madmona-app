/**
 * 🔀 جسر جيميناي — يخلّي المارد يشتغل على Google AI Studio
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «عايز موديول المارد يشتغل على جوجل ستوديو».
 *
 * 🎯 المشكلة: قلب المارد (marid-brain.ts) مبني على واجهة الأنثروبيك —
 *    ٢٦ أداة بصيغة `input_schema`، ودورة `tool_use` / `tool_result`.
 *    إعادة كتابته كلها = مخاطرة كبيرة على شغل شغّال.
 *
 * ✅ الحل: **جسر** بنفس شكل `anthropic.messages.create` بالظبط —
 *    بياخد نفس المدخلات، ويرجّع نفس شكل الرد، وجوّه بيتكلم جيميناي.
 *    فـmarid-brain مايتغيرش ولا سطر.
 *
 * 💰 والمكسب: جيميناي مجاني في حدود الاستخدام الحالي، والأنثروبيك
 *    كان بيصرف على كل رد.
 */

// ── أنواع مطابقة لواجهة الأنثروبيك ─────────────────────────────
type AnthropicTool = {
  name: string
  description?: string
  input_schema: { type: string; properties?: Record<string, unknown>; required?: string[] }
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  | { type: 'image'; source: { type: string; media_type: string; data: string } }

type Msg = { role: 'user' | 'assistant'; content: string | ContentBlock[] }

export type BridgeResponse = {
  content: ContentBlock[]
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

// ── تحويل الأدوات: input_schema → parameters ───────────────────
/** 🔧 جيميناي بيرفض حقول JSON-Schema اللي مش عارفها — بننضّفها */
function cleanSchema(s: unknown): unknown {
  if (!s || typeof s !== 'object') return s
  const o = s as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    // ❌ جيميناي مابيقبلش دول
    if (['additionalProperties', '$schema', 'default', 'examples', 'title'].includes(k)) continue
    if (k === 'properties' && v && typeof v === 'object') {
      const p: Record<string, unknown> = {}
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        p[pk] = cleanSchema(pv)
      }
      out[k] = p
    } else if (k === 'items') {
      out[k] = cleanSchema(v)
    } else if (k === 'type' && typeof v === 'string') {
      out[k] = v.toUpperCase()   // جيميناي بيستخدم STRING/OBJECT/ARRAY
    } else {
      out[k] = v
    }
  }
  return out
}

function toolsToGemini(tools: AnthropicTool[]) {
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.name,
      description: t.description || t.name,
      parameters: cleanSchema(t.input_schema),
    })),
  }]
}

// ── تحويل الرسايل ──────────────────────────────────────────────
function messagesToGemini(messages: Msg[]) {
  const out: Array<{ role: string; parts: unknown[] }> = []

  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'

    if (typeof m.content === 'string') {
      out.push({ role, parts: [{ text: m.content }] })
      continue
    }

    const parts: unknown[] = []
    for (const b of m.content) {
      if (b.type === 'text') {
        parts.push({ text: b.text })
      } else if (b.type === 'image') {
        // 🖼️ الصور بنفس شكل base64
        parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } })
      } else if (b.type === 'tool_use') {
        parts.push({ functionCall: { name: b.name, args: b.input || {} } })
      } else if (b.type === 'tool_result') {
        // 📤 نتيجة الأداة — جيميناي بيتوقعها في دور user
        const text = typeof b.content === 'string' ? b.content : JSON.stringify(b.content)
        parts.push({
          functionResponse: {
            name: (b as { name?: string }).name || 'tool',
            response: { result: text },
          },
        })
      }
    }
    if (parts.length) out.push({ role, parts })
  }

  return out
}

// ── تحويل رد جيميناي → شكل الأنثروبيك ──────────────────────────
function geminiToAnthropic(data: unknown): BridgeResponse {
  const d = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: unknown } }> }
      finishReason?: string
    }>
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }

  const parts = d.candidates?.[0]?.content?.parts || []
  const content: ContentBlock[] = []
  let hasTool = false

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.text) {
      content.push({ type: 'text', text: p.text })
    } else if (p.functionCall) {
      hasTool = true
      content.push({
        type: 'tool_use',
        // 🔑 جيميناي مابيديش id — بنولّده بنفس شكل الأنثروبيك
        id: `toolu_g${Date.now().toString(36)}${i}`,
        name: p.functionCall.name,
        input: (p.functionCall.args || {}) as Record<string, unknown>,
      })
    }
  }

  if (content.length === 0) content.push({ type: 'text', text: '' })

  return {
    content,
    stop_reason: hasTool ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: d.usageMetadata?.promptTokenCount || 0,
      output_tokens: d.usageMetadata?.candidatesTokenCount || 0,
    },
  }
}

// ── النداء ─────────────────────────────────────────────────────
/**
 * 🧞 نفس واجهة `anthropic.messages.create` بالظبط.
 *
 * marid-brain بينده عليها من غير ما يعرف إن جواها جيميناي.
 */
export async function geminiMessagesCreate(opts: {
  model?: string
  max_tokens?: number
  system?: string | Array<{ type: string; text: string }>
  tools?: AnthropicTool[]
  messages: Msg[]
}): Promise<BridgeResponse> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY مش موجود')

  // 🔁 (٢٨ أغسطس ٢٠٢٦) الاختبار كشف إن حصة الموديل اليومية بتخلص
  //    (429 Quota exceeded). فبنجرّب البدايل بالترتيب بدل ما الرد يقف.
  const models = [
    process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
  ].filter((m, i, a) => a.indexOf(m) === i)

  // 📜 التعليمات — الأنثروبيك بيقبلها نص أو مصفوفة
  const sysText = typeof opts.system === 'string'
    ? opts.system
    : Array.isArray(opts.system)
      ? opts.system.map((s) => s.text).join('\n\n')
      : ''

  const body: Record<string, unknown> = {
    contents: messagesToGemini(opts.messages),
    generationConfig: {
      maxOutputTokens: opts.max_tokens || 1200,
      temperature: 0.7,
    },
  }
  if (sysText) body.systemInstruction = { parts: [{ text: sysText }] }
  if (opts.tools?.length) body.tools = toolsToGemini(opts.tools)

  let lastErr = ''

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    // 🔁 503 «high demand» بيحصل — نعيد مرتين لكل موديل
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) return geminiToAnthropic(await res.json())

      lastErr = await res.text().catch(() => `HTTP ${res.status}`)

      // 🚫 الحصة خلصت؟ الموديل ده مش هينفع النهاردة — نروح للي بعده
      if (res.status === 429) break

      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)))
        continue
      }
      // ❌ خطأ تاني (مفتاح غلط · صيغة) — مفيش فايدة من التكرار
      throw new Error(`Gemini ${model}: ${lastErr.slice(0, 200)}`)
    }
  }

  throw new Error(`Gemini (كل الموديلات): ${lastErr.slice(0, 200)}`)
}
