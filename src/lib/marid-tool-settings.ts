// src/lib/marid-tool-settings.ts
// ============================================================================
// 🔌 مفاتيح أدوات المارد — تشغيل/إطفاء كل أداة **من الداتابيز**، مش من الكود.
// ============================================================================
// محمد (٢٤ أغسطس ٢٠٢٦):
//   «من الاخر انا شايف ان المارد مش نافع انه يضيف اعلانات ويستدعي ادوات
//    فالغية انا هخلي الاضافة تكون عن طريق صاحب الاعلان»
//
// ليه مفتاح مش حذف؟
//   حذف `create_listing_draft` من الكود يبقى قرار مقفول: أي رجوع فيه = نشر
//   جديد وانتظار بيلد. وكمان تعليمات تسجيل الإعلان مكتوبة في **١٥ مكان**
//   في `customer-concierge.ts` و`marid-brain.ts` — حذف الأداة لوحده كان
//   هيسيب البرومبت بيأمر المارد ينادي أداة مش موجودة، والنتيجة وعود كاذبة
//   للعميل (نفس عيب «الكلام مش تسجيل» بتاع ١٨ و١٩ أغسطس بالظبط).
//
//   فالمفتاح بيعمل **٣ حاجات مع بعض**، ودي التلاتة اللي بيتعمل بيهم القفل:
//     ١) الأداة ماتتبعتش لكلود أصلًا     → مش هيقدر ينادّيها
//     ٢) تعليمة بديلة تتحقن في البرومبت  → يعرف يعمل إيه بدالها
//     ٣) حارس في `runMaridTool`          → حتى لو اخترعها، بترجّعله رفض
//
// القاعدة اللي محمد ماشي عليها: «اللي تقدر تخليه دينامك خليه دينامك».
//
// الجدول: public.marid_tool_settings (tool_name pk · enabled · note_ar)
// الشاشة: /admin/marid → كارت «🔌 أدوات المارد»
//
// ⚠️ الكاش دقيقة. أي تغيير من الشاشة بيبان خلال دقيقة على الأكتر.
// ⚠️ **fail-open بالكاش القديم، مش fail-open بالكل**: لو القراءة وقعت
//    بنستعمل آخر نسخة عرفناها. أول قراءة لو وقعت → كل الأدوات شغّالة
//    (نفس سلوك ما قبل الملف ده) — أهون من إننا نطفّي المارد كله بالغلط.
// ============================================================================
import { supabaseUntyped as db } from '@/lib/supabase'

export interface MaridToolSetting {
  tool_name: string
  label_ar: string | null
  enabled: boolean
  note_ar: string | null
}

const TTL_MS = 60_000
let cache: { at: number; rows: MaridToolSetting[] } | null = null

/** كل صفوف الإعدادات — مكاشة دقيقة. لو القراءة وقعت بترجّع آخر نسخة معروفة. */
export async function getMaridToolSettings(): Promise<MaridToolSetting[]> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.rows
  try {
    const { data, error } = await db
      .from('marid_tool_settings')
      .select('tool_name, label_ar, enabled, note_ar')
    if (error) throw new Error(error.message)
    const rows = (data as MaridToolSetting[] | null) ?? []
    // صفر صفوف مش «كل الأدوات مطفية» — ده جدول لسه مااتزرعش أو قراءة بايظة.
    // مانكاشهاش كإنها الحقيقة، وإلا نفضل عميان دقيقة كاملة.
    if (!rows.length) return cache?.rows ?? []
    cache = { at: now, rows }
    return rows
  } catch (e) {
    console.warn('[marid-tools] مش قادر أقرا مفاتيح الأدوات — بنكمّل بآخر نسخة:',
      e instanceof Error ? e.message : String(e))
    return cache?.rows ?? []
  }
}

/** الأدوات المطفية بس، بالاسم. */
export async function getDisabledMaridTools(): Promise<Map<string, MaridToolSetting>> {
  const rows = await getMaridToolSettings()
  return new Map(rows.filter((r) => !r.enabled).map((r) => [r.tool_name, r]))
}

/**
 * يشيل الأدوات المطفية من القايمة اللي بتتبعت لكلود.
 *
 * `readonly T[]` مش `T[]`: `MARID_TOOLS` متعرّفة كـtuple ثابتة، ولو الباراميتر
 * مصفوفة عادية TypeScript بيرفض تمريرها (خطأ اتمسك في الـtsc).
 */
export async function filterEnabledTools<T extends { name: string }>(
  tools: readonly T[],
): Promise<T[]> {
  const off = await getDisabledMaridTools()
  if (!off.size) return [...tools]
  return tools.filter((t) => !off.has(t.name))
}

/**
 * القسم اللي يتحقن في البرومبت مكان الأدوات المطفية.
 * بيرجّع فاضي لو مفيش حاجة مطفية — يعني البرومبت يفضل بالحرف زي ما هو.
 *
 * بيتحطّ **في آخر البرومبت الثابت** عشان يجي بعد أي تعليمة قديمة بتأمر
 * بنداء الأداة، والأخير هو اللي بيتنفّذ.
 */
export async function maridDisabledToolsPrompt(): Promise<string> {
  const off = await getDisabledMaridTools()
  if (!off.size) return ''
  const blocks = [...off.values()].map((t) => {
    const head = `⛔ ${t.tool_name}${t.label_ar ? ` (${t.label_ar})` : ''} — **مقفولة**`
    return t.note_ar?.trim() ? `${head}\n${t.note_ar.trim()}` : head
  })
  return `

═══════════════════════════════════════════════════════════
أدوات مقفولة — ده بيلغي أي تعليمة فوق بتقولك تنادّيها
═══════════════════════════════════════════════════════════
الأدوات دي **مش موجودة عندك خلاص**. مش هتلاقيها في قايمة أدواتك،
وأي محاولة تنادّيها هترجعلك رفض.

${blocks.join('\n\n')}

⛔ ممنوع تقول للعميل إنك عملت حاجة بالأداة المقفولة أو إنك «هتعملها».
⛔ ممنوع تطلب منه بيانات عشان تعملها إنت — التعليمة البديلة فوق هي الرد.
✅ لو الكلام مالوش علاقة بالأدوات دي، اشتغل عادي بباقي أدواتك.`
}

/**
 * رد الأداة المقفولة — بيترجع لكلود مكان نتيجة النداء.
 * بيسجّل المحاولة في `marid_tool_blocked_log` عشان (١) نعرف كام واحد كان
 * محتاج الأداة دي فعلًا، و(٢) محدش يضيع من غير ما نعرف.
 */
export async function blockedToolResult(
  name: string,
  setting: MaridToolSetting,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const phone = typeof input?.phone === 'string' ? input.phone
    : typeof input?.supplier_phone === 'string' ? input.supplier_phone
    : null
  // fire-and-forget — تسجيل المحاولة مايأخّرش الرد ولا بيقدر يكسره
  void db
    .from('marid_tool_blocked_log')
    .insert({ tool_name: name, phone, args: input as never })
    .then(() => {}, () => {})

  console.warn('[marid-tools] نداء أداة مقفولة اترفض', { tool: name, phone })
  return {
    ok: false,
    blocked: true,
    message: setting.note_ar?.trim()
      || `الأداة «${name}» مقفولة دلوقتي — ماتقولش للعميل إنك عملتها.`,
  }
}
