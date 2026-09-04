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
// ═══════════════════════════════════════════════════════════════════════
// 🔌 قاطع دورة الحصة (٤ سبتمبر ٢٠٢٦)
//
// محمد: «هو جوجل ده بكام؟» → الفحص من كونسول جوجل نفسه لقى **~٣٬٢٠٠ نداء
// مرفوض بـ429 في ٤ أيام**، ونسبة النجاح نزلت من ١٠٠٪ لقرب الصفر.
//
// 🐞 الجذر — **دوامة**: القايمة فيها ٥ موديلات بيتجربوا بالترتيب،
//    و`MAX_TURNS = 4` في المخ. يعني رسالة عميل واحدة ممكن تكلّف
//    **٢٠ نداء لجوجل**. وأول ما الحصة تخلص، كل رسالة جديدة بتحرق ٢٠
//    وحدة تانية — فبنحفر أعمق بدل ما نوقف.
//    التأكيد بالأرقام: ٧٩ رسالة يوم ٣١/٨ × ٢٠ ≈ ١٬٥٨٠ — وجوجل شايفة ١٬٨٨٠.
//
// ✅ أول ٤٢٩، بنوقف النداء خالص لفترة تبريد. المارد بيرجّع للقالب
//    (`marid_reply_mode='template'` / `marid_offline_replies`) بدل ما
//    يفضل يضرب في حيطة. التبريد متخزّن في `whatsapp_config` عشان كل
//    نسخ السيرفرليس تشوفه — الذاكرة لوحدها مابتنفعش هنا.
// ═══════════════════════════════════════════════════════════════════════
const COOLDOWN_KEY = 'gemini_quota_cooldown_until'
const COOLDOWN_MS = 15 * 60_000
let _cool: { until: number; at: number } | null = null

async function cooldownUntil(): Promise<number> {
  if (_cool && Date.now() - _cool.at < 60_000) return _cool.until
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data } = await db.from('whatsapp_config').select('value').eq('key', COOLDOWN_KEY).maybeSingle()
    const v = Number((data as { value?: string } | null)?.value || 0)
    _cool = { until: Number.isFinite(v) ? v : 0, at: Date.now() }
    return _cool.until
  } catch { return 0 }
}

async function startCooldown(): Promise<void> {
  const until = Date.now() + COOLDOWN_MS
  _cool = { until, at: Date.now() }
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    await db.from('whatsapp_config').upsert(
      { key: COOLDOWN_KEY, value: String(until) } as never, { onConflict: 'key' })
  } catch { /* التبريد في الذاكرة على الأقل */ }
}

export async function callGeminiNative(opts: {
  system?: string
  contents: GeminiContent[]
  tools?: GeminiTool[]
  maxTokens?: number
  temperature?: number
}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY مش موجود')

  // 🔌 الحصة خلصت من شوية؟ ماتضربش في حيطة — ارجع للقالب على طول.
  const cool = await cooldownUntil()
  if (cool > Date.now()) {
    throw new Error(`Gemini: الحصة خلصت — تبريد لحد ${new Date(cool).toISOString()}`)
  }

  // 🔁 (١ سبتمبر ٢٠٢٦ — مساءً) محمد: «المارد لسه بيرد من المكتبة مع إننا
  //    ربطناه بجوجل!». الفحص بالأرقام: الحصة المجانية لموديلات Flash =
  //    **٢٠ نداء في اليوم** (gemini-flash-latest · 3.6 · 3.7) — والمارد
  //    بياخد ٢–٤ نداءات للرد الواحد = ٧ ردود ثم 429 للمكتبة.
  //    موديلات Lite حصتها أعلى بكتير، واتأكدت إنها بتكمّل دورة الأدوات
  //    كاملة (نداء → أداة → رد بالإعلانات). فاللايت الأول والفلاش احتياطي.
  // 🔻 (٤ سبتمبر ٢٠٢٦) القايمة اتقصّرت من ٦ لـ٢.
  //    السبب: التعليق فوق نفسه بيقول إن حصة موديلات **Flash** المجانية
  //    ٢٠ نداء في اليوم — يعني `3.6-flash` و`flash-latest` بيرجّعوا 429
  //    فورًا كل مرة. كانوا بيضيفوا نداءين مرفوضين مضمونين لكل رسالة
  //    من غير أي فايدة، وبيعمّقوا الحفرة.
  const models = [
    process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    // 🛟 (٤ سبتمبر ٢٠٢٦) الاتنين فوق رجّعوا 503 «high demand» مع بعض ساعة
    //    كاملة والمارد وقع للمكتبة على كل رسالة. 3.1-flash-lite رد 200 في
    //    نفس اللحظة — مسبح طلب مختلف. (2.5-flash-lite → 404 على المفتاح ده.)
    'gemini-3.1-flash-lite',
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

  // كل الموديلات رجّعت الحصة خلصت → وقف النداءات فترة بدل الدوامة
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(lastErr)) await startCooldown()
  throw new Error(`Gemini (كل الموديلات): ${lastErr.slice(0, 220)}`)
}
