// src/lib/developer-directory.ts
// =====================================================================
// دليل المطورين: بيربط كل لوجو في public/developers/ بأسماء الشركة
// زي ما هي متخزنة في property_market_items.developer (عربي/إنجليزي/صيغ مختلفة).
// مستخدم في: MarketExplorer (رصّة اللوجوهات + فلتر ?dev=).
// =====================================================================

// جودة اللوجو الفعلية (دقة الصورة المصدر) — بتتحدد يدوي مرة واحدة من أبعاد
// كل ملف (SVG = عالية دايمًا، PNG/WebP بتتقاس بمساحة البيكسل). مستخدمة في
// شاشة البورصة العقارية عشان كل لوجو ياخد مساحة عرض تناسب جودته الحقيقية
// بدل ما نكبّر لوجو منخفض الدقة ويبان مبكسل (طلب محمد ١١ أغسطس).
//   high   → SVG أو راستر ≥ ~250k بيكسل (600×600 فأكتر تقريبًا)
//   medium → راستر بين ~30k و250k بيكسل
//   low    → راستر أقل من ~20k بيكسل (لوجوهات صغيرة فعليًا من المصدر)
export type LogoQuality = 'high' | 'medium' | 'low'

export type DeveloperEntry = {
  slug: string
  name: string          // الاسم المعروض بالعربي
  logo: string          // مسار اللوجو
  match: string[]       // كل الصيغ الموجودة في الداتابيز
  quality: LogoQuality
}

export const DEVELOPER_DIRECTORY: DeveloperEntry[] = [
  { slug: 'talaat-moustafa', name: 'طلعت مصطفى', logo: '/developers/talaat-moustafa.png', match: ['طلعت مصطفى'], quality: 'high' },
  { slug: 'emaar-misr', name: 'إعمار مصر', logo: '/developers/emaar-misr.png', match: ['إعمار مصر'], quality: 'low' },
  { slug: 'sodic', name: 'سوديك', logo: '/developers/sodic.svg', match: ['سوديك'], quality: 'high' },
  { slug: 'palm-hills', name: 'بالم هيلز', logo: '/developers/palm-hills.svg', match: ['بالم هيلز'], quality: 'high' },
  { slug: 'mountain-view', name: 'ماونتن فيو', logo: '/developers/mountain-view.png', match: ['ماونتن فيو', 'ماونتن فيو + هايد بارك'], quality: 'medium' },
  { slug: 'ora', name: 'أورا', logo: '/developers/ora.png', match: ['أورا (نجيب ساويرس)'], quality: 'medium' },
  { slug: 'hyde-park', name: 'هايد بارك', logo: '/developers/hyde-park.png', match: ['هايد بارك', 'Hyde Park Developments', 'ماونتن فيو + هايد بارك'], quality: 'low' },
  { slug: 'la-vista', name: 'لافيستا', logo: '/developers/la-vista.png', match: ['لافيستا'], quality: 'high' },
  { slug: 'tatweer-misr', name: 'تطوير مصر', logo: '/developers/tatweer-misr.svg', match: ['تطوير مصر', 'Tatweer Misr'], quality: 'high' },
  { slug: 'hdp', name: 'HDP', logo: '/developers/hdp.svg', match: ['HDP Development'], quality: 'high' },
  { slug: 'new-plan', name: 'نيو بلان', logo: '/developers/new-plan.svg', match: ['New Plan Developments', 'New Plan Development'], quality: 'high' },
  { slug: 'gates', name: 'جيتس', logo: '/developers/gates.webp', match: ['Gates Developments'], quality: 'low' },
  { slug: 'roya', name: 'رؤية', logo: '/developers/roya.svg', match: ['Roya Developments'], quality: 'high' },
  { slug: 'saudi-egyptian', name: 'السعودية المصرية', logo: '/developers/saudi-egyptian.png', match: ['Saudi Egyptian Developers (SED)'], quality: 'medium' },
  { slug: 'empire-state', name: 'إمباير ستيت', logo: '/developers/empire-state.png', match: ['Empire State Developments'], quality: 'high' },
  { slug: 'alfath', name: 'الفتح جروب', logo: '/developers/alfath.png', match: ['Al Fath Group (AFG)', 'AlFath Group (AFG)', 'Alfth Group'], quality: 'medium' },
  { slug: 'al-kayan', name: 'الكيان', logo: '/developers/al-kayan.webp', match: ['Al Kayan Real Estate'], quality: 'high' },
  { slug: 'maqam', name: 'مقام', logo: '/developers/maqam.webp', match: ['MAQAM for Urban Development'], quality: 'low' },
  { slug: 'ncb', name: 'NCB', logo: '/developers/ncb.png', match: ['NCB Developments'], quality: 'low' },
  { slug: 'upwyde', name: 'أبوايد', logo: '/developers/upwyde.png', match: ['Upwyde Developments'], quality: 'medium' },
  { slug: 'misr-italia', name: 'مصر إيطاليا', logo: '/developers/misr-italia.webp', match: ['مصر إيطاليا'], quality: 'medium' },
  { slug: 'hassan-allam', name: 'حسن علام', logo: '/developers/hassan-allam.png', match: ['حسن علام'], quality: 'high' },
  { slug: 'samco', name: 'سامكو', logo: '/developers/samco.webp', match: ['Samco Holding'], quality: 'medium' },
  { slug: 'rayn', name: 'راين', logo: '/developers/rayn.svg', match: ['Rayn Developments'], quality: 'high' },
  { slug: 'arqa', name: 'أرقى', logo: '/developers/arqa.png', match: ['ARQA Development Group'], quality: 'low' },
]

export function findDeveloperBySlug(slug: string): DeveloperEntry | undefined {
  return DEVELOPER_DIRECTORY.find((d) => d.slug === slug)
}
