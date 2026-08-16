// src/lib/commission.ts
// ============================================================================
// 💰 العمولة — **مصدر واحد**، بيتقري من الداتابيز.
//
// 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «عمولة العربيات ١٠ الاف» · «كل قسم ليه العمولة بتاعته»)
//
//    الرقم كان متكتوب في تلات أماكن مختلفة، والتلاتة مكانوش متفقين:
//      • برومبت المارد     → «المركبات بالاتفاق ⛔ ماتقولش رقم»
//      • نص حملة «عربيات»  → «عمولتنا في العربيات ١٠ الاف جنيه»
//      • كود التسجيل       → commission_rate: 10.0 لأي مورد مهما كان قسمه
//
//    يعني البايع كان بياخد رسالة مكتوب فيها رقم صريح، يرد يسأل، فالمارد
//    يقوله «بنتفق عليها وإنت اللي تحدد». ده مش تناقض في الكلام بس — ده
//    بيخلّي البايع يشك في الرسالة الأصلية كلها.
//
//    دلوقتي الأرقام في `commission_rules` في الداتابيز. البرومبت بيتبني
//    منها وقت التشغيل، والشيك أوت بيحسب منها، والشاشة بتعدّلها من غير نشر.
//
// ⚠️ الترتيب لما نقرا: الداتابيز → القيم اللي تحت. لو الجدول اتمسح أو
//    الاتصال وقع، السلوك بيرجع لآخر حاجة محمد قالها بالظبط — مش لصفر
//    ومش لـ«بالاتفاق».
// ============================================================================

// `commission_rules` جديد ولسه مش في الأنواع المولّدة، فالعميل المطبوع
// بيرجّع `never` عليه. نفس الحل المستعمل في جداول الواتساب.
import { supabaseUntyped as supabaseAdmin } from '@/lib/supabase'

/** إزاي بنحسب الرقم. */
export type CommissionKind =
  | 'percent' // نسبة من القيمة
  | 'flat' // مبلغ ثابت بالجنيه مهما كان السعر
  | 'months' // عدد شهور إيجار (الإيجار الطويل)
  | 'manual' // بالاتفاق — مفيش رقم

export interface CommissionRule {
  key: string
  /** مسار القسم: sales · rentals · services · restaurants · products. null = أي مسار */
  match_track: string | null
  /** مجموعة القسم: sale-vehicles · sale-property · properties … null = أي مجموعة */
  match_group: string | null
  kind: CommissionKind
  value: number
  /** اللي المارد بيقوله بالنص — عربي جاهز للقراية */
  label_ar: string
  note_ar: string | null
  /** الشيك أوت بيحسبها لوحده؟ (البيع بيتقفل بره المنصة → false) */
  auto_charge: boolean
  priority: number
  is_active: boolean
}

/**
 * القيم اللي محمد قالها في ١٦ أغسطس ٢٠٢٦ — الملاذ الأخير لو الداتابيز
 * مارجعتش. مطابقة للـseed في مايجريشن `commission_rules_per_section`.
 */
export const COMMISSION_DEFAULTS: CommissionRule[] = [
  {
    key: 'sale-vehicles',
    match_track: 'sales',
    match_group: 'sale-vehicles',
    kind: 'flat',
    value: 10000,
    label_ar: '١٠ آلاف جنيه ثابتة',
    note_ar:
      'مبلغ ثابت مش نسبة — مهما كان سعر العربية. ده نفس الرقم اللي حملة «عربيات» بتقوله بالنص. ⛔ ماتقولش «بالاتفاق».',
    auto_charge: false,
    priority: 10,
    is_active: true,
  },
  {
    key: 'sale-marine',
    match_track: 'sales',
    match_group: 'sale-marine',
    kind: 'flat',
    value: 10000,
    label_ar: '١٠ آلاف جنيه ثابتة',
    note_ar: 'مركبات بحرية — نفس قاعدة المركبات.',
    auto_charge: false,
    priority: 15,
    is_active: true,
  },
  {
    key: 'sale-property',
    match_track: 'sales',
    match_group: 'sale-property',
    kind: 'percent',
    value: 5,
    label_ar: '٥٪ من سعر البيع',
    note_ar:
      'ثابتة ومش بالاتفاق — شقق وفيلل وشاليهات وأراضي. ⛔ ماتقولش للريسيل «بالاتفاق»، قوله ٥٪ وبس.',
    auto_charge: false,
    priority: 20,
    is_active: true,
  },
  {
    key: 'rent-property',
    match_track: 'rentals',
    match_group: 'properties',
    kind: 'percent',
    value: 10,
    label_ar: '١٠٪ من قيمة العقد',
    note_ar:
      'ده للإيجار القصير (أقل من سنة). الإيجار الطويل (سنة أو أكتر) → شهر إيجار كامل عمولة، مش نسبة.',
    auto_charge: true,
    priority: 30,
    is_active: true,
  },
  {
    key: 'default',
    match_track: null,
    match_group: null,
    kind: 'percent',
    value: 10,
    label_ar: '١٠٪ موحدة',
    note_ar: 'أي حاجة تانية: خدمات · مطاعم · مارت · منتجات · إيجار معدات ومركبات.',
    auto_charge: true,
    priority: 900,
    is_active: true,
  },
]

// كاش قصير — البرومبت بيتبني في كل رسالة واتساب، ومش هنضرب الداتابيز
// في كل مرة. دقيقة كفاية إن محمد يغيّر رقم ويلاقيه شغّال وهو لسه قاعد.
let cache: { at: number; rules: CommissionRule[] } | null = null
const TTL_MS = 60_000

function sortRules(rules: CommissionRule[]): CommissionRule[] {
  return rules.slice().sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    // الأدق الأول — نفس ترتيب `commission_rule_for` في الداتابيز بالظبط
    const ga = a.match_group ? 0 : 1
    const gb = b.match_group ? 0 : 1
    if (ga !== gb) return ga - gb
    const ta = a.match_track ? 0 : 1
    const tb = b.match_track ? 0 : 1
    return ta - tb
  })
}

/** كل القواعد الشغّالة، مرتّبة زي الداتابيز. */
export async function getCommissionRules(force = false): Promise<CommissionRule[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.rules
  try {
    const { data, error } = await supabaseAdmin
      .from('commission_rules')
      .select('key, match_track, match_group, kind, value, label_ar, note_ar, auto_charge, priority, is_active')
      .eq('is_active', true)

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as CommissionRule[]
    // ⛔ جدول فاضي مش سبب إننا نمشي من غير عمولة — بنرجع للقيم المكتوبة.
    if (rows.length === 0) throw new Error('empty')

    const rules = sortRules(rows.map((r) => ({ ...r, value: Number(r.value) })))
    cache = { at: Date.now(), rules }
    return rules
  } catch {
    return sortRules(COMMISSION_DEFAULTS)
  }
}

/** أول قاعدة بتنطبق على (المسار + المجموعة). */
export function matchRule(
  rules: CommissionRule[],
  track: string | null | undefined,
  group: string | null | undefined,
): CommissionRule {
  const hit = sortRules(rules).find(
    (r) =>
      (r.match_track === null || r.match_track === track) &&
      (r.match_group === null || r.match_group === group),
  )
  // القاعدة الافتراضية موجودة دايمًا، بس TypeScript مايعرفش كده.
  return hit ?? COMMISSION_DEFAULTS[COMMISSION_DEFAULTS.length - 1]
}

/** النسبة الافتراضية للمنصة — اللي المورد الجديد بيتسجّل بيها. */
export async function defaultCommissionPercent(): Promise<number> {
  const rules = await getCommissionRules()
  const def = rules.find((r) => r.key === 'default') ?? matchRule(rules, null, null)
  return def.kind === 'percent' && Number.isFinite(def.value) ? Number(def.value) : 10
}

/**
 * بلوك العمولة اللي بيتحقن في برومبت المارد.
 *
 * ⚠️ مكتوب هنا مرة واحدة بس. أي حتة تانية عايزة تقول رقم عمولة لازم
 *    تنادي الدالة دي — مش تكتب الرقم. ده بالظبط اللي وقّعنا في المركبات.
 */
export async function commissionPromptBlock(): Promise<string> {
  const rules = await getCommissionRules()
  const byKey = new Map(rules.map((r) => [r.key, r]))
  const line = (key: string, title: string) => {
    const r = byKey.get(key)
    if (!r) return null
    const note = r.note_ar ? `\n  ↳ ${r.note_ar}` : ''
    return `• **${title}** → **${r.label_ar}**${note}`
  }

  const known = [
    line('rent-property', 'إيجار عقار'),
    line('sale-property', 'بيع/ريسيل عقار'),
    line('sale-vehicles', 'بيع المركبات (عربيات · موتوسيكلات)'),
    line('sale-marine', 'بيع مركبات بحرية'),
  ].filter(Boolean) as string[]

  const def = byKey.get('default')
  if (def) known.push(`• **أي حاجة تانية** (خدمات · مطاعم · مارت · منتجات) → **${def.label_ar}**`)

  // أي قاعدة زوّدها محمد من الشاشة وإحنا مش عارفينها بالاسم
  const extra = rules
    .filter((r) => !['rent-property', 'sale-property', 'sale-vehicles', 'sale-marine', 'default'].includes(r.key))
    .map((r) => `• **${r.key}** → **${r.label_ar}**${r.note_ar ? `\n  ↳ ${r.note_ar}` : ''}`)

  return [
    '💰 **العمولة — الأرقام دي بتتقري من الداتابيز وقت الرد، فهي آخر حاجة قالها محمد:**',
    ...known,
    ...extra,
    '',
    '⛔ العقارات والمركبات مش نفس الحاجة — ماتخلطهمش وماتحسبش نسبة للمركبات.',
    // سكربت تسجيل المطاعم فوق في البرومبت مكتوب فيه «العمولة ١٠٪» بالنص
    // في ٥ مواضع — ده مقصود لأنه سكربت بيع متظبّط. بس لو محمد غيّر
    // القاعدة الافتراضية من الشاشة، السطر ده هو اللي بيمنع المارد يقول
    // رقمين مختلفين في نفس الرسالة.
    `⛔ لو لقيت في أي مكان تاني في التعليمات رقم عمولة مختلف عن اللي فوق — **اللي فوق هو الصح**، لأنه بيتقري من الداتابيز دلوقتي حالًا.${
      def ? ` (المطاعم والخدمات والمنتجات = ${def.label_ar}.)` : ''
    }`,
    '⛔ الرقم اللي فوق هو نفسه اللي الحملات بتقوله للبايعين بالنص. لو حد بعتلك ردًّا على حملة،',
    '   **ماتقولش رقم تاني ولا «بالاتفاق»** — ده بيخلّيه يشك في الرسالة كلها.',
    '⛔ ماتبدأش الكلام بالعمولة في بيع العقارات والمركبات — الهدف إننا نسجّل الإعلان الأول.',
    '   لو سأل، ساعتها جاوب بالرقم الصح فوق.',
  ].join('\n')
}

/** العلامة اللي بتتبدّل في البرومبت الثابت. */
export const COMMISSION_TOKEN = '{{COMMISSION_RULES}}'

/**
 * بيحط بلوك العمولة الحي مكان العلامة في أي برومبت.
 * لو العلامة مش موجودة بيرجّع البرومبت زي ما هو — أسوأ حالة إننا نمشي
 * بالبرومبت القديم، مش إننا نبعت برومبت ناقص.
 */
export async function withLiveCommission(prompt: string): Promise<string> {
  if (!prompt.includes(COMMISSION_TOKEN)) return prompt
  try {
    return prompt.split(COMMISSION_TOKEN).join(await commissionPromptBlock())
  } catch {
    return prompt.split(COMMISSION_TOKEN).join(
      COMMISSION_DEFAULTS.map((r) => `• ${r.key} → ${r.label_ar}`).join('\n'),
    )
  }
}

/** بيفضّي الكاش — الشاشة بتناديها بعد الحفظ عشان التغيير يبان على طول. */
export function clearCommissionCache(): void {
  cache = null
}
