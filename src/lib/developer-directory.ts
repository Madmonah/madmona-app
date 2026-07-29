// src/lib/developer-directory.ts
// =====================================================================
// دليل المطورين: بيربط كل لوجو في public/developers/ بأسماء الشركة
// زي ما هي متخزنة في property_market_items.developer (عربي/إنجليزي/صيغ مختلفة).
// مستخدم في: MobileHome (رصّة اللوجوهات) + MarketExplorer (فلتر ?dev=).
// =====================================================================

export type DeveloperEntry = {
  slug: string
  name: string          // الاسم المعروض بالعربي
  logo: string          // مسار اللوجو
  match: string[]       // كل الصيغ الموجودة في الداتابيز
}

export const DEVELOPER_DIRECTORY: DeveloperEntry[] = [
  { slug: 'talaat-moustafa', name: 'طلعت مصطفى', logo: '/developers/talaat-moustafa.png', match: ['طلعت مصطفى'] },
  { slug: 'emaar-misr', name: 'إعمار مصر', logo: '/developers/emaar-misr.png', match: ['إعمار مصر'] },
  { slug: 'sodic', name: 'سوديك', logo: '/developers/sodic.svg', match: ['سوديك'] },
  { slug: 'palm-hills', name: 'بالم هيلز', logo: '/developers/palm-hills.svg', match: ['بالم هيلز'] },
  { slug: 'mountain-view', name: 'ماونتن فيو', logo: '/developers/mountain-view.png', match: ['ماونتن فيو', 'ماونتن فيو + هايد بارك'] },
  { slug: 'ora', name: 'أورا', logo: '/developers/ora.png', match: ['أورا (نجيب ساويرس)'] },
  { slug: 'hyde-park', name: 'هايد بارك', logo: '/developers/hyde-park.png', match: ['هايد بارك', 'Hyde Park Developments', 'ماونتن فيو + هايد بارك'] },
  { slug: 'la-vista', name: 'لافيستا', logo: '/developers/la-vista.png', match: ['لافيستا'] },
  { slug: 'tatweer-misr', name: 'تطوير مصر', logo: '/developers/tatweer-misr.svg', match: ['تطوير مصر', 'Tatweer Misr'] },
  { slug: 'hdp', name: 'HDP', logo: '/developers/hdp.svg', match: ['HDP Development'] },
  { slug: 'new-plan', name: 'نيو بلان', logo: '/developers/new-plan.svg', match: ['New Plan Developments', 'New Plan Development'] },
  { slug: 'gates', name: 'جيتس', logo: '/developers/gates.webp', match: ['Gates Developments'] },
  { slug: 'roya', name: 'رؤية', logo: '/developers/roya.svg', match: ['Roya Developments'] },
  { slug: 'saudi-egyptian', name: 'السعودية المصرية', logo: '/developers/saudi-egyptian.png', match: ['Saudi Egyptian Developers (SED)'] },
  { slug: 'empire-state', name: 'إمباير ستيت', logo: '/developers/empire-state.png', match: ['Empire State Developments'] },
  { slug: 'alfath', name: 'الفتح جروب', logo: '/developers/alfath.png', match: ['Al Fath Group (AFG)', 'AlFath Group (AFG)', 'Alfth Group'] },
  { slug: 'al-kayan', name: 'الكيان', logo: '/developers/al-kayan.webp', match: ['Al Kayan Real Estate'] },
  { slug: 'maqam', name: 'مقام', logo: '/developers/maqam.webp', match: ['MAQAM for Urban Development'] },
  { slug: 'ncb', name: 'NCB', logo: '/developers/ncb.png', match: ['NCB Developments'] },
]

export function findDeveloperBySlug(slug: string): DeveloperEntry | undefined {
  return DEVELOPER_DIRECTORY.find((d) => d.slug === slug)
}
