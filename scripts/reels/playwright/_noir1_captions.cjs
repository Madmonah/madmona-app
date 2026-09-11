// كابشنات «هكذا تبدو حياتك كمقاول… من غير سيستم» لكل منصة
const fs = require('fs')
const slug = 'noir-contractor-day'
const base = 'هكذا تبدو حياتك كمقاول… من غير سيستم 🎞️\n\nالصبح: تلات مواقع وعهدة في جيب كل مشرف. الضهر: «الخامة وصلت؟» ومحدش عارف. المغرب: العميل بيسأل على المستخلص. بالليل: الفواتير على الترابيزة وسؤال واحد: المشروع كسبان ولا خسران؟\n\nوهكذا كل شهر… لحد ما تقرر تغيّر القصة.'
const price = '\n\nبرنامج إدارة المقاولات من مضمونة — بـ١٠٠٠ ج بدل كتير، لعدد محدود.'
const tags = '\n\n(قصة تمثيلية)\n#مضمونة #مقاولات #هكذا_تبدو_حياتك #مصر'
const link = (src, med) => `\nhttps://www.madmonacairo.com/for/contracting?utm_source=${src}&utm_medium=${med}&utm_campaign=erp1000&utm_content=${slug}`
const w = (p, t) => fs.writeFileSync(`E:/madmona-app/scripts/reels/playwright/output/caption-${slug}-${p}.txt`, t)
w('instagram', base + price + '\nاللينك في البايو' + tags)
w('tiktok', 'هكذا تبدو حياتك كمقاول… من غير سيستم 🎞️ وهكذا كل شهر، لحد ما تقرر تغيّر القصة #مضمونة #مقاولات #هكذا_تبدو_حياتك #مصر')
w('facebook', base + price + '\nاللينك في أول كومنت 👇' + tags)
w('threads', 'هكذا تبدو حياتك كمقاول… من غير سيستم 🎞️\n\nتلات مواقع وعهدة في جيب كل مشرف، «الخامة وصلت؟» ومحدش عارف، والعميل بيسأل على المستخلص، وبالليل: كسبان ولا خسران؟ وهكذا كل شهر… لحد ما تقرر تغيّر القصة.' + price + link('threads', 'organic') + '\n\n(قصة تمثيلية)\n#مضمونة #مقاولات')
w('telegram', base + price + link('telegram', 'channel') + '\n\n(قصة تمثيلية)')
w('x', 'هكذا تبدو حياتك كمقاول… من غير سيستم 🎞️\n\nعهدة في جيب كل مشرف، «الخامة وصلت؟» ومحدش عارف، وبالليل: كسبان ولا خسران؟ وهكذا كل شهر… لحد ما تغيّر القصة.\n\nبرنامج إدارة المقاولات بـ١٠٠٠ ج بدل كتير:\nmadmonacairo.com/for/contracting?utm_source=x&utm_campaign=erp1000')
w('comment', 'غيّر القصة — ضيف شركتك في دقيقتين 👇 https://www.madmonacairo.com/for/contracting?utm_source=facebook&utm_medium=comment&utm_campaign=erp1000&utm_content=' + slug)
console.log('captions ok', fs.readFileSync(`E:/madmona-app/scripts/reels/playwright/output/caption-${slug}-x.txt`, 'utf8').length, fs.readFileSync(`E:/madmona-app/scripts/reels/playwright/output/caption-${slug}-threads.txt`, 'utf8').length)
