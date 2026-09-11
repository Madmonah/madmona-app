// 🎭 (١١/٩/٢٠٢٦) سلسلة «لو كان على مضمونة» — الحلقة ٢: العيادة (المريض اتصل ٣ مرات عشان يعرف ميعاده).
// نفس فورمات الحلقة ١ (شات كوميدي → «بس لو كان على مضمونة» → شات → rows → CTA «اكتب قصتك»).
const fs = require('fs')
const cf = 'E:/madmona-app/scripts/reels/playwright/reels.config.js'
let c = fs.readFileSync(cf, 'utf8')
if (c.includes("slug: 'law-madmona-clinic'")) { console.log('exists'); process.exit(0) }
const entry = `
  {
    slug: 'law-madmona-clinic',
    title: 'لو كان على مضمونة — الحلقة ٢: العيادة',
    caption: "لو كان على مضمونة — الحلقة ٢ 🩺\\n\\nالمريض اتصل ٣ مرات عشان يعرف ميعاده… والسكرتيرة بتقلّب في الدفتر 📒\\n\\nإيه اللي كان هيتغيّر في القصة؟ اتفرج للآخر.\\n\\nبرنامج إدارة العيادات من مضمونة — بـ١٠٠٠ ج بدل كتير، لعدد محدود.\\nmadmonacairo.com/for/clinics\\n\\n(قصة تمثيلية)\\n#مضمونة #عيادات #لو_كان_على_مضمونة",
    scenes: [
      { type: 'big', len: 3.2, reveal: 1.2, text: 'لو كان على مضمونة', em: 'الحلقة ٢: العيادة 🩺', note: 'قصة حقيقية… بتتكرر كل يوم' },
      { type: 'chat', len: 9, bubbles: [
        { who: 'them', text: 'لو سمحتي ميعادي إمتى؟ 🙏' },
        { who: 'me', text: 'ثانية بس أشوف الدفتر 📒' },
        { who: 'them', text: 'أنا كلمت الصبح كمان' },
        { who: 'me', text: 'الدكتور اتأخر… تقدر تيجي ٨؟' },
        { who: 'them', text: 'أنا واقف قدام العيادة من ٦ 🙂' },
      ], ask: 'المريض راح لدكتور تاني 🚶' },
      { type: 'big', len: 3.4, reveal: 1.3, text: 'نفس القصة…', em: 'بس لو كان على مضمونة 👇' },
      { type: 'chat', len: 9, bubbles: [
        { who: 'them', text: 'ميعادي إمتى؟' },
        { who: 'me', text: 'ميعادك النهارده ٦:٣٠ مع د. أحمد ✅' },
        { who: 'me', text: 'الدكتور اتأخر ٢٠ دقيقة — تحب تأجّل لـ٧؟' },
        { who: 'them', text: 'تمام ٧ 👌' },
      ], ask: 'الرد في ثانية ⚡' },
      { type: 'rows', len: 6.5, tone: 'good', cap: 'اللي اتغيّر في القصة', items: ['المريض بيحجز يوم وساعة من صفحتك', 'بوت الواتساب بيرد من مواعيدك الحقيقية', 'قائمة الانتظار على شاشة واحدة', 'وكل مريض ليه ملف'] },
      { type: 'big', len: 4, reveal: 1.4, text: 'برنامج إدارة العيادات', em: 'بـ١٠٠٠ ج بدل كتير', note: 'لعدد محدود من الحسابات' },
      { type: 'end', len: 4.5, line: 'قصتك مع عيادتك إيه؟ اكتبها في كومنت ونعيدها «لو كان على مضمونة»', sub: 'madmonacairo.com/for/clinics' },
    ],
  },
`
const anchor = c.lastIndexOf('\n]')
c = c.slice(0, anchor) + entry + c.slice(anchor)
fs.writeFileSync(cf, c)
// كابشنات
const slug = 'law-madmona-clinic'
const base = 'لو كان على مضمونة — الحلقة ٢ 🩺\n\nالمريض اتصل ٣ مرات عشان يعرف ميعاده… والسكرتيرة بتقلّب في الدفتر 📒\nإيه اللي كان هيتغيّر في القصة؟ اتفرج للآخر.\n\nقصتك مع عيادتك إيه؟ اكتبها في كومنت ونعيدها 👇'
const price = '\n\nبرنامج إدارة العيادات من مضمونة — بـ١٠٠٠ ج بدل كتير، لعدد محدود.'
const tags = '\n\n(قصة تمثيلية)\n#مضمونة #لو_كان_على_مضمونة #عيادات #مصر'
const link = (src, med) => `\nhttps://www.madmonacairo.com/for/clinics?utm_source=${src}&utm_medium=${med}&utm_campaign=erp1000&utm_content=${slug}`
const w = (p, t) => fs.writeFileSync(`E:/madmona-app/scripts/reels/playwright/output/caption-${slug}-${p}.txt`, t)
w('instagram', base + price + '\nاللينك في البايو' + tags)
w('tiktok', 'لو كان على مضمونة — الحلقة ٢ 🩺 المريض اتصل ٣ مرات عشان يعرف ميعاده… إيه اللي كان هيتغيّر؟ #مضمونة #لو_كان_على_مضمونة #عيادات #مصر')
w('facebook', base + price + '\nاللينك في أول كومنت 👇' + tags)
w('threads', base + price + link('threads', 'organic') + '\n\n(قصة تمثيلية)\n#مضمونة #لو_كان_على_مضمونة')
w('telegram', base + price + link('telegram', 'channel') + '\n\n(قصة تمثيلية)')
w('x', 'لو كان على مضمونة — الحلقة ٢ 🩺\n\nالمريض اتصل ٣ مرات عشان يعرف ميعاده… والسكرتيرة بتقلّب في الدفتر 📒 إيه اللي كان هيتغيّر؟\n\nبرنامج إدارة العيادات بـ١٠٠٠ ج بدل كتير:\nmadmonacairo.com/for/clinics?utm_source=x&utm_campaign=erp1000')
console.log('added + captions')
