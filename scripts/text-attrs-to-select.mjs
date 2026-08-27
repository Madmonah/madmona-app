// scripts/text-attrs-to-select.mjs
// 📋 (٢٧ أغسطس ٢٠٢٦) محمد: «التفاصيل اللي جوّه إضافة المنتج زي الماركة والموديل
// تبقى دروب ليست — على مستوى الأبليكيشن». بيحوّل حقول attributes نوعها text
// لقوايم منسدلة (select / multi_select) مع خيارات مترجمة بـ٥ لغات.
// كل خيار له key ثابت إنجليزي + label_ar + options_i18n.
// الحقول اللي طبيعتها نص حر (اسم الكومبوند · الأبعاد · تاريخ الرخصة · الموديل)
// بتفضل text عن قصد. التشغيل: node scripts/text-attrs-to-select.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const L = ['en', 'uk', 'ru', 'ja', 'zh']
const o = (a) => Object.fromEntries(L.map((l, i) => [l, a[i]]))

// [key, ar, en, uk, ru, ja, zh]
const FLOORS = [
  ['basement','بدروم','Basement','Цокольний','Цокольный','地下','地下室'],
  ['ground','أرضي','Ground floor','Перший поверх','Первый этаж','1階','一楼'],
  ['ground_garden','أرضي بجاردن','Ground floor with garden','Перший із садом','Первый с садом','庭付き1階','带花园一楼'],
  ['1','الأول','1st floor','1-й поверх','1-й этаж','2階','二楼'],
  ['2','الثاني','2nd floor','2-й поверх','2-й этаж','3階','三楼'],
  ['3','الثالث','3rd floor','3-й поверх','3-й этаж','4階','四楼'],
  ['4','الرابع','4th floor','4-й поверх','4-й этаж','5階','五楼'],
  ['5','الخامس','5th floor','5-й поверх','5-й этаж','6階','六楼'],
  ['6_9','من السادس للتاسع','6th–9th floor','6–9 поверх','6–9 этаж','7〜10階','六至九楼'],
  ['10_plus','العاشر أو أعلى','10th floor or higher','10-й і вище','10-й и выше','11階以上','十楼及以上'],
  ['top','الأخير','Top floor','Останній поверх','Последний этаж','最上階','顶层'],
  ['roof','روف','Roof','Дах','Крыша','ルーフ','屋顶'],
]
const COLORS = [
  ['white','أبيض','White','Білий','Белый','ホワイト','白色'],
  ['black','أسود','Black','Чорний','Чёрный','ブラック','黑色'],
  ['silver','فضي','Silver','Сріблястий','Серебристый','シルバー','银色'],
  ['grey','رمادي','Grey','Сірий','Серый','グレー','灰色'],
  ['blue','أزرق','Blue','Синій','Синий','ブルー','蓝色'],
  ['navy','كحلي','Navy','Темно-синій','Тёмно-синий','ネイビー','藏青色'],
  ['red','أحمر','Red','Червоний','Красный','レッド','红色'],
  ['maroon','نبيتي','Maroon','Бордовий','Бордовый','マルーン','酒红色'],
  ['green','أخضر','Green','Зелений','Зелёный','グリーン','绿色'],
  ['beige','بيچ','Beige','Бежевий','Бежевый','ベージュ','米色'],
  ['brown','بني','Brown','Коричневий','Коричневый','ブラウン','棕色'],
  ['gold','ذهبي','Gold','Золотий','Золотой','ゴールド','金色'],
  ['bronze','برونزي','Bronze','Бронзовий','Бронзовый','ブロンズ','古铜色'],
  ['other','لون آخر','Other colour','Інший колір','Другой цвет','その他の色','其他颜色'],
]
const MATERIALS = [
  ['wood','خشب','Wood','Дерево','Дерево','木','木材'],
  ['metal','معدن','Metal','Метал','Металл','金属','金属'],
  ['plastic','بلاستيك','Plastic','Пластик','Пластик','プラスチック','塑料'],
  ['glass','زجاج','Glass','Скло','Стекло','ガラス','玻璃'],
  ['ceramic','سيراميك','Ceramic','Кераміка','Керамика','セラミック','陶瓷'],
  ['stainless','استانلس','Stainless steel','Нержавіюча сталь','Нержавеющая сталь','ステンレス','不锈钢'],
  ['fabric','قماش','Fabric','Тканина','Ткань','ファブリック','布艺'],
  ['leather','جلد','Leather','Шкіра','Кожа','レザー','皮革'],
  ['rattan','خيزران','Rattan','Ротанг','Ротанг','ラタン','藤编'],
  ['marble','رخام','Marble','Мармур','Мрамор','大理石','大理石'],
  ['mixed','خامات مختلطة','Mixed materials','Змішані матеріали','Смешанные материалы','複合素材','混合材质'],
]
const SIZES = [
  ['xs','XS','XS','XS','XS','XS','XS'],
  ['s','S','S','S','S','S','S'],
  ['m','M','M','M','M','M','M'],
  ['l','L','L','L','L','L','L'],
  ['xl','XL','XL','XL','XL','XL','XL'],
  ['xxl','XXL','XXL','XXL','XXL','XXL','XXL'],
  ['free','مقاس واحد','One size','Один розмір','Один размер','フリーサイズ','均码'],
  ['custom','مقاس مخصوص','Custom size','Індивідуальний розмір','Индивидуальный размер','特注サイズ','定制尺寸'],
]
const SPORTS = [
  ['football','كرة قدم','Football','Футбол','Футбол','サッカー','足球'],
  ['basketball','كرة سلة','Basketball','Баскетбол','Баскетбол','バスケットボール','篮球'],
  ['gym','جيم وحديد','Gym & weights','Тренажерний зал','Тренажёрный зал','ジム・ウエイト','健身举重'],
  ['running','جري','Running','Біг','Бег','ランニング','跑步'],
  ['cycling','دراجات','Cycling','Велоспорт','Велоспорт','サイクリング','骑行'],
  ['swimming','سباحة','Swimming','Плавання','Плавание','水泳','游泳'],
  ['tennis','تنس وبادل','Tennis & padel','Теніс і падел','Теннис и падел','テニス・パデル','网球与板式网球'],
  ['martial','فنون قتالية','Martial arts','Бойові мистецтва','Боевые искусства','格闘技','武术'],
  ['camping','تخييم','Camping','Кемпінг','Кемпинг','キャンプ','露营'],
  ['other','رياضة أخرى','Other sport','Інший спорт','Другой спорт','その他のスポーツ','其他运动'],
]
const CITIES = [
  ['cairo','القاهرة','Cairo','Каїр','Каир','カイロ','开罗'],
  ['giza','الجيزة','Giza','Гіза','Гиза','ギザ','吉萨'],
  ['new_cairo','القاهرة الجديدة','New Cairo','Новий Каїр','Новый Каир','ニューカイロ','新开罗'],
  ['nac','العاصمة الإدارية','New Administrative Capital','Нова столиця','Новая столица','新行政首都','新行政首都'],
  ['october','٦ أكتوبر','6th of October','6 Жовтня','6 Октября','10月6日市','十月六日城'],
  ['zayed','الشيخ زايد','Sheikh Zayed','Шейх-Заїд','Шейх-Заид','シェイク・ザイード','谢赫扎耶德'],
  ['obour','العبور','El Obour','Ель-Обур','Эль-Обур','エル・オブール','奥布尔'],
  ['shorouk','الشروق','El Shorouk','Ель-Шурук','Эль-Шурук','エル・ショルーク','舒鲁克'],
  ['alex','الإسكندرية','Alexandria','Олександрія','Александрия','アレクサンドリア','亚历山大'],
  ['delta','الدلتا','Delta','Дельта','Дельта','デルタ地域','三角洲地区'],
  ['canal','مدن القناة','Canal cities','Міста каналу','Города канала','運河都市','运河城市'],
  ['upper','الصعيد','Upper Egypt','Верхній Єгипет','Верхний Египет','上エジプト','上埃及'],
  ['redsea','البحر الأحمر','Red Sea','Червоне море','Красное море','紅海','红海'],
  ['sahel','الساحل الشمالي','North Coast','Північне узбережжя','Северное побережье','北海岸','北海岸'],
  ['allover','كل المحافظات','All governorates','Усі провінції','Все провинции','全県','全国'],
]
const MISC_TYPE = [
  ['new_product','منتج جديد','New product','Новий товар','Новый товар','新品','全新商品'],
  ['used_product','منتج مستعمل','Used product','Вживаний товар','Б/у товар','中古品','二手商品'],
  ['handmade','شغل يدوي','Handmade','Ручна робота','Ручная работа','ハンドメイド','手工制品'],
  ['collectible','قطعة نادرة','Collectible','Колекційний','Коллекционный','コレクターズアイテム','收藏品'],
  ['spare','قطعة غيار','Spare part','Запчастина','Запчасть','スペアパーツ','配件'],
  ['other','نوع آخر','Other type','Інший тип','Другой тип','その他','其他类型'],
]

// field_key -> { type, opts }
const MAP = {
  floor:          { type: 'select',       opts: FLOORS },
  color:          { type: 'select',       opts: COLORS },
  material:       { type: 'select',       opts: MATERIALS },
  sports_size:    { type: 'select',       opts: SIZES },
  sport_type:     { type: 'select',       opts: SPORTS },
  ships_from:     { type: 'select',       opts: CITIES },
  delivery_areas: { type: 'multi_select', opts: CITIES },
  misc_type:      { type: 'select',       opts: MISC_TYPE },
}

const { data: rows, error } = await sb.from('attributes').select('id,name_ar,field_key,field_type,category_id').eq('field_type', 'text').in('field_key', Object.keys(MAP))
if (error) { console.error(error.message); process.exit(1) }
let n = 0
for (const r of rows) {
  const m = MAP[r.field_key]
  const options = m.opts.map(a => ({ key: a[0], label_ar: a[1] }))
  const options_i18n = Object.fromEntries(m.opts.map(a => [a[0], o(a.slice(2))]))
  const { error: e } = await sb.from('attributes').update({ field_type: m.type, options, options_i18n }).eq('id', r.id)
  if (e) console.error('save', r.id, e.message); else n++
}
console.log('converted text -> dropdown:', n, 'of', rows.length)
