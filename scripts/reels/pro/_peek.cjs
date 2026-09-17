// لقطات سريعة من قالب HTML عند ثواني محددة: node _peek.cjs <html> <out.png> t1 t2 ...
const { chromium } = require('playwright'); const path = require('path'); const { execFileSync } = require('child_process')
const [, , html, out, ...ts] = process.argv
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('file:///' + path.resolve(html).split(path.sep).join('/')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  const files = []
  for (const t of ts) { await p.evaluate(x => window.render(x), +t); const f = path.join(__dirname, 'shots', `_peek_${t}.png`); await p.screenshot({ path: f }); files.push(f) }
  await b.close()
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex', files.map((_, i) => `[${i}]scale=240:-1[s${i}]`).join(';') + ';' + files.map((_, i) => `[s${i}]`).join('') + `hstack=${files.length}`, out])
  console.log('ok')
})()
