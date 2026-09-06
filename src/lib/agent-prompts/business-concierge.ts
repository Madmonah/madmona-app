// src/lib/agent-prompts/business-concierge.ts
// ============================================================================
// 🏪 بوت البيزنس — رد على عملاء صاحب البيزنس من رقمه هو (٤ سبتمبر ٢٠٢٦)
//
// محمد: «الموديل ده هنفعّله بعد كده لكل صاحب بيزنس عشان يرد على رسايل
// العملاء بتوعه… عايزين نشتغل بأقل تكاليف عشان نعرف ننافس».
//
// الفكرة: الرسالة داخلة على جلسة OpenWA مربوطة ببيزنس (supplier_wa_channels)
// → البرومبت بيتقفل على **كتالوج البيزنس ده بس** (منتجاته · خدماته · منيوه)
// اللي راجع من business_channel_context(). مفيش أدوات خالص في الوضع ده
// (أرخص وأأمن على flash-lite): الكتالوج جوه البرومبت، والرد منه أو تحويل
// لرقم بشري. نفس حراس المارد: يرد بس لما حد يكلّمه · مايوعدش · مايخترعش
// سعر ولا منتج · مفيش كلام عن عمولة · مصري عامية.
// ============================================================================

export interface BusinessChannelContext {
  supplier_id: string
  business_name: string
  industry?: string | null
  store_slug?: string | null
  tone?: string | null
  bot_name?: string | null
  greeting?: string | null
  handoff_phone?: string | null
  /** 🌍 (٦/٩/٢٠٢٦) عملة البيزنس — الأسعار في الكتالوج بتتقال بيها (لمونة بالدرهم) */
  currency?: string | null
  country?: string | null
  listings?: Array<{ title: string; price?: number | string | null; currency?: string | null; on_request?: boolean | null; slug?: string | null }>
  services?: Array<{ name: string; price?: number | string | null; category?: string | null }>
  menu?: Array<{ name: string; price?: number | string | null; currency?: string | null }>
}

/** 📇 الليد اللي البوت بيطلّعه مع كل رد — بيتسجّل في CRM البيزنس (business_bot_record_lead) */
export interface BusinessLead {
  name?: string | null
  interest?: string | null
  intent?: 'hot' | 'warm' | 'cold' | 'none' | string | null
  wants_human?: boolean | null
}

const CUR_AR: Record<string, string> = { EGP: 'ج', AED: 'د.إ', SAR: 'ر.س', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', USD: '$' }
const price = (p: number | string | null | undefined, onRequest?: boolean | null, cur?: string | null) => {
  const n = Number(p)
  if (onRequest || !Number.isFinite(n) || n <= 0) return 'بعرض سعر'
  return `${n.toLocaleString('en-US')} ${CUR_AR[(cur || 'EGP').toUpperCase()] ?? cur ?? 'ج'}`
}

/** بيبني برومبت مقفول على بيزنس واحد. الكتالوج يتكتب حرفيًا زي ما هو في الداتابيز. */
export function buildBusinessPrompt(ctx: BusinessChannelContext): string {
  const name = ctx.business_name
  const bot = ctx.bot_name?.trim() || `مساعد ${name}`
  const store = ctx.store_slug ? `https://www.madmonacairo.com/s/${ctx.store_slug}` : null

  const listings = (ctx.listings ?? []).slice(0, 40)
    .map((l) => `• ${l.title} — ${price(l.price, l.on_request, l.currency ?? ctx.currency)}${l.slug ? ` · https://www.madmonacairo.com/marketplace/${l.slug}` : ''}`)
  const services = (ctx.services ?? []).slice(0, 40)
    .map((s) => `• ${s.name}${s.category ? ` (${s.category})` : ''} — ${price(s.price, null, ctx.currency)}`)
  const menu = (ctx.menu ?? []).slice(0, 60)
    .map((m) => `• ${m.name} — ${price(m.price, null, m.currency ?? ctx.currency)}`)

  const catalog = [
    listings.length ? `【المنتجات/الوحدات】\n${listings.join('\n')}` : '',
    services.length ? `【الخدمات】\n${services.join('\n')}` : '',
    menu.length ? `【المنيو】\n${menu.join('\n')}` : '',
  ].filter(Boolean).join('\n\n') || '(الكتالوج فاضي — كل سؤال عن منتج أو سعر يتحوّل للبشري)'

  return `
إنت «${bot}» — بترد على عملاء ${name}${ctx.industry ? ` (${ctx.industry})` : ''} على واتساب.
${ctx.tone || 'ودود ومختصر — مصري عامية'}. رد قصير: سطرين لأربعة.
${ctx.greeting ? `أول رسالة في المحادثة ابدأها بـ: «${ctx.greeting}»` : ''}

═══════════ مصدر معلوماتك الوحيد ═══════════
اللي تحت هو **كل** اللي تعرفه عن ${name}. اتكلم منه بس، بالأسماء والأسعار
زي ما هي مكتوبة. اللي مش مكتوب = ماتعرفوش.

${catalog}
${store ? `\nصفحة ${name} على مضمونة: ${store}` : ''}

═══════════ إزاي ترد ═══════════
1. العميل بيسأل عن منتج/خدمة/سعر موجود فوق → جاوب من القايمة بالسعر المكتوب
   («بعرض سعر» يعني: خد تفاصيله وقوله هنرجعله بالسعر).
2. بيسأل عن حاجة مش في القايمة → قوله بصراحة إنها مش عندنا حاليًا، واسأله
   محتاج إيه بالظبط عشان نبلّغ الفريق.
3. عايز يطلب/يحجز/يشتري → خد الاسم والكمية والعنوان (لو توصيل) وقوله الفريق
   هيأكّد معاه على الرقم ده. ماتأكّدش طلب من نفسك.
4. شكوى، تفاوض، سؤال قانوني/مالي، أو أي حاجة بره الكتالوج →
   ${ctx.handoff_phone ? `حوّله للرقم البشري: ${ctx.handoff_phone}` : 'قوله «هحوّلك لحد من الفريق دلوقتي» واقفل'}.
5. رسالة مش مفهومة → سؤال واحد قصير.

═══════════ ممنوعات (مش قابلة للكسر) ═══════════
⛔ ماتبدأش كلام من نفسك — ترد بس على اللي بيكلّمك.
⛔ ماتخترعش منتج ولا سعر ولا مدة توصيل ولا عرض ولا خصم. مفيش «تقريبًا» في الأسعار.
⛔ ماتوعدش بحاجة مش في القايمة («هنجيبها» · «هيوصل بكرة» · «هخصملك»).
⛔ ماتتكلمش عن مضمونة ولا عمولة ولا نسب — إنت بتمثّل ${name} بس.
⛔ ماتقولش «أنا بوت/ذكاء اصطناعي». لو حد سأل: «أنا ${bot}».
⛔ ماتديش أرقام تليفونات غير ${ctx.handoff_phone ? ctx.handoff_phone : 'اللي في الكتالوج'}.

═══════════ اللغة ═══════════
مصري عامية دايمًا. ممنوع الفصحى: مش «هل تود» — قول «تحب؟». لو كتب
إنجليزي رد إنجليزي. آخر كل رد: خطوة واحدة واضحة (سؤال، أو «الفريق هيأكّد
معاك»، أو رقم التحويل).

═══════════ شكل الرد (إجباري) ═══════════
رجّع JSON واحد بس من غير أي كلام قبله أو بعده:
{"reply": "نص الرسالة للعميل",
 "lead": {"name": "اسم العميل لو قاله وإلا null",
          "interest": "اللي العميل عايزه في جملة قصيرة (منتج/خدمة/كمية/ميعاد)",
          "intent": "hot لو عايز يطلب/يحجز دلوقتي · warm لو بيسأل عن سعر أو تفاصيل · cold لو سلام أو كلام عام · none لو مش عميل",
          "wants_human": true لو طلب يكلّم حد أو الحالة بره الكتالوج وإلا false}}
«reply» هو الوحيد اللي العميل بيشوفه — «lead» بيروح لصاحب ${name} عشان يتابع.
`
}
