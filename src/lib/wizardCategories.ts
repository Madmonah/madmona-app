// 🌳 (٢٦ أغسطس ٢٠٢٦) شجرة تصنيفات الإضافة — مصدر واحد.
// محمد: «لسة تاب الاضافة بتاعت الاعلان اللي موجودة في شغلي فيها مشكلة».
// المشكلة: مودال «ضيف إعلان» كان بياخد التصنيفات من admin_listings_facets
// — يعني بس التصنيفات اللي عليها إعلانات بالفعل، ليستة مسطحة فيها عك،
// وتصنيف جديد فاضي مش بيظهر، والأب مش الورقة مش بيجيب أتربيوتات.
// الدالة دي بتبني نفس شجرة الويزارد بالظبط (نفس قواعد add-listing/page.tsx:
// is_active · ٣ مستويات · display_order · also_show_in · ديدوب) وبترجعها
// كاختيارات جاهزة للدروب داون — أي شاشة إضافة جديدة تستخدمها هي.
import type { SupabaseClient } from '@supabase/supabase-js'

export type WizardCatOption = {
  id: string
  name: string      // الاسم مع الإيموجي
  group: string     // اسم المجموعة (القسم الرئيسي) للـoptgroup
}

type Row = {
  id: string; slug: string; name_ar: string; icon: string | null
  parent_id: string | null; also_show_in: string[] | null
  group_name_ar: string | null; group_emoji: string | null
}

export async function getWizardCategoryOptions(db: SupabaseClient): Promise<WizardCatOption[]> {
  const COLS = 'id, slug, name_ar, icon, parent_id, also_show_in, group_name_ar, group_emoji'

  const { data: topsRaw } = await db.from('categories')
    .select(COLS).is('parent_id', null).eq('is_active', true).order('display_order')
  const tops = (topsRaw || []) as Row[]
  if (!tops.length) return []

  const { data: subsRaw } = await db.from('categories')
    .select(COLS).in('parent_id', tops.map(t => t.id)).eq('is_active', true).order('display_order')
  const subs = (subsRaw || []) as Row[]

  let grands: Row[] = []
  if (subs.length) {
    const { data: grandRaw } = await db.from('categories')
      .select(COLS).in('parent_id', subs.map(s => s.id)).eq('is_active', true).order('display_order')
    grands = (grandRaw || []) as Row[]
  }

  const out: WizardCatOption[] = []
  const seen = new Set<string>()  // ديدوب عالمي — also_show_in بيكرر الفروع
  const push = (row: Row, group: string) => {
    if (seen.has(row.id)) return
    seen.add(row.id)
    out.push({ id: row.id, name: `${row.icon || '📁'} ${row.name_ar}`, group })
  }

  for (const top of tops) {
    const group = `${top.icon || '📁'} ${top.name_ar}`
    const matching = subs.filter(s =>
      s.parent_id === top.id || (Array.isArray(s.also_show_in) && s.also_show_in.includes(top.id)))
    if (!matching.length) {
      // قسم من غير فروع — هو نفسه الاختيار
      push(top, top.group_name_ar ? `${top.group_emoji || '📁'} ${top.group_name_ar}` : 'أقسام تانية')
      continue
    }
    for (const s of matching) {
      push(s, group)
      for (const g of grands) if (g.parent_id === s.id) push(g, group)
    }
  }
  return out
}
