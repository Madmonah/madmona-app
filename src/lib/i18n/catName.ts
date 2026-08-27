// src/lib/i18n/catName.ts
// ============================================================
// 🌍 (٢٧ أغسطس ٢٠٢٦) اسم التصنيف/المجموعة باللغة الحالية.
// المصدر في الداتابيز: categories.name_ar (المصري) + name_en +
// name_i18n {en,uk,ru,ja} (وللمجموعات group_name_ar + group_name_i18n).
// سلسلة الرجوع: i18n[locale] → i18n.en → name_en → name_ar.
// العربي بنوعيه (مصري/خليجي) بياخد name_ar دايمًا.
// أي مكان بيعرض اسم تصنيف للمستخدم يستخدم الدالتين دول — ممنوع
// `lang === 'en' ? name_en : name_ar` تاني.
// ============================================================
import type { Locale } from './dictionary'

export type I18nNames = Record<string, string | null | undefined> | null | undefined

export type NamedCategory = {
  name_ar?: string | null
  name_en?: string | null
  name_i18n?: I18nNames
}

export type NamedGroup = {
  group_name_ar?: string | null
  group_name_i18n?: I18nNames
}

function pick(locale: Locale, ar: string | null | undefined, en: string | null | undefined, i18n: I18nNames): string {
  if (locale === 'ar' || locale === 'ar-gulf') return ar || en || ''
  return i18n?.[locale] || i18n?.en || en || ar || ''
}

export function catNameFor(c: NamedCategory | null | undefined, locale: Locale): string {
  if (!c) return ''
  return pick(locale, c.name_ar, c.name_en, c.name_i18n)
}

export function groupNameFor(g: NamedGroup | null | undefined, locale: Locale): string {
  if (!g) return ''
  return pick(locale, g.group_name_ar, g.group_name_i18n?.en, g.group_name_i18n)
}

/** أعمدة التصنيف اللي لازم تتجاب في أي select عشان catNameFor تشتغل */
export const CAT_NAME_COLS = 'name_ar, name_en, name_i18n'

// ---- إعلانات: عنوان ووصف بلغة المستخدم ----
// المصدر listings.title/description (لغة صاحب الإعلان) + listings.i18n
// {en,uk,ru,ja}{title,description} (بتتولد بـ scripts/translate-listings.mjs
// وبتتمسح تلقائي لو الأصل اتغيّر). العربي بنوعيه = الأصل.
export type I18nListing = {
  title?: string | null
  description?: string | null
  i18n?: Record<string, { title?: string | null; description?: string | null } | null> | null
}

export function listingTitleFor(l: I18nListing | null | undefined, locale: Locale): string {
  if (!l) return ''
  if (locale === 'ar' || locale === 'ar-gulf') return l.title || ''
  return l.i18n?.[locale]?.title || l.i18n?.en?.title || l.title || ''
}

export function listingDescriptionFor(l: I18nListing | null | undefined, locale: Locale): string {
  if (!l) return ''
  if (locale === 'ar' || locale === 'ar-gulf') return l.description || ''
  return l.i18n?.[locale]?.description || l.i18n?.en?.description || l.description || ''
}

// ---- مدن/مناطق: الاسم العربي زي ما المورد كتبه ← ترجمة للعرض ----
// (٢٧ أغسطس ٢٠٢٦) المدن في listings.city نص حر بالعربي. الخريطة دي للأسماء
// المتكررة؛ أي اسم مش هنا بيتعرض زي ما هو.
const CITY_I18N: Record<string, [string, string, string, string, string]> = {
  // [en, uk, ru, ja, zh]
  'القاهرة': ['Cairo', 'Каїр', 'Каир', 'カイロ', '开罗'],
  'القاهره': ['Cairo', 'Каїр', 'Каир', 'カイロ', '开罗'],
  'القاهرة الجديدة': ['New Cairo', 'Новий Каїр', 'Новый Каир', 'ニューカイロ', '新开罗'],
  'العاصمة الإدارية': ['New Administrative Capital', 'Нова адміністративна столиця', 'Новая административная столица', '新行政首都', '新行政首都'],
  'العاصمة الإدارية الجدية': ['New Administrative Capital', 'Нова адміністративна столиця', 'Новая административная столица', '新行政首都', '新行政首都'],
  'الساحل الشمالي': ['North Coast', 'Північне узбережжя', 'Северное побережье', '北海岸', '北海岸'],
  'الإسكندرية': ['Alexandria', 'Олександрія', 'Александрия', 'アレクサンドリア', '亚历山大'],
  'اسكندريه': ['Alexandria', 'Олександрія', 'Александрия', 'アレクサンドリア', '亚历山大'],
  'الجيزة': ['Giza', 'Гіза', 'Гиза', 'ギザ', '吉萨'],
  'مستقبل سيتي': ['Mostakbal City', 'Мостакбаль-Сіті', 'Мостакбаль-Сити', 'モスタクバル・シティ', 'Mostakbal City'],
  'العبور': ['El Obour', 'Ель-Обур', 'Эль-Обур', 'エル・オブール', 'El Obour'],
  'العبور الجديدة': ['New Obour', 'Новий Обур', 'Новый Обур', 'ニュー・オブール', 'New Obour'],
  'العين السخنة': ['Ain Sokhna', 'Айн-Сохна', 'Айн-Сохна', 'アイン・ソフナ', 'Ain Sokhna'],
  'الشيخ زايد': ['Sheikh Zayed', 'Шейх-Заїд', 'Шейх-Заид', 'シェイク・ザイード', 'Sheikh Zayed'],
  'نيو زايد': ['New Zayed', 'Нью-Заїд', 'Нью-Заид', 'ニュー・ザイード', 'New Zayed'],
  'الشروق': ['El Shorouk', 'Ель-Шурук', 'Эль-Шурук', 'エル・ショルーク', 'El Shorouk'],
  'هليوبوليس الجديدة': ['New Heliopolis', 'Новий Геліополіс', 'Новый Гелиополис', 'ニュー・ヘリオポリス', '新 Heliopolis'],
  'مصر الجديدة': ['Heliopolis', 'Геліополіс', 'Гелиополис', 'ヘリオポリス', 'Heliopolis'],
  'التجمع الخامس': ['Fifth Settlement', 'П’яте поселення', 'Пятый район', '第5居住区', '第五区'],
  'الغردقة': ['Hurghada', 'Хургада', 'Хургада', 'ハルガダ', '赫尔格达'],
  'الغردقه': ['Hurghada', 'Хургада', 'Хургада', 'ハルガダ', '赫尔格达'],
  'العلمين الجديدة': ['New Alamein', 'Новий Аламейн', 'Новый Аламейн', 'ニュー・アラメイン', '新阿拉曼'],
  'شرم الشيخ': ['Sharm El Sheikh', 'Шарм-ель-Шейх', 'Шарм-эль-Шейх', 'シャルム・エル・シェイク', '沙姆沙伊赫'],
  'مطروح': ['Matrouh', 'Матрух', 'Матрух', 'マトルーフ', '马特鲁'],
  'العاشر من رمضان': ['10th of Ramadan', 'Місто 10 Рамадану', 'Город 10 Рамадана', '10th of Ramadan', '十月拉马丹城'],
  '٦ أكتوبر': ['6th of October', 'Місто 6 Жовтня', 'Город 6 Октября', '10月6日市', '十月六日城'],
  '6 أكتوبر': ['6th of October', 'Місто 6 Жовтня', 'Город 6 Октября', '10月6日市', '十月六日城'],
  'رأس الحكمة': ['Ras El Hekma', 'Рас-ель-Хекма', 'Рас-эль-Хекма', 'ラス・エル・ヘクマ', 'Ras El Hekma'],
  'السويس': ['Suez', 'Суец', 'Суэц', 'スエズ', '苏伊士'],
  'البحر الاحمر': ['Red Sea', 'Червоне море', 'Красное море', '紅海', '红海'],
  'المعادي': ['Maadi', 'Мааді', 'Маади', 'マアディ', 'Maadi'],
  'مدينة نصر': ['Nasr City', 'Наср-Сіті', 'Наср-Сити', 'ナスル・シティ', 'Nasr City'],
  'الدقي': ['Dokki', 'Докі', 'Докки', 'ドッキ', 'Dokki'],
  'المهندسين': ['Mohandessin', 'Мохандесін', 'Мохандесин', 'モハンデシーン', 'Mohandessin'],
  'الزمالك': ['Zamalek', 'Замалек', 'Замалек', 'ザマレク', 'Zamalek'],
  'مدينتي': ['Madinaty', 'Мадінаті', 'Мадинати', 'マディナティ', 'Madinaty'],
  'الرحاب': ['El Rehab', 'Ель-Рехаб', 'Эль-Рехаб', 'エル・レハブ', 'El Rehab'],
  'دهب': ['Dahab', 'Дахаб', 'Дахаб', 'ダハブ', '达哈布'],
  'الجونة': ['El Gouna', 'Ель-Гуна', 'Эль-Гуна', 'エル・グーナ', 'El Gouna'],
  'الأقصر': ['Luxor', 'Луксор', 'Луксор', 'ルクソール', '卢克索'],
  'أسوان': ['Aswan', 'Асуан', 'Асуан', 'アスワン', '阿斯旺'],
  'مرسى علم': ['Marsa Alam', 'Марса-Алам', 'Марса-Алам', 'マルサ・アラム', 'Marsa Alam'],
  'مرسى مطروح': ['Marsa Matrouh', 'Марса-Матрух', 'Марса-Матрух', 'マルサ・マトルーフ', '马特鲁港'],
  'بورسعيد': ['Port Said', 'Порт-Саїд', 'Порт-Саид', 'ポートサイド', '塞得港'],
  'الإسماعيلية': ['Ismailia', 'Ісмаїлія', 'Исмаилия', 'イスマイリア', '伊斯梅利亚'],
  'المنصورة': ['Mansoura', 'Мансура', 'Мансура', 'マンスーラ', '曼苏拉'],
  'طنطا': ['Tanta', 'Танта', 'Танта', 'タンタ', '坦塔'],
  'الفيوم': ['Fayoum', 'Файюм', 'Файюм', 'ファイユーム', '法尤姆'],
}
const CITY_IDX: Record<string, number> = { en: 0, uk: 1, ru: 2, ja: 3, zh: 4 }
export function cityFor(city: string | null | undefined, locale: Locale): string {
  if (!city) return ''
  if (locale === 'ar' || locale === 'ar-gulf') return city
  const hit = CITY_I18N[city.trim()]
  const idx = CITY_IDX[locale]
  return hit && idx !== undefined ? hit[idx] : (hit ? hit[0] : city)
}

// ---- خصائص الإعلان (attributes) ----
// name_i18n {en,uk,ru,ja,zh} لو موجود → name_en → name_ar. الاختيارات كذلك.
export type NamedAttr = { name_ar?: string | null; name_en?: string | null; name_i18n?: I18nNames }
export function attrNameFor(a: NamedAttr | null | undefined, locale: Locale): string {
  if (!a) return ''
  return pick(locale, a.name_ar, a.name_en, a.name_i18n)
}
export type AttrOption = { key?: string; label_ar?: string | null; label_en?: string | null; label_i18n?: I18nNames }
export function optionLabelFor(o: AttrOption | null | undefined, locale: Locale): string {
  if (!o) return ''
  return pick(locale, o.label_ar, o.label_en, o.label_i18n)
}
