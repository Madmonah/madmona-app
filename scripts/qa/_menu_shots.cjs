// 📸 مقارنة بصرية بين منيو لمونة ومنيو مطاعم تانية (١٨/٩/٢٠٢٦ — محمد: «كل منيوهات
//    المطاعم تبقى زي منيو لمونة بالظبط في الشكل وطريقة العرض»).
// بياخد لقطة كاملة لكل منيو من كروم حقيقي (الهيدلس بياخد ٤٠٣ من نقطة تفتيش فيرسل).
const { chromium } = require('playwright')
const OUT = process.argv[2] || 'E:/madmona-app/output/menus'
const SLUGS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['lamouna-juices-dubai', 'sultan-saray', 'alsaddah-restaurant', 'mashwi-w-mandi']
require('fs').mkdirSync(OUT, { recursive: true })

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  // ⚠️ (١٨/٩/٢٠٢٦) viewport غير طبيعي (زي 420×2200) بيشغّل **نقطة تفتيش أمان Vercel**
  //    وبترجّع «فشل في التحقق من متصفحك» حتى من كروم حقيقي. استخدم مقاس موبايل عادي
  //    وfullPage للصفحة الطويلة.
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  for (const s of SLUGS) {
    try {
      await p.goto(`https://www.madmonacairo.com/marketplace/${s}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await p.waitForTimeout(9000)
      const info = await p.evaluate(() => {
        const t = document.body.innerText
        return {
          // إشارات شكل المنيو: تابات الأقسام · كروت الأصناف · صور · أوصاف
          hasTabs: /الكل|كل الأصناف/.test(t),
          cards: document.querySelectorAll('[data-menu-item], article, li').length,
          imgs: document.querySelectorAll('img').length,
          height: document.body.scrollHeight,
        }
      })
      await p.screenshot({ path: `${OUT}/${s}.png`, fullPage: true })
      console.log(s, JSON.stringify(info))
    } catch (e) { console.log(s, 'ERR', e.message.slice(0, 80)) }
  }
  await b.close()
})().catch(e => console.log('ERR', e.message.slice(0, 140)))
