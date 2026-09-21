// ═══════════════════════════════════════════════════════════════════════
// 🗂️ مصدر واحد لقاعدة «تجميع التصنيفات في مجموعات»
//
// محمد (٢ سبتمبر ٢٠٢٦): «ياريت الإضافة تطابق العرض، علشان مش عارف إزاي
// إحنا بنضيف قسم وبننسى نشوف لو حد حب يضيف مانيوال يعمل إيه، أو لو موظف
// حب يضيف. أنا عايز المواضيع دي يكون ليها ربط علشان هي فعلاً مربوطة».
//
// قبل الملف ده كانت القاعدة **متكتوبة مرتين**: مرة في MarketplaceClient
// (العرض) ومرة في AddListingClient (الإضافة) — فأي تصنيف جديد كان بيتظبط
// في واحدة وينسى في التانية. دلوقتي القاعدة هنا، والشاشتين بينادوها.
//
// ⚠️ أي شاشة جديدة بتعرض أو بتضيف تصنيفات لازم تنادي resolveTopGroups —
//    ممنوع نسخة تالتة من المنطق ده.
// ═══════════════════════════════════════════════════════════════════════

/** أقل شكل محتاجينه من التصنيف عشان نجمّعه. كل شاشة بتطوّع الداتا بتاعتها له. */
export type GroupMeta = {
  slug: string
  name_ar: string
  name_i18n?: Record<string, string> | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_name_i18n?: Record<string, string> | null
  group_emoji?: string | null
  group_display_order?: number | null
}

export type CatGroup<T> = {
  slug: string
  name_ar: string
  name_i18n: Record<string, string> | null
  emoji: string
  order: number
  cats: T[]
}

/** تجميع مباشر بالـgroup_slug (والمفتاح البديل هو الـslug لو مفيش مجموعة). */
export function groupCategories<T extends GroupMeta>(
  items: T[],
  opts: { fallbackToSelf?: boolean } = {},
): CatGroup<T>[] {
  const map = new Map<string, CatGroup<T>>()
  for (const c of items) {
    const key = c.group_slug || (opts.fallbackToSelf ? c.slug : '__ungrouped')
    if (!map.has(key)) {
      map.set(key, {
        slug: key,
        name_ar: c.group_name_ar || (opts.fallbackToSelf ? c.name_ar : ''),
        name_i18n: (c.group_slug ? c.group_name_i18n : c.name_i18n) || null,
        emoji: c.group_emoji || '',
        order: c.group_display_order ?? 999,
        cats: [],
      })
    }
    map.get(key)!.cats.push(c)
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}

/**
 * مجموعات المستوى الأول لأي قسم (تراك).
 *
 * القاعدة (نفسها في العرض والإضافة):
 *  ١) جمّع الرووتس بالـgroup_slug — ده الوضع الطبيعي (بيع · إيجار · خدمات).
 *  ٢) لو طلعت **مجموعة واحدة ورووت واحد** (شركات وصناعة)، المجموعات
 *     الحقيقية عايشة على **أولاد** الرووت — فأعد البناء منهم.
 *     (صناعة الأدوية · صناعة عامة · خدمات صناعية)
 *  ٣) غير كده سيبها زي ما هي (مطاعم: مجموعة واحدة و١٣ رووت — الرووتس
 *     نفسها هي المستوى الأول).
 */
export function resolveTopGroups<T extends GroupMeta>(
  roots: T[],
  childrenOf: (root: T) => T[],
  opts: { fallbackToSelf?: boolean } = {},
): CatGroup<T>[] {
  const byRoots = groupCategories(roots, opts)
  if (byRoots.length > 1 || roots.length !== 1) return byRoots
  const kids = childrenOf(roots[0])
  const byKids = groupCategories(kids, opts).filter(g => g.slug !== roots[0].group_slug)
  return byKids.length > 1 ? byKids : byRoots
}

// ═══════════════════════════════════════════════════════════════════════
// 🧭 أقسام السوق الخمسة — **مصدر واحد** للعرض والإضافة.
//
// (٢ سبتمبر ٢٠٢٦) القايمة كانت متكتوبة مرتين: الماركتبليس فيه الخمسة،
// والويزارد فيه أربعة hardcoded من غير 'industry'. فلما اتضاف القسم
// الخامس (١/٩) بان في التصفّح واتنسي في الإضافة — بالظبط اللي محمد
// اشتكى منه. أي قسم جديد يتضاف **هنا** وبس.
// ملحوظة: 'sales' مالوش تاب — تصنيفاته بتتعرض جوّه 'products'.
// و'hybrid' جوّه 'rentals'.
export const TRACK_TAB_ORDER = ['products', 'rentals', 'services', 'restaurants', 'industry'] as const
export type MarketTrack = (typeof TRACK_TAB_ORDER)[number]

/**
 * 🧭 رووتس التراك — **مصدر واحد للعرض والإضافة** (٢١ سبتمبر ٢٠٢٦).
 *
 * محمد: «انا مش لاقي قسم المعدات الثقلة مع اني شايف ٥٠٠ نوع معدات تصوير».
 *
 * المشكلة: الرووتس كانت بتتحسب `parent_id === null && track === التراك` بس.
 * وفيه **٣١ قسم نشط أبوهم في تراك تاني** — يعني القسم في «إيجار» وأبوه في
 * «شركات وصناعة»، فالابن مالوش أب في شجرة الإيجار و**بيختفي خالص**:
 *   • معدات ثقيله → ٨ أقسام (أوناش · كومبريسور · محطات خلط · أساسات ·
 *     تحريك تربة · خرسانة · لحام · مولدات)
 *   • عقارات صناعية → ١٦ (مصنع · مخزن · مخزن مبرد · مركز لوجستي · ورشة …)
 *   • مقاولات وتشطيبات → ٦ · إلكترونيات → ١
 *
 * القاعدة دلوقتي: رووتس التراك = الرووتس الحقيقية **+ أي أب** ليه أولاد في
 * التراك ده وهو نفسه مش فيه. الأب بيتعرض بأقسامه، بدل ما تتبعتر أو تختفي.
 */
export function rootsForTrack<T extends { id: string; parent_id: string | null; track?: string | null }>(
  all: T[],
  inTrack: (c: T) => boolean,
): T[] {
  const roots = all.filter((c) => c.parent_id === null && inTrack(c))
  const rootIds = new Set(roots.map((r) => r.id))
  const byId = new Map(all.map((c) => [c.id, c]))
  const extra = new Map<string, T>()
  for (const c of all) {
    if (!c.parent_id || !inTrack(c) || rootIds.has(c.parent_id)) continue
    const parent = byId.get(c.parent_id)
    // الأب مش في رووتس التراك → نرفعه كرووت عشان أولاده يبانوا تحته
    if (parent && !rootIds.has(parent.id) && !extra.has(parent.id)) extra.set(parent.id, parent)
  }
  return [...roots, ...extra.values()]
}
