// فحص صفحة /quiz على عرض موبايل: هل زرار «ابدأ» ظاهر جوّه الشاشة الأولى؟
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await p.goto('https://www.madmonacairo.com/quiz', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(6000)
  const info = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button,a')].map(e => {
      const r = e.getBoundingClientRect()
      return { t: (e.innerText || '').trim().slice(0, 30), top: Math.round(r.top), h: Math.round(r.height), vis: r.top < innerHeight && r.height > 0 }
    }).filter(x => x.t)
    return { h: document.body.scrollHeight, vh: innerHeight, btns: btns.slice(0, 12) }
  })
  console.log(JSON.stringify(info, null, 1))
  await p.screenshot({ path: 'E:/madmona-app/scripts/reels/playwright/output/quiz-mobile.png' })
  await b.close()
})()
