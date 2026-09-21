// 🔁 (٢١/٩/٢٠٢٦) محمد: «محتاج اعمل اعلان اسكتش ويكون فيه لوب».
//
// الفكرة: الرسالة نفسها **لوب** — صاحب بيزنس في حلقة يومية مقفولة — والفيديو
// نفسه مصمّم لوب: **آخر مشهد = نفس رسمة أول مشهد بالظبط** (نفس الأرضية ونفس
// اللمبة ونفس وقفة الشخصية في نفس الإحداثيات)، فلما إنستجرام/تيك توك يعيد
// الريل تلقائي المشاهد مايحسّش بفاصل ويكمّل دورة تانية.
// ⛔ مفيش أرقام ولا وعود — الرسالة سلوكية بحتة + CTA واحد.
const fs = require('fs')
const P = __dirname + '/noir.config.js'
const slug = 'loop-daily-grind'

const scenes = [
  // ① الافتتاح — ده التكوين اللي هنرجعله في الآخر بالظبط
  { len: 3.4, mood: 'dark', title: 'سبعة الصبح.', em: 'فتحت المحل.',
    draw: (p, f) => p.ground(1240) + p.lamp(760, 1240, 720) + f({ x: 560, y: 1240, pose: 'stand' }) },

  { len: 4.2, mood: 'dark', sub: 'تليفون. «كام سعر ده؟» — مش فاكر. «هرد عليك حالًا».',
    draw: (p, f) => p.ground(1240) + p.lamp(760, 1240, 720) + f({ x: 540, y: 1240, pose: 'phone' }) + p.qmark(820, 560) },

  { len: 4.2, mood: 'dark', sub: 'ورق على المكتب. الحساب مش مظبوط… وماحدش عارف الفرق منين.',
    draw: (p, f) => p.ground(1240) + p.desk(460, 1110, 440) + p.papers(300, 1160, 3) + f({ x: 860, y: 1240, pose: 'headdown' }) },

  { len: 4.2, mood: 'dark', sub: 'موظف بيسأل: «الأوردر بتاع امبارح راح فين؟» — وإنت بتفكّر.',
    draw: (p, f) => p.ground(1240) + f({ x: 380, y: 1240, pose: 'point' }) + f({ x: 760, y: 1240, pose: 'headdown', red: true }) + p.qmark(600, 520) },

  { len: 4.2, mood: 'dark', sub: 'بالليل… قفلت. ومش فاكر اليوم عدّى إزاي.',
    draw: (p, f) => p.ground(1240) + p.house(680, 1240, 360) + f({ x: 320, y: 1240, pose: 'walk', flip: true }) },

  // ⑥ الكشف — هنا بنسمّي اللي بيحصل
  { len: 4.6, mood: 'turn', title: 'وبكرة…', em: 'نفس الحكاية بالظبط.',
    draw: (p, f) => p.ground(1240) + p.ring(540, 760, 250) + f({ x: 540, y: 1240, pose: 'stand' }) },

  { len: 4.2, mood: 'turn', title: 'ده مش شغل.', em: 'ده لوب.',
    draw: (p, f) => p.ground(1240) + p.ring(540, 720, 300) + p.ring(540, 720, 200) + f({ x: 540, y: 1240, pose: 'headdown', red: true }) },

  // ⑧ الكسر
  { len: 4.6, mood: 'brand', sub: 'على مضمونة: السعر مكتوب، والأوردر متسجّل، والحساب بيقفل لوحده.',
    draw: (p, f) => p.ground(1240) + p.desk(460, 1110, 440) + p.bigphone(820, 700, 300) + f({ x: 300, y: 1240, pose: 'point' }) },

  { len: 4.2, mood: 'brand', title: 'اكتب start', em: 'وابدأ مجانًا', sub: 'madmonacairo.com/start',
    draw: (p, f) => p.ground(1240) + p.flash(540, 700) + f({ x: 540, y: 1240, pose: 'stand' }) },

  // ⑩ 🔁 اللوب — نفس رسمة المشهد ① بالحرف: نفس الأرضية · نفس اللمبة · نفس الوقفة والإحداثيات
  { len: 3.4, mood: 'dark', title: 'سبعة الصبح.', em: 'فتحت المحل.',
    draw: (p, f) => p.ground(1240) + p.lamp(760, 1240, 720) + f({ x: 560, y: 1240, pose: 'stand' }) },
]

const src = fs.readFileSync(P, 'utf8')
if (src.includes(`'${slug}'`)) { console.log('الحلقة موجودة بالفعل'); process.exit(0) }

const body = scenes.map((s) => {
  const parts = [`len: ${s.len}`, `mood: '${s.mood}'`]
  if (s.title) parts.push(`title: ${JSON.stringify(s.title)}`)
  if (s.em) parts.push(`em: ${JSON.stringify(s.em)}`)
  if (s.sub) parts.push(`sub: ${JSON.stringify(s.sub)}`)
  parts.push(`draw: ${String(s.draw)}`)
  return `    { ${parts.join(', ')} },`
}).join('\n')

const block = `
// 🔁 (٢١/٩/٢٠٢٦) إعلان سكتش مصمّم **لوب**: آخر مشهد = نفس رسمة أول مشهد بالظبط،
//    فالإعادة التلقائية على إنستجرام/تيك توك بتكمّل دورة تانية من غير فاصل محسوس.
//    والرسالة نفسها لوب: يوم صاحب البيزنس بيعيد نفسه لحد ما يكسره نظام.
module.exports['${slug}'] = {
  slug: '${slug}',
  title: 'ده مش شغل… ده لوب',
  scenes: [
${body}
  ],
}
`
fs.writeFileSync(P, src + block)
console.log('✅ اتضافت:', slug, '· مشاهد:', scenes.length, '· المدة:', scenes.reduce((a, s) => a + s.len, 0).toFixed(1), 'ث')
console.log('اللوب: مشهد ١ و١٠ بنفس الرسمة بالظبط')
