// كابشنات الحلقة ١ من «لو كان على مضمونة» لكل منصة
const fs = require('fs')
const slug = 'law-madmona-showroom'
const base = 'لو كان على مضمونة — الحلقة ١ 🚗\n\nالعميل بيسأل على عربية اتباعت من ١٠ أيام… ولسه معروضة 🙈\nإيه اللي كان هيتغيّر في القصة؟ اتفرج للآخر.\n\nعندك قصة عايز نعيدها «لو كان على مضمونة»؟ اكتبها في كومنت 👇'
const price = '\n\nبرنامج إدارة المعارض من مضمونة — بـ١٠٠٠ ج بدل كتير، لعدد محدود.'
const tags = '\n\n(قصة تمثيلية)\n#مضمونة #لو_كان_على_مضمونة #معارض_سيارات #مصر'
const link = (src, med) => `\nhttps://www.madmonacairo.com/for/showrooms?utm_source=${src}&utm_medium=${med}&utm_campaign=erp1000&utm_content=${slug}`
const w = (p, t) => fs.writeFileSync(`output/caption-${slug}-${p}.txt`, t)
w('instagram', base + price + '\nاللينك في البايو' + tags)
w('tiktok', 'لو كان على مضمونة — الحلقة ١ 🚗 العميل بيسأل على عربية اتباعت من ١٠ أيام… إيه اللي كان هيتغيّر؟ #مضمونة #لو_كان_على_مضمونة #معارض_سيارات #مصر')
w('facebook', base + price + '\nاللينك في أول كومنت 👇' + tags)
w('threads', base + price + link('threads', 'organic') + '\n\n(قصة تمثيلية)\n#مضمونة #لو_كان_على_مضمونة')
w('telegram', base + price + link('telegram', 'channel') + '\n\n(قصة تمثيلية)')
w('x', 'لو كان على مضمونة — الحلقة ١ 🚗\n\nالعميل بيسأل على عربية اتباعت من ١٠ أيام… ولسه معروضة 🙈 إيه اللي كان هيتغيّر؟\n\nبرنامج إدارة المعارض بـ١٠٠٠ ج بدل كتير:\nmadmonacairo.com/for/showrooms?utm_source=x&utm_campaign=erp1000')
w('comment', 'ضيف معرضك في دقيقتين 👇 https://www.madmonacairo.com/for/showrooms?utm_source=facebook&utm_medium=comment&utm_campaign=erp1000&utm_content=' + slug)
console.log('captions ok', fs.readFileSync(`output/caption-${slug}-x.txt`, 'utf8').length)
