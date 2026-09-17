// 🎞️ محرك فريمات حتمي (١٧/٩/٢٠٢٦): صفحة HTML فيها window.render(t) → لقطة لكل فريم → mp4.
// بيخلّي أي حركة (عدّادات · رسوم بيانية · تايبوجرافي) مظبوطة على الفريم ومش معتمدة على توقيت المتصفح.
// argv: <html> <seconds> <out.mp4> [audio.mp3] [musicVol]
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const [, , html, secs, out, audio, musicVol = '0.14'] = process.argv
const FPS = 30, N = Math.round(+secs * FPS)
const tmp = path.join(__dirname, 'shots', '_render_' + path.basename(out, '.mp4'))
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true })

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('file:///' + path.resolve(html).split(path.sep).join('/'))
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(800)
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => window.render(t), i / FPS)
    await p.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 })
  }
  await b.close()
  const music = path.join(__dirname, '..', 'music', 'exmusichqlibre518664.mp3')
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'), '-i', music]
  let fc = `[1:a]atrim=0:${secs},afade=t=in:d=0.3,afade=t=out:st=${+secs - 1}:d=1,volume=${audio ? musicVol : 0.85}[m]`
  if (audio) { args.push('-i', audio); fc += `;[2:a]volume=1.35[v];[m][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]` }
  else fc += ';[m]anull[a]'
  execFileSync('ffmpeg', [...args, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', String(secs), out], { stdio: 'inherit' })
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(JSON.stringify({ out, frames: N }))
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
