// ============================================================================
// 🔀 lib/ai-provider.ts — مزوّد الذكاء القابل للتبديل
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عطّل الأنثروبيك شوية لحد ما يبقى معايا فلوس».
//
// 🎯 الفكرة: نقطة عبور واحدة بتوجّه كل نداءات الذكاء لـGemini أو
//    الأنثروبيك حسب متغيّر واحد — من غير ما نلمس الـ٢٣ ملف اللي
//    بينادوا callClaude.
//
// 🔧 التبديل: AI_PROVIDER في .env.local
//    · gemini    → Gemini Flash (مجاني حتى ١٥٠٠ نداء/يوم)
//    · anthropic → كلود (لما الرصيد يرجع)
//    · auto      → جيميناي، ولو فشل يجرّب كلود (لو مفتاحه شغّال)
//
// 💡 ولما الرصيد يرجع: غيّر السطر الواحد ده لـanthropic وخلاص.
// ============================================================================

const GEMINI_MODEL = 'gemini-flash-lite-latest'
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export type AiProvider = 'gemini' | 'anthropic' | 'auto'

export function currentProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER || '').toLowerCase()
  if (p === 'anthropic' || p === 'gemini' || p === 'auto') return p as AiProvider
  // 🛟 الافتراضي: جيميناي لو مفتاحه موجود، وإلا كلود
  return process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic'
}

/**
 * 🤖 نداء Gemini بنفس شكل callClaude.
 *
 * 🔁 الخدمة بترجّع 503 «high demand» أحيانًا — اتأكدت بالتجربة الفعلية.
 *    تلات محاولات بتباعد متزايد بتحلّها.
 */
export async function callGemini(opts: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('مفيش GEMINI_API_KEY')

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2500 * attempt))
    try {
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 🧠 جيميناي بيسمّيه system_instruction مش system
          system_instruction: { parts: [{ text: opts.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: opts.userMessage }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.7,
            maxOutputTokens: opts.maxTokens ?? 8192,
          },
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (res.status === 503 || res.status === 429) continue
      if (!res.ok) {
        const t = await res.text()
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`)
      }

      const j = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
      if (text?.trim()) return text.trim()
      // 🔁 رد فاضي — نجرّب تاني
    } catch (e) {
      // آخر محاولة؟ نرمي الخطأ
      if (attempt === 2) throw e
    }
  }
  throw new Error('Gemini مارجعش رد بعد ٣ محاولات')
}
