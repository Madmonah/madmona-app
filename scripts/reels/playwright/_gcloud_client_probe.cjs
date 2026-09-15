// قراءة بس: هل حساب جوجل في كروم السوشيال يقدر يفتح عميل OAuth بتاع دخول جوجل؟ (مابيعدّلش حاجة)
const { chromium } = require('playwright')
const CID = '739336454511-320ecs47arl6l2tpmm657qlupll3a9kr.apps.googleusercontent.com'
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const ctx = b.contexts()[0]
  const p = await ctx.newPage()
  const out = {}
  await p.goto('https://myaccount.google.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
  out.account = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').match(/[\w.+-]+@[\w.-]+/g)?.slice(0, 3) || null
  await p.goto(`https://console.cloud.google.com/apis/credentials/oauthclient/${CID}?project=739336454511`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(12000)
  out.url = p.url().slice(0, 120)
  out.text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 900)
  console.log(JSON.stringify(out))
  await p.close(); await b.close().catch(() => {})
})().catch(e => { console.log('ERR', e.message); process.exit(1) })
