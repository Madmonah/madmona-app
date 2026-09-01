/**
 * 🧞 نداء جيميناي الأصلي للمارد — Google AI Studio
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «لا أنا عايز تحويل المارد، مش عايز جسر».
 *
 * 🎯 الفرق عن الجسر: ده **مش طبقة ترجمة** — دي دالة بتتكلم لغة
 *    جيميناي أصلًا وبترجّع شكله الطبيعي. marid-brain اتحوّل يستخدمها
 *    مباشرة بدل ما يفضل مكتوب بلغة الأنثروبيك ونترجمله.
 *
 * 💰 والمكسب: المارد بقى على جوجل ستوديو بالكامل — مفيش أنثروبيك.
 */

// ── أنواع جيميناي الأصلية ──────────────────────────────────────
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } }

export type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

export type GeminiTool = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type GeminiResult = {
  parts: GeminiPart[]
  /** 🔧 نداءات الأدوات — مستخرجة جاهزة */
  calls: Array<{ name: string; args: Record<string, unknown> }>
  /** 📝 النص لو موجود */
  text: string
  usage: { input: number; output: number }
  model: string
}

/**
 * 🔧 تنضيف الـschema — جيميناي بيرفض حقول JSON-Schema اللي مش عارفها،
 *    وبيستخدم أنواع كابيتال (STRING · OBJECT · ARRAY).
 */
export function toGeminiSchema(s: unknown): Record<string, unknown> {
  if (!s || typeof s !== 'object') return {}
  const o = s as Record<string, unknown>
  const out: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(o)) {
    // ❌ حقول جيميناي بيرفضها
    if (['additionalProperties', '$schema', 'default', 'examples', 'title', 'const'].includes(k)) {
      continue
    }
    if (k === 'properties' && v && typeof v === 'object') {
      const p: Record<string, unknown> = {}
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        p[pk] = toGeminiSchema(pv)
      }
      out[k] = p
    } else if (k === 'items') {
      out[k] = toGeminiSchema(v)
    } else if (k === 'type' && typeof v === 'string') {
      out[k] = v.toUpperCase()
    } else if (k === 'enum' && Array.isArray(v)) {
      out[k] = v
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * 🧞 النداء — بلغة جيميناي الأصلية.
 *
 * 🔁 وبيجرّب موديلات بالترتيب: الحصة اليومية بتخلص على الموديل
 *    الأحدث، فبنروح للي بعده بدل ما الرد يقف.
 *    (اتأكدت بالاختبار ٢٨/٨: 3.6-flash → 429 · flash-latest → ✅)
 */
export async function callGeminiNative(opts: {
  system?: string
  contents: GeminiContent[]
  tools?: GeminiTool[]
  maxTokens?: number
  temperature?: number
}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY مش موجود')

  // 🔁 (١ سبتمبر ٢٠٢٦ — مساءً) محمد: «المارد لسه بيرد من المكتبة مع إننا
  //    ربطناه بجوجل!». الفحص بالأرقام: الحصة المجانية لموديلات Flash =
  //    **٢٠ نداء في اليوم** (gemini-flash-latest · 3.6 · 3.7) — والمارد
  //    بياخد ٢–٤ نداءات للرد الواحد = ٧ ردود ثم 429 للمكتبة.
  //    موديلات Lite حصتها أعلى بكتير، واتأكدت إنها بتكمّل دورة الأدوات
  //    كاملة (نداء → أداة → رد بالإعلانات). فاللايت الأول والفلاش احتياطي.
  const models = [
    process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ].filter((m, i, a) => a.indexOf(m) === i)

  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.7,
    },
  }
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }
  if (opts.tools?.length) {
    body.tools = [{ functionDeclarations: opts.tools }]
  }

  let lastErr = ''

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const d = await res.json() as {
          candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
        }
        const parts = d.candidates?.[0]?.content?.parts || []
        const calls: Array<{ name: string; args: Record<string, unknown> }> = []
        let text = ''

        for (const p of parts) {
          if ('functionCall' in p && p.functionCall) {
            calls.push({ name: p.functionCall.name, args: p.functionCall.args || {} })
          } else if ('text' in p && p.text) {
            text += p.text
          }
        }

        return {
          parts, calls, text: text.trim(), model,
          usage: {
            input: d.usageMetadata?.promptTokenCount || 0,
            output: d.usageMetadata?.candidatesTokenCount || 0,
          },
        }
      }

      lastErr = await res.text().catch(() => `HTTP ${res.status}`)

      // 🚫 الحصة خلصت → الموديل ده مش هينفع النهاردة
      if (res.status === 429) break
      // 🔁 ضغط مؤقت → نعيد
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)))
        continue
      }
      // ❌ خطأ حقيقي (مفتاح · صيغة) — التكرار مالوش فايدة
      throw new Error(`Gemini ${model}: ${lastErr.slice(0, 220)}`)
    }
  }

  throw new Error(`Gemini (كل الموديلات): ${lastErr.slice(0, 220)}`)
}
